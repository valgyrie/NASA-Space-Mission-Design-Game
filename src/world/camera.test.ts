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
  wholeSiteView,
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

describe('whole-Site view (ticket 30)', () => {
  const corners = (plots: [number, number][]) =>
    plots.flatMap(([px, pz]) => [0, 1].flatMap((i) => [0, 1].map((k) => ({ x: (px + i) * 64 - 32, z: (pz + k) * 64 - 32 }))));

  it('is the usual view for the Home Site alone', () => {
    for (const aspect of [1.6, 1.17, 0.6]) {
      const v = wholeSiteView(corners([[0, 0]]), START_AZIMUTH, aspect);
      expect(v.x).toBeCloseTo(0);
      expect(v.z).toBeCloseTo(0);
      expect(v.distance).toBeCloseTo(START_DISTANCE);
    }
  });

  it('centres on bought land and backs off until every corner is on screen', () => {
    const land = corners([[0, 0], [1, 0], [2, 0]]);
    const aspect = 1440 / 900;
    const v = wholeSiteView(land, START_AZIMUTH, aspect);
    expect(v.x).toBeCloseTo(64);
    expect(v.z).toBeCloseTo(0);
    expect(v.distance).toBeGreaterThan(START_DISTANCE);
    // Every corner falls inside the screen at that distance (seen straight along the view).
    const height = 2 * v.distance * Math.tan((FOV_DEGREES * Math.PI) / 360);
    const width = height * aspect;
    for (const p of land) {
      const across = (p.x - v.x) * Math.cos(START_AZIMUTH) - (p.z - v.z) * Math.sin(START_AZIMUTH);
      expect(Math.abs(across)).toBeLessThan(width / 2);
    }
  });
});
