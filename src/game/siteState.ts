import type { GroundTestId } from './groundTests';
import type { Team } from './team';
import { type BuildingKind, type FactoryKind, PARTS, type Part, type SiteBuildingKind } from '../economy/part';
import { RAW_MATERIALS, type RawMaterial } from '../economy/rawMaterial';
import { type Site, tileAt } from '../site/site';
import type { AnomalyKind } from './anomalies';
import { CONTRACTS, CONTRACT_IDS, type AcceptedContract, type ContractId, choiceOf, expireContracts, milestoneDone, refreshOffers } from './contracts';
import { type Deposit, depositAt, depositLeft, digDeposit } from './deposits';
import { nextLevel } from './upgrades';
import type { HistoryCardId, Patch } from './history';
import { type LaunchSiteId, type LaunchVehicleId, firstOpenVehicle, isVehicleOpen } from './launchVehicles';
import { MODERN_ERA, eraOf, eraStartDay, isBuildingOpen } from './eras';
import { JPL, type Place } from './places';
import { type Difficulty, type PlayMode, isExplorer } from './modes';
import { type Research, newResearch, runLabs } from './research';
import type { TutorialProgress } from './tutorial';
import type { Mission, MissionReport } from './mission';
import { type Design, emptyDesign } from './spacecraft';
import {
  BASE_STORAGE_KG,
  BUILD_COST,
  EXPLORER_PACE,
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

/** The HQ: the Company's main building. Every Site starts with one; its level is the Company's Era. */
export interface HQ extends Levels {
  x: number;
  z: number;
}

/** A Ground Station: the Company's own antenna for talking to its Spacecraft (Era 2). */
export interface GroundStation extends Levels {
  x: number;
  z: number;
}

/** Any building standing on the Site. */
export type Building = Mine | Factory | Warehouse | Lab | AssemblyHall | HQ | GroundStation;

/** Everything about the running Site that changes over time and is saved. */
export interface SiteState {
  playMode: PlayMode;
  difficulty: Difficulty;
  money: number;
  /** Game days since the start date. Fractions count. */
  day: number;
  mines: Mine[];
  factories: Factory[];
  warehouses: Warehouse[];
  labs: Lab[];
  /** Null only until the Site is shown the first time, which places it (`placeAssemblyHall`). */
  assemblyHall: AssemblyHall | null;
  /** The HQ, placed like the Assembly Hall when the Site is first shown (`placeHQ`). Its level is the Era. */
  hq: HQ | null;
  groundStations: GroundStation[];
  /** The newest Era whose welcome card the player has seen. */
  eraSeen: number;
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
  /** Contracts whose deadline passed before they were fulfilled: back on the board to try again. */
  reopened: ContractId[];
  /** Game day the one-time startup grant was paid, or null while it is still to come. */
  grantDay: number | null;
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
  /** Where on Earth the Site is (ticket 16): its real climate, and how far Shipping goes. */
  place: Place;
  /** The Launch Site picked in the Launch planner. */
  launchSite: LaunchSiteId;
  /** Plots of land bought next to the Home Site, as [px, pz], oldest first (ticket 30). The Home Site is not listed. */
  plots: [number, number][];
  /** Plots won from Contracts and not yet chosen: the next Plot bought is free. */
  freePlots: number;
  /**
   * Designs tried in a Test Run for one Contract, for the maturity strip's Trade Space step (ticket 33).
   * Optional, so saves stay v19 and the deployed cloud validator still reads them; missing until the first Test Run.
   */
  testedDesigns?: { contract: ContractId; designs: string[] };
  /**
   * Ground Tests ticked in the Launch planner (ticket 40); only those that suit the design count.
   * Optional like `testedDesigns`, so saves stay v19; missing means none.
   */
  groundTests?: GroundTestId[];
  /**
   * Team Mode (ticket 41): the players sharing this Company on one computer. Missing: one player.
   * Optional like `testedDesigns`, so saves stay v19.
   */
  team?: Team;
  // ---- Game modes: rules (save v21) ----
  /** Grants paid so far, the first one included (`grantDay` is the last one's day). */
  grants: number;
  /** Mission Director: the Game day each Free Play Contract on the board was offered, by ID. Only those on the board. */
  offerDays: Partial<Record<ContractId, number>>;
  /** Mission Director: Free Play Contracts that went away unaccepted. They never come back. */
  expiredOffers: ContractId[];
  /** Mission Director: designs (`testRunKey`) that have had their free Test Run, newest last. */
  testRuns: string[];
  /** Mission Director: kilograms dug out of each Deposit, by `depositKey`. Missing: none, so it is full. */
  depositsUsed: Record<string, number>;
  /** Explorer: Contracts whose failed Mission already had its launch costs refunded. */
  refunds: ContractId[];
}

const zeroes = <K extends string>(keys: readonly K[]) => Object.fromEntries(keys.map((k) => [k, 0])) as Record<K, number>;

export function noBetterParts(): Record<Part, number[]> {
  return Object.fromEntries(PARTS.map((p) => [p, []])) as unknown as Record<Part, number[]>;
}

export function newSiteState(place: Place = JPL, difficulty: Difficulty = 'easy', playMode: PlayMode = 'campaign'): SiteState {
  return {
    playMode,
    difficulty,
    money: START_MONEY,
    day: playMode === 'freePlay' ? eraStartDay(MODERN_ERA) : 0,
    mines: [],
    factories: [],
    warehouses: [],
    labs: [],
    assemblyHall: null,
    hq: null,
    groundStations: [],
    // A new Campaign has not seen Era 1's card yet; a new Free Play Company starts in the modern Era without one.
    eraSeen: playMode === 'freePlay' ? MODERN_ERA : 0,
    stock: zeroes(RAW_MATERIALS),
    parts: zeroes(PARTS),
    betterParts: noBetterParts(),
    contracts: [],
    completed: [],
    reopened: [],
    grantDay: null,
    design: emptyDesign(),
    mission: null,
    reports: [],
    anomalyBest: {},
    history: [],
    patches: [],
    tutorial: { skipped: playMode === 'freePlay', testRun: false },
    research: newResearch(),
    vehicle: playMode === 'freePlay' ? 'falcon9' : 'juno1',
    place: { ...place },
    launchSite: 'capeCanaveral',
    plots: [],
    freePlots: 0,
    grants: 0,
    offerDays: {},
    expiredOffers: [],
    testRuns: [],
    depositsUsed: {},
    refunds: [],
  };
}

/** The Parts a kind of Factory can make, in menu order. */
export function partsMadeBy(kind: FactoryKind): Part[] {
  return PARTS.filter((p) => RECIPES[p].factory === kind);
}

// ---- Building ----

/** `dock`: the Shipping truck's loading dock is in use there (checked by the Site view, which knows the dock). */
/** `emptyDeposit`: Mission Director, the Deposit a Mine there would dig has run out. */
export type PlaceProblem = 'noDeposit' | 'onDeposit' | 'water' | 'edge' | 'occupied' | 'money' | 'era' | 'dock' | 'emptyDeposit';

export type PlaceCheck = { ok: true } | { ok: false; problem: PlaceProblem };

/**
 * Tiles a building takes along each side. Every building stands on FOOTPRINT × FOOTPRINT tiles, centred on
 * its own tile (x, z): big enough to see from the whole-Site view, small enough that a Site holds hundreds.
 */
export const FOOTPRINT = 3;
const REACH = (FOOTPRINT - 1) / 2;

/** The tiles under a building centred on (x, z), nearest the centre first. Some may be off the Site. */
export function footprint(x: number, z: number): { x: number; z: number }[] {
  const tiles: { x: number; z: number }[] = [];
  for (let dz = -REACH; dz <= REACH; dz++) for (let dx = -REACH; dx <= REACH; dx++) tiles.push({ x: x + dx, z: z + dz });
  return tiles.sort((a, b) => Math.abs(a.x - x) + Math.abs(a.z - z) - (Math.abs(b.x - x) + Math.abs(b.z - z)));
}

/** Does the building centred on `b` stand on tile (x, z)? */
export function covers(b: { x: number; z: number }, x: number, z: number): boolean {
  return Math.abs(b.x - x) <= REACH && Math.abs(b.z - z) <= REACH;
}

/** Would two buildings centred on `a` and `b` stand on the same tile? */
function overlap(a: { x: number; z: number }, b: { x: number; z: number }): boolean {
  return Math.abs(a.x - b.x) < FOOTPRINT && Math.abs(a.z - b.z) < FOOTPRINT;
}

/**
 * Height step a building centred on (x, z) stands at: the highest ground under it. Its foundation fills
 * the lower tiles, so buildings can go on slopes.
 */
export function foundationLevel(site: Site, x: number, z: number): number {
  return Math.max(0, ...footprint(x, z).map((t) => tileAt(site, t.x, t.z)?.level ?? 0));
}

/** Every building on the Site with its kind. */
export function allBuildings(state: SiteState): { kind: SiteBuildingKind; building: Building }[] {
  return [
    ...(state.assemblyHall ? [{ kind: 'assemblyHall' as const, building: state.assemblyHall }] : []),
    ...state.mines.map((building) => ({ kind: 'mine' as const, building })),
    ...state.factories.map((building) => ({ kind: building.kind, building })),
    ...state.warehouses.map((building) => ({ kind: 'warehouse' as const, building })),
    ...state.labs.map((building) => ({ kind: 'researchLab' as const, building })),
    ...(state.hq ? [{ kind: 'hq' as const, building: state.hq }] : []),
    ...state.groundStations.map((building) => ({ kind: 'groundStation' as const, building })),
  ];
}

/** How much further from the middle the Assembly Hall would rather go than build on high ground (squared tiles). */
const HIGH_GROUND = { hills: 100, mountain: 400 } as const;
/** The same, for each height step of slope under it. */
const SLOPE = 60;
/** The same, for each height step that land close by towers over it: behind a cliff it would be hard to see. */
const WALLED_IN = { within: 4, above: 2, each: 40 };

/**
 * Put the Assembly Hall on the free dry land nearest the middle of the Site, if it has none yet: on flat, open
 * land if any is near, and never on a Deposit, so Deposits stay free for Mines. Returns the hall.
 */
export function placeAssemblyHall(site: Site, state: SiteState): AssemblyHall {
  if (state.assemblyHall) return state.assemblyHall;
  return (state.assemblyHall = { ...nearMiddle(site, state, 'assemblyHall'), level: 1, upgradeDay: null });
}

/** Put the HQ beside the Assembly Hall in the same way, if the Site has none yet (a new game, or an older save). */
export function placeHQ(site: Site, state: SiteState): HQ {
  if (state.hq) return state.hq;
  return (state.hq = { ...nearMiddle(site, state, 'hq'), level: state.playMode === 'freePlay' ? MODERN_ERA : 1, upgradeDay: null });
}

/** The free spot for a building nearest the middle of the Site, preferring flat, open, low land. */
function nearMiddle(site: Site, state: SiteState, kind: SiteBuildingKind): { x: number; z: number } {
  const mid = (site.size - 1) / 2;
  let best: { x: number; z: number } | null = null;
  let bestD = Infinity;
  for (let z = 0; z < site.size; z++) {
    for (let x = 0; x < site.size; x++) {
      if (placeProblem(site, state, kind, x, z)) continue;
      const tile = tileAt(site, x, z)!;
      const levels = footprint(x, z).map((t) => tileAt(site, t.x, t.z)!.level);
      const top = Math.max(...levels);
      let around = top;
      for (let dz = -WALLED_IN.within; dz <= WALLED_IN.within; dz++) {
        for (let dx = -WALLED_IN.within; dx <= WALLED_IN.within; dx++) around = Math.max(around, tileAt(site, x + dx, z + dz)?.level ?? 0);
      }
      const d =
        (x - mid) ** 2 +
        (z - mid) ** 2 +
        (tile.terrain === 'hills' || tile.terrain === 'mountain' ? HIGH_GROUND[tile.terrain] : 0) +
        (top - Math.min(...levels)) * SLOPE +
        Math.max(0, around - top - WALLED_IN.above) * WALLED_IN.each;
      if (d < bestD) [best, bestD] = [{ x, z }, d];
    }
  }
  return best ?? { x: Math.floor(mid), z: Math.floor(mid) };
}

/**
 * What stops a building of `kind` from standing centred on tile (x, z), money aside; null if nothing does.
 * `ignore` is a building to leave out of the check (the one being moved).
 */
function placeProblem(
  site: Site,
  state: SiteState,
  kind: SiteBuildingKind,
  x: number,
  z: number,
  ignore?: Building,
): PlaceProblem | null {
  const tiles = footprint(x, z).map((t) => tileAt(site, t.x, t.z));
  if (tiles.some((t) => !t)) return 'edge';
  if (kind === 'mine') {
    if (!tiles.some((t) => t!.deposit)) return 'noDeposit';
    if (tiles[0]!.terrain === 'water') return 'water';
  } else {
    if (tiles.some((t) => t!.terrain === 'water')) return 'water';
    if (tiles.some((t) => t!.deposit)) return 'onDeposit';
  }
  if (allBuildings(state).some(({ building }) => building !== ignore && overlap(building, { x, z }))) return 'occupied';
  return null;
}

/**
 * Can a building of `kind` go centred on tile (x, z)? It takes FOOTPRINT × FOOTPRINT tiles, all on the Site
 * and free. A Mine must touch a Deposit and stand on dry land; everything else needs dry land without a
 * Deposit, so Deposits stay free for Mines. All of them cost money.
 */
export function checkBuild(site: Site, state: SiteState, kind: BuildingKind, x: number, z: number): PlaceCheck {
  if (!isBuildingOpen(state, kind)) return { ok: false, problem: 'era' };
  const problem = placeProblem(site, state, kind, x, z);
  if (problem) return { ok: false, problem };
  if (kind === 'mine' && mineEmpty(site, state, { x, z })) return { ok: false, problem: 'emptyDeposit' };
  if (state.money < BUILD_COST[kind]) return { ok: false, problem: 'money' };
  return { ok: true };
}

/**
 * Make room in a save from when buildings took one tile: a building that no longer fits where it stands
 * (it overlaps another, hangs off the Site, or a Mine lost its Deposit) moves to the nearest spot where it
 * does. The Assembly Hall goes first, then the rest in the order they were built. Returns true if any moved.
 */
export function fitBuildings(site: Site, state: SiteState): boolean {
  const kept: Building[] = [];
  let moved = false;
  for (const { kind, building } of allBuildings(state)) {
    const material = kind === 'mine' ? mineMaterial(site, building) : null;
    const fits = (x: number, z: number, strict: boolean) => {
      const problem = placeProblem(site, state, kind, x, z, building);
      // Where it already stands, only the ground rules that can't be bent count; a new spot must pass them all.
      if (problem && (strict || problem === 'edge' || problem === 'noDeposit')) return false;
      if (kept.some((other) => overlap(other, { x, z }))) return false;
      return kind !== 'mine' || !strict || mineMaterial(site, { x, z }) === material;
    };
    if (!fits(building.x, building.z, false)) {
      let best: { x: number; z: number } | null = null;
      let bestD = Infinity;
      for (let z = 0; z < site.size; z++) {
        for (let x = 0; x < site.size; x++) {
          const d = (x - building.x) ** 2 + (z - building.z) ** 2;
          if (d < bestD && fits(x, z, true)) [best, bestD] = [{ x, z }, d];
        }
      }
      if (best) {
        building.x = best.x;
        building.z = best.z;
        moved = true;
      }
    }
    kept.push(building);
  }
  return moved;
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
  else if (kind === 'groundStation') state.groundStations.push(at);
  else state.factories.push({ kind, ...at, making: partsMadeBy(kind)[0]!, progress: null });
  return check;
}

/** What stands on tile (x, z), if anything: any tile under a building counts. */
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
  | { kind: 'hq'; building: HQ }
  | { kind: 'groundStation'; building: GroundStation }
  | null {
  const found = allBuildings(state).find(({ building }) => covers(building, x, z));
  if (!found) return null;
  const { kind, building } = found;
  if (kind === 'mine') return { kind, building, mine: building as Mine };
  if (kind === 'warehouse') return { kind, building };
  if (kind === 'researchLab') return { kind, building };
  if (kind === 'assemblyHall') return { kind, building };
  if (kind === 'hq') return { kind, building };
  if (kind === 'groundStation') return { kind, building };
  return { kind, building: building as Factory, factory: building as Factory };
}

/** How much a building's level multiplies what it does (Mine output, Warehouse storage, Research Lab pace). */
export function levelBoost(level: number): number {
  return 1 + LEVEL_OUTPUT_STEP * (level - 1);
}

/** Kilograms a day a Mine at `level` digs: Explorer's Mines dig faster (EXPLORER_PACE). */
export function mineOutputAt(level: number, state: Pick<SiteState, 'difficulty'>): number {
  return MINE_OUTPUT_PER_DAY * levelBoost(level) * (isExplorer(state) ? EXPLORER_PACE.mineOutput : 1);
}

/** Kilograms one Mine digs a day at its level, while its Deposit lasts. */
export function mineOutput(mine: Mine, state: Pick<SiteState, 'difficulty'>): number {
  return mineOutputAt(mine.level, state);
}

/** The Deposit a Mine digs: the one nearest its middle, as `mineMaterial` picks. */
export function mineDeposit(site: Site, mine: Pick<Mine, 'x' | 'z'>): Deposit | null {
  for (const t of footprint(mine.x, mine.z)) {
    if (tileAt(site, t.x, t.z)?.deposit) return depositAt(site, t.x, t.z);
  }
  return null;
}

/** Mission Director: the Mine's Deposit is empty, so it has stopped. */
export function mineEmpty(site: Site, state: SiteState, mine: Pick<Mine, 'x' | 'z'>): boolean {
  const deposit = mineDeposit(site, mine);
  return !!deposit && depositLeft(state, deposit) <= 0;
}

/** Kilograms one Warehouse stores at its level. */
export function warehouseStorage(warehouse: Warehouse): number {
  return WAREHOUSE_STORAGE_KG * levelBoost(warehouse.level);
}

/** Raw Material a Mine digs up: the Deposit under it, the one nearest its middle if it touches two. */
export function mineMaterial(site: Site, mine: Pick<Mine, 'x' | 'z'>): RawMaterial | null {
  for (const t of footprint(mine.x, mine.z)) {
    const deposit = tileAt(site, t.x, t.z)?.deposit;
    if (deposit) return deposit;
  }
  return null;
}

// ---- Storage ----

/** Kilograms the Site can store: the yard plus every Warehouse. */
export function storageCapacity(state: SiteState): number {
  return BASE_STORAGE_KG + state.warehouses.reduce((kg, w) => kg + warehouseStorage(w), 0);
}

/**
 * Kilograms in storage now: Raw Materials plus the mass of every Part. A Factory's Raw Materials for the Part it
 * is making still take room, so the finished Part, or the inputs given back, always fit (ticket 05).
 */
export function storageUsed(state: SiteState): number {
  let kg = 0;
  for (const m of RAW_MATERIALS) kg += state.stock[m];
  for (const f of state.factories) if (f.progress !== null) kg += inputsMass(f.making);
  for (const p of PARTS) partsByMark(state, p).forEach((n, i) => (kg += n * partMass(p, i + 1)));
  return kg;
}

/** Kilograms of Raw Materials a Part is made from. */
function inputsMass(part: Part): number {
  return Object.values(RECIPES[part].inputs).reduce((kg, n) => kg + (n ?? 0), 0);
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
  for (const { deposit, kgPerDay } of digging(site, state)) out[deposit.material] += kgPerDay;
  return out;
}

/** Every Mine that is digging (its Deposit not empty), with its Deposit and kilograms a day. */
function digging(site: Site, state: SiteState): { deposit: Deposit; kgPerDay: number }[] {
  const list: { deposit: Deposit; kgPerDay: number }[] = [];
  for (const mine of state.mines) {
    const deposit = mineDeposit(site, mine);
    if (deposit && depositLeft(state, deposit) > 0) list.push({ deposit, kgPerDay: mineOutput(mine, state) });
  }
  return list;
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

/** Finish every Upgrade whose day has come. A finished HQ Upgrade moves the Company into the next Era. */
function finishUpgrades(state: SiteState): void {
  for (const { kind, building } of allBuildings(state)) {
    if (building.upgradeDay !== null && state.day >= building.upgradeDay) {
      building.level = nextLevel(kind, building.level);
      building.upgradeDay = null;
      if (kind === 'hq') enterEra(state);
    }
  }
}

/**
 * The Company has just reached a new Era (its HQ's level): the Game date jumps to the Era's first day, unless it
 * is already past it, and every date still to come moves with it (Upgrades, deadlines, a Mission on its way).
 * A Launch Vehicle that has retired gives way to the first one open.
 */
export function enterEra(state: SiteState): void {
  const shift = Math.max(0, eraStartDay(eraOf(state)) - Math.floor(state.day));
  if (shift > 0) {
    state.day += shift;
    for (const { building } of allBuildings(state)) if (building.upgradeDay !== null) building.upgradeDay += shift;
    for (const c of state.contracts) c.acceptedDay += shift;
    const m = state.mission;
    if (m) {
      m.startDay += shift;
      m.shipDay += shift;
      m.readyDay += shift;
    }
  }
  if (!isVehicleOpen(state, state.vehicle)) state.vehicle = firstOpenVehicle(state);
}

/** The Campaign is finished once its finale (Artemis IV, any one choice) is done: the Company can go on in Free Play. */
export function canContinueFreePlay(state: SiteState): boolean {
  return state.playMode === 'campaign' && state.mission === null && campaignDone(state);
}

/** Every Campaign Milestone is done (a Choice Milestone by any one of its Contracts). */
export function campaignDone(state: Pick<SiteState, 'completed'>): boolean {
  return CONTRACT_IDS.filter((id) => CONTRACTS[id].kind === 'milestone').every((id) => milestoneDone(state, choiceOf(id) ?? id));
}

/** Keep the Company and its history; move dates still to come with the jump to modern play. */
export function continueFreePlay(state: SiteState): boolean {
  if (!canContinueFreePlay(state)) return false;
  state.playMode = 'freePlay';
  if (state.hq) state.hq.level = MODERN_ERA;
  state.tutorial.skipped = true;
  enterEra(state);
  return true;
}

/**
 * Move the Site forward by `days` game days: the date advances, Upgrades finish, Mines dig, Factories make
 * Parts and Research Labs research.
 */
export function advanceDays(site: Site, state: SiteState, days: number): void {
  if (days <= 0) return;
  state.day += days;
  finishUpgrades(state);
  // Mines stop when storage is full. A Factory's inputs keep their room until its Part is done, and a finished Part
  // weighs less than its inputs, so Factories never overfill it.
  // Mission Director: each Mine takes what it digs out of its Deposit, and stops when it is empty.
  const mines = digging(site, state);
  const total = mines.reduce((sum, m) => sum + m.kgPerDay, 0) * days;
  const share = total > 0 ? Math.min(1, storageFree(state) / total) : 0;
  for (const { deposit, kgPerDay } of mines) state.stock[deposit.material] += digDeposit(state, deposit, kgPerDay * days * share);
  for (const factory of state.factories) runFactory(state, factory, days);
  runLabs(state, days);
  expireContracts(state);
  refreshOffers(state);
}

/** Game days that pass in `seconds` of real time at `speed`. Long gaps are capped. */
export function daysFor(seconds: number, speed: Speed): number {
  return (Math.min(seconds, MAX_FRAME_SECONDS) * speed) / SECONDS_PER_DAY;
}
