import { describe, expect, it } from 'vitest';
import { BERM_GRADE, type DockSquare, bermHeight, bermReach, dockOutline, withBerm } from './truckModel';

const dock: DockSquare = { x: 10, z: -4, half: 1.5, top: 2 };

describe('the fill round the Shipping dock', () => {
  it('is level with the slab at its edge and falls away at the grade', () => {
    expect(bermHeight(dock, 10, -4)).toBe(2);
    expect(bermHeight(dock, 11.5, -4)).toBe(2);
    expect(bermHeight(dock, 12.5, -4)).toBeCloseTo(2 - BERM_GRADE);
    // Round the corners: by the straight distance from the corner.
    expect(bermHeight(dock, 11.5 + 0.6, -4 + 1.5 + 0.8)).toBeCloseTo(2 - BERM_GRADE * 1);
  });

  it('never lowers the land', () => {
    const ground = withBerm(dock, () => 5);
    expect(ground(10, -4)).toBe(5);
    expect(ground(20, 0)).toBe(5);
    const low = withBerm(dock, () => 0);
    expect(low(12.5, -4)).toBeCloseTo(2 - BERM_GRADE);
    expect(low(30, -4)).toBe(0);
  });

  it('reaches out until it meets the land', () => {
    const flat = () => 1.4;
    const reach = bermReach(dock, flat, 11.5, -4, 1, 0);
    expect(reach).toBeCloseTo(0.6 / BERM_GRADE, 1);
    // Land as high as the slab: no fill at all.
    expect(bermReach(dock, () => 2, 11.5, -4, 1, 0)).toBe(0);
    // Land falling away faster than the fill: it stops at its widest.
    expect(bermReach(dock, (x) => 1.9 - (x - 11.5) * 2, 11.5, -4, 1, 0)).toBe(3);
  });

  it('has an outline that goes all the way round with ways out of unit length', () => {
    const outline = dockOutline(1.5);
    for (const p of outline) {
      expect(Math.hypot(p.ux, p.uz)).toBeCloseTo(1);
      expect(Math.max(Math.abs(p.x), Math.abs(p.z))).toBeCloseTo(1.5);
      // Each way out points away from the slab.
      expect(p.x * p.ux + p.z * p.uz).toBeGreaterThan(0);
    }
    const sides = new Set(outline.map((p) => `${Math.sign(Math.round(p.ux))},${Math.sign(Math.round(p.uz))}`));
    expect(sides).toEqual(new Set(['1,0', '0,1', '-1,0', '0,-1', '1,1', '-1,1', '-1,-1', '1,-1']));
  });
});
