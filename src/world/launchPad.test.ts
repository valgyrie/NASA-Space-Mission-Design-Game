import { describe, expect, it } from 'vitest';
import { armReach, holdDown, padKind } from './launchPad';
import { partsByRole } from './launchModels';

describe('padKind', () => {
  it('stands Falcon 9 on the modern pad and the 1950s–60s rockets on the classic one', () => {
    expect(padKind('falcon9')).toBe('modern');
    for (const v of ['juno1', 'thorAble', 'thorDelta', 'deltaD'] as const) expect(padKind(v)).toBe('classic');
  });
});

describe('holdDown', () => {
  it('keeps the ring clear of the engine bells and under the skirt', () => {
    // Bell exit radii (rocketMesh.ts): Juno I 0.49, Thor 0.55, Falcon 9's outer engines reach 0.63.
    expect(holdDown('juno1').inner).toBeGreaterThan(0.49);
    expect(holdDown('thorDelta').inner).toBeGreaterThan(0.55);
    expect(holdDown('falcon9').inner).toBeGreaterThan(0.63);
    for (const v of ['juno1', 'thorAble', 'thorDelta', 'deltaD', 'falcon9'] as const) {
      const r = holdDown(v);
      expect(r.outer).toBeGreaterThan(r.inner);
    }
  });

  it("runs Delta D's arms between its three boosters (at 30°, 150° and 270°)", () => {
    const boosters = [30, 150, 270].map((d) => (d * Math.PI) / 180);
    for (const a of holdDown('deltaD').arms) {
      for (const b of boosters) expect(Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)))).toBeGreaterThan(0.9);
    }
  });
});

describe('armReach', () => {
  it('reaches the nearer side of the rectangle', () => {
    expect(armReach(Math.PI / 2, 2, 3)).toBeCloseTo(2);
    expect(armReach(0, 2, 3)).toBeCloseTo(3);
    expect(armReach(Math.PI / 4, 2, 3)).toBeCloseTo(2 * Math.SQRT2);
  });
});

describe('partsByRole', () => {
  it('finds the three parts of launch.glb by their roles, in any order', () => {
    const nodes = [{ userData: { role: 'modern' } }, { userData: {} }, { userData: { role: 'common' } }, { userData: { role: 'classic' } }];
    expect(partsByRole(nodes)).toEqual({ modern: 0, common: 2, classic: 3 });
  });

  it('is null when a part is missing', () => {
    expect(partsByRole([{ userData: { role: 'common' } }, { userData: { role: 'classic' } }])).toBeNull();
  });
});
