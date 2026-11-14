import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { oreTint } from './buildingModels';
import { DEPOSIT_COLOUR } from './ground';

const hsl = (hex: number) => {
  const out = { h: 0, s: 0, l: 0 };
  new THREE.Color(hex).getHSL(out);
  return out;
};

describe('oreTint', () => {
  it('keeps each Deposit hue but mutes and darkens it like crushed rock', () => {
    for (const hex of Object.values(DEPOSIT_COLOUR)) {
      const before = hsl(hex);
      const after = hsl(oreTint(hex));
      expect(after.s).toBeLessThan(before.s * 0.5 + 0.01);
      expect(after.l).toBeLessThanOrEqual(0.5 + 1e-6);
      expect(after.l).toBeGreaterThan(0.25);
      if (before.s > 0.2) expect(Math.abs(after.h - before.h)).toBeLessThan(0.02);
    }
  });

  it('keeps the three ores apart', () => {
    const tints = Object.values(DEPOSIT_COLOUR).map(oreTint);
    expect(new Set(tints).size).toBe(tints.length);
  });
});
