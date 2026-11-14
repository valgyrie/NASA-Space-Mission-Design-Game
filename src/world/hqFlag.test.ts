import { describe, expect, it } from 'vitest';
import { buildHQ, placeHqExtras } from './factoryMesh';
import { at } from './buildingModels';

describe('HQ flag and logo on the realistic model', () => {
  it('moves the wall logo onto its board and leaves both flag logos on the flag', () => {
    const g = buildHQ();
    const flag = g.children.find((c) => c.name === 'flag')!;
    const flagLogos = flag.children.filter((c) => c.name === 'company-logo');
    const before = flagLogos.map((c) => c.position.clone());
    placeHqExtras(g);
    expect(flag.position.distanceTo(at(10.6, 13.0, 9.5))).toBeLessThan(1e-9);
    const wall = g.children.find((c) => c.name === 'company-logo')!;
    expect(wall.position.distanceTo(at(-4.0, 10.0, 4.64))).toBeLessThan(1e-9);
    expect(flagLogos).toHaveLength(2);
    flagLogos.forEach((c, i) => expect(c.position.equals(before[i]!)).toBe(true));
  });
});
