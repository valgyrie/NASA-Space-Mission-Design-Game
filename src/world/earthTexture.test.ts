import { describe, expect, it } from 'vitest';
import { cloudPixels, earthPixels, pixelLatLon, surfaceAt } from './earthTexture';

const W = 720;
const H = 360;
const earth = earthPixels(W, H);
/** The pixel of a picture nearest a latitude and longitude. */
const pixelAt = (pixels: Uint8Array, lat: number, lon: number) => {
  const x = Math.floor((((lon + 90 + 360) % 360) / 360) * W);
  const y = Math.floor(((lat + 90) / 180) * H);
  return [...pixels.subarray((y * W + x) * 4, (y * W + x) * 4 + 4)];
};

describe('Earth picture', () => {
  it('starts at the south pole and at 90°W, where the sphere has its seam', () => {
    expect(pixelLatLon(0, 0, 360, 180)).toEqual({ lat: -89.5, lon: -89.5 });
    expect(pixelLatLon(359, 179, 360, 180)).toEqual({ lat: 89.5, lon: 269.5 });
  });

  it('marks land and sea in alpha, with the coast at one half', () => {
    expect(pixelAt(earth, 23, 10)[3]).toBe(255); // Sahara
    expect(pixelAt(earth, -25, 125)[3]).toBe(255); // Australian interior
    expect(pixelAt(earth, 0, -30)[3]).toBe(0); // middle of the Atlantic
    expect(pixelAt(earth, 0, -150)[3]).toBe(0); // middle of the Pacific
  });

  it('agrees with the map everywhere but near coasts', () => {
    let checked = 0;
    for (let lat = -88.5; lat < 89; lat += 3) {
      for (let lon = -179.5; lon < 180; lon += 3) {
        const near = [-1, 0, 1].flatMap((dl) => [-1, 0, 1].map((dn) => surfaceAt(lat + dl, lon + dn) !== '.'));
        if (near.some((land) => land !== near[0])) continue;
        expect(pixelAt(earth, lat, lon)[3]! > 127, `${lat}, ${lon}`).toBe(near[0]);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(5000);
  });

  it('keeps small islands and narrow land', () => {
    expect(pixelAt(earth, 19.5, -155.5)[3]).toBeGreaterThan(127); // Hawaii
    expect(pixelAt(earth, 8.5, -80.5)[3]).toBeGreaterThan(127); // Panama
  });

  it('colours the land: sand in the Sahara, green in the Amazon, white on Antarctica', () => {
    const sand = pixelAt(earth, 23, 10);
    expect(sand[0]).toBeGreaterThan(sand[2]! + 40);
    const [ar, ag, ab] = pixelAt(earth, -3, -60) as [number, number, number];
    expect(ag).toBeGreaterThan(Math.max(ar, ab) + 30);
    const ice = pixelAt(earth, -85, 0);
    expect(Math.min(ice[0]!, ice[1]!, ice[2]!)).toBeGreaterThan(220);
  });
});

describe('Cloud picture', () => {
  const clouds = cloudPixels(W, H);
  it('has clear sky and cloud, with more sky than cloud', () => {
    let cloudy = 0;
    for (let i = 0; i < clouds.length; i += 4) if (clouds[i]! > 127) cloudy++;
    const share = cloudy / (W * H);
    expect(share).toBeGreaterThan(0.1);
    expect(share).toBeLessThan(0.5);
  });

  it('has no seam where the picture wraps round', () => {
    for (let y = 0; y < H; y += 7) {
      const left = clouds[y * W * 4]!;
      const right = clouds[(y * W + W - 1) * 4]!;
      expect(Math.abs(left - right)).toBeLessThan(40);
    }
  });
});
