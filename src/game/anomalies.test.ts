import { describe, expect, it } from 'vitest';
import { ANOMALY_MAX_DATA_LOSS, ANOMALY_UNANSWERED_SCORE, ANTENNA_CHANCE } from './balance';
import {
  type Anomaly,
  antennaChance,
  isMandatory,
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

const plan = (ids: OptionId[] = EXPLORER) => ({ contract: 'explorer1' as const, design: design(ids), vehicle: 'juno1' as const });

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
