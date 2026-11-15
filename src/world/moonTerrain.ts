/**
 * The ground of the two landing sites as a height field, in metres (x east, z south, y up; the landing spot at the
 * origin). Pure maths, no three.js, so it can be tested and used for placing things on the ground.
 *
 *  - Tranquility Base: flat mare, gentle swells, craters of every size from a few hundred metres down to
 *    half a metre (many small, few large), most of them old and soft-rimmed; West crater (about 190 m across) lies
 *    some 400 m east of the landing spot, the one Armstrong flew over before landing.
 *  - The south-pole ridge: the lander sits on a broad ridge crest; the ground falls away on both sides into big,
 *    deep craters whose floors never see the Sun; rougher and more cratered everywhere.
 */

export type LunarSite = 'tranquility' | 'southPole';

interface Octave {
  /** Largest crater radius in this size class, metres. */
  rMax: number;
  /** Chance a cell holds a crater. */
  chance: number;
  /** Depth / radius range (old craters are shallow). */
  depth: [number, number];
}

const OCTAVES: Record<LunarSite, Octave[]> = {
  tranquility: [
    { rMax: 70, chance: 0.22, depth: [0.06, 0.16] },
    { rMax: 22, chance: 0.3, depth: [0.08, 0.2] },
    { rMax: 7, chance: 0.42, depth: [0.1, 0.22] },
    { rMax: 2.4, chance: 0.5, depth: [0.1, 0.22] },
    { rMax: 0.8, chance: 0.55, depth: [0.1, 0.2] },
  ],
  southPole: [
    { rMax: 120, chance: 0.3, depth: [0.12, 0.24] },
    { rMax: 35, chance: 0.4, depth: [0.12, 0.24] },
    { rMax: 10, chance: 0.5, depth: [0.12, 0.24] },
    { rMax: 3, chance: 0.55, depth: [0.12, 0.22] },
    { rMax: 0.9, chance: 0.55, depth: [0.1, 0.2] },
  ],
};

/** Large named or shaping features, placed by hand: [x, z, radius, depth, rim]. */
const BIG: Record<LunarSite, [number, number, number, number, number][]> = {
  // West crater, ~400 m east of Tranquility Base (the LM flew over it from the east).
  tranquility: [[430, -40, 95, 22, 5], [-900, 650, 160, 18, 4], [1500, -1200, 300, 30, 6]],
  // Deep craters either side of the ridge.
  southPole: [[-1500, 200, 900, 260, 25], [1700, -600, 1100, 300, 30], [-600, -2600, 700, 220, 20], [500, 2400, 800, 200, 18], [-3600, -1800, 1500, 380, 30]],
};

/** Repeatable 0–1 number for a whole-number cell. */
function hash(x: number, z: number, k: number): number {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(z | 0, 668265263) ^ Math.imul(k | 0, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Smooth 2D value noise, 0–1. */
function noise(x: number, z: number, k: number): number {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const sx = fx * fx * (3 - 2 * fx);
  const sz = fz * fz * (3 - 2 * fz);
  const a = hash(ix, iz, k);
  const b = hash(ix + 1, iz, k);
  const c = hash(ix, iz + 1, k);
  const d = hash(ix + 1, iz + 1, k);
  return a + (b - a) * sx + (c - a) * sz + (a - b - c + d) * sx * sz;
}

/** One crater's height at distance d (in radii) from its centre: bowl, raised rim, rim falling off outside. */
function crater(d: number, depth: number, rim: number): number {
  if (d >= 2.6) return 0;
  if (d < 1) return Math.max(rim + depth * (d * d - 1), rim - depth * 0.82);
  const o = d - 1;
  return rim * Math.exp(-o * o * 9) * (1 - o / 1.6);
}

export interface GroundSample {
  height: number;
  /** Brightness factor of the regolith (fresh crater ejecta is paler). */
  albedo: number;
}

/**
 * Height (and albedo) of the site's ground at (x, z). `detail`: craters smaller than this radius are left out
 * (for far-away ground and for shadow look-ups, which don't need them).
 */
export function groundAt(site: LunarSite, x: number, z: number, detail = 0, out: GroundSample = { height: 0, albedo: 1 }): GroundSample {
  const pole = site === 'southPole';
  // Broad swells; on the pole, the ridge running north-south, falling away to both sides.
  let h = (noise(x / 220, z / 220, 1) - 0.5) * (pole ? 16 : 3) + (noise(x / 60, z / 60, 2) - 0.5) * (pole ? 4 : 0.8);
  if (pole) {
    const across = x / 1400;
    h -= 260 * across * across * (1 + 0.3 * Math.sin(z / 900)) + 60 * (noise(x / 700, z / 700, 3) - 0.5);
  }
  let albedo = 1 + (noise(x / 35, z / 35, 4) - 0.5) * 0.12;
  // A clear, nearly flat landing spot: the craters fade out within a few metres of the origin.
  const r2 = x * x + z * z;
  const keep = Math.min(1, r2 / (pole ? 900 : 400));
  for (const [cx, cz, r, depth, rim] of BIG[site]) {
    const d = Math.hypot(x - cx, z - cz) / r;
    h += crater(d, depth, rim);
  }
  const octaves = OCTAVES[site];
  for (let k = 0; k < octaves.length; k++) {
    const o = octaves[k]!;
    if (o.rMax < detail) continue;
    const cell = o.rMax * 2.6;
    const ix = Math.floor(x / cell);
    const iz = Math.floor(z / cell);
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        const cx = ix + dx;
        const cz = iz + dz;
        if (hash(cx, cz, 10 + k) > o.chance) continue;
        const px = (cx + 0.15 + 0.7 * hash(cx, cz, 20 + k)) * cell;
        const pz = (cz + 0.15 + 0.7 * hash(cx, cz, 30 + k)) * cell;
        // Many more small craters than big ones within a class.
        const r = o.rMax * (0.35 + 0.65 * hash(cx, cz, 40 + k) ** 2);
        const d = Math.hypot(x - px, z - pz) / r;
        if (d >= 2.6) continue;
        const fresh = hash(cx, cz, 50 + k);
        const depthR = o.depth[0] + (o.depth[1] - o.depth[0]) * fresh;
        h += crater(d, depthR * r, depthR * r * 0.22) * keep;
        // Young craters throw out pale ejecta round their rims.
        if (fresh > 0.8 && d > 0.7 && d < 2.2) albedo += (fresh - 0.8) * 1.6 * (1 - Math.abs(d - 1.2) / 1.0) * keep;
      }
    }
  }
  out.height = h;
  out.albedo = Math.max(0.75, Math.min(1.45, albedo));
  return out;
}

/** The Moon's radius, m: ground dips by d²/2R with distance d, so the horizon is close (about 2.5 km for a person). */
export const MOON_RADIUS_M = 1_737_400;

/** How far the ground drops below a flat plane at distance d from the origin, from the Moon's curve. */
export function curveDrop(d: number): number {
  return (d * d) / (2 * MOON_RADIUS_M);
}
