/**
 * The smooth ground as it is drawn: a continuous surface built from the tile levels of the Site and the land around
 * it, flattened into pads under buildings. Pure maths, no Three.js, so it is easy to test and cheap to query.
 *
 * Gameplay still works on tiles and levels (`site.ts`); this only decides how high the drawn land is at any world
 * point, and what it looks like there (which ground kinds blend, where Deposits colour it). Later scenery (trees,
 * rocks, props) can use `heightAt`, `normalAt` and `terrainAt` to sit on it.
 */

import type { RawMaterial } from '../economy/rawMaterial';
import { FOOTPRINT, foundationLevel } from '../game/siteState';
import {
  type Land,
  SITE_SIZE,
  type Site,
  type SiteClimate,
  type Terrain,
  ownsPlot,
  plotKey,
  plotOf,
  plotTiles,
  sitePlots,
  tileAt,
} from '../site/site';

/** Height of one terrain level in world units. A tile is 1 × 1. */
export const STEP = 0.5;
/** Height of the water surface. Water tiles (level −1) lie below it, dry land (level 0 and up) above. */
export const WATER_Y = -0.12;

/** Full-detail land reaches this many tiles past each edge of the Site: one Plot on every side. */
export const NEAR_REACH = 64;
/** Coarse land reaches this far, out to where the haze hides it. */
export const FAR_REACH = 224;
/** Tiles between the vertices of the coarse land. */
export const FAR_STEP = 4;
/** Above this many vertices the full-detail land uses one vertex per tile instead of four. */
const MAX_NEAR_VERTICES = 220_000;

/** How far the graded earthworks around a building pad reach, in tiles. */
export const PAD_SKIRT = 1.25;

/** A flat, level building pad: world x/z from `x0` to `x1` and `z0` to `z1`, at height `y`. */
export interface Pad {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  y: number;
}

/** The pad under a building centred on tile (x, z): its 3 × 3 footprint at its foundation level. */
export function padFor(site: Site, x: number, z: number): Pad {
  const half = (FOOTPRINT - 1) / 2;
  const o = -site.size / 2;
  return {
    x0: x - half + o,
    x1: x + half + 1 + o,
    z0: z - half + o,
    z1: z + half + 1 + o,
    y: foundationLevel(site, x, z) * STEP,
  };
}

/** Tiles from `from` (included) to `to` (excluded) on both axes: a square holding every Plot of the Site. */
export function squareBounds(site: Site): { from: number; to: number } {
  const plots = sitePlots(site);
  const px = plots.map((p) => p.px);
  const pz = plots.map((p) => p.pz);
  return {
    from: Math.min(Math.min(...px), Math.min(...pz)) * SITE_SIZE,
    to: (Math.max(Math.max(...px), Math.max(...pz)) + 1) * SITE_SIZE,
  };
}

/** A square grid of vertices: vertex (i, j) is at world (x0 + i·step, z0 + j·step). */
export interface Lattice {
  x0: number;
  z0: number;
  step: number;
  /** Vertices per side. */
  n: number;
  /** Height of each vertex, row by row (index j·n + i). */
  height: Float32Array;
}

/** What the ground looks like at each vertex, for the terrain shader. */
export interface GroundLook {
  /** Per vertex: how much sand, dry soil, rock and snow (0–1 each); grass makes up the rest. */
  mix: Float32Array;
  /** Per vertex: a Deposit's colour (premultiplied by its amount) and its amount. */
  ore: Float32Array;
  /** Per vertex: 1 on the Site, fading to 0 just outside it. */
  site: Float32Array;
}

const smoothstep = (a: number, b: number, v: number) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Catmull-Rom weights for a point a fraction `f` of the way from sample 0 to sample 1 (samples −1, 0, 1, 2). */
function catmullRom(f: number): [number, number, number, number] {
  const f2 = f * f;
  const f3 = f2 * f;
  return [(-f3 + 2 * f2 - f) / 2, (3 * f3 - 5 * f2 + 2) / 2, (-3 * f3 + 4 * f2 + f) / 2, (f3 - f2) / 2];
}

/** Repeatable 0–1 number for a whole-number point. */
function hash2(x: number, z: number): number {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(z | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Smooth value noise, about −1 to 1, with features `cell` tiles across. */
function valueNoise(x: number, z: number, cell: number): number {
  const fx = x / cell;
  const fz = z / cell;
  const ix = Math.floor(fx);
  const iz = Math.floor(fz);
  const tx = smoothstep(0, 1, fx - ix);
  const tz = smoothstep(0, 1, fz - iz);
  const a = hash2(ix, iz);
  const b = hash2(ix + 1, iz);
  const c = hash2(ix, iz + 1);
  const d = hash2(ix + 1, iz + 1);
  return (a + (b - a) * tx + (c - a) * tz + (a - b - c + d) * tx * tz) * 2 - 1;
}

/** Small natural bumps on top of the shape the levels give, in world units. */
function microRelief(x: number, z: number): number {
  return valueNoise(x, z, 7) * 0.05 + valueNoise(x + 101, z - 57, 2.5) * 0.025;
}

/** How much sand, dry soil, rock and snow a tile shows; grass is the rest. */
export function groundMix(terrain: Terrain, level: number, climate: SiteClimate): [number, number, number, number] {
  const dry = climate.dryness;
  const snowy = climate.snow ?? 0;
  let sand = 0;
  let dirt = 0;
  let rock = 0;
  let snow = 0;
  if (terrain === 'water') {
    sand = 0.8;
    dirt = 0.2;
  } else if (terrain === 'sand') {
    sand = 1;
  } else if (terrain === 'grass') {
    dirt = smoothstep(0.3, 0.95, dry) * 0.85;
    sand = smoothstep(0.75, 1, dry) * 0.15;
  } else if (terrain === 'hills') {
    rock = 0.12;
    dirt = 0.15 + smoothstep(0.3, 0.95, dry) * 0.45;
  } else {
    // Rocky highland: bare rock with thin grass and soil between.
    rock = 0.72;
    dirt = 0.12;
    if (level >= 9) snow = 1;
  }
  if (terrain !== 'water') snow = Math.max(snow, snowy * (terrain === 'mountain' ? 1 : terrain === 'hills' ? 0.95 : 0.9));
  // Snow covers whatever is under it.
  const rest = 1 - snow;
  return [sand * rest, dirt * rest, rock * rest, snow];
}

/** The tiles of the drawn land: levels, kinds and Deposits over a square, with a margin for smoothing. */
interface TileGrid {
  from: number;
  n: number;
  level: Int8Array;
  terrain: Terrain[];
  deposit: (RawMaterial | null)[];
  /** 1 for a Deposit on the Site, less for one on a Plot next door. */
  depositAmount: Float32Array;
  onSite: Uint8Array;
}

/** Does the Plot touch a Plot of the Site (sides and corners count) without being one? */
function touchesOwned(site: Site, px: number, pz: number): boolean {
  if (ownsPlot(site, px, pz)) return false;
  for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) if (ownsPlot(site, px + dx, pz + dz)) return true;
  return false;
}

function readTiles(site: Site, land: Land, from: number, to: number): TileGrid {
  const n = to - from;
  const g: TileGrid = {
    from,
    n,
    level: new Int8Array(n * n),
    terrain: new Array<Terrain>(n * n),
    deposit: new Array<RawMaterial | null>(n * n).fill(null),
    depositAmount: new Float32Array(n * n),
    onSite: new Uint8Array(n * n),
  };
  // The Deposits of the Plots next door show faintly, so the player can see what buying one would bring.
  const nextDoor = new Map<string, ReturnType<typeof plotTiles>>();
  for (let z = 0; z < n; z++) {
    for (let x = 0; x < n; x++) {
      const tx = from + x;
      const tz = from + z;
      const k = z * n + x;
      const tile = tileAt(site, tx, tz);
      if (tile) {
        g.level[k] = tile.level;
        g.terrain[k] = tile.terrain;
        g.deposit[k] = tile.deposit;
        g.depositAmount[k] = tile.deposit ? 1 : 0;
        g.onSite[k] = 1;
        continue;
      }
      const ground = land.groundAt(tx, tz);
      g.level[k] = ground.level;
      g.terrain[k] = ground.terrain;
      const { px, pz } = plotOf(tx, tz);
      const key = plotKey(px, pz);
      let tiles = nextDoor.get(key);
      if (!tiles) nextDoor.set(key, (tiles = touchesOwned(site, px, pz) ? plotTiles(site, px, pz, land) : []));
      const d = tiles[(tz - pz * SITE_SIZE) * SITE_SIZE + (tx - px * SITE_SIZE)]?.deposit ?? null;
      g.deposit[k] = d;
      g.depositAmount[k] = d ? 0.6 : 0;
    }
  }
  return g;
}

/** Distance in tiles from each water cell to the nearest land (chamfer), 0 on land. */
function distanceToLand(isWater: (k: number) => boolean, n: number): Float32Array {
  const d = new Float32Array(n * n);
  const far = 1e6;
  for (let k = 0; k < n * n; k++) d[k] = isWater(k) ? far : 0;
  const D = Math.SQRT2;
  const relax = (k: number, j: number, w: number) => {
    const v = d[j]! + w;
    if (v < d[k]!) d[k] = v;
  };
  for (let z = 0; z < n; z++)
    for (let x = 0; x < n; x++) {
      const k = z * n + x;
      if (d[k] === 0) continue;
      if (x > 0) relax(k, k - 1, 1);
      if (z > 0) relax(k, k - n, 1);
      if (x > 0 && z > 0) relax(k, k - n - 1, D);
      if (x < n - 1 && z > 0) relax(k, k - n + 1, D);
    }
  for (let z = n - 1; z >= 0; z--)
    for (let x = n - 1; x >= 0; x--) {
      const k = z * n + x;
      if (d[k] === 0) continue;
      if (x < n - 1) relax(k, k + 1, 1);
      if (z < n - 1) relax(k, k + n, 1);
      if (x < n - 1 && z < n - 1) relax(k, k + n + 1, D);
      if (x > 0 && z < n - 1) relax(k, k + n - 1, D);
    }
  // Water with no land in reach is deep.
  for (let k = 0; k < n * n; k++) if (d[k]! >= far) d[k] = 50;
  return d;
}

/** Blur a square field in place with a separable kernel (odd length), clamping at the edges. */
function blur(field: Float32Array, n: number, kernel: number[], stride = 1, channel = 0): void {
  const r = (kernel.length - 1) / 2;
  const tmp = new Float32Array(n * n);
  const at = (x: number, z: number) => field[(z * n + x) * stride + channel]!;
  for (let z = 0; z < n; z++)
    for (let x = 0; x < n; x++) {
      let s = 0;
      for (let i = -r; i <= r; i++) s += kernel[i + r]! * at(Math.min(n - 1, Math.max(0, x + i)), z);
      tmp[z * n + x] = s;
    }
  for (let z = 0; z < n; z++)
    for (let x = 0; x < n; x++) {
      let s = 0;
      for (let i = -r; i <= r; i++) s += kernel[i + r]! * tmp[Math.min(n - 1, Math.max(0, z + i)) * n + x]!;
      field[(z * n + x) * stride + channel] = s;
    }
}

const WIDE = [1 / 16, 4 / 16, 6 / 16, 4 / 16, 1 / 16];
const NARROW = [0.25, 0.5, 0.25];

/** How deep water is drawn, by its distance from the shore in tiles. */
function waterBed(distance: number): number {
  return -STEP - Math.min(Math.max(distance - 1, 0), 6) * 0.32;
}

/** Keep a tile-centre height true to its tile: dry land above the water, water tiles below it. */
function keepTrue(h: number, level: number): number {
  if (level < 0) return Math.min(h, WATER_Y - 0.14);
  const y = level * STEP;
  return Math.max(WATER_Y + 0.07, Math.min(y + 0.3, Math.max(y - 0.3, h)));
}

/**
 * The drawn ground of a Site: full detail over the Site and a Plot around it (`near`), coarse out to the horizon
 * (`far`), with building pads pressed in.
 */
export class Ground {
  readonly near: Lattice;
  readonly far: Lattice;
  readonly nearLook: GroundLook;
  readonly farLook: GroundLook;
  /** World x/z of the edges of the full-detail land. */
  readonly nearMin: number;
  readonly nearMax: number;
  private readonly base: Float32Array;
  private readonly pads: Pad[] = [];

  constructor(
    readonly site: Site,
    readonly land: Land,
  ) {
    const o = -site.size / 2;
    const bounds = squareBounds(site);
    const from = bounds.from - NEAR_REACH;
    const to = bounds.to + NEAR_REACH;
    const span = to - from;
    const step = (span * 2 + 1) ** 2 <= MAX_NEAR_VERTICES ? 0.5 : 1;
    const margin = 4;
    const grid = readTiles(site, land, from - margin, to + margin);
    const tn = grid.n;

    // Tile-centre heights: levels, with water deepening away from the shore; then smoothed and kept true.
    const dist = distanceToLand((k) => grid.level[k]! < 0, tn);
    const centre = new Float32Array(tn * tn);
    for (let k = 0; k < tn * tn; k++) centre[k] = grid.level[k]! < 0 ? waterBed(dist[k]!) : grid.level[k]! * STEP;
    blur(centre, tn, WIDE);
    for (let k = 0; k < tn * tn; k++) centre[k] = keepTrue(centre[k]!, grid.level[k]!);

    // Looks per tile centre, softened so kinds blend instead of ending at tile edges.
    const mix = new Float32Array(tn * tn * 4);
    const ore = new Float32Array(tn * tn * 4);
    const onSite = new Float32Array(tn * tn);
    const climate = land.climate;
    for (let k = 0; k < tn * tn; k++) {
      mix.set(groundMix(grid.terrain[k]!, grid.level[k]!, climate), k * 4);
      const d = grid.deposit[k];
      if (d) {
        const c = DEPOSIT_RGB[d];
        const a = grid.depositAmount[k]!;
        ore.set([c[0] * a, c[1] * a, c[2] * a, a], k * 4);
      }
      onSite[k] = grid.onSite[k]!;
    }
    for (let c = 0; c < 4; c++) {
      blur(mix, tn, NARROW, 4, c);
      blur(ore, tn, NARROW, 4, c);
    }
    blur(onSite, tn, WIDE);

    // Near lattice: Catmull-Rom through the tile centres, plus small bumps away from the shore.
    const n = Math.round(span / step) + 1;
    const height = new Float32Array(n * n);
    const look: GroundLook = { mix: new Float32Array(n * n * 4), ore: new Float32Array(n * n * 4), site: new Float32Array(n * n) };
    const tileIndex = (tx: number, tz: number) => (tz - grid.from) * tn + (tx - grid.from);
    for (let j = 0; j < n; j++) {
      const w = from + j * step; // tile coordinate
      const pz = w - 0.5;
      const tz0 = Math.floor(pz);
      const wz = catmullRom(pz - tz0);
      const fz = pz - tz0;
      for (let i = 0; i < n; i++) {
        const u = from + i * step;
        const px = u - 0.5;
        const tx0 = Math.floor(px);
        const wx = catmullRom(px - tx0);
        const fx = px - tx0;
        let h = 0;
        for (let b = 0; b < 4; b++) {
          const row = tileIndex(tx0 - 1, tz0 - 1 + b);
          let s = 0;
          for (let a = 0; a < 4; a++) s += wx[a]! * centre[row + a]!;
          h += wz[b]! * s;
        }
        const k00 = tileIndex(tx0, tz0);
        const c00 = centre[k00]!;
        const c10 = centre[k00 + 1]!;
        const c01 = centre[k00 + tn]!;
        const c11 = centre[k00 + tn + 1]!;
        h = Math.min(Math.max(h, Math.min(c00, c10, c01, c11)), Math.max(c00, c10, c01, c11));
        const x = u + o;
        const z = w + o;
        h += microRelief(x, z) * smoothstep(0.1, 0.4, Math.abs(h - WATER_Y));
        const v = j * n + i;
        height[v] = h;
        // Looks: bilinear between the four tile centres around the vertex.
        const b00 = (1 - fx) * (1 - fz);
        const b10 = fx * (1 - fz);
        const b01 = (1 - fx) * fz;
        const b11 = fx * fz;
        for (let c = 0; c < 4; c++) {
          look.mix[v * 4 + c] =
            b00 * mix[k00 * 4 + c]! + b10 * mix[(k00 + 1) * 4 + c]! + b01 * mix[(k00 + tn) * 4 + c]! + b11 * mix[(k00 + tn + 1) * 4 + c]!;
          look.ore[v * 4 + c] =
            b00 * ore[k00 * 4 + c]! + b10 * ore[(k00 + 1) * 4 + c]! + b01 * ore[(k00 + tn) * 4 + c]! + b11 * ore[(k00 + tn + 1) * 4 + c]!;
        }
        look.site[v] = b00 * onSite[k00]! + b10 * onSite[k00 + 1]! + b01 * onSite[k00 + tn]! + b11 * onSite[k00 + tn + 1]!;
      }
    }
    this.near = { x0: from + o, z0: from + o, step, n, height };
    this.base = height.slice();
    this.nearLook = look;
    this.nearMin = from + o;
    this.nearMax = to + o;

    const farBuilt = this.buildFar(from, to, o);
    this.far = farBuilt.lattice;
    this.farLook = farBuilt.look;
  }

  /** The coarse land out to the horizon. Its vertices on and inside the edge of the near land copy the near land. */
  private buildFar(nearFrom: number, nearTo: number, o: number): { lattice: Lattice; look: GroundLook } {
    const from = nearFrom - FAR_REACH + NEAR_REACH;
    const to = nearTo + FAR_REACH - NEAR_REACH;
    const n = Math.round((to - from) / FAR_STEP) + 1;
    const levels = new Int8Array(n * n);
    const terrains = new Array<Terrain>(n * n);
    const value = new Float32Array(n * n);
    for (let j = 0; j < n; j++)
      for (let i = 0; i < n; i++) {
        const g = this.land.groundAt(from + i * FAR_STEP, from + j * FAR_STEP);
        levels[j * n + i] = g.level;
        terrains[j * n + i] = g.terrain;
      }
    const dist = distanceToLand((k) => levels[k]! < 0, n);
    for (let k = 0; k < n * n; k++) value[k] = levels[k]! < 0 ? waterBed(dist[k]! * FAR_STEP) : levels[k]! * STEP;
    blur(value, n, NARROW);
    const look: GroundLook = { mix: new Float32Array(n * n * 4), ore: new Float32Array(n * n * 4), site: new Float32Array(n * n) };
    const height = new Float32Array(n * n);
    for (let j = 0; j < n; j++)
      for (let i = 0; i < n; i++) {
        const k = j * n + i;
        const x = from + i * FAR_STEP + o;
        const z = from + j * FAR_STEP + o;
        const inside = x >= this.nearMin && x <= this.nearMax && z >= this.nearMin && z <= this.nearMax;
        let h = inside ? this.latticeHeight(this.near, x, z) : keepTrue(value[k]!, levels[k]!);
        if (!inside) h += microRelief(x, z) * 2 * smoothstep(0.1, 0.4, Math.abs(h - WATER_Y));
        height[k] = h;
        look.mix.set(groundMix(terrains[k]!, levels[k]!, this.land.climate), k * 4);
      }
    for (let c = 0; c < 4; c++) blur(look.mix, n, NARROW, 4, c);
    return { lattice: { x0: from + o, z0: from + o, step: FAR_STEP, n, height }, look };
  }

  /** Height of the drawn ground at world (x, z): continuous, matching the triangles on screen. */
  heightAt(x: number, z: number): number {
    if (x >= this.nearMin && x <= this.nearMax && z >= this.nearMin && z <= this.nearMax) return this.latticeHeight(this.near, x, z);
    const f = this.far;
    const end = f.x0 + (f.n - 1) * f.step;
    if (x >= f.x0 && x <= end && z >= f.z0 && z <= end) return this.latticeHeight(f, x, z);
    const level = this.land.groundAt(Math.floor(x + this.site.size / 2), Math.floor(z + this.site.size / 2)).level;
    return level < 0 ? waterBed(10) : level * STEP;
  }

  /** Height on a lattice, by the same two triangles per cell that are drawn (diagonal from (i+1, j) to (i, j+1)). */
  latticeHeight(l: Lattice, x: number, z: number): number {
    const gx = Math.min(l.n - 1.000001, Math.max(0, (x - l.x0) / l.step));
    const gz = Math.min(l.n - 1.000001, Math.max(0, (z - l.z0) / l.step));
    const i = Math.floor(gx);
    const j = Math.floor(gz);
    const fx = gx - i;
    const fz = gz - j;
    const h = l.height;
    const a = h[j * l.n + i]!;
    const b = h[j * l.n + i + 1]!;
    const c = h[(j + 1) * l.n + i]!;
    const d = h[(j + 1) * l.n + i + 1]!;
    if (fx + fz <= 1) return a + (b - a) * fx + (c - a) * fz;
    return d + (c - d) * (1 - fx) + (b - d) * (1 - fz);
  }

  /** Upward unit normal of the drawn ground at world (x, z). */
  normalAt(x: number, z: number): { x: number; y: number; z: number } {
    const e = this.near.step;
    const dx = (this.heightAt(x + e, z) - this.heightAt(x - e, z)) / (2 * e);
    const dz = (this.heightAt(x, z + e) - this.heightAt(x, z - e)) / (2 * e);
    const l = Math.hypot(dx, 1, dz);
    return { x: -dx / l, y: 1 / l, z: -dz / l };
  }

  /** Steepness at world (x, z): 0 flat, 1 vertical. */
  slopeAt(x: number, z: number): number {
    return 1 - this.normalAt(x, z).y;
  }

  /** The kind of ground at world (x, z): the Site's tile there, or the land around it. */
  terrainAt(x: number, z: number): Terrain {
    const tx = Math.floor(x + this.site.size / 2);
    const tz = Math.floor(z + this.site.size / 2);
    return tileAt(this.site, tx, tz)?.terrain ?? this.land.groundAt(tx, tz).terrain;
  }

  /** Is world (x, z) under water (and not under a pad)? */
  isWater(x: number, z: number): boolean {
    return this.heightAt(x, z) < WATER_Y;
  }

  /** The pads pressed into the ground so far. */
  get padList(): readonly Pad[] {
    return this.pads;
  }

  /**
   * Press a building pad into the ground: flat at its height under it, graded back to the land around it.
   * Returns the range of near-lattice vertices that changed (inclusive), or null if none did.
   */
  addPad(pad: Pad): { i0: number; i1: number; j0: number; j1: number } | null {
    this.pads.push(pad);
    const l = this.near;
    const reach = PAD_SKIRT + l.step;
    const i0 = Math.max(0, Math.floor((pad.x0 - reach - l.x0) / l.step));
    const i1 = Math.min(l.n - 1, Math.ceil((pad.x1 + reach - l.x0) / l.step));
    const j0 = Math.max(0, Math.floor((pad.z0 - reach - l.z0) / l.step));
    const j1 = Math.min(l.n - 1, Math.ceil((pad.z1 + reach - l.z0) / l.step));
    if (i0 > i1 || j0 > j1) return null;
    this.reshape(i0, i1, j0, j1);
    return { i0, i1, j0, j1 };
  }

  /** Recompute the near heights in a range from the land and every pad: skirts first, then the flat pads on top. */
  private reshape(i0: number, i1: number, j0: number, j1: number): void {
    const l = this.near;
    for (let j = j0; j <= j1; j++)
      for (let i = i0; i <= i1; i++) {
        const x = l.x0 + i * l.step;
        const z = l.z0 + j * l.step;
        let h = this.base[j * l.n + i]!;
        for (const p of this.pads) {
          const d = Math.hypot(Math.max(p.x0 - x, 0, x - p.x1), Math.max(p.z0 - z, 0, z - p.z1));
          if (d > 0 && d < PAD_SKIRT) h = p.y + (h - p.y) * smoothstep(0, PAD_SKIRT, d);
        }
        for (const p of this.pads) if (x >= p.x0 && x <= p.x1 && z >= p.z0 && z <= p.z1) h = p.y;
        l.height[j * l.n + i] = h;
      }
  }
}

/** The colour of each Raw Material's Deposits, on the ground, the rocks and in the HUD. */
export const DEPOSIT_COLOUR: Record<RawMaterial, number> = {
  aluminium: 0xdfe6ee,
  copper: 0xd8763a,
  silicon: 0x7b83eb,
};

/** The same as 0–1 sRGB numbers, for the ore patches on the ground. */
const DEPOSIT_RGB = Object.fromEntries(
  Object.entries(DEPOSIT_COLOUR).map(([k, c]) => [k, [((c >> 16) & 255) / 255, ((c >> 8) & 255) / 255, (c & 255) / 255]]),
) as Record<RawMaterial, [number, number, number]>;

/** Build the drawn ground of a Site, with pads under these buildings. */
export function buildGround(site: Site, land: Land, pads: readonly Pad[] = []): Ground {
  const ground = new Ground(site, land);
  for (const p of pads) ground.addPad(p);
  return ground;
}

/** Height of the drawn ground at world (x, z), on the Site and out in the scenery. */
export function surfaceHeight(ground: Ground, x: number, z: number): number {
  return ground.heightAt(x, z);
}
