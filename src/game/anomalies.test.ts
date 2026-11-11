import { describe, expect, it } from 'vitest';
import { ANOMALY_MAX_DATA_LOSS, ANOMALY_UNANSWERED_SCORE, ANTENNA_CHANCE, ECLIPSE_CHANCE, PANEL_CHANCE } from './balance';
import {
  type Anomaly,
  antennaChance,
  eclipseChance,
  isMandatory,
  panelChance,
  lostDaysFor,
  rollAnomaly,
  settleAnomaly,
  settleUnanswered,
  skipAnomaly,
  withContactLost,
} from './anomalies';
import { CONTRACTS, acceptContract } from './contracts';
import { fly } from './flight';
import { type MissionReport, launch, shipMission } from './mission';
import { type SiteState, newSiteState } from './siteState';
import { type Design, type OptionId, choose, emptyDesign, partsNeeded } from './spacecraft';

const EXPLORER: OptionId[] = ['smallBus', 'batteriesOnly', 'largeBattery', 'simpleAntenna', 'spin', 'radiationDetector'];
const swap = (from: OptionId, to: OptionId) => EXPLORER.map((id) => (id === from ? to : id));

function design(ids: OptionId[]): Design {
  const d = emptyDesign();
  for (const id of ids) choose(d, id);
  return d;
}

const plan = (ids: OptionId[] = EXPLORER) => ({ contract: 'explorer1' as const, design: design(ids), vehicle: 'juno1' as const, tech: [] });

/** Fly Explorer 1 for real: accepted, shipped, launched on the day it arrives. */
function launched(state: SiteState = newSiteState(), ids: OptionId[] = EXPLORER, seed = 'K7QXM2') {
  acceptContract(state, 'explorer1');
  state.design = design(ids);
  for (const p of partsNeeded(state.design)) state.parts[p] += 1;
  shipMission(state, state.design);
  state.day = state.mission!.readyDay;
  const money = state.money;
  const result = launch(state, seed)!;
  return { state, report: result.report, flight: result.flight, money };
}

describe('Point the antenna: when it happens', () => {
  it('is more likely the less the antenna has to spare', () => {
    expect(antennaChance(20, 20)).toBeCloseTo(ANTENNA_CHANCE.high);
    expect(antennaChance(10, 20)).toBeCloseTo(ANTENNA_CHANCE.high);
    expect(antennaChance(30, 20)).toBeGreaterThan(antennaChance(50, 20));
    expect(antennaChance(50, 20)).toBeGreaterThan(antennaChance(60, 20));
    expect(antennaChance(60, 20)).toBeCloseTo(ANTENNA_CHANCE.low);
    expect(antennaChance(500, 20)).toBeCloseTo(ANTENNA_CHANCE.low);
  });

  it('always comes on the first flight, and by chance after that', () => {
    const state = newSiteState();
    const p = plan();
    const flight = fly(p, 40, 365);
    expect(isMandatory(state, 'antenna')).toBe(true);
    for (let day = 0; day < 20; day++) expect(rollAnomaly(state, 'K7QXM2', p, flight, day)?.first).toBe(true);
    state.anomalyBest.antenna = 0.6;
    expect(isMandatory(state, 'antenna')).toBe(false);
    const rolls = Array.from({ length: 400 }, (_, day) => rollAnomaly(state, 'K7QXM2', p, flight, day));
    const share = rolls.filter((a) => a).length / rolls.length;
    expect(share).toBeGreaterThan(antennaChance(50, 20) - 0.08);
    expect(share).toBeLessThan(antennaChance(50, 20) + 0.08);
    expect(rolls.every((a) => !a || !a.first)).toBe(true);
  });

  it('gives the same answer for the same Seed and Launch day', () => {
    const state = { ...newSiteState(), anomalyBest: { antenna: 0.5 } };
    const p = plan();
    const flight = fly(p, 40, 365);
    const a = Array.from({ length: 30 }, (_, d) => rollAnomaly(state, 'K7QXM2', p, flight, d));
    const b = Array.from({ length: 30 }, (_, d) => rollAnomaly(state, 'K7QXM2', p, flight, d));
    expect(a).toEqual(b);
  });

  it('strikes while the Spacecraft still has Power, never in a flight that missed orbit', () => {
    const state = newSiteState();
    const small = plan(swap('largeBattery', 'smallBattery'));
    const flight = fly(small, 40, 365);
    expect(flight.powerOutDay).not.toBeNull();
    for (let day = 0; day < 50; day++) {
      const a = rollAnomaly(state, 'K7QXM2', small, flight, day)!;
      expect(a.day).toBeGreaterThanOrEqual(1);
      expect(a.day).toBeLessThan(flight.powerOutDay!);
    }
    const heavy = plan(swap('smallBus', 'mediumBus'));
    const lost = fly(heavy, 40, 365);
    expect(lost.findings.find((f) => f.kind === 'orbit')?.ok).toBe(false);
    expect(rollAnomaly(state, 'K7QXM2', heavy, lost, 40)).toBeNull();
  });
});

describe('Point the antenna: what it costs', () => {
  it('loses more Data the lower the score, never past the end', () => {
    const a = { day: 10, missionDays: 30, untilDay: 30 } as Anomaly;
    expect(lostDaysFor(a, 1)).toBe(0);
    expect(lostDaysFor(a, 0)).toBe(Math.round(ANOMALY_MAX_DATA_LOSS * 30));
    expect(lostDaysFor(a, 0.5)).toBeLessThan(lostDaysFor(a, 0.2));
    expect(lostDaysFor({ ...a, day: 27 }, 0)).toBe(3);
  });

  it('holds the reward back at Launch, then pays it less the lost share', () => {
    const { state, report, money } = launched();
    expect(report.success).toBe(true);
    expect(report.anomaly?.first).toBe(true);
    expect(state.money).toBe(money);
    settleAnomaly(state, report, 0, 'played');
    const a = report.anomaly!;
    expect(a.lostDays).toBe(Math.min(a.untilDay - a.day, Math.round(ANOMALY_MAX_DATA_LOSS * 30)));
    expect(a.cut).toBe(Math.round((CONTRACTS.explorer1.reward * a.lostDays) / 30));
    expect(report.reward).toBe(CONTRACTS.explorer1.reward - a.cut);
    expect(state.money).toBe(money + report.reward);
    // Still a working Mission: the Contract is done.
    expect(report.success).toBe(true);
    expect(state.completed).toEqual(['explorer1']);
  });

  it('settles only once', () => {
    const { state, report, money } = launched();
    settleAnomaly(state, report, 1, 'played');
    settleAnomaly(state, report, 0, 'played');
    expect(report.anomaly?.score).toBe(1);
    expect(state.money).toBe(money + CONTRACTS.explorer1.reward);
  });

  it('costs no money on a failed Mission, only Data', () => {
    const { state, report, money } = launched(newSiteState(), swap('largeBattery', 'smallBattery'));
    expect(report.success).toBe(false);
    settleAnomaly(state, report, 0, 'played');
    expect(report.anomaly!.lostDays).toBeGreaterThan(0);
    expect(report.anomaly!.cut).toBe(0);
    expect(state.money).toBe(money);
  });

  it('takes the lost days out of the Data sent home', () => {
    const flight = fly(plan(), 40, 365);
    const after = withContactLost(flight, { day: 5, lostDays: 3 });
    const perDay = flight.dataSentKb[1]!;
    expect(after.dataSentKb.slice(0, 6)).toEqual(flight.dataSentKb.slice(0, 6));
    expect(after.dataSentKb[8]).toBe(flight.dataSentKb[5]);
    expect(after.dataSentKb[30]).toBeCloseTo(flight.dataSentKb[30]! - 3 * perDay);
    expect(withContactLost(flight, { day: 5, lostDays: 0 })).toBe(flight);
  });
});

describe('Point the antenna: first time, skipping and the best score', () => {
  it("can't be skipped the first time; after playing, a skip takes the best score", () => {
    const { state, report } = launched();
    expect(skipAnomaly(state, report)).toBe(false);
    settleAnomaly(state, report, 0.8, 'played');
    expect(state.anomalyBest.antenna).toBe(0.8);

    const next: MissionReport = { ...report, reward: 1000, anomaly: { ...report.anomaly!, first: false, score: null, answer: null, cut: 0 } };
    state.reports.push(next);
    expect(skipAnomaly(state, next)).toBe(true);
    expect(next.anomaly).toMatchObject({ score: 0.8, answer: 'skipped' });
  });

  it('keeps the best played score, not the latest', () => {
    const state = newSiteState();
    const report = (): MissionReport => ({ ...launched().report, anomaly: { ...launched().report.anomaly!, score: null } });
    settleAnomaly(state, report(), 0.9, 'played');
    settleAnomaly(state, report(), 0.4, 'played');
    expect(state.anomalyBest.antenna).toBe(0.9);
  });

  it('settles an Anomaly left open when the game closed, without counting it as played', () => {
    const { state, report, money } = launched();
    settleUnanswered(state);
    expect(report.anomaly).toMatchObject({ score: ANOMALY_UNANSWERED_SCORE, answer: 'unanswered' });
    expect(state.money).toBe(money + report.reward);
    expect(isMandatory(state, 'antenna')).toBe(true);
  });
});

const TIROS: OptionId[] = ['mediumBus', 'solarCells', 'largeBattery', 'simpleAntenna', 'spin', 'tvCamera'];
const tirosPlan = (ids: OptionId[] = TIROS, power = 1) => ({
  contract: 'tiros1' as const,
  design: design(ids),
  vehicle: 'thorAble' as const,
  tech: [],
  marks: { power },
});
const played = () => ({ ...newSiteState(), anomalyBest: { antenna: 0.7, panel: 0.7, eclipse: 0.7 } });
/** Every Anomaly met over many Launch days, by kind. */
function kindsOver(state: SiteState, p: ReturnType<typeof tirosPlan>, days = 600) {
  const flight = fly(p, 40, null);
  const met = Array.from({ length: days }, (_, d) => rollAnomaly(state, 'K7QXM2', p, flight, d));
  const share = (kind: string) => met.filter((a) => a?.kind === kind).length / days;
  return { met, share };
}

describe('Stuck solar panel and Survive the eclipse: when they happen', () => {
  it('Stuck solar panel is likelier with cheap Mk 1 Solar Cells', () => {
    expect(panelChance(1)).toBe(PANEL_CHANCE[1]);
    expect(panelChance(1)).toBeGreaterThan(panelChance(2));
    expect(panelChance(2)).toBeGreaterThan(panelChance(3));
  });

  it('Survive the eclipse is likelier with a thin Power margin and a Small Battery', () => {
    expect(eclipseChance(78, 78, 'largeBattery')).toBeCloseTo(ECLIPSE_CHANCE.high);
    expect(eclipseChance(120, 78, 'largeBattery')).toBeGreaterThan(eclipseChance(150, 78, 'largeBattery'));
    expect(eclipseChance(null, 78, 'largeBattery')).toBeCloseTo(ECLIPSE_CHANCE.low);
    expect(eclipseChance(1000, 78, 'largeBattery')).toBeCloseTo(ECLIPSE_CHANCE.low);
    expect(eclipseChance(null, 78, 'smallBattery')).toBeCloseTo(ECLIPSE_CHANCE.low + ECLIPSE_CHANCE.smallBattery);
  });

  it('only a Spacecraft with Solar Cells meets them', () => {
    const p = plan();
    const flight = fly(p, 40, 365);
    const kinds = Array.from({ length: 300 }, (_, d) => rollAnomaly(played(), 'K7QXM2', p, flight, d)?.kind);
    expect(kinds.every((k) => k === undefined || k === 'antenna')).toBe(true);
    const { met } = kindsOver(played(), tirosPlan());
    expect(met.some((a) => a?.kind === 'panel')).toBe(true);
    expect(met.some((a) => a?.kind === 'eclipse')).toBe(true);
  });

  it('meets Stuck solar panel more often with Mk 1 cells than Mk 3', () => {
    expect(kindsOver(played(), tirosPlan(TIROS, 1)).share('panel')).toBeGreaterThan(kindsOver(played(), tirosPlan(TIROS, 3)).share('panel'));
  });

  it('meets at most one per flight, a kind never played first', () => {
    // The antenna is likelier for TIROS-1, but a new kind that struck comes before it.
    const fresh = kindsOver({ ...newSiteState(), anomalyBest: { antenna: 0.7 } }, tirosPlan());
    const old = kindsOver(played(), tirosPlan());
    expect(fresh.share('panel')).toBeGreaterThan(old.share('panel'));
    expect(fresh.share('antenna')).toBeLessThan(old.share('antenna'));
    expect(fresh.met.every((a) => !a || a.kind === 'antenna' || a.first)).toBe(true);
    expect(old.met.every((a) => !a || !a.first)).toBe(true);
  });

  it("keeps Point the antenna as the Company's first Anomaly, and the same days it always had", () => {
    const state = newSiteState();
    const p = tirosPlan();
    const flight = fly(p, 40, null);
    for (let d = 0; d < 30; d++) expect(rollAnomaly(state, 'K7QXM2', p, flight, d)).toMatchObject({ kind: 'antenna', first: true });
    // A design without Solar Cells rolls exactly as before ticket 12.
    const e = plan();
    const ef = fly(e, 40, 365);
    const withPlayed = rollAnomaly({ ...newSiteState(), anomalyBest: { antenna: 0.5 } }, 'K7QXM2', e, ef, 3);
    const withAll = rollAnomaly(played(), 'K7QXM2', e, ef, 3);
    expect(withAll?.day).toBe(withPlayed?.day);
  });

  it('keeps the design numbers the Mission Report explains it with', () => {
    const { met } = kindsOver(played(), tirosPlan(['mediumBus', 'solarCells', 'smallBattery', 'simpleAntenna', 'spin', 'tvCamera'], 2));
    const panel = met.find((a) => a?.kind === 'panel')!;
    expect(panel.solarMark).toBe(2);
    expect(panel.chance).toBe(PANEL_CHANCE[2]);
    const eclipse = met.find((a) => a?.kind === 'eclipse')!;
    expect(eclipse.battery).toBe('smallBattery');
    expect(eclipse.chance).toBeCloseTo(eclipseChance(eclipse.lastsDays ?? null, eclipse.missionDays, 'smallBattery'));
  });

  it('follows the same skip rules: the first of each kind must be played', () => {
    const state: SiteState = { ...newSiteState(), anomalyBest: { antenna: 0.7 } };
    expect(isMandatory(state, 'panel')).toBe(true);
    expect(isMandatory(state, 'eclipse')).toBe(true);
    const report = { ...launched().report, anomaly: { ...launched().report.anomaly!, kind: 'panel' as const, first: true, score: null, answer: null } };
    expect(skipAnomaly(state, report)).toBe(false);
    settleAnomaly(state, report, 0.6, 'played');
    expect(state.anomalyBest.panel).toBe(0.6);
    expect(isMandatory(state, 'panel')).toBe(false);
  });
});
