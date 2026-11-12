import { contractById } from './contracts';
import { contractNeeds } from './spacecraft';
import { describe, expect, it } from 'vitest';
import { evaluateWeekly, previousWeek, validWeek, weeklyId, weeklyRules, weeklyState, weeklyTestRun } from './weekly';
import { emptyDesign, type Design } from './spacecraft';
import { readSharedSeed, shareSeed } from '../site/shareSeed';
import { JPL, siteClimateFor } from './places';
import { generateSite } from '../site/site';

const week = '2026-11-09';
function design(): Design {
  return { bus: 'mediumBus', power: 'solarCells', battery: 'largeBattery', comms: 'simpleAntenna', pointing: 'spin', propulsion: 'noEngine', payload: contractNeeds(contractById(weeklyRules(week).contract)).payload };
}

describe('Weekly Challenge and shared Seeds', () => {
  it('rolls weeks at Monday midnight UTC across years and rejects malformed IDs', () => {
    expect(weeklyId(new Date('2026-11-15T23:59:59Z'))).toBe(week);
    expect(weeklyId(new Date('2026-11-16T00:00:00Z'))).toBe('2026-11-16');
    expect(weeklyId(new Date('2027-01-01T12:00:00Z'))).toBe('2026-12-28');
    expect(previousWeek(week)).toBe('2026-11-02');
    for (const bad of ['2026-11-10', '2026-02-30', '', null, 'abc']) expect(validWeek(bad)).toBe(false);
  });

  it('recreates the same budget, Parts, flight and weighted score without touching personal progress', () => {
    const picked = design();
    const a = evaluateWeekly(week, picked)!;
    expect(a).not.toBeNull();
    expect(a.success).toBe(true);
    expect(evaluateWeekly(week, picked)).toEqual(a);
    expect(a.score).toBe(Math.round((a.reliability * 0.4 + a.science * 0.3 + a.money * 0.2 + a.mass * 0.1) * 10000));
    expect(a.score).toBeGreaterThan(0);
    expect(a.score).toBeLessThanOrEqual(10000);
    expect(weeklyState(week)).toEqual(weeklyState(week));
    expect(picked).toEqual(design());
    expect(weeklyState(week).money).toBe(600000);
    const time = (d: Design) => weeklyTestRun(week, d).asLabelled.findings.find(f => f.kind === 'time');
    expect(time(picked)).toEqual(time({ ...picked, bus: 'largeBus' }));
  });

  it('requires the objective, rejects unavailable Parts, wrong slots and a Bus that cannot carry the design', () => {
    const picked = design();
    const wrong = { ...picked, payload: picked.payload === 'tvCamera' ? 'radiationDetector' : 'tvCamera' };
    expect(evaluateWeekly(week, wrong)?.score).toBe(0);
    expect(evaluateWeekly(week, wrong)?.success).toBe(false);
    for (const bad of [null, {}, emptyDesign(), { ...picked, bus: 'simpleAntenna' }, { ...picked, propulsion: 'mainEngine' }, { ...picked, extra: 1 }]) expect(evaluateWeekly(week, bad)).toBeNull();
    expect(evaluateWeekly(week, { ...picked, bus: 'smallBus' })).toBeNull();
  });

  it('shares the location and legacy climate as well as the Seed and still accepts old raw Seeds', () => {
    for (const place of [JPL, { lat: -33.86, lon: 151.21, start: 'anywhere' as const }, { ...JPL, start: 'legacy' as const }]) {
      const code = shareSeed('K7QXM2', place);
      const loaded = readSharedSeed(code)!;
      expect(loaded).toEqual({ seed: 'K7QXM2', place });
      expect(generateSite(loaded.seed, siteClimateFor(loaded.place!))).toEqual(generateSite('K7QXM2', siteClimateFor(place)));
    }
    expect(readSharedSeed('k7qx-m2')).toEqual({ seed: 'K7QXM2' });
    for (const bad of ['LEAP1:K7QXM2:NaN:1:anywhere', 'LEAP1:K7QXM2:91:2:anywhere', 'LEAP1:K7QXM2:0:0:historic', 'LEAP1:K7QXM2:34:12:unknown', 'LEAP1:K7QXM2::2:legacy', 'LEAP1:K7QXM2:1:2:legacy:extra']) expect(readSharedSeed(bad)).toBeNull();
  });
});
