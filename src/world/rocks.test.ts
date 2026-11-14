import { describe, expect, it } from 'vitest';
import { DEPOSIT_COLOUR } from './ground';
import { oreStone } from './rocks';

const lum = (c: { r: number; g: number; b: number }) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;

describe('ore stone colours', () => {
  const al = oreStone(DEPOSIT_COLOUR.aluminium);
  const cu = oreStone(DEPOSIT_COLOUR.copper);
  const si = oreStone(DEPOSIT_COLOUR.silicon);

  it('keeps each ore its own hue, as in the HUD', () => {
    expect(cu.r).toBeGreaterThan(cu.g);
    expect(cu.g).toBeGreaterThan(cu.b);
    expect(si.b).toBeGreaterThan(si.r);
    expect(al.b).toBeGreaterThanOrEqual(al.r);
    expect(lum(al)).toBeGreaterThan(lum(cu));
  });

  it('is muted: stone, not paint', () => {
    for (const c of [al, cu, si]) {
      expect(lum(c)).toBeLessThan(0.4);
      expect(Math.max(c.r, c.g, c.b) / Math.min(c.r, c.g, c.b)).toBeLessThan(3);
    }
  });
});
