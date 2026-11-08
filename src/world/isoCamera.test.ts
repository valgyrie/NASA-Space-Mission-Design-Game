import { describe, expect, it } from 'vitest';
import { ISO_ELEVATION, ISO_POLAR, clampToGround, frustumFor, isoOffset } from './isoCamera';

describe('isometric camera', () => {
  it('tilts at the true isometric angle', () => {
    expect((ISO_ELEVATION * 180) / Math.PI).toBeCloseTo(35.264, 3);
    expect(ISO_POLAR + ISO_ELEVATION).toBeCloseTo(Math.PI / 2);
  });

  it('keeps the same vertical view on wide and tall screens', () => {
    const wide = frustumFor(16 / 9, 40);
    const tall = frustumFor(9 / 16, 40);
    expect(wide.top - wide.bottom).toBe(40);
    expect(tall.top - tall.bottom).toBe(40);
    expect(wide.right - wide.left).toBeCloseTo(40 * (16 / 9));
  });

  it('places the camera at the given distance and tilt for any turn', () => {
    for (const azimuth of [0, Math.PI / 4, 2, -3]) {
      const o = isoOffset(azimuth, 100);
      expect(Math.hypot(o.x, o.y, o.z)).toBeCloseTo(100);
      expect(Math.asin(o.y / 100)).toBeCloseTo(ISO_ELEVATION);
    }
  });

  it('stops panning at the edge of the ground', () => {
    expect(clampToGround(50, -50, 32)).toEqual({ x: 32, z: -32 });
    expect(clampToGround(3, -4, 32)).toEqual({ x: 3, z: -4 });
  });
});
