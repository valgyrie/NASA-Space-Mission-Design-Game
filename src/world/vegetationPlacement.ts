import { hashText, makeNoise, makeRng } from '../site/random';
import { type Site, tileAt } from '../site/site';
import { type Ground, NEAR_REACH, WATER_Y, squareBounds } from './ground';
import { type TreeKind, type TreeLod, treeGeometries, triangleCount } from './treeModels';

/**
 * Where trees and bushes stand on a Site and the land around it: the same for the same Seed, by the kind of ground,
 * its slope and the climate. Never on water, Deposits (with a margin, so they stay easy to find), building pads or the
 * band along the Site's border; few on the Site itself, where the Company builds; woods and copses off it.
 */

export interface TreeSpot {
  kind: TreeKind;
  lod: TreeLod;
  /** Which of the kind's shapes (0 … VARIANTS − 1). */
  variant: number;
  x: number;
  y: number;
  z: number;
  /** Height in world units (the shapes are about 1 tall). */
  scale: number;
  /** Height compared with width (1 = as made; flat-topped thorn trees in deserts are lower). */
  squash: number;
  /** Turn about the vertical, radians. */
  yaw: number;
  /** Colour the shape is multiplied by (0–1 RGB). */
  tint: [number, number, number];
  /** Casts a shadow (only trees near the Site do: shadows of the far woods cost much and show little). */
  shadow: boolean;
  /** 0–1, for thinning: the trees with the highest numbers go first. */
  keep: number;
}

/** Trees nearer the Site than this (tiles past its edge) are drawn in full detail. */
export const DETAIL_REACH = 8;
/** Trees nearer the Site than this (tiles past its edge) cast shadows. */
export const SHADOW_REACH = 24;
/** How far past the Site's edge trees grow (beyond the full-detail land, sparser and in 2-tile steps). */
export const TREE_REACH = 104;
/** Most triangles all the trees of a Site may have together: thick woods are thinned evenly to stay under it. */
export const TRIANGLE_BUDGET = 1_000_000;
/** Steeper ground than this (0 flat … 1 vertical) is rock: nothing grows there. */
export const MAX_SLOPE = 0.3;
/** Clear distance (tiles) round a Deposit, along the Site's border and round a building pad. */
export const DEPOSIT_CLEAR = 1.4;
export const BORDER_CLEAR = 1.2;
export const PAD_CLEAR = 0.5;
/** Share of the trees the Site itself keeps, compared with the land around it. */
const ON_SITE = 0.16;
/** Tries per patch of land: up to this many trees per tile in a thick wood. */
const TRIES = 2;

const smooth = (a: number, b: number, v: number) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Height range of each kind (world units), lowest to highest. */
const HEIGHT: Record<TreeKind, [number, number]> = {
  broadleaf: [1.3, 2.0],
  oak: [1.1, 1.6],
  conifer: [1.4, 2.4],
  pine: [1.5, 2.2],
  bush: [0.18, 0.34],
  scrub: [0.12, 0.24],
  palm: [1.0, 1.5],
};

/** Is world (x, z) on a tile of the Site? */
function onSiteAt(site: Site, x: number, z: number): boolean {
  return tileAt(site, Math.floor(x + site.size / 2), Math.floor(z + site.size / 2)) !== undefined;
}

const RING = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [0.7, 0.7],
  [-0.7, 0.7],
  [0.7, -0.7],
  [-0.7, -0.7],
] as const;

/** Can anything grow at world (x, z)? Water, steep rock, Deposits, pads and the border band are kept clear. */
export function canGrow(ground: Ground, site: Site, x: number, z: number): boolean {
  if (ground.heightAt(x, z) < WATER_Y + 0.08) return false;
  if (ground.slopeAt(x, z) > MAX_SLOPE) return false;
  if (ground.onPad(x, z, PAD_CLEAR)) return false;
  const on = onSiteAt(site, x, z);
  if (ground.depositAt(x, z)) return false;
  for (const [dx, dz] of RING) {
    if (ground.depositAt(x + dx * DEPOSIT_CLEAR, z + dz * DEPOSIT_CLEAR)) return false;
    if (onSiteAt(site, x + dx * BORDER_CLEAR, z + dz * BORDER_CLEAR) !== on) return false;
  }
  return true;
}

/** Every tree and bush of a Site and the land around it. */
export function placeVegetation(ground: Ground, site: Site): TreeSpot[] {
  const seed = hashText(`${site.seed}:trees`);
  const fieldRng = makeRng(seed);
  const woods = makeNoise(fieldRng, 13);
  const copses = makeNoise(fieldRng, 4.5);
  const groves = makeNoise(fieldRng, 9);
  const climate = ground.land.climate;
  const dry = climate.dryness;
  const snow = climate.snow ?? 0;
  /** 1 in green lands, 0 in deserts. */
  const green = clamp01(1 - (dry - 0.35) / 0.4);
  const half = site.size / 2;
  const sq = squareBounds(site);
  const x0 = sq.from - half;
  const x1 = sq.to - half;
  const outside = (x: number, z: number) => Math.max(x0 - x, x - x1, x0 - z, z - x1, 0);
  const spots: TreeSpot[] = [];

  const visit = (cx: number, cz: number, step: number, k: number) => {
    let h = seed ^ Math.imul(Math.floor(cx * 2) | 0, 73856093) ^ Math.imul(Math.floor(cz * 2) | 0, 19349663) ^ Math.imul(k + 1, 83492791);
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    const rng = makeRng(h);
    const x = cx + rng() * step;
    const z = cz + rng() * step;
    const out = outside(x, z);
    const terrain = ground.terrainAt(x, z);
    if (terrain === 'water') return;
    const wood = smooth(0.4, 0.66, woods(x, z) * 0.72 + copses(x, z) * 0.28);
    let base = terrain === 'hills' ? 1.1 : terrain === 'mountain' ? 0.45 : terrain === 'sand' ? 0.12 : 1;
    if (snow > 0.5 && terrain === 'mountain') base *= 0.4;
    let density = base * (0.03 + 1.9 * wood ** 1.3) * (0.12 + 0.88 * green);
    if (out === 0) density *= ON_SITE;
    if (out > NEAR_REACH) density *= 0.7;
    // Bushes at the edges of woods and in open country.
    const bushChance = (0.06 + 0.3 * smooth(0.1, 0.5, wood) * (1 - wood)) * (out === 0 ? ON_SITE * 0.6 : 1);
    const roll = (rng() * TRIES) / (step * step);
    let kind: TreeKind | null = null;
    if (roll < density) {
      if (green < 0.35) {
        // Dry land: scrub; a rare thorn tree; palms by the water in warm places.
        const wet = snow < 0.1 && RING.some(([dx, dz]) => ground.heightAt(x + dx * 2.5, z + dz * 2.5) < WATER_Y);
        kind = wet && rng() < 0.6 ? 'palm' : rng() < 0.8 ? 'scrub' : 'oak';
      } else {
        const coniferShare = clamp01(
          0.18 + (terrain === 'hills' ? 0.2 : 0) + (terrain === 'mountain' ? 0.65 : 0) + snow * 0.9 + (groves(x, z) - 0.5) * 1.4,
        );
        if (rng() < coniferShare) kind = rng() < (dry > 0.25 || terrain === 'mountain' ? 0.4 : 0.15) ? 'pine' : 'conifer';
        else kind = groves(x + 37, z - 11) > 0.5 ? 'oak' : 'broadleaf';
      }
    } else if (roll < density + bushChance * (0.25 + 0.75 * green) * base) {
      kind = green < 0.35 ? 'scrub' : 'bush';
    }
    if (!kind || !canGrow(ground, site, x, z)) return;
    const [lo, hi] = HEIGHT[kind];
    const scale = (lo + (hi - lo) * rng()) * (kind === 'conifer' && snow > 0.3 ? 0.85 : 1);
    const slope = ground.slopeAt(x, z);
    // Tint: lusher or drier patches, each tree a little different; drier climates yellower.
    const conifer = kind === 'conifer' || kind === 'pine';
    const g = (0.6 + rng() * 0.18) * (conifer ? 1.08 : 1);
    const yellow = (rng() - 0.5) * 0.12 + dry * 0.18;
    const tint: [number, number, number] = [clamp01(g * (0.92 + yellow)), clamp01(g), clamp01(g * (0.86 - yellow * 0.6 + (conifer ? 0.06 : 0)))];
    // Dry land: dusty olive and grey-green leaves.
    if (green < 0.35) {
      const dust = 0.75 + rng() * 0.15;
      tint[0] = clamp01(tint[0] * dust * 1.08);
      tint[1] = clamp01(tint[1] * dust * 0.95);
      tint[2] = clamp01(tint[2] * dust * 0.72);
    }
    const squash = green < 0.35 && kind === 'oak' ? 0.55 : 1;
    spots.push({
      kind,
      lod: out < DETAIL_REACH ? 0 : 1,
      variant: out < DETAIL_REACH ? Math.floor(rng() * 2) : 0,
      x,
      y: ground.heightAt(x, z) - (0.02 + slope * 0.3) * Math.min(scale, 1),
      z,
      scale: scale * (squash < 1 ? 1.3 : 1),
      squash,
      yaw: rng() * Math.PI * 2,
      tint,
      shadow: out < SHADOW_REACH,
      keep: rng(),
    });
  };

  for (let z = x0 - TREE_REACH; z < x1 + TREE_REACH; z += 1)
    for (let x = x0 - TREE_REACH; x < x1 + TREE_REACH; x += 1) {
      const out = outside(x + 0.5, z + 0.5);
      if (out <= NEAR_REACH) for (let k = 0; k < TRIES; k++) visit(x, z, 1, k);
      // Beyond the full-detail land, one try per 2 × 2 tiles.
      else if (((x - x0) & 1) === 0 && ((z - x0) & 1) === 0) for (let k = 0; k < TRIES; k++) visit(x, z, 2, k);
    }
  // Too many for the budget (a land of thick woods): thin them evenly, the same way every time.
  const cost = spots.reduce((sum, s) => sum + triangleCount(treeGeometries(s.kind, s.lod)[s.variant]!), 0);
  const share = Math.min(1, TRIANGLE_BUDGET / cost);
  return share < 1 ? spots.filter((s) => s.keep < share) : spots;
}
