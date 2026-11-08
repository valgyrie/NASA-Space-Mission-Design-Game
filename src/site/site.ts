import { RAW_MATERIALS, type RawMaterial } from '../economy/rawMaterial';
import { type Rng, hashText, makeNoise, makeRng, pickWeighted, randInt } from './random';

/** Side length of a Site in tiles. */
export const SITE_SIZE = 64;

export type Terrain = 'water' | 'sand' | 'grass' | 'hills' | 'mountain';

/** How the Site touches water. */
export type WaterKind = 'coast' | 'lake' | 'river' | 'none';

export interface Tile {
  terrain: Terrain;
  /** Height step of the tile's top. Water tiles sit below 0; dry land starts at 0. */
  level: number;
  deposit: RawMaterial | null;
}

/**
 * Stand-in climate until real NASA POWER data arrives (ticket 16).
 * `dryness` 0 = wet and green, 1 = desert.
 */
export interface SiteClimate {
  dryness: number;
}

export interface Site {
  seed: string;
  size: number;
  water: WaterKind;
  climate: SiteClimate;
  /** Row by row: tile (x, z) is at index z * size + x. */
  tiles: Tile[];
}

export const MAX_LEVEL = 9;

/** Lowest height of dry land, on the 0–1 scale used before heights become levels. */
const LAND_FLOOR = 0.2;

/** Placeholder climate drawn from the Seed, so Sites vary from green to dry. */
export function placeholderClimate(rng: Rng): SiteClimate {
  return { dryness: Math.round(rng() * 100) / 100 };
}

export function tileAt(site: Site, x: number, z: number): Tile | undefined {
  if (x < 0 || z < 0 || x >= site.size || z >= site.size) return undefined;
  return site.tiles[z * site.size + x];
}

/** Build the Site map for a Seed. Pure: the same Seed always gives the same Site. */
export function generateSite(seed: string, climate?: SiteClimate): Site {
  const rng = makeRng(hashText(seed));
  const size = SITE_SIZE;
  const siteClimate = climate ?? placeholderClimate(rng);

  const height = heightField(rng, size);
  const water = pickWeighted<WaterKind>(rng, [
    ['coast', 0.35],
    ['lake', 0.25],
    ['river', 0.25],
    ['none', 0.15],
  ]);
  carveWater(rng, height, size, water);

  const moisture = makeNoise(rng, 14);
  const tiles: Tile[] = height.map((h, i) => {
    const x = i % size;
    const z = Math.floor(i / size);
    const level = Math.min(MAX_LEVEL, Math.floor(h * 10) - 2);
    return { terrain: terrainFor(level, moisture(x, z), siteClimate.dryness), level: Math.max(level, -1), deposit: null };
  });
  addBeaches(tiles, size);
  placeDeposits(rng, tiles, size);

  return { seed, size, water, climate: siteClimate, tiles };
}

/** Rolling land: a few layers of noise, flattened so most of the Site is buildable. */
function heightField(rng: Rng, size: number): number[] {
  const layers = [
    { noise: makeNoise(rng, 24), weight: 0.64 },
    { noise: makeNoise(rng, 10), weight: 0.3 },
    { noise: makeNoise(rng, 4), weight: 0.06 },
  ];
  const out: number[] = [];
  for (let z = 0; z < size; z++) {
    for (let x = 0; x < size; x++) {
      const n = layers.reduce((sum, l) => sum + l.noise(x, z) * l.weight, 0);
      // Stretch the middle range so there are plains, hills and some peaks. Land never dips
      // below sea level here: the only water is the coast, lake or river carved next.
      out.push(Math.min(1, Math.max(LAND_FLOOR, (n - 0.5) * 1.8 + 0.5)));
    }
  }
  return out;
}

/** Lower the land below sea level for the chosen kind of water. */
function carveWater(rng: Rng, h: number[], size: number, kind: WaterKind): void {
  const wobble = makeNoise(rng, 8);
  if (kind === 'coast') {
    const side = randInt(rng, 0, 3);
    const width = randInt(rng, 10, 18);
    for (let z = 0; z < size; z++) {
      for (let x = 0; x < size; x++) {
        const fromEdge = [x, size - 1 - x, z, size - 1 - z][side]!;
        const d = fromEdge - width + (wobble(x, z) - 0.5) * 10;
        if (d < 6) h[z * size + x] = Math.min(h[z * size + x]!, 0.2 + Math.max(d, -6) * 0.03);
      }
    }
  } else if (kind === 'lake') {
    const cx = randInt(rng, size * 0.3, size * 0.7);
    const cz = randInt(rng, size * 0.3, size * 0.7);
    const r = randInt(rng, 6, 10);
    for (let z = 0; z < size; z++) {
      for (let x = 0; x < size; x++) {
        const d = Math.hypot(x - cx, z - cz) - r + (wobble(x, z) - 0.5) * 6;
        if (d < 4) h[z * size + x] = Math.min(h[z * size + x]!, 0.21 + Math.max(d, -4) * 0.025);
      }
    }
  } else if (kind === 'river') {
    // A river crosses the Site from one side to the other, winding as it goes.
    const alongX = rng() < 0.5;
    let across = randInt(rng, size * 0.25, size * 0.75);
    let drift = 0;
    const halfWidth = rng() < 0.5 ? 1 : 1.6;
    for (let t = 0; t < size; t++) {
      drift = Math.max(-0.8, Math.min(0.8, drift + (rng() - 0.5) * 0.5));
      across = Math.max(6, Math.min(size - 7, across + drift));
      for (let o = -4; o <= 4; o++) {
        const a = Math.round(across) + o;
        const [x, z] = alongX ? [t, a] : [a, t];
        const d = Math.abs(across - a) - halfWidth;
        const i = z * size + x;
        if (d < 0.5) h[i] = Math.min(h[i]!, 0.15);
        else if (d < 3) h[i] = Math.min(h[i]!, 0.2 + d * 0.035);
      }
    }
  }
}

function terrainFor(level: number, moisture: number, dryness: number): Terrain {
  if (level < 0) return 'water';
  if (level >= 7) return 'mountain';
  if (level >= 5) return 'hills';
  // Deserts: dry patches, more of them when the climate is dry.
  return moisture < dryness * 0.75 - 0.05 ? 'sand' : 'grass';
}

const NEIGHBOURS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;

/** Low land right next to water becomes sand. */
function addBeaches(tiles: Tile[], size: number): void {
  const beach: number[] = [];
  tiles.forEach((tile, i) => {
    if (tile.terrain !== 'grass' || tile.level > 1) return;
    const x = i % size;
    const z = Math.floor(i / size);
    const byWater = NEIGHBOURS.some(([dx, dz]) => tiles[(z + dz) * size + (x + dx)]?.terrain === 'water' && x + dx >= 0 && x + dx < size);
    if (byWater) beach.push(i);
  });
  for (const i of beach) tiles[i]!.terrain = 'sand';
}

/** Where each Raw Material is found (docs/GDD.md §4). */
const FOUND_IN: Record<RawMaterial, readonly Terrain[]> = {
  aluminium: ['grass', 'hills', 'sand'],
  copper: ['hills', 'mountain'],
  silicon: ['sand'],
};

const PATCHES = { min: 2, max: 4 };
const PATCH_TILES = { min: 4, max: 8 };

/** Scatter patches of each Raw Material on fitting land. Every Site gets at least two of each. */
function placeDeposits(rng: Rng, tiles: Tile[], size: number): void {
  for (const material of RAW_MATERIALS) {
    const free = (i: number) => tiles[i]!.terrain !== 'water' && tiles[i]!.deposit === null;
    let spots = tiles.map((_, i) => i).filter((i) => free(i) && FOUND_IN[material].includes(tiles[i]!.terrain));
    // Not enough of the right land: fall back to any dry land, so no Site is unplayable.
    if (spots.length < 20) spots = tiles.map((_, i) => i).filter(free);

    const count = randInt(rng, PATCHES.min, PATCHES.max);
    for (let p = 0; p < count && spots.length > 0; p++) {
      const fits = new Set(spots);
      const start = spots[Math.floor(rng() * spots.length)]!;
      const patch = [start];
      tiles[start]!.deposit = material;
      const target = randInt(rng, PATCH_TILES.min, PATCH_TILES.max);
      for (let tries = 0; patch.length < target && tries < 40; tries++) {
        const from = patch[Math.floor(rng() * patch.length)]!;
        const [dx, dz] = NEIGHBOURS[randInt(rng, 0, 3)]!;
        const x = (from % size) + dx;
        const z = Math.floor(from / size) + dz;
        const i = z * size + x;
        if (x < 0 || z < 0 || x >= size || z >= size || !fits.has(i) || !free(i)) continue;
        tiles[i]!.deposit = material;
        patch.push(i);
      }
      // Keep patches apart.
      spots = spots.filter((i) => {
        const x = i % size;
        const z = Math.floor(i / size);
        return free(i) && !patch.some((j) => Math.abs((j % size) - x) + Math.abs(Math.floor(j / size) - z) < 6);
      });
    }
  }
}
