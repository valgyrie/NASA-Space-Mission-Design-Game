import { describe, expect, it } from 'vitest';
import { makeRng } from '../site/random';
import { INSURANCE, ROCKET_RELIABILITY, STARTUP_GRANT } from './balance';
import { acceptContract, deadlineDay } from './contracts';
import { drawRocket, fly, realFlight, testRun } from './flight';
import { flightShow } from './ascent';
import { grantDue, payGrant } from './grant';
import { FAILURE_STORY } from './history';
import { LAUNCH_VEHICLES } from './launchVehicles';
import { type MissionReport, insuranceQuote, launch, planLaunch, rocketReliability, shipMission, testRunFor } from './mission';
import { JPL, weatherOn } from './places';
import { type SiteState, newSiteState } from './siteState';
import { type Design, type OptionId, choose, emptyDesign, partsNeeded } from './spacecraft';

const SEED = 'K7QXM2';
const EXPLORER: OptionId[] = ['smallBus', 'batteriesOnly', 'largeBattery', 'simpleAntenna', 'spin', 'radiationDetector'];
const WEAK: OptionId[] = EXPLORER.map((id) => (id === 'largeBattery' ? 'smallBattery' : id));

function design(ids: OptionId[]): Design {
  const d = emptyDesign();
  for (const id of ids) choose(d, id);
  return d;
}

/** A Company with Explorer 1 accepted, the Parts in the Warehouse, and `launches` Missions flown before. */
function ready(ids: OptionId[] = EXPLORER, launches = 0): SiteState {
  const state = newSiteState(JPL, 'advanced');
  acceptContract(state, 'explorer1');
  state.design = design(ids);
  for (const p of partsNeeded(state.design)) state.parts[p] += 1;
  for (let i = 0; i < launches; i++) state.reports.push({ contract: 'explorer1', success: false } as MissionReport);
  return state;
}

const flightPlan = (ids: OptionId[] = EXPLORER) => ({ contract: 'explorer1' as const, design: design(ids), vehicle: 'juno1' as const, tech: [] });

describe('Launch Vehicle failures', () => {
  it('uses a game reliability below 1, with the real record alongside', () => {
    expect(LAUNCH_VEHICLES.juno1.reliability).toBe(ROCKET_RELIABILITY.juno1);
    expect(LAUNCH_VEHICLES.juno1.record).toEqual({ worked: 3, flights: 6 });
    expect(LAUNCH_VEHICLES.thorAble.record).toEqual({ worked: 10, flights: 16 });
    // The game is kinder than history, but a rocket can still fail: even Delta D, which never failed in its 2 flights.
    for (const v of Object.values(LAUNCH_VEHICLES)) {
      if (v.record && v.record.worked < v.record.flights) expect(v.reliability).toBeGreaterThan(v.record.worked / v.record.flights);
      expect(v.reliability).toBeLessThan(1);
    }
    expect(LAUNCH_VEHICLES.thorDelta.record).toEqual({ worked: 11, flights: 12 });
    expect(LAUNCH_VEHICLES.deltaD.record).toEqual({ worked: 2, flights: 2 });
  });

  it('fails about as often as its reliability says, at any stage', () => {
    const rng = makeRng(42);
    const stages = new Set<number>();
    let fails = 0;
    for (let i = 0; i < 4_000; i++) {
      const s = drawRocket(rng, 'juno1', 0.8);
      if (s !== null) {
        fails++;
        stages.add(s);
      }
    }
    expect(fails / 4_000).toBeCloseTo(0.2, 1);
    expect([...stages].sort()).toEqual([1, 2, 3, 4]);
    expect(drawRocket(rng, 'juno1', 1)).toBeNull();
  });

  it('a failed stage means no orbit, and the report says which one', () => {
    const f = fly(flightPlan(), 40, 365, undefined, 2);
    expect(f.success).toBe(false);
    expect(f.findings.find((x) => x.kind === 'orbit')).toMatchObject({ ok: false, failedStage: 2 });
    // Too heavy fails on that alone: the rocket's stage doesn't come into it.
    const heavy = fly(flightPlan(EXPLORER.map((id) => (id === 'smallBus' ? 'mediumBus' : id))), 40, 365, undefined, 2);
    expect(heavy.findings.find((x) => x.kind === 'orbit')).toMatchObject({ ok: false, failedStage: null });
  });

  it("never fails on the Company's first Launch, as Explorer 1 didn't", () => {
    expect(rocketReliability(ready(), 'juno1')).toBe(1);
    expect(rocketReliability(ready(EXPLORER, 1), 'juno1')).toBe(ROCKET_RELIABILITY.juno1);
    for (let day = 40; day < 140; day++) expect(realFlight(SEED, flightPlan(), day, 365, 1).success).toBe(true);
    const lost = Array.from({ length: 100 }, (_, i) => realFlight(SEED, flightPlan(), 40 + i, 365, ROCKET_RELIABILITY.juno1).success).filter((ok) => !ok);
    expect(lost.length).toBeGreaterThan(5);
  });

  it('the Test Run counts the rocket in: the design share times its reliability', () => {
    const run = testRun(SEED, flightPlan(), 40, 365, { reliability: 0.8 });
    expect(run.designPercent).toBe(100);
    expect(run.successPercent).toBe(80);
    expect(testRunFor(ready(), SEED, design(EXPLORER)).successPercent).toBe(100);
    expect(testRunFor(ready(EXPLORER, 1), SEED, design(EXPLORER)).successPercent).toBe(80);
  });

  it('cuts the Launch show at the failed stage', () => {
    const f = fly(flightPlan(), 40, 365, undefined, 1);
    const show = flightShow('juno1', f);
    expect(show.map((s) => s.phase)).toEqual(['countdown', 'burn', 'lost']);
    expect(show[1]!.to).toBe(LAUNCH_VEHICLES.juno1.stages[0]!.burnS / 2);
    expect(show[2]).toMatchObject({ phase: 'lost', stage: 1 });
  });
});

describe('Launch Insurance', () => {
  it('is priced from the estimated success and pays back most of the cost', () => {
    const first = ready();
    const plan = planLaunch(first, first.design);
    const safe = insuranceQuote(first, SEED, first.design);
    expect(safe).toMatchObject({ ok: true, successPercent: 100 });
    expect(safe.payout).toBe(Math.round((plan.total * INSURANCE.payoutShare) / 1_000) * 1_000);
    // A sure thing still costs the minimum.
    expect(safe.ok && safe.price).toBe(Math.round((safe.payout * INSURANCE.minShare) / 1_000) * 1_000);
    // A riskier flight (the rocket can fail now) costs more.
    const later = ready(EXPLORER, 1);
    const risky = insuranceQuote(later, SEED, later.design);
    expect(risky.successPercent).toBe(80);
    expect(risky.ok && safe.ok && risky.price > safe.price).toBe(true);
    expect(risky.ok && risky.price).toBe(Math.round((risky.payout * 0.2 * INSURANCE.margin) / 1_000) * 1_000);
  });

  it('nobody will insure a flight under half likely to work', () => {
    const state = ready(WEAK);
    expect(insuranceQuote(state, SEED, state.design)).toMatchObject({ ok: false, successPercent: 0 });
    // Ticking it anyway ships without insurance.
    shipMission(state, state.design, 'juno1', 'capeCanaveral', { insure: true, seed: SEED });
    expect(state.mission?.insurance).toBeNull();
  });

  it('is paid when shipping, and pays back on failure', () => {
    const state = ready(EXPLORER, 1);
    const quote = insuranceQuote(state, SEED, state.design);
    if (!quote.ok) throw new Error('should be insurable');
    const money = state.money;
    const plan = shipMission(state, state.design, 'juno1', 'capeCanaveral', { insure: true, seed: SEED });
    expect(plan.insurance).toBe(quote.price);
    expect(state.money).toBe(money - plan.total - quote.price);
    expect(state.mission?.insurance).toEqual({ price: quote.price, payout: quote.payout });
    // Find a calm day on which this rocket fails, and Launch then.
    const m = state.mission!;
    const deadline = deadlineDay(state.contracts[0]!);
    let day = m.readyDay;
    while (weatherOn(m.site, day).scrub || realFlight(SEED, m, day, deadline, ROCKET_RELIABILITY.juno1).success) day++;
    state.day = day;
    const before = state.money;
    const { report } = launch(state, SEED)!;
    expect(report.success).toBe(false);
    expect(report.insurancePaid).toBe(quote.payout);
    expect(state.money).toBe(before + quote.payout);
  });

  it('counts its price in the money check', () => {
    const state = ready(EXPLORER, 1);
    const plan = planLaunch(state, state.design);
    state.money = plan.total + 1;
    expect(planLaunch(state, state.design, 'juno1', 'capeCanaveral', 50_000).problems.map((p) => p.kind)).toContain('money');
    expect(planLaunch(state, state.design).ok).toBe(true);
  });
});

describe('failure story', () => {
  it('shows Vanguard TV3 after the first failed Mission, once', () => {
    const state = ready(WEAK);
    shipMission(state, state.design);
    state.day = state.mission!.readyDay;
    while (weatherOn('capeCanaveral', state.day).scrub) state.day++;
    expect(launch(state, SEED)!.report.success).toBe(false);
    expect(state.history).toContain(FAILURE_STORY);
    expect(state.history.filter((id) => id === FAILURE_STORY)).toHaveLength(1);
  });
});

describe('startup grant', () => {
  it('pays once when money runs low with nothing on its way', () => {
    const state = newSiteState();
    expect(grantDue(state)).toBe(false);
    state.money = STARTUP_GRANT.belowMoney - 1;
    state.mission = {} as SiteState['mission'];
    expect(payGrant(state)).toBe(0);
    state.mission = null;
    state.day = 42.7;
    expect(payGrant(state)).toBe(STARTUP_GRANT.amount);
    expect(state.money).toBe(STARTUP_GRANT.belowMoney - 1 + STARTUP_GRANT.amount);
    expect(state.grantDay).toBe(42);
    state.money = 0;
    expect(payGrant(state)).toBe(0);
  });
});
