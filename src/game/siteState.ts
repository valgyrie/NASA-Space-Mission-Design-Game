import { RAW_MATERIALS, type RawMaterial } from '../economy/rawMaterial';
import { type Site, tileAt } from '../site/site';
import { MAX_FRAME_SECONDS, MINE_COST, MINE_OUTPUT_PER_DAY, SECONDS_PER_DAY, START_MONEY, type Speed } from './balance';

export interface Mine {
  x: number;
  z: number;
}

/** Everything about the running Site that changes over time and is saved. */
export interface SiteState {
  money: number;
  /** Game days since the start date. Fractions count. */
  day: number;
  mines: Mine[];
  /** Kilograms of each Raw Material in stock. */
  stock: Record<RawMaterial, number>;
}

export function newSiteState(): SiteState {
  return {
    money: START_MONEY,
    day: 0,
    mines: [],
    stock: Object.fromEntries(RAW_MATERIALS.map((m) => [m, 0])) as Record<RawMaterial, number>,
  };
}

export type PlaceProblem = 'noDeposit' | 'occupied' | 'money';

export type PlaceCheck = { ok: true; material: RawMaterial } | { ok: false; problem: PlaceProblem };

/** Can a Mine go on tile (x, z)? It needs a free Deposit and enough money. */
export function checkMine(site: Site, state: SiteState, x: number, z: number): PlaceCheck {
  const deposit = tileAt(site, x, z)?.deposit;
  if (!deposit) return { ok: false, problem: 'noDeposit' };
  if (state.mines.some((m) => m.x === x && m.z === z)) return { ok: false, problem: 'occupied' };
  if (state.money < MINE_COST) return { ok: false, problem: 'money' };
  return { ok: true, material: deposit };
}

/** Build a Mine if allowed. Returns what was checked, so the caller can explain a "no". */
export function placeMine(site: Site, state: SiteState, x: number, z: number): PlaceCheck {
  const check = checkMine(site, state, x, z);
  if (check.ok) {
    state.money -= MINE_COST;
    state.mines.push({ x, z });
  }
  return check;
}

/** Raw Material each Mine digs up, keyed by what is under it. */
export function mineMaterial(site: Site, mine: Mine): RawMaterial | null {
  return tileAt(site, mine.x, mine.z)?.deposit ?? null;
}

/** Kilograms per game day of each Raw Material from all Mines. */
export function outputPerDay(site: Site, state: SiteState): Record<RawMaterial, number> {
  const out = Object.fromEntries(RAW_MATERIALS.map((m) => [m, 0])) as Record<RawMaterial, number>;
  for (const mine of state.mines) {
    const material = mineMaterial(site, mine);
    if (material) out[material] += MINE_OUTPUT_PER_DAY;
  }
  return out;
}

/** Move the Site forward by `days` game days: the date advances and Mines produce. */
export function advanceDays(site: Site, state: SiteState, days: number): void {
  if (days <= 0) return;
  state.day += days;
  const out = outputPerDay(site, state);
  for (const m of RAW_MATERIALS) state.stock[m] += out[m] * days;
}

/** Game days that pass in `seconds` of real time at `speed`. Long gaps are capped. */
export function daysFor(seconds: number, speed: Speed): number {
  return (Math.min(seconds, MAX_FRAME_SECONDS) * speed) / SECONDS_PER_DAY;
}
