import { describe, expect, it } from 'vitest';
import {
  FOV_DEGREES,
  ISO_ELEVATION,
  MAX_DISTANCE,
  MIN_ELEVATION,
  START_DISTANCE,
  cameraOffset,
  START_AZIMUTH,
  clampToGround,
  easeInOut,
  nearestIsoAzimuth,
  distanceToShow,
  hazeFor,
  polarFromElevation,
} from './camera';

describe('camera', () => {
  it('opens at the classic isometric tilt', () => {
    expect((ISO_ELEVATION * 180) / Math.PI).toBeCloseTo(35.264, 3);
    expect(polarFromElevation(ISO_ELEVATION) + ISO_ELEVATION).toBeCloseTo(Math.PI / 2);
  });

  it('can tilt low enough to see the horizon', () => {
    // The top edge of the view points above level ground when the tilt is less than half the lens angle.
    expect(MIN_ELEVATION).toBeLessThan((FOV_DEGREES / 2) * (Math.PI / 180));
  });

  it('starts far enough back to show the whole Site', () => {
    const height = 2 * START_DISTANCE * Math.tan((FOV_DEGREES * Math.PI) / 360);
    expect(height).toBeCloseTo(92);
    expect(distanceToShow(46)).toBeCloseTo(START_DISTANCE / 2);
  });

  it('places the camera at the given distance and tilt for any turn', () => {
    for (const azimuth of [0, Math.PI / 4, 2, -3]) {
      const o = cameraOffset(azimuth, ISO_ELEVATION, 100);
      expect(Math.hypot(o.x, o.y, o.z)).toBeCloseTo(100);
      expect(Math.asin(o.y / 100)).toBeCloseTo(ISO_ELEVATION);
    }
  });

  it('keeps the Site clear of haze but hides the far scenery', () => {
    for (const d of [10, START_DISTANCE, MAX_DISTANCE]) {
      const { near, far } = hazeFor(d);
      expect(near).toBeGreaterThan(d + 32); // the Site's far edge, seen from straight above its edge
      expect(far).toBeLessThan(d + 32 + 224); // the end of the drawn land
    }
  });

  it('goes home to the nearest isometric corner', () => {
    expect(nearestIsoAzimuth(START_AZIMUTH + 0.3)).toBeCloseTo(START_AZIMUTH);
    expect(nearestIsoAzimuth(START_AZIMUTH + 1.2)).toBeCloseTo(START_AZIMUTH + Math.PI / 2);
    expect(nearestIsoAzimuth(START_AZIMUTH - 2.5)).toBeCloseTo(START_AZIMUTH - Math.PI);
  });

  it('eases camera moves in and out', () => {
    expect(easeInOut(0)).toBe(0);
    expect(easeInOut(1)).toBe(1);
    expect(easeInOut(0.5)).toBe(0.5);
    expect(easeInOut(2)).toBe(1);
  });

  it('stops panning at the edge of the Site', () => {
    expect(clampToGround(50, -50, 32)).toEqual({ x: 32, z: -32 });
    expect(clampToGround(3, -4, 32)).toEqual({ x: 3, z: -4 });
  });
});
