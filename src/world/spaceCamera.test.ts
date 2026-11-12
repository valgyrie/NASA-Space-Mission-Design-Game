import { describe, expect, it } from 'vitest';
import { outsideSphere } from './spaceCamera';

describe('Space view camera', () => {
  it('leaves a camera outside Earth where it is', () => {
    expect(outsideSphere({ x: 40, y: 0, z: 0 }, 31.5)).toEqual({ x: 40, y: 0, z: 0 });
  });

  it('pushes a camera that went inside Earth straight back out to the edge', () => {
    const p = outsideSphere({ x: 3, y: 4, z: 0 }, 31.5);
    expect(Math.hypot(p.x, p.y, p.z)).toBeCloseTo(31.5);
    expect(p.x / p.y).toBeCloseTo(3 / 4);
    expect(outsideSphere({ x: 0, y: 0, z: 0 }, 31.5)).toEqual({ x: 0, y: 31.5, z: 0 });
  });
});
