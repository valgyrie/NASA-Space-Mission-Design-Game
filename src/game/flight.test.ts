import { describe, expect, it } from 'vitest';
import { PART_SPREAD, TEST_RUNS } from './balance';
import { AS_LABELLED, type FlightPlan, fly, percent, realFlight, testRun } from './flight';
import { type Design, type OptionId, choose, emptyDesign, powerOf } from './spacecraft';

const EXPLORER: OptionId[] = ['smallBus', 'batteriesOnly', 'largeBattery', 'simpleAntenna', 'spin', 'radiationDetector'];
const swap = (from: OptionId, to: OptionId) => EXPLORER.map((id) => (id === from ? to : id));

function design(ids: OptionId[]): Design {
  const d = emptyDesign();
  for (const id of ids) choose(d, id);
  return d;
}

const plan = (ids: OptionId[] = EXPLORER): FlightPlan => ({ contract: 'explorer1', design: design(ids), vehicle: 'juno1' });
const SEED = 'K7QXM2';

describe('flight', () => {
  it('flies the Explorer 1 design for all 30 days and sends every kilobyte home', () => {
    const f = fly(plan(), 40, 365);
    expect(f.success).toBe(true);
    expect(f.powerOutDay).toBeNull();
    expect(f.batteryWh).toHaveLength(31);
    expect(f.batteryWh[0]).toBe(720);
    expect(f.batteryWh[30]).toBeGreaterThan(0);
    expect(f.dataSentKb[30]).toBeCloseTo(f.dataGoalKb);
    expect(f.dataGoalKb).toBe(20 * 30);
  });

  it('runs a Small Battery flat halfway, and the Data stops with it', () => {
    const f = fly(plan(swap('largeBattery', 'smallBattery')), 40, 365);
    expect(f.success).toBe(false);
    expect(f.powerOutDay).toBeCloseTo(powerOf(design(swap('largeBattery', 'smallBattery'))).lastsDays);
    expect(f.powerOutDay).toBeLessThan(17);
    expect(f.batteryWh[17]).toBe(0);
    expect(f.dataSentKb[30]).toBeCloseTo(20 * f.powerOutDay!);
    expect(f.findings.filter((x) => !x.ok).map((x) => x.kind)).toEqual(['power']);
  });

  it('misses the deadline when the Mission would end after it', () => {
    const f = fly(plan(), 340, 365);
    expect(f.findings.find((x) => x.kind === 'time')?.ok).toBe(false);
  });

  it('keeps a 10% Power margin safe even with every Part at its worst', () => {
    const worst = { batteryWh: 1 - PART_SPREAD.batteryWh, powerUseW: 1 + PART_SPREAD.powerUseW, sendPerDay: 1 - PART_SPREAD.sendPerDay };
    expect(fly(plan(), 40, 365, worst).success).toBe(true);
  });

  it('fails a design whose battery holds much less than labelled', () => {
    const weak = { ...AS_LABELLED, batteryWh: 0.85 };
    expect(fly(plan(), 40, 365, weak).findings.find((x) => x.kind === 'power')?.ok).toBe(false);
  });

  it('gives the same real flight for the same Seed and Launch day', () => {
    expect(realFlight(SEED, plan(), 40, 365)).toEqual(realFlight(SEED, plan(), 40, 365));
    expect(realFlight(SEED, plan(), 40, 365).success).toBe(true);
  });
});

describe('Test Run', () => {
  it('estimates 100% for the Explorer 1 design and 0% with a Small Battery', () => {
    const good = testRun(SEED, plan(), 40, 365);
    expect(good.runs).toBe(TEST_RUNS);
    expect(good.successPercent).toBe(100);
    expect(good.missed.power).toBe(0);
    const weak = testRun(SEED, plan(swap('largeBattery', 'smallBattery')), 40, 365);
    expect(weak.successPercent).toBe(0);
    expect(weak.missed.power).toBe(TEST_RUNS);
  });

  it('gives the same result for the same design and Seed', () => {
    const wide = { batteryWh: 0.2, powerUseW: 0.2, sendPerDay: 0.2 };
    const a = testRun(SEED, plan(), 40, 365, { share: wide });
    expect(testRun(SEED, plan(), 40, 365, { share: wide })).toEqual(a);
    expect(testRun('ZZZZZZ', plan(), 40, 365, { share: wide }).successes).not.toBe(a.successes);
  });

  it('finds a thin margin: with Parts far off their labels some runs fail', () => {
    const wide = { batteryWh: 0.2, powerUseW: 0.2, sendPerDay: 0.2 };
    const run = testRun(SEED, plan(), 40, 365, { share: wide });
    expect(run.successPercent).toBeGreaterThan(0);
    expect(run.successPercent).toBeLessThan(100);
    expect(run.missed.power).toBe(run.runs - run.successes);
    expect(run.batteryLowWh[0]).toBeLessThan(720);
    expect(run.batteryHighWh[0]).toBeGreaterThan(720);
    // The run as labelled still lasts: the graphs show what the design is meant to do.
    expect(run.asLabelled.success).toBe(true);
  });

  it('rounds to whole percent but never claims 0% or 100% unless every run agreed', () => {
    expect(percent(199, 200)).toBe(99);
    expect(percent(1, 200)).toBe(1);
    expect(percent(200, 200)).toBe(100);
    expect(percent(0, 200)).toBe(0);
    expect(percent(150, 200)).toBe(75);
  });
});
