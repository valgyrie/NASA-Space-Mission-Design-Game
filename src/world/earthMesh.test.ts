import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { EARTH_MAP_ROWS } from './earthMap';
import { SURFACES, latLonOf, surfaceAt } from './earthMesh';

describe('Earth map', () => {
  it('has 180 rows of 360 known cells', () => {
    expect(EARTH_MAP_ROWS).toHaveLength(180);
    for (const row of EARTH_MAP_ROWS) {
      const cells = [...row.matchAll(/([a-z.])(\d*)/g)].reduce((n, [, , count]) => n + (count ? Number(count) : 1), 0);
      expect(cells).toBe(360);
      for (const [, c] of row.matchAll(/([a-z.])\d*/g)) expect(SURFACES).toContain(c);
    }
  });

  it('puts real places on the right surface', () => {
    expect(surfaceAt(23, 10)).toBe('d'); // Sahara
    expect(surfaceAt(-25, 125)).toBe('d'); // Australian interior
    expect(surfaceAt(-3, -60)).toBe('r'); // Amazon
    expect(surfaceAt(0, 22)).toBe('r'); // Congo Basin
    expect(surfaceAt(72, -40)).toBe('i'); // Greenland
    expect(surfaceAt(-80, 0)).toBe('i'); // Antarctica
    expect(surfaceAt(0, -30)).toBe('.'); // middle of the Atlantic
    expect(surfaceAt(0, -150)).toBe('.'); // middle of the Pacific
    expect(surfaceAt(48.8, 2.3)).not.toBe('.'); // Paris
    expect(surfaceAt(39, -98)).not.toBe('.'); // Kansas
  });

  it('wraps longitude and clamps latitude', () => {
    expect(surfaceAt(0, 330)).toBe(surfaceAt(0, -30));
    expect(surfaceAt(95, 0)).toBe(surfaceAt(89.5, 0));
  });

  it('reads latitude and longitude from a direction (longitude 0 faces +z, east is +x)', () => {
    expect(latLonOf(new THREE.Vector3(0, 0, 1))).toEqual({ lat: 0, lon: 0 });
    expect(latLonOf(new THREE.Vector3(1, 0, 0)).lon).toBeCloseTo(90);
    expect(latLonOf(new THREE.Vector3(0, 2, 0)).lat).toBeCloseTo(90);
  });
});
