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
 * How the climate shapes a Site. Real places (ticket 16) set it from NASA POWER data (game/places.ts);
 * older saves keep a made-up one drawn from the Seed, with only `dryness`.
 */
export interface SiteClimate {
  /** 0 = wet and green, 1 = desert. */
  dryness: number;
  /** 'coast': the sea is next door. 'inland': no sea, so a lake, a river or none. Missing: the Seed decides. */
  water?: 'coast' | 'inland';
  /** -1 flat … 0 rolling … 1 mountainous. Missing: 0. */
  relief?: number;
  /** 0 = no snow … 1 = the land is white with snow. Missing: 0. */
  snow?: number;
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

/** The ground at one spot: what it is and how high. */
export interface Ground {
  terrain: Terrain;
  level: number;
}

/**
 * The land a Seed describes, everywhere: the Site and the scenery around it.
 * `groundAt` works for any whole-number tile position, inside or outside the Site.
 */
export interface Land {
  water: WaterKind;
  climate: SiteClimate;
  groundAt(x: number, z: number): Ground;
}

/** Shape the land for a Seed. Also returns the random numbers, ready for placing Deposits. */
function makeLand(seed: string, climate?: SiteClimate): { land: Land; rng: Rng } {
  const rng = makeRng(hashText(seed));
  const drawn = placeholderClimate(rng); // always drawn, so the numbers after it don't depend on `climate`
  const siteClimate = climate ?? drawn;

  const height = heightField(rng, siteClimate.relief ?? 0);
  let water = pickWeighted<WaterKind>(rng, [
    ['coast', 0.35],
    ['lake', 0.25],
    ['river', 0.25],
    ['none', 0.15],
  ]);
  // A real place decides the coast; inland, a coast drawn from the Seed becomes a lake (or nothing in a desert).
  if (siteClimate.water === 'coast') water = 'coast';
  else if (siteClimate.water === 'inland' && water === 'coast') water = siteClimate.dryness > 0.7 ? 'none' : 'lake';
  const carve = waterCarver(rng, seed, SITE_SIZE, water);
  const moisture = makeNoise(rng, 14);

  const levelAt = (x: number, z: number) =>
    Math.max(-1, Math.min(MAX_LEVEL, Math.floor(carve(x, z, height(x, z)) * 10) - 2));

  const groundAt = (x: number, z: number): Ground => {
    const level = levelAt(x, z);
    let terrain = terrainFor(level, moisture(x, z), siteClimate.dryness);
    // Low land right next to water becomes beach.
    if (terrain === 'grass' && level <= 1 && NEIGHBOURS.some(([dx, dz]) => levelAt(x + dx, z + dz) < 0)) {
      terrain = 'sand';
    }
    return { terrain, level };
  };

  return { land: { water, climate: siteClimate, groundAt }, rng };
}

/** Build the Site map for a Seed. Pure: the same Seed always gives the same Site. */
export function generateSite(seed: string, climate?: SiteClimate): Site {
  const { land, rng } = makeLand(seed, climate);
  const size = SITE_SIZE;
  const tiles: Tile[] = [];
  for (let z = 0; z < size; z++) {
    for (let x = 0; x < size; x++) tiles.push({ ...land.groundAt(x, z), deposit: null });
  }
  placeDeposits(rng, tiles, size);
  return { seed, size, water: land.water, climate: land.climate, tiles };
}

/** The land around (and under) a Site, for drawing the scenery out to the horizon. */
export function landOf(site: Site): Land {
  return makeLand(site.seed, site.climate).land;
}

/** Rolling land: a few layers of noise, flattened so most of the Site is buildable. `relief` -1 flat to 1 mountainous. */
function heightField(rng: Rng, relief: number): (x: number, z: number) => number {
  const layers = [
    { noise: makeNoise(rng, 24), weight: 0.64 },
    { noise: makeNoise(rng, 10), weight: 0.3 },
    { noise: makeNoise(rng, 4), weight: 0.06 },
  ];
  return (x, z) => {
    const n = layers.reduce((sum, l) => sum + l.noise(x, z) * l.weight, 0);
    // Stretch the middle range so there are plains, hills and some peaks. Land never dips
    // below sea level here: the only water is the coast, lake or river carved next.
    return Math.min(1, Math.max(LAND_FLOOR, (n - 0.5) * (1.8 + 0.5 * relief) + 0.5 + 0.12 * relief));
  };
}

/** How far a river runs on past the Site's edges, in tiles. */
const RIVER_REACH = 256;

/** A function that lowers the land below sea level for the chosen kind of water. */
function waterCarver(
  rng: Rng,
  seed: string,
  size: number,
  kind: WaterKind,
): (x: number, z: number, h: number) => number {
  const wobble = makeNoise(rng, 8);
  if (kind === 'coast') {
    const side = randInt(rng, 0, 3);
    const width = randInt(rng, 10, 18);
    return (x, z, h) => {
      const fromEdge = [x, size - 1 - x, z, size - 1 - z][side]!;
      const d = fromEdge - width + (wobble(x, z) - 0.5) * 10;
      return d < 6 ? Math.min(h, 0.2 + Math.max(d, -6) * 0.03) : h;
    };
  }
  if (kind === 'lake') {
    const cx = randInt(rng, size * 0.3, size * 0.7);
    const cz = randInt(rng, size * 0.3, size * 0.7);
    const r = randInt(rng, 6, 10);
    return (x, z, h) => {
      const d = Math.hypot(x - cx, z - cz) - r + (wobble(x, z) - 0.5) * 6;
      return d < 4 ? Math.min(h, 0.21 + Math.max(d, -4) * 0.025) : h;
    };
  }
  if (kind === 'river') {
    // A river crosses the Site from one side to the other, winding as it goes, and runs on
    // beyond both edges. The part outside the Site uses its own random numbers.
    const alongX = rng() < 0.5;
    const halfWidth = rng() < 0.5 ? 1 : 1.6;
    const start = randInt(rng, size * 0.25, size * 0.75);
    const path = new Map<number, number>();
    const walk = (from: number, to: number, step: 1 | -1, r: Rng, across: number) => {
      let drift = 0;
      for (let t = from; t !== to; t += step) {
        drift = Math.max(-0.8, Math.min(0.8, drift + (r() - 0.5) * 0.5));
        across = Math.max(6, Math.min(size - 7, across + drift));
        path.set(t, across);
      }
    };
    walk(0, size, 1, rng, start);
    const outside = makeRng(hashText(seed + ':river'));
    walk(size, size + RIVER_REACH, 1, outside, path.get(size - 1)!);
    walk(-1, -RIVER_REACH - 1, -1, outside, path.get(0)!);
    return (x, z, h) => {
      const across = path.get(alongX ? x : z);
      if (across === undefined) return h;
      const d = Math.abs(across - (alongX ? z : x)) - halfWidth;
      if (d < 0.5) return Math.min(h, 0.15);
      if (d < 3) return Math.min(h, 0.2 + d * 0.035);
      return h;
    };
  }
  return (_x, _z, h) => h;
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
