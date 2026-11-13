import { readFileSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { REFERENCE_PATH_DATA, REFERENCE_PATH_SOURCE, type ReferencePathKey } from './referencePaths';
import {
  COMPANION,
  REFERENCE_TRAJECTORY_IDS,
  faceOn,
  radiusRange,
  referenceBurns,
  referenceMinutes,
  referencePoints,
  referencePositionAt,
} from './referenceTrajectory';

/** Reads a source file as text (never runs it), the same way the bake script does. */
function source(file: string): { minutes: number; x: number; y: number; z: number }[] {
  let text = readFileSync(`docs/research/sources/mission-viz/${file}`, 'utf8').replace(/^﻿/, '');
  if (file.endsWith('.js')) text = [...text.matchAll(/'((?:[^'\\]|\\.)*)'/g)].map((m) => m[1]).join('');
  const raw = JSON.parse(text).coordinates as { Date: string; Time: string; X: number; Y: number; Z: number }[];
  const when = (p: { Date: string; Time: string }) => Date.parse(`${p.Date.trim()} ${p.Time} UTC`);
  return raw.map((p) => ({ minutes: (when(p) - when(raw[0])) / 60_000, x: p.X, y: p.Y, z: p.Z }));
}

const KEYS = Object.keys(REFERENCE_PATH_DATA) as ReferencePathKey[];

describe('Reference Trajectories (NASA Mission Viz, GMAT)', () => {
  it('records where the paths came from', () => {
    expect(REFERENCE_PATH_SOURCE).toEqual({ repo: 'https://github.com/nasa/mission-viz', folder: 'X3Dom/', commit: 'c6f2270', date: '2022-05-16' });
  });

  it('stays small', () => {
    expect(statSync('src/world/referencePaths.ts').size).toBeLessThan(30_000);
  });

  it.each(KEYS)('%s: thinned, with the first and last points of the source', (key) => {
    const raw = source(REFERENCE_PATH_DATA[key].file);
    const kept = referencePoints(key);
    expect(REFERENCE_PATH_DATA[key].sourcePoints).toBe(raw.length);
    expect(kept.length).toBeGreaterThan(20);
    expect(kept.length).toBeLessThanOrEqual(raw.length);
    for (const [a, b] of [
      [kept[0], raw[0]],
      [kept[kept.length - 1], raw[raw.length - 1]],
    ]) {
      expect(Math.abs(a.minutes - b.minutes)).toBeLessThan(0.01);
      expect(Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)).toBeLessThan(1);
    }
  });

  it.each(KEYS)('%s: every source point stays close to the thinned path at its own time', (key) => {
    for (const p of source(REFERENCE_PATH_DATA[key].file)) {
      const q = referencePositionAt(key, p.minutes);
      const r = Math.hypot(p.x, p.y, p.z);
      expect(Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z) / r).toBeLessThan(0.0035);
    }
  });

  it('keeps the sizes from the research note', () => {
    expect(source('missionfile.js')).toHaveLength(150);
    expect(source('MolniyaOrbit.json')).toHaveLength(155);
    expect(source('LunarTransferTrajectory.js')).toHaveLength(1_269);
    expect(source('LunarOrbit.js')).toHaveLength(1_269);
    const geo = radiusRange('geoTransfer');
    expect(geo.min).toBeGreaterThan(7_000);
    expect(geo.max).toBeCloseTo(42_165, -1);
    const ellipse = radiusRange('longEllipse');
    expect(ellipse.min).toBeGreaterThan(8_500);
    expect(ellipse.max).toBeGreaterThan(158_000);
    const moon = radiusRange('moon');
    expect(moon.min).toBeGreaterThan(356_000);
    expect(moon.max).toBeLessThan(407_000);
    expect(referenceMinutes('lunarTransfer') / 1_440).toBeCloseTo(21.44, 1);
    expect(referenceMinutes('geoTransfer') / 1_440).toBeCloseTo(1.27, 2);
  });

  it('finds the two burns of the transfer to geostationary orbit: low, then at geostationary height', () => {
    const [first, second] = referenceBurns('geoTransfer');
    expect(referenceBurns('geoTransfer')).toHaveLength(2);
    expect(Math.hypot(first.x, first.y, first.z)).toBeLessThan(7_100);
    expect(Math.hypot(second.x, second.y, second.z)).toBeCloseTo(42_165, -1);
    // About five hours apart: half a lap of the transfer orbit.
    expect((second.minutes - first.minutes) / 60).toBeCloseTo(5.3, 0);
  });

  it('the Moon shares the Earth → Moon clock and ends near the Spacecraft', () => {
    expect(COMPANION.lunarTransfer).toBe('moon');
    expect(REFERENCE_PATH_DATA.moon.start).toBe(REFERENCE_PATH_DATA.lunarTransfer.start);
    const end = referenceMinutes('lunarTransfer');
    const ship = referencePositionAt('lunarTransfer', end);
    const moon = referencePositionAt('moon', end);
    expect(Math.hypot(ship.x - moon.x, ship.y - moon.y, ship.z - moon.z)).toBeLessThan(10_000);
  });

  it('Earth → Moon: about six days to reach the Moon, then circles it about 9,200 km from its centre', () => {
    const apart = (m: number) => {
      const ship = referencePositionAt('lunarTransfer', m);
      const moon = referencePositionAt('moon', m);
      return Math.hypot(ship.x - moon.x, ship.y - moon.y, ship.z - moon.z);
    };
    expect(apart(6 * 1_440)).toBeGreaterThan(10_000);
    for (let day = 6.6; day < 21.4; day += 0.2) expect(apart(day * 1_440)).toBeLessThan(10_500);
  });

  it('holds at the ends and lists only the player paths', () => {
    expect(referencePositionAt('geoTransfer', -5)).toEqual(referencePoints('geoTransfer')[0]);
    expect(REFERENCE_TRAJECTORY_IDS).toEqual(['geoTransfer', 'longEllipse', 'lunarTransfer']);
  });

  it('draws the transfer face-on without changing distances', () => {
    const flat = faceOn('geoTransfer');
    referencePoints('geoTransfer').forEach((p, i) => {
      expect(Math.hypot(flat[i].x, flat[i].y)).toBeCloseTo(Math.hypot(p.x, p.y, p.z), -1);
    });
  });
});
