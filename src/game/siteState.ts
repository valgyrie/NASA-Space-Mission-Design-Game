import { type BuildingKind, type FactoryKind, PARTS, type Part } from '../economy/part';
import { RAW_MATERIALS, type RawMaterial } from '../economy/rawMaterial';
import { type Site, tileAt } from '../site/site';
import type { AcceptedContract } from './contracts';
import { type Design, emptyDesign } from './spacecraft';
import {
  BASE_STORAGE_KG,
  BUILD_COST,
  MAX_FRAME_SECONDS,
  MINE_OUTPUT_PER_DAY,
  RECIPES,
  SECONDS_PER_DAY,
  START_MONEY,
  type Speed,
  WAREHOUSE_STORAGE_KG,
} from './balance';

export interface Mine {
  x: number;
  z: number;
}

export interface Factory {
  kind: FactoryKind;
  x: number;
  z: number;
  /** The Part it makes, one after another. */
  making: Part;
  /** Game days into the Part it is making now, or null while it waits for Raw Materials. */
  progress: number | null;
}

export interface Warehouse {
  x: number;
  z: number;
}

/** Everything about the running Site that changes over time and is saved. */
export interface SiteState {
  money: number;
  /** Game days since the start date. Fractions count. */
  day: number;
  mines: Mine[];
  factories: Factory[];
  warehouses: Warehouse[];
  /** Kilograms of each Raw Material in stock. */
  stock: Record<RawMaterial, number>;
  /** How many of each Part are in stock. */
  parts: Record<Part, number>;
  /** Contracts the Company has accepted. */
  contracts: AcceptedContract[];
  /** The Spacecraft on the Mission Designer's table. */
  design: Design;
}

const zeroes = <K extends string>(keys: readonly K[]) => Object.fromEntries(keys.map((k) => [k, 0])) as Record<K, number>;

export function newSiteState(): SiteState {
  return {
    money: START_MONEY,
    day: 0,
    mines: [],
    factories: [],
    warehouses: [],
    stock: zeroes(RAW_MATERIALS),
    parts: zeroes(PARTS),
    contracts: [],
    design: emptyDesign(),
  };
}

/** The Parts a kind of Factory can make, in menu order. */
export function partsMadeBy(kind: FactoryKind): Part[] {
  return PARTS.filter((p) => RECIPES[p].factory === kind);
}

// ---- Building ----

export type PlaceProblem = 'noDeposit' | 'onDeposit' | 'water' | 'occupied' | 'money';

export type PlaceCheck = { ok: true } | { ok: false; problem: PlaceProblem };

function occupied(state: SiteState, x: number, z: number): boolean {
  const here = (b: { x: number; z: number }) => b.x === x && b.z === z;
  return state.mines.some(here) || state.factories.some(here) || state.warehouses.some(here);
}

/**
 * Can a building of `kind` go on tile (x, z)? Mines need a free Deposit; everything else needs
 * dry land without one, so Deposits stay free for Mines. All of them cost money.
 */
export function checkBuild(site: Site, state: SiteState, kind: BuildingKind, x: number, z: number): PlaceCheck {
  const tile = tileAt(site, x, z);
  if (kind === 'mine') {
    if (!tile?.deposit) return { ok: false, problem: 'noDeposit' };
  } else {
    if (!tile || tile.terrain === 'water') return { ok: false, problem: 'water' };
    if (tile.deposit) return { ok: false, problem: 'onDeposit' };
  }
  if (occupied(state, x, z)) return { ok: false, problem: 'occupied' };
  if (state.money < BUILD_COST[kind]) return { ok: false, problem: 'money' };
  return { ok: true };
}

/** Build if allowed. Returns what was checked, so the caller can explain a "no". */
export function build(site: Site, state: SiteState, kind: BuildingKind, x: number, z: number): PlaceCheck {
  const check = checkBuild(site, state, kind, x, z);
  if (!check.ok) return check;
  state.money -= BUILD_COST[kind];
  if (kind === 'mine') state.mines.push({ x, z });
  else if (kind === 'warehouse') state.warehouses.push({ x, z });
  else state.factories.push({ kind, x, z, making: partsMadeBy(kind)[0]!, progress: null });
  return check;
}

/** What stands on tile (x, z), if anything. */
export function buildingAt(
  state: SiteState,
  x: number,
  z: number,
): { kind: 'mine'; mine: Mine } | { kind: FactoryKind; factory: Factory } | { kind: 'warehouse' } | null {
  const here = (b: { x: number; z: number }) => b.x === x && b.z === z;
  const mine = state.mines.find(here);
  if (mine) return { kind: 'mine', mine };
  const factory = state.factories.find(here);
  if (factory) return { kind: factory.kind, factory };
  if (state.warehouses.some(here)) return { kind: 'warehouse' };
  return null;
}

/** Raw Material each Mine digs up, keyed by what is under it. */
export function mineMaterial(site: Site, mine: Mine): RawMaterial | null {
  return tileAt(site, mine.x, mine.z)?.deposit ?? null;
}

// ---- Storage ----

/** Kilograms the Site can store: the yard plus every Warehouse. */
export function storageCapacity(state: SiteState): number {
  return BASE_STORAGE_KG + state.warehouses.length * WAREHOUSE_STORAGE_KG;
}

/** Kilograms in storage now: Raw Materials plus the mass of every Part. */
export function storageUsed(state: SiteState): number {
  let kg = 0;
  for (const m of RAW_MATERIALS) kg += state.stock[m];
  for (const p of PARTS) kg += state.parts[p] * RECIPES[p].massKg;
  return kg;
}

export function storageFree(state: SiteState): number {
  return Math.max(0, storageCapacity(state) - storageUsed(state));
}

// ---- Production ----

/** Kilograms per game day of each Raw Material from all Mines (while there is room to store it). */
export function outputPerDay(site: Site, state: SiteState): Record<RawMaterial, number> {
  const out = zeroes(RAW_MATERIALS);
  for (const mine of state.mines) {
    const material = mineMaterial(site, mine);
    if (material) out[material] += MINE_OUTPUT_PER_DAY;
  }
  return out;
}

/** Raw Materials the Factory still needs before it can start its next Part (kilograms short of each). */
export function missingInputs(state: SiteState, part: Part): Partial<Record<RawMaterial, number>> {
  const missing: Partial<Record<RawMaterial, number>> = {};
  for (const [m, kg] of Object.entries(RECIPES[part].inputs) as [RawMaterial, number][]) {
    if (state.stock[m] < kg) missing[m] = kg - state.stock[m];
  }
  return missing;
}

function takeInputs(state: SiteState, part: Part): boolean {
  if (Object.keys(missingInputs(state, part)).length > 0) return false;
  for (const [m, kg] of Object.entries(RECIPES[part].inputs) as [RawMaterial, number][]) state.stock[m] -= kg;
  return true;
}

function returnInputs(state: SiteState, part: Part): void {
  for (const [m, kg] of Object.entries(RECIPES[part].inputs) as [RawMaterial, number][]) state.stock[m] += kg;
}

/** Run one Factory for `days`: it takes Raw Materials when it starts a Part and adds the Part when done. */
function runFactory(state: SiteState, factory: Factory, days: number): void {
  const recipe = RECIPES[factory.making];
  let left = days;
  while (left > 0) {
    if (factory.progress === null) {
      if (!takeInputs(state, factory.making)) return;
      factory.progress = 0;
    }
    const need = recipe.days - factory.progress;
    if (left < need) {
      factory.progress += left;
      return;
    }
    left -= need;
    state.parts[factory.making] += 1;
    factory.progress = null;
  }
}

/** Switch what a Factory makes. A Part it had started is dropped and its Raw Materials go back to stock. */
export function setMaking(state: SiteState, factory: Factory, part: Part): void {
  if (RECIPES[part].factory !== factory.kind || factory.making === part) return;
  if (factory.progress !== null) returnInputs(state, factory.making);
  factory.making = part;
  factory.progress = null;
}

/** Move the Site forward by `days` game days: the date advances, Mines dig and Factories make Parts. */
export function advanceDays(site: Site, state: SiteState, days: number): void {
  if (days <= 0) return;
  state.day += days;
  // Mines stop when storage is full. A finished Part always weighs less than its inputs, so Factories never overfill it.
  const out = outputPerDay(site, state);
  const total = RAW_MATERIALS.reduce((sum, m) => sum + out[m], 0) * days;
  const share = total > 0 ? Math.min(1, storageFree(state) / total) : 0;
  for (const m of RAW_MATERIALS) state.stock[m] += out[m] * days * share;
  for (const factory of state.factories) runFactory(state, factory, days);
}

/** Game days that pass in `seconds` of real time at `speed`. Long gaps are capped. */
export function daysFor(seconds: number, speed: Speed): number {
  return (Math.min(seconds, MAX_FRAME_SECONDS) * speed) / SECONDS_PER_DAY;
}
