import { describe, expect, it } from 'vitest';
import { generateSite } from '../site/site';
import { CONTRACTS, acceptContract, availableContracts } from './contracts';
import { LAUNCH_SITES, LAUNCH_VEHICLES, rideshareCost } from './launchVehicles';
import { launch, missionStage, planLaunch, shipMission } from './mission';
import { type SiteState, advanceDays, newSiteState } from './siteState';
import { type Design, type OptionId, checkDesign, choose, emptyDesign, missionGoal, partsNeeded, spacecraftMass } from './spacecraft';

const EXPLORER: OptionId[] = ['smallBus', 'batteriesOnly', 'largeBattery', 'simpleAntenna', 'spin', 'radiationDetector'];
const swap = (from: OptionId, to: OptionId) => EXPLORER.map((id) => (id === from ? to : id));

function design(ids: OptionId[]): Design {
  const d = emptyDesign();
  for (const id of ids) choose(d, id);
  return d;
}

/** A Company with the Contract accepted and the Parts for `ids` in the Warehouse. */
function ready(ids: OptionId[] = EXPLORER): SiteState {
  const state = newSiteState();
  acceptContract(state, 'explorer1');
  state.design = design(ids);
  for (const p of partsNeeded(state.design)) state.parts[p] += 1;
  return state;
}

const site = generateSite('K7QXM2');

describe('Launch planner', () => {
  it('prices the Rideshare per kg of Spacecraft', () => {
    const plan = planLaunch(ready(), design(EXPLORER));
    expect(plan.massKg).toBe(11.5);
    expect(plan.rideshare).toBe(Math.round(11.5 * LAUNCH_VEHICLES.juno1.perKg));
    expect(rideshareCost('juno1', 5)).toBeLessThan(rideshareCost('juno1', 10));
    expect(plan.shipping).toBe(LAUNCH_SITES.capeCanaveral.shippingCost);
    expect(plan.total).toBe(plan.rideshare + plan.shipping);
    expect(plan.ok).toBe(true);
  });

  it('counts assembly and Shipping days before the Spacecraft can Launch', () => {
    const state = ready();
    state.day = 10.6;
    const plan = planLaunch(state, state.design);
    expect(plan.readyDay).toBe(10 + 30 + LAUNCH_SITES.capeCanaveral.shippingDays);
    expect(plan.endDay).toBe(plan.readyDay + 30);
    expect(plan.deadlineDay).toBe(CONTRACTS.explorer1.deadlineDays);
  });

  it('blocks a design too heavy for Juno I and says by how much', () => {
    const heavy = swap('smallBus', 'mediumBus');
    const plan = planLaunch(ready(heavy), design(heavy));
    expect(plan.ok).toBe(false);
    expect(plan.problems).toContainEqual({ kind: 'tooHeavy', overKg: spacecraftMass(design(heavy)) - 14 });
  });

  it('blocks shipping without an accepted Contract, a full design, the Parts or the money', () => {
    const state = newSiteState();
    const kinds = planLaunch(state, design(['smallBus'])).problems.map((p) => p.kind);
    expect(kinds).toEqual(['noContract', 'emptySlots', 'missingParts']);
    const poor = { ...ready(), money: 1_000 };
    expect(planLaunch(poor, poor.design).problems).toContainEqual({ kind: 'money', short: planLaunch(poor, poor.design).total - 1_000 });
  });

  it('lets a design with warnings ship, so the Mission Report can explain them', () => {
    const weak = swap('largeBattery', 'smallBattery');
    const state = ready(weak);
    expect(checkDesign(state, state.design).ready).toBe(false);
    expect(planLaunch(state, state.design).ok).toBe(true);
  });
});

describe('shipping and Launch', () => {
  it('pays, takes the Parts from the Warehouse and waits for assembly and Shipping', () => {
    const state = ready();
    const money = state.money;
    const plan = shipMission(state, state.design);
    expect(plan.ok).toBe(true);
    expect(state.money).toBe(money - plan.total);
    for (const p of partsNeeded(state.design)) expect(state.parts[p]).toBe(0);
    expect(missionStage(state)).toEqual({ stage: 'assembling', daysLeft: 30 });
    expect(launch(state)).toBeNull();
    advanceDays(site, state, 30);
    expect(missionStage(state)).toEqual({ stage: 'shipping', daysLeft: 7 });
    advanceDays(site, state, 7);
    expect(missionStage(state)?.stage).toBe('ready');
  });

  it('ships one Mission at a time', () => {
    const state = ready();
    shipMission(state, state.design);
    for (const p of partsNeeded(state.design)) state.parts[p] += 1;
    expect(shipMission(state, state.design).problems).toContainEqual({ kind: 'underway' });
  });

  it('pays the Explorer 1 reward and closes the Contract when every requirement is met', () => {
    const state = ready();
    shipMission(state, state.design);
    advanceDays(site, state, 37);
    const money = state.money;
    const report = launch(state)!;
    expect(report.success).toBe(true);
    expect(report.findings.every((f) => f.ok)).toBe(true);
    expect(report.reward).toBe(CONTRACTS.explorer1.reward);
    expect(state.money).toBe(money + CONTRACTS.explorer1.reward);
    expect(state.contracts).toEqual([]);
    expect(state.completed).toEqual(['explorer1']);
    expect(availableContracts(state)).toEqual([]);
    expect(acceptContract(state, 'explorer1')).toEqual({ ok: false, problem: 'done' });
    expect(missionGoal(state).status).toBe('done');
    expect(state.mission).toBeNull();
    expect(state.reports).toEqual([report]);
  });

  it('fails because the Small Battery runs out, and keeps the Contract open for another try', () => {
    const state = ready(swap('largeBattery', 'smallBattery'));
    shipMission(state, state.design);
    advanceDays(site, state, 37);
    const money = state.money;
    const report = launch(state)!;
    expect(report.success).toBe(false);
    expect(report.reward).toBe(0);
    expect(state.money).toBe(money);
    const power = report.findings.find((f) => f.kind === 'power');
    expect(power).toMatchObject({ ok: false, battery: 'smallBattery', needDays: 30 });
    expect(power?.kind === 'power' && power.lastsDays).toBeLessThan(30);
    expect(report.findings.filter((f) => !f.ok).map((f) => f.kind)).toEqual(['power']);
    expect(state.contracts.map((c) => c.id)).toEqual(['explorer1']);
  });

  it('fails on Time when the Mission ends after the deadline', () => {
    const state = ready();
    state.day = 300; // ready on day 337, ends on day 367: two days after the deadline
    shipMission(state, state.design);
    advanceDays(site, state, 37);
    const report = launch(state)!;
    expect(report.success).toBe(false);
    expect(report.findings.find((f) => f.kind === 'time')).toEqual({ kind: 'time', ok: false, endDay: 367, deadlineDay: 365 });
  });
});
