import { type BuildingKind, type FactoryKind, PARTS, type Part, type SiteBuildingKind } from '../economy/part';
import { RAW_MATERIALS, type RawMaterial } from '../economy/rawMaterial';
import { type Site, tileAt } from '../site/site';
import type { AnomalyKind } from './anomalies';
import type { AcceptedContract, ContractId } from './contracts';
import type { HistoryCardId, Patch } from './history';
import type { LaunchVehicleId } from './launchVehicles';
import { type Research, newResearch, runLabs } from './research';
import type { TutorialProgress } from './tutorial';
import type { Mission, MissionReport } from './mission';
import { type Design, emptyDesign } from './spacecraft';
import {
  BASE_STORAGE_KG,
  BUILD_COST,
  LEVEL_OUTPUT_STEP,
  MARK_STEP,
  MAX_FRAME_SECONDS,
  MINE_OUTPUT_PER_DAY,
  RECIPES,
  SECONDS_PER_DAY,
  START_MONEY,
  type Speed,
  WAREHOUSE_STORAGE_KG,
} from './balance';

/** A building's level and the Upgrade under way, if any. Every building has them. */
export interface Levels {
  /** 1 when built; each Upgrade raises it by one. */
  level: number;
  /** Game day the Upgrade under way finishes, or null when there is none. */
  upgradeDay: number | null;
}

export interface Mine extends Levels {
  x: number;
  z: number;
}

export interface Factory extends Levels {
  kind: FactoryKind;
  x: number;
  z: number;
  /** The Part it makes, one after another. */
  making: Part;
  /** Game days into the Part it is making now, or null while it waits for Raw Materials. */
  progress: number | null;
}

export interface Warehouse extends Levels {
  x: number;
  z: number;
}

/** A Research Lab: turns the Data Spacecraft send home into Research Points. */
export interface Lab extends Levels {
  x: number;
  z: number;
}

/** The Assembly Hall: puts Spacecraft together. Every Site starts with one; its level sets the biggest Bus. */
export interface AssemblyHall extends Levels {
  x: number;
  z: number;
}

/** Any building standing on the Site. */
export type Building = Mine | Factory | Warehouse | Lab | AssemblyHall;

/** Everything about the running Site that changes over time and is saved. */
export interface SiteState {
  money: number;
  /** Game days since the start date. Fractions count. */
  day: number;
  mines: Mine[];
  factories: Factory[];
  warehouses: Warehouse[];
  labs: Lab[];
  /** Null only until the Site is shown the first time, which places it (`placeAssemblyHall`). */
  assemblyHall: AssemblyHall | null;
  /** Kilograms of each Raw Material in stock. */
  stock: Record<RawMaterial, number>;
  /** How many of each Part are in stock. */
  parts: Record<Part, number>;
  /**
   * How many of those Parts are better than Mk 1: index 0 counts Mk 2, index 1 Mk 3. The rest are Mk 1.
   * A Part's Mark is the level of the Factory that made it; the Market trades Mk 1 Parts.
   */
  betterParts: Record<Part, number[]>;
  /** Contracts the Company has accepted. */
  contracts: AcceptedContract[];
  /** Contracts the Company has fulfilled, oldest first. */
  completed: ContractId[];
  /** The Spacecraft on the Mission Designer's table. */
  design: Design;
  /** The Mission being assembled and shipped, or waiting at the Launch Site; null when none. */
  mission: Mission | null;
  /** Every Mission Report so far, oldest first. */
  reports: MissionReport[];
  /** Best score (0–1) the Company has played for each kind of Anomaly. Missing until it has played one. */
  anomalyBest: Partial<Record<AnomalyKind, number>>;
  /** Real History cards unlocked so far, in the order they were: the History Archive. */
  history: HistoryCardId[];
  /** Mission Patches earned, oldest first: the patch gallery. */
  patches: Patch[];
  /** The Explorer 1 tutorial. */
  tutorial: TutorialProgress;
  /** Research Points earned and the tech tree Upgrades bought with them. */
  research: Research;
  /** The Launch Vehicle picked in the Launch planner: the Mission Designer's Mass bar measures against it. */
  vehicle: LaunchVehicleId;
}

const zeroes = <K extends string>(keys: readonly K[]) => Object.fromEntries(keys.map((k) => [k, 0])) as Record<K, number>;

export function noBetterParts(): Record<Part, number[]> {
  return Object.fromEntries(PARTS.map((p) => [p, []])) as unknown as Record<Part, number[]>;
}

export function newSiteState(): SiteState {
  return {
    money: START_MONEY,
    day: 0,
    mines: [],
    factories: [],
    warehouses: [],
    labs: [],
    assemblyHall: null,
    stock: zeroes(RAW_MATERIALS),
    parts: zeroes(PARTS),
    betterParts: noBetterParts(),
    contracts: [],
    completed: [],
    design: emptyDesign(),
    mission: null,
    reports: [],
    anomalyBest: {},
    history: [],
    patches: [],
    tutorial: { skipped: false, testRun: false },
    research: newResearch(),
    vehicle: 'juno1',
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
  return allBuildings(state).some(({ building }) => here(building));
}

/** Every building on the Site with its kind. */
export function allBuildings(state: SiteState): { kind: SiteBuildingKind; building: Building }[] {
  return [
    ...(state.assemblyHall ? [{ kind: 'assemblyHall' as const, building: state.assemblyHall }] : []),
    ...state.mines.map((building) => ({ kind: 'mine' as const, building })),
    ...state.factories.map((building) => ({ kind: building.kind, building })),
    ...state.warehouses.map((building) => ({ kind: 'warehouse' as const, building })),
    ...state.labs.map((building) => ({ kind: 'researchLab' as const, building })),
  ];
}

/** How much further from the middle the Assembly Hall would rather go than build on high ground (squared tiles). */
const HIGH_GROUND = { hills: 100, mountain: 400 } as const;

/**
 * Put the Assembly Hall on the free dry tile nearest the middle of the Site, if it has none yet: on flat land
 * if any is near, and never on a Deposit, so Deposits stay free for Mines. Returns the hall.
 */
export function placeAssemblyHall(site: Site, state: SiteState): AssemblyHall {
  if (state.assemblyHall) return state.assemblyHall;
  const mid = (site.size - 1) / 2;
  let best: { x: number; z: number } | null = null;
  let bestD = Infinity;
  for (let z = 0; z < site.size; z++) {
    for (let x = 0; x < site.size; x++) {
      const tile = tileAt(site, x, z);
      if (!tile || tile.terrain === 'water' || tile.deposit || occupied(state, x, z)) continue;
      const d = (x - mid) ** 2 + (z - mid) ** 2 + (tile.terrain === 'hills' || tile.terrain === 'mountain' ? HIGH_GROUND[tile.terrain] : 0);
      if (d < bestD) [best, bestD] = [{ x, z }, d];
    }
  }
  const at = best ?? { x: Math.floor(mid), z: Math.floor(mid) };
  return (state.assemblyHall = { ...at, level: 1, upgradeDay: null });
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
  const at = { x, z, level: 1, upgradeDay: null };
  if (kind === 'mine') state.mines.push(at);
  else if (kind === 'warehouse') state.warehouses.push(at);
  else if (kind === 'researchLab') state.labs.push(at);
  else state.factories.push({ kind, ...at, making: partsMadeBy(kind)[0]!, progress: null });
  return check;
}

/** What stands on tile (x, z), if anything. */
export function buildingAt(
  state: SiteState,
  x: number,
  z: number,
):
  | { kind: 'mine'; building: Mine; mine: Mine }
  | { kind: FactoryKind; building: Factory; factory: Factory }
  | { kind: 'warehouse'; building: Warehouse }
  | { kind: 'researchLab'; building: Lab }
  | { kind: 'assemblyHall'; building: AssemblyHall }
  | null {
  const found = allBuildings(state).find(({ building: b }) => b.x === x && b.z === z);
  if (!found) return null;
  const { kind, building } = found;
  if (kind === 'mine') return { kind, building, mine: building as Mine };
  if (kind === 'warehouse') return { kind, building };
  if (kind === 'researchLab') return { kind, building };
  if (kind === 'assemblyHall') return { kind, building };
  return { kind, building: building as Factory, factory: building as Factory };
}

/** How much a building's level multiplies what it does (Mine output, Warehouse storage, Research Lab pace). */
export function levelBoost(level: number): number {
  return 1 + LEVEL_OUTPUT_STEP * (level - 1);
}

/** Kilograms one Mine digs a day at its level. */
export function mineOutput(mine: Mine): number {
  return MINE_OUTPUT_PER_DAY * levelBoost(mine.level);
}

/** Kilograms one Warehouse stores at its level. */
export function warehouseStorage(warehouse: Warehouse): number {
  return WAREHOUSE_STORAGE_KG * levelBoost(warehouse.level);
}

/** Raw Material each Mine digs up, keyed by what is under it. */
export function mineMaterial(site: Site, mine: Pick<Mine, 'x' | 'z'>): RawMaterial | null {
  return tileAt(site, mine.x, mine.z)?.deposit ?? null;
}

// ---- Storage ----

/** Kilograms the Site can store: the yard plus every Warehouse. */
export function storageCapacity(state: SiteState): number {
  return BASE_STORAGE_KG + state.warehouses.reduce((kg, w) => kg + warehouseStorage(w), 0);
}

/** Kilograms in storage now: Raw Materials plus the mass of every Part. */
export function storageUsed(state: SiteState): number {
  let kg = 0;
  for (const m of RAW_MATERIALS) kg += state.stock[m];
  for (const p of PARTS) partsByMark(state, p).forEach((n, i) => (kg += n * partMass(p, i + 1)));
  return kg;
}

export function storageFree(state: SiteState): number {
  return Math.max(0, storageCapacity(state) - storageUsed(state));
}

// ---- Part Marks ----

/** A Part's mass at a Mark: each Mark above Mk 1 is lighter. */
export function partMass(part: Part, mark = 1): number {
  return RECIPES[part].massKg * (1 - MARK_STEP.lighter * (mark - 1));
}

/** How many of a Part are in stock at each Mark: index 0 is Mk 1. */
export function partsByMark(state: SiteState, part: Part): number[] {
  const better = state.betterParts[part];
  return [state.parts[part] - better.reduce((n, k) => n + k, 0), ...better];
}

/** Add one Part of a Mark to stock. */
export function addPart(state: SiteState, part: Part, mark = 1): void {
  state.parts[part] += 1;
  if (mark <= 1) return;
  const better = state.betterParts[part];
  while (better.length < mark - 1) better.push(0);
  better[mark - 2]! += 1;
}

/** Take one Part out of stock, the best Mark (for a Spacecraft) or the worst (to sell). Returns its Mark, or 0 if none. */
export function takePart(state: SiteState, part: Part, which: 'best' | 'worst'): number {
  const counts = partsByMark(state, part);
  const marks = counts.map((_, i) => i + 1).filter((m) => counts[m - 1]! > 0);
  const mark = which === 'best' ? marks.at(-1) : marks[0];
  if (!mark) return 0;
  state.parts[part] -= 1;
  if (mark > 1) state.betterParts[part][mark - 2]! -= 1;
  return mark;
}

/** The best Mark of a Part in stock: what a Spacecraft would take. Mk 1 when there is none (the Market sells Mk 1). */
export function bestMark(state: SiteState, part: Part): number {
  const counts = partsByMark(state, part);
  for (let i = counts.length - 1; i > 0; i--) if (counts[i]! > 0) return i + 1;
  return 1;
}

// ---- Production ----

/** Kilograms per game day of each Raw Material from all Mines (while there is room to store it). */
export function outputPerDay(site: Site, state: SiteState): Record<RawMaterial, number> {
  const out = zeroes(RAW_MATERIALS);
  for (const mine of state.mines) {
    const material = mineMaterial(site, mine);
    if (material) out[material] += mineOutput(mine);
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
    addPart(state, factory.making, factory.level);
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

/** Finish every Upgrade whose day has come. */
function finishUpgrades(state: SiteState): void {
  for (const { building } of allBuildings(state)) {
    if (building.upgradeDay !== null && state.day >= building.upgradeDay) {
      building.level += 1;
      building.upgradeDay = null;
    }
  }
}

/**
 * Move the Site forward by `days` game days: the date advances, Upgrades finish, Mines dig, Factories make
 * Parts and Research Labs research.
 */
export function advanceDays(site: Site, state: SiteState, days: number): void {
  if (days <= 0) return;
  state.day += days;
  finishUpgrades(state);
  // Mines stop when storage is full. A finished Part always weighs less than its inputs, so Factories never overfill it.
  const out = outputPerDay(site, state);
  const total = RAW_MATERIALS.reduce((sum, m) => sum + out[m], 0) * days;
  const share = total > 0 ? Math.min(1, storageFree(state) / total) : 0;
  for (const m of RAW_MATERIALS) state.stock[m] += out[m] * days * share;
  for (const factory of state.factories) runFactory(state, factory, days);
  runLabs(state, days);
}

/** Game days that pass in `seconds` of real time at `speed`. Long gaps are capped. */
export function daysFor(seconds: number, speed: Speed): number {
  return (Math.min(seconds, MAX_FRAME_SECONDS) * speed) / SECONDS_PER_DAY;
}
