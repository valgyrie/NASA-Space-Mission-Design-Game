import type { RawMaterial } from '../economy/rawMaterial';
import { type Site, plotOf, tileAt } from '../site/site';
import { DEPOSIT_KG_PER_TILE } from './balance';
import { isDirector } from './modes';
import type { SiteState } from './siteState';

/**
 * Deposits run out (Mission Director). A Deposit is a patch of touching tiles of one Raw Material, inside one Plot
 * (plots.ts counts them the same way). Each tile holds DEPOSIT_KG_PER_TILE; the state keeps how much has been dug
 * from each Deposit, so a new one is full. In Explorer they never run out.
 */

export interface Deposit {
  /** Its top-left tile, "x,z" (the first by row, then column): stable for as long as the Site exists. */
  key: string;
  material: RawMaterial;
  tiles: number;
  /** Kilograms it held when full. */
  sizeKg: number;
}

/** Deposits never change once their Plot is part of the Site, so each is worked out once per tile. */
const found = new WeakMap<Site, Map<string, Deposit | null>>();

/** The Deposit tile (x, z) is part of, or null when it has none. */
export function depositAt(site: Site, x: number, z: number): Deposit | null {
  let cache = found.get(site);
  if (!cache) found.set(site, (cache = new Map()));
  const at = `${x},${z}`;
  if (cache.has(at)) return cache.get(at)!;
  const deposit = fill(site, x, z);
  if (!deposit) cache.set(at, null);
  return deposit;
}

function fill(site: Site, x: number, z: number): Deposit | null {
  const material = tileAt(site, x, z)?.deposit;
  if (!material) return null;
  const plot = plotOf(x, z);
  const seen = new Set<string>([`${x},${z}`]);
  const queue: [number, number][] = [[x, z]];
  const tiles: [number, number][] = [];
  while (queue.length > 0) {
    const [cx, cz] = queue.pop()!;
    tiles.push([cx, cz]);
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = cx + dx;
      const nz = cz + dz;
      const k = `${nx},${nz}`;
      if (seen.has(k)) continue;
      const p = plotOf(nx, nz);
      if (p.px !== plot.px || p.pz !== plot.pz || tileAt(site, nx, nz)?.deposit !== material) continue;
      seen.add(k);
      queue.push([nx, nz]);
    }
  }
  const [kx, kz] = tiles.reduce((a, b) => (b[1] < a[1] || (b[1] === a[1] && b[0] < a[0]) ? b : a));
  const deposit: Deposit = { key: `${kx},${kz}`, material, tiles: tiles.length, sizeKg: tiles.length * DEPOSIT_KG_PER_TILE };
  const cache = found.get(site)!;
  for (const [tx, tz] of tiles) cache.set(`${tx},${tz}`, deposit);
  return deposit;
}

/** Kilograms left in the Deposit. Explorer: always full. */
export function depositLeft(state: Pick<SiteState, 'difficulty' | 'depositsUsed'>, deposit: Deposit): number {
  if (!isDirector(state)) return deposit.sizeKg;
  return Math.max(0, deposit.sizeKg - (state.depositsUsed[deposit.key] ?? 0));
}

/** Share of the Deposit left, 0–1. */
export function depositShare(state: Pick<SiteState, 'difficulty' | 'depositsUsed'>, deposit: Deposit): number {
  return depositLeft(state, deposit) / deposit.sizeKg;
}

/** Take kilograms out of the Deposit (Mission Director only). Returns what it could give. */
export function digDeposit(state: Pick<SiteState, 'difficulty' | 'depositsUsed'>, deposit: Deposit, kg: number): number {
  if (!isDirector(state)) return kg;
  const got = Math.min(kg, depositLeft(state, deposit));
  if (got > 0) state.depositsUsed[deposit.key] = (state.depositsUsed[deposit.key] ?? 0) + got;
  return got;
}
