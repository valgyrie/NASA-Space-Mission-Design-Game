import { BLUE_MARBLE_PALETTE, BLUE_MARBLE_ROWS } from './blueMarble';
import { EARTH_MAP_ROWS } from './earthMap';

/**
 * The Earth map as pictures for a smooth globe. No Three.js here, so it is easy to test.
 *
 * The Natural Earth map is only 1° per cell, so drawing its cells directly gives blocks and stair-step
 * coasts. Instead every pixel blends the nine cells around it with smooth (quadratic B-spline) weights:
 * colours melt into each other, and "how much land is here" becomes a smooth number the globe's shader
 * cuts at one half, which gives rounded coastlines that stay sharp at any zoom.
 */

export const SURFACES = ['.', 'f', 'r', 'b', 't', 's', 'm', 'd', 'i'] as const;
export type Surface = (typeof SURFACES)[number];

/** A run-length coded row unpacked: 360 cells from 180°W eastwards. */
const unpack = (row: string, letters: RegExp) =>
  [...row.matchAll(letters)].map(([, c, n]) => c!.repeat(n ? Number(n) : 1)).join('');
/** The map unpacked: 180 rows (90°N to 90°S) of 360 cells (180°W eastwards). */
const GRID: string[] = EARTH_MAP_ROWS.map((row) => unpack(row, /([a-z.])(\d*)/g));
/** NASA Blue Marble colours on the same grid: a letter per land cell, "." for sea. */
const BLUE_MARBLE: string[] = BLUE_MARBLE_ROWS.map((row) => unpack(row, /([A-Za-z.])(\d*)/g));
const PALETTE_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const ROWS = 180;
const COLS = 360;

/** What covers the Earth at a latitude and longitude, in degrees (north and east positive). */
export function surfaceAt(lat: number, lon: number): Surface {
  const row = Math.min(ROWS - 1, Math.max(0, Math.floor(90 - lat)));
  const col = ((Math.floor(lon + 180) % COLS) + COLS) % COLS;
  return GRID[row]![col] as Surface;
}

/**
 * Land colours by surface. The globe shows NASA Blue Marble colours instead (`landColour`); these stay
 * for any land cell Blue Marble has no colour for. The sea is coloured by the globe's shader (`SEA`).
 */
export const LAND_COLOUR: Record<Exclude<Surface, '.'>, number> = {
  f: 0x4c8a42, // temperate forest and farmland
  r: 0x2c7236, // rainforest
  b: 0x3a6447, // boreal forest
  t: 0x8e9a7c, // tundra
  s: 0xa3ad5e, // grassland and steppe
  m: 0x8a7a66, // mountains
  d: 0xdcc184, // desert
  i: 0xf1f5fa, // ice
};
export const SEA = { deep: 0x1a4c96, shallow: 0x2f7fc8 };

/** The colour of a land cell of the map: NASA Blue Marble's, averaged over the 1° cell. */
export function landColour(row: number, col: number): number {
  const letter = BLUE_MARBLE[row]![col]!;
  const index = PALETTE_LETTERS.indexOf(letter);
  return index >= 0 ? BLUE_MARBLE_PALETTE[index]! : LAND_COLOUR[GRID[row]![col] as Exclude<Surface, '.'>];
}

/**
 * Where a pixel of an Earth picture is on the globe. Pictures wrap a Three.js sphere whose seam is at
 * 90°W (longitude 0 faces +z, east is +x), with the first row of data at the south pole.
 */
export function pixelLatLon(x: number, y: number, width: number, height: number): { lat: number; lon: number } {
  return { lat: -90 + ((y + 0.5) / height) * 180, lon: ((x + 0.5) / width) * 360 - 90 };
}

/** The three cells around a spot along one axis, and how much each counts (quadratic B-spline). */
function taps(position: number, count: number, wrap: boolean): { index: number[]; weight: number[] } {
  const nearest = Math.round(position);
  const f = position - nearest;
  const fit = (i: number) => (wrap ? ((i % count) + count) % count : Math.min(count - 1, Math.max(0, i)));
  return {
    index: [fit(nearest - 1), fit(nearest), fit(nearest + 1)],
    weight: [0.5 * (0.5 - f) ** 2, 0.75 - f * f, 0.5 * (0.5 + f) ** 2],
  };
}

/**
 * The surface picture, RGBA bytes: colour of the land (sRGB) and, in alpha, how much land is around
 * (0 open sea, 255 inland, 128 right at the coast).
 */
export function earthPixels(width: number, height: number): Uint8Array {
  const land = new Uint8Array(ROWS * COLS);
  const red = new Uint8Array(ROWS * COLS);
  const green = new Uint8Array(ROWS * COLS);
  const blue = new Uint8Array(ROWS * COLS);
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const surface = GRID[r]![c] as Surface;
      if (surface === '.') continue;
      const i = r * COLS + c;
      const colour = landColour(r, c);
      land[i] = 1;
      red[i] = colour >> 16;
      green[i] = (colour >> 8) & 255;
      blue[i] = colour & 255;
    }
  }

  // Smooth the outline once more, so stair-step coasts become curves. Islands of a cell or two would
  // melt away, so they keep their full weight.
  const soft = new Float32Array(ROWS * COLS);
  const cell = (r: number, c: number) => land[Math.min(ROWS - 1, Math.max(0, r)) * COLS + ((c + COLS) % COLS)]!;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      let sum = 0;
      let around = -cell(r, c);
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          sum += cell(r + dr, c + dc) * (dr ? 0.125 : 0.75) * (dc ? 0.125 : 0.75);
          around += cell(r + dr, c + dc);
        }
      }
      soft[r * COLS + c] = cell(r, c) && around <= 2 ? 1 : sum;
    }
  }

  const columns = Array.from({ length: width }, (_, x) => taps(pixelLatLon(x, 0, width, height).lon + 179.5, COLS, true));
  const out = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    const row = taps(89.5 - pixelLatLon(0, y, width, height).lat, ROWS, false);
    for (let x = 0; x < width; x++) {
      const col = columns[x]!;
      let amount = 0;
      let coloured = 0;
      let r = 0;
      let g = 0;
      let b = 0;
      for (let j = 0; j < 3; j++) {
        const base = row.index[j]! * COLS;
        const wr = row.weight[j]!;
        for (let k = 0; k < 3; k++) {
          const i = base + col.index[k]!;
          const w = wr * col.weight[k]!;
          amount += w * soft[i]!;
          if (!land[i]) continue;
          coloured += w;
          r += w * red[i]!;
          g += w * green[i]!;
          b += w * blue[i]!;
        }
      }
      const o = (y * width + x) * 4;
      if (coloured > 0) {
        out[o] = r / coloured;
        out[o + 1] = g / coloured;
        out[o + 2] = b / coloured;
      } else {
        out[o] = SEA.deep >> 16;
        out[o + 1] = (SEA.deep >> 8) & 255;
        out[o + 2] = SEA.deep & 255;
      }
      out[o + 3] = Math.round(Math.min(1, amount) * 255);
    }
  }
  return out;
}

/** A repeatable 0–1 number for a point of a 3D grid. */
function hash3(x: number, y: number, z: number): number {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(z, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Smooth 0–1 noise in 3D. Used on the sphere itself, so it has no seam and no pinch at the poles. */
function noise3(x: number, y: number, z: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const zi = Math.floor(z);
  const ease = (t: number) => t * t * (3 - 2 * t);
  const u = ease(x - xi);
  const v = ease(y - yi);
  const w = ease(z - zi);
  const mix = (a: number, b: number, t: number) => a + (b - a) * t;
  const at = (dx: number, dy: number, dz: number) => hash3(xi + dx, yi + dy, zi + dz);
  return mix(
    mix(mix(at(0, 0, 0), at(1, 0, 0), u), mix(at(0, 1, 0), at(1, 1, 0), u), v),
    mix(mix(at(0, 0, 1), at(1, 0, 1), u), mix(at(0, 1, 1), at(1, 1, 1), u), v),
    w,
  );
}

/**
 * The cloud picture, RGBA bytes with the same number in every channel: how cloudy it is, with 128 at the
 * edge of a cloud (the globe's shader cuts it there, so edges stay crisp close up). Soft patches, most of
 * them where real weather is busiest: the tropics and the storm belts near 52°.
 */
export function cloudPixels(width: number, height: number): Uint8Array {
  const out = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    const { lat } = pixelLatLon(0, y, width, height);
    const phi = (lat * Math.PI) / 180;
    const belt = Math.max(Math.exp(-((lat / 10) ** 2)), Math.exp(-(((Math.abs(lat) - 52) / 11) ** 2)));
    for (let x = 0; x < width; x++) {
      const theta = (pixelLatLon(x, 0, width, height).lon * Math.PI) / 180;
      const px = Math.cos(phi) * Math.sin(theta);
      const py = Math.sin(phi);
      const pz = Math.cos(phi) * Math.cos(theta);
      // Stretched a little east–west, like weather systems, and bent by a slower noise so the patches curl.
      const bend = noise3(px * 2.3 + 7, py * 2.3, pz * 2.3) - 0.5;
      let n = 0;
      let size = 3.4;
      let weight = 0.5;
      for (let octave = 0; octave < 4; octave++) {
        n += weight * noise3(px * size + bend * 1.8, py * size * 1.5 + 31 * octave, pz * size + bend * 1.8);
        size *= 2.1;
        weight *= 0.5;
      }
      const cover = n / 0.9375 - 0.59 + belt * 0.13;
      const value = Math.round(Math.min(1, Math.max(0, 0.5 + cover * 2)) * 255);
      out.fill(value, (y * width + x) * 4, (y * width + x) * 4 + 4);
    }
  }
  return out;
}
