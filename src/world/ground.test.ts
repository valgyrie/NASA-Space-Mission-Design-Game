import { describe, expect, it } from 'vitest';
import { generateSite, landOf, tileAt } from '../site/site';
import { STEP, WATER_Y, buildGround, padFor } from './ground';

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
