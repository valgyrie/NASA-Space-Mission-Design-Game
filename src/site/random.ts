/** Small seeded random numbers. Same Seed in, same numbers out, on every browser. */

/** Turn any text into a 32-bit number (FNV-1a). */
export function hashText(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Random numbers in [0, 1), from a 32-bit start value (mulberry32). */
export type Rng = () => number;

export function makeRng(start: number): Rng {
  let a = start >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Whole number from min to max, both included. */
export function randInt(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

export function pick<T>(rng: Rng, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)]!;
}

/** Pick an item with a weight per item. */
export function pickWeighted<T>(rng: Rng, items: readonly (readonly [T, number])[]): T {
  const total = items.reduce((sum, [, w]) => sum + w, 0);
  let r = rng() * total;
  for (const [item, w] of items) {
    r -= w;
    if (r < 0) return item;
  }
  return items[items.length - 1]![0];
}

/** Smooth 2D value noise in [0, 1], tiled on a grid of `cell` tiles. */
export function makeNoise(rng: Rng, cell: number): (x: number, z: number) => number {
  const N = 256;
  const values = Array.from({ length: N * N }, () => rng());
  const at = (ix: number, iz: number) => values[((iz & (N - 1)) * N + (ix & (N - 1))) >>> 0]!;
  const smooth = (t: number) => t * t * (3 - 2 * t);
  return (x, z) => {
    const fx = x / cell;
    const fz = z / cell;
    const ix = Math.floor(fx);
    const iz = Math.floor(fz);
    const tx = smooth(fx - ix);
    const tz = smooth(fz - iz);
    const top = at(ix, iz) + (at(ix + 1, iz) - at(ix, iz)) * tx;
    const bottom = at(ix, iz + 1) + (at(ix + 1, iz + 1) - at(ix, iz + 1)) * tx;
    return top + (bottom - top) * tz;
  };
}
