import { describe, expect, it } from 'vitest';
import { generateSite, landOf, tileAt } from '../site/site';
import { BANK_SLOPE, PAD_GRADE, PAD_SKIRT_MAX, STEP, WATER_Y, bank, buildGround, padFor, padGrade, shoreOf, skirtWidth } from './ground';

const site = generateSite('ground-test', { dryness: 0.3, water: 'coast', relief: 0.5 });
const ground = buildGround(site, landOf(site));
const o = -site.size / 2;

describe('ground', () => {
  it('keeps land above the water and water tiles below it, at tile centres', () => {
    for (let z = 0; z < site.size; z += 3)
      for (let x = 0; x < site.size; x += 3) {
        const h = ground.heightAt(x + 0.5 + o, z + 0.5 + o);
        if (tileAt(site, x, z)!.level < 0) expect(h).toBeLessThan(WATER_Y);
        else expect(h).toBeGreaterThan(WATER_Y);
      }
  });

  it('is continuous', () => {
    for (let x = -40; x < 40; x += 0.37) {
      const a = ground.heightAt(x, 3.1);
      const b = ground.heightAt(x + 0.001, 3.1);
      expect(Math.abs(a - b)).toBeLessThan(0.01);
    }
  });

  it('is flat at the pad height under a building', () => {
    const g = buildGround(site, landOf(site));
    const pad = padFor(site, 20, 20);
    g.addPad(pad);
    expect(pad.y % STEP).toBe(0);
    for (let x = pad.x0; x <= pad.x1; x += 0.25) for (let z = pad.z0; z <= pad.z1; z += 0.25) expect(g.heightAt(x, z)).toBeCloseTo(pad.y);
  });
});

describe('ground: earthworks and banks', () => {
  it('grades a pad skirt no steeper than PAD_GRADE when there is room', () => {
    for (const rise of [0.5, 1, 2, 3]) {
      const w = skirtWidth(rise);
      if (w >= PAD_SKIRT_MAX) continue;
      let steepest = 0;
      for (let d = 0; d < w; d += 0.01) steepest = Math.max(steepest, (rise * (padGrade(d + 0.01, w) - padGrade(d, w))) / 0.01);
      expect(steepest).toBeLessThanOrEqual(PAD_GRADE + 1e-3);
    }
  });

  it('slopes evenly between two pads at different heights, never below both', () => {
    const g = buildGround(site, landOf(site));
    const a = { x0: 0, x1: 3, z0: 0, z1: 3, y: 1 };
    const b = { x0: 4.5, x1: 7.5, z0: 0, z1: 3, y: 2 };
    g.addPad(a);
    g.addPad(b);
    let last = -Infinity;
    for (let x = 3; x <= 4.5; x += 0.5) {
      const h = g.heightAt(x, 1.5);
      expect(h).toBeGreaterThanOrEqual(1 - 1e-6);
      expect(h).toBeLessThanOrEqual(2 + 1e-6);
      expect(h).toBeGreaterThanOrEqual(last - 1e-6);
      last = h;
    }
    expect(g.onPad(3.5, 1.5)).toBe(true);
    expect(g.onPad(20, 20)).toBe(false);
  });

  it('rounds the bank over instead of breaking at an edge', () => {
    const top = WATER_Y + 0.12 + BANK_SLOPE * 2.5;
    expect(bank(top - 1, 3, 3)).toBeCloseTo(top - 1);
    expect(bank(top + 1, 3, 3)).toBeCloseTo(top);
    // Continuous across the soft corner.
    for (let h = top - 0.5; h < top + 0.5; h += 0.01) expect(Math.abs(bank(h + 0.001, 3, 3) - bank(h, 3, 3))).toBeLessThan(0.002);
    expect(bank(-2, -1, 0)).toBe(-2);
  });

  it('marks the shore for beaches only near water', () => {
    expect(shoreOf(0)).toBe(1);
    expect(shoreOf(5)).toBe(0);
  });
});

describe('ground: scenery hooks', () => {
  it('describes a point of the ground', () => {
    const s = ground.surfaceAt(0.3, 0.7);
    expect(s.height).toBeCloseTo(ground.heightAt(0.3, 0.7));
    expect(s.slope).toBeGreaterThanOrEqual(0);
    expect(s.slope).toBeLessThan(1);
    expect(Math.hypot(s.normal.x, s.normal.y, s.normal.z)).toBeCloseTo(1);
    expect(s.onSite).toBe(true);
    expect(s.terrain).toBe(tileAt(site, Math.floor(0.3 + site.size / 2), Math.floor(0.7 + site.size / 2))!.terrain);
  });

  it('finds the Deposits of the Site', () => {
    const i = site.tiles.findIndex((t) => t.deposit);
    const x = (i % site.size) + 0.5 + o;
    const z = Math.floor(i / site.size) + 0.5 + o;
    expect(ground.depositAt(x, z)).toBe(site.tiles[i]!.deposit);
    expect(ground.depositAt(1000, 1000)).toBeNull();
  });
});
