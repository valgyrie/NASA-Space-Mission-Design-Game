import type { Part } from '../economy/part';
import { OPTION_STATS, type OptionStats, RECIPES, SUNLIT_SHARE } from './balance';
import { type Contract, type Orbit, type PayloadKind, CONTRACTS, CONTRACT_IDS, availableContracts, daysLeft } from './contracts';
import { LAUNCH_SITES, LAUNCH_VEHICLES, type LaunchSiteId, type LaunchVehicleId } from './launchVehicles';
import { type TradeResult, buy, buyPrice } from './market';
import { type SiteState, storageFree } from './siteState';

/**
 * The Spacecraft the player designs in the Mission Designer: one option per slot.
 * Nothing is used up here; the Parts leave the Warehouse when the Mission ships (mission.ts).
 */

export const SLOTS = ['bus', 'power', 'battery', 'comms', 'pointing', 'payload'] as const;
export type Slot = (typeof SLOTS)[number];

/** Every option in every slot. Options that need a Part share its id; the rest need no Part. */
export const OPTION_IDS = [
  'smallBus',
  'mediumBus',
  'batteriesOnly',
  'solarCells',
  'smallBattery',
  'largeBattery',
  'simpleAntenna',
  'spin',
  'radiationDetector',
] as const;
export type OptionId = (typeof OPTION_IDS)[number];

export interface SpacecraftOption {
  id: OptionId;
  slot: Slot;
  /** The Part it takes from the Warehouse, or null when it needs none (spin, batteries only). */
  part: Part | null;
  /** The Contract Payload it counts as. */
  payload?: PayloadKind;
  stats: OptionStats;
}

const option = (id: OptionId, slot: Slot, part: Part | null, payload?: PayloadKind): SpacecraftOption => ({
  id,
  slot,
  part,
  ...(payload ? { payload } : {}),
  stats: OPTION_STATS[id],
});

export const OPTIONS: Record<OptionId, SpacecraftOption> = {
  smallBus: option('smallBus', 'bus', 'smallBus'),
  mediumBus: option('mediumBus', 'bus', 'mediumBus'),
  batteriesOnly: option('batteriesOnly', 'power', null),
  solarCells: option('solarCells', 'power', 'solarCells'),
  smallBattery: option('smallBattery', 'battery', 'smallBattery'),
  largeBattery: option('largeBattery', 'battery', 'largeBattery'),
  simpleAntenna: option('simpleAntenna', 'comms', 'simpleAntenna'),
  // Explorer 1 kept steady by spinning around its long axis at 750 rpm: no Part needed.
  spin: option('spin', 'pointing', null),
  radiationDetector: option('radiationDetector', 'payload', 'radiationDetector', 'radiationDetector'),
};

/**
 * Options shown but not yet available. Explorer 1 flew on batteries alone; solar cells unlock
 * later in Era 1 with Vanguard 1 (ticket 14 replaces this with the real unlock).
 */
const LOCKED: ReadonlySet<OptionId> = new Set(['solarCells']);

export function isUnlocked(id: OptionId): boolean {
  return !LOCKED.has(id);
}

/** The options for a slot, in menu order. */
export function optionsFor(slot: Slot): SpacecraftOption[] {
  return OPTION_IDS.filter((id) => OPTIONS[id].slot === slot).map((id) => OPTIONS[id]);
}

/** The option picked for each slot, or null while it is empty. */
export type Design = Record<Slot, OptionId | null>;

export function emptyDesign(): Design {
  return { bus: null, power: null, battery: null, comms: null, pointing: null, payload: null };
}

/** Pick an option for its slot. Locked options are refused. */
export function choose(design: Design, id: OptionId): boolean {
  if (!isUnlocked(id)) return false;
  design[OPTIONS[id].slot] = id;
  return true;
}

export function isValidChoice(slot: Slot, id: unknown): boolean {
  return id === null || ((OPTION_IDS as readonly unknown[]).includes(id) && OPTIONS[id as OptionId].slot === slot);
}

function picked(design: Design): SpacecraftOption[] {
  return SLOTS.flatMap((slot) => {
    const id = design[slot];
    return id ? [OPTIONS[id]] : [];
  });
}

const sum = (options: SpacecraftOption[], stat: keyof OptionStats) =>
  options.reduce((total, o) => total + (o.stats[stat] ?? 0), 0);

export function emptySlots(design: Design): Slot[] {
  return SLOTS.filter((slot) => design[slot] === null);
}

/** The Parts the design takes from the Warehouse, one per filled slot that needs one. */
export function partsNeeded(design: Design): Part[] {
  return picked(design).flatMap((o) => (o.part ? [o.part] : []));
}

/** Total Spacecraft mass in kilograms: the Bus plus everything on it. */
export function spacecraftMass(design: Design): number {
  return partsNeeded(design).reduce((kg, p) => kg + RECIPES[p].massKg, 0);
}

/** Every slot is filled. */
export function isComplete(design: Design): boolean {
  return emptySlots(design).length === 0;
}

/** Kilograms of Parts carried by the Bus (everything except the Bus itself). */
export function carriedMass(design: Design): number {
  return picked(design)
    .filter((o) => o.slot !== 'bus' && o.part)
    .reduce((kg, o) => kg + RECIPES[o.part!].massKg, 0);
}

/** Parts the design needs that the Warehouse doesn't have. */
export function partsToBuy(state: SiteState, design: Design): Part[] {
  const want = new Map<Part, number>();
  for (const p of partsNeeded(design)) want.set(p, (want.get(p) ?? 0) + 1);
  return [...want].flatMap(([p, n]) => Array<Part>(Math.max(0, n - state.parts[p])).fill(p));
}

/** What buying the missing Parts on the Market costs. */
export function costToBuy(state: SiteState, design: Design): number {
  return partsToBuy(state, design).reduce((dollars, p) => dollars + buyPrice(p), 0);
}

/** Buy every missing Part on the Market, or none if money or storage can't cover them all. */
export function buyMissing(state: SiteState, design: Design): TradeResult {
  const parts = partsToBuy(state, design);
  if (state.money < costToBuy(state, design)) return { ok: false, problem: 'money' };
  if (storageFree(state) < parts.reduce((kg, p) => kg + RECIPES[p].massKg, 0)) return { ok: false, problem: 'space' };
  for (const p of parts) buy(state, p);
  return { ok: true };
}

// ---- What the Mission needs ----

/** The Contract the Spacecraft is designed for, and what follows from it. */
export interface MissionGoal {
  contract: Contract;
  /** Accepted by the Company, still on offer, or already done (nothing else on the board). */
  status: 'accepted' | 'offered' | 'done';
  /** Days the Spacecraft must send Data. */
  missionDays: number;
  payload: PayloadKind | null;
  /** Game days left before the deadline (the full deadline if not accepted yet). */
  daysLeft: number;
  orbit: Orbit;
  vehicle: LaunchVehicleId;
  /** Kilograms the Launch Vehicle can lift to the Contract's orbit. */
  liftKg: number;
  site: LaunchSiteId;
  /** Game days to ship the finished Spacecraft to the Launch Site. */
  shippingDays: number;
}

/** What a Contract asks for: orbit, Payload and days of Data. */
export function contractNeeds(contract: Contract): { orbit: Orbit; payload: PayloadKind | null; missionDays: number } {
  let missionDays = 0;
  let payload: PayloadKind | null = null;
  let orbit: Orbit = 'lowEarthOrbit';
  for (const r of contract.requirements) {
    if (r.kind === 'dataDays') missionDays = r.days;
    else if (r.kind === 'payload') payload = r.payload;
    else orbit = r.orbit;
  }
  return { orbit, payload, missionDays };
}

/** The first accepted Contract, else the first one on offer, else the last one done. */
export function missionGoal(state: SiteState): MissionGoal {
  const taken = state.contracts[0];
  const offered = availableContracts(state)[0];
  const contract = taken ? CONTRACTS[taken.id] : (offered ?? CONTRACTS[state.completed.at(-1) ?? CONTRACT_IDS[0]]);
  const status = taken ? 'accepted' : offered ? 'offered' : 'done';
  const { orbit, payload, missionDays } = contractNeeds(contract);
  const vehicle: LaunchVehicleId = 'juno1';
  const site: LaunchSiteId = 'capeCanaveral';
  return {
    contract,
    status,
    missionDays,
    payload,
    daysLeft: taken ? daysLeft(state, taken) : contract.deadlineDays,
    orbit,
    vehicle,
    liftKg: LAUNCH_VEHICLES[vehicle].liftKg[orbit],
    site,
    shippingDays: LAUNCH_SITES[site].shippingDays,
  };
}

// ---- How the Spacecraft works in flight ----

/** Power over a Mission: watts used, watts from sunlight on average, energy stored, and days it lasts. */
export function powerOf(design: Design): { powerUseW: number; sunW: number; batteryWh: number; lastsDays: number } {
  const options = picked(design);
  const powerUseW = sum(options, 'powerUseW');
  const sunW = sum(options, 'solarW') * SUNLIT_SHARE;
  const batteryWh = sum(options, 'batteryWh');
  const drainW = powerUseW - sunW;
  return { powerUseW, sunW, batteryWh, lastsDays: drainW > 0 ? batteryWh / drainW / 24 : Infinity };
}

/** Kilobytes of Data the Payload makes each day, and what the Comms can send home. */
export function dataOf(design: Design): { dataPerDay: number; sendPerDay: number } {
  const options = picked(design);
  return { dataPerDay: sum(options, 'dataPerDay'), sendPerDay: sum(options, 'sendPerDay') };
}

/** Does the Payload slot hold what the Contract asks for? Any Payload counts when it names none. */
export function hasRightPayload(design: Design, payload: PayloadKind | null): boolean {
  const p = design.payload ? OPTIONS[design.payload] : null;
  return !!p && (payload === null || p.payload === payload);
}

/** Game days to put the Spacecraft together, set by its Bus. */
export function assemblyDays(design: Design): number {
  return design.bus ? (OPTIONS[design.bus].stats.assemblyDays ?? 0) : 0;
}

// ---- The six resources ----

export const RESOURCES = ['mass', 'power', 'budget', 'data', 'communications', 'time'] as const;
export type Resource = (typeof RESOURCES)[number];

/**
 * One live bar. `target` is a limit to stay under ('max') or a need to reach ('min').
 * A bar is 'waiting' until the slots it depends on are filled.
 */
export interface Gauge {
  value: number;
  target: number;
  sense: 'max' | 'min';
  status: 'ok' | 'short' | 'waiting';
  /** The first empty slot this bar waits for. */
  waitingFor?: Slot;
}

/** A clear reason a resource is short, for the warning list. */
export type DesignProblem =
  | { kind: 'tooHeavy'; overKg: number }
  | { kind: 'busFull'; bus: OptionId; carriesKg: number; partsKg: number }
  | { kind: 'powerShort'; lastsDays: number; needDays: number }
  | { kind: 'money'; short: number }
  | { kind: 'wrongPayload'; payload: PayloadKind }
  | { kind: 'commsShort'; sendPerDay: number; dataPerDay: number }
  | { kind: 'late'; needDays: number; daysLeft: number };

export interface DesignCheck {
  goal: MissionGoal;
  gauges: Record<Resource, Gauge>;
  problems: DesignProblem[];
  /** Watts used all the time. */
  powerUseW: number;
  /** Days the Power lasts (Infinity when sunlight alone covers it). */
  lastsDays: number;
  dataPerDay: number;
  sendPerDay: number;
  buildDays: number;
  /** Every slot filled and nothing short. */
  ready: boolean;
}

function gauge(value: number, target: number, sense: 'max' | 'min', waitingFor?: Slot): Gauge {
  if (waitingFor) return { value, target, sense, status: 'waiting', waitingFor };
  const ok = sense === 'max' ? value <= target + 1e-9 : value >= target - 1e-9;
  return { value, target, sense, status: ok ? 'ok' : 'short' };
}

/** Check a design against its Mission: the six live bars and the problems behind any shortfall. */
export function checkDesign(state: SiteState, design: Design): DesignCheck {
  const goal = missionGoal(state);
  const empty = (...slots: Slot[]) => slots.find((s) => design[s] === null);
  const problems: DesignProblem[] = [];

  // Mass: the whole Spacecraft against the Launch Vehicle, and the Parts against what the Bus can carry.
  const mass = spacecraftMass(design);
  const massGauge = gauge(mass, goal.liftKg, 'max');
  if (massGauge.status === 'short') problems.push({ kind: 'tooHeavy', overKg: mass - goal.liftKg });
  const bus = design.bus;
  const carriesKg = bus ? (OPTIONS[bus].stats.carriesKg ?? 0) : Infinity;
  const partsKg = carriedMass(design);
  if (bus && partsKg > carriesKg) {
    problems.push({ kind: 'busFull', bus, carriesKg, partsKg });
    massGauge.status = 'short';
  }

  // Power: energy stored plus sunlight, against what the Spacecraft uses over the Mission.
  const hours = goal.missionDays * 24;
  const { powerUseW, sunW, batteryWh, lastsDays } = powerOf(design);
  const powerGauge = gauge(batteryWh + sunW * hours, powerUseW * hours, 'min', empty('power', 'battery'));
  if (powerGauge.status === 'short') problems.push({ kind: 'powerShort', lastsDays, needDays: goal.missionDays });

  // Budget: what the missing Parts cost on the Market, against the money in the bank.
  const cost = costToBuy(state, design);
  const budgetGauge = gauge(cost, state.money, 'max');
  if (budgetGauge.status === 'short') problems.push({ kind: 'money', short: cost - state.money });

  // Data: days the right Payload keeps sending, against the days the Contract asks for.
  const rightPayload = hasRightPayload(design, goal.payload);
  const dataDays = rightPayload ? Math.min(lastsDays, 9_999) : 0;
  const dataGauge = gauge(dataDays, goal.missionDays, 'min', empty('payload', 'comms', 'power', 'battery'));
  if (design.payload && !rightPayload && goal.payload) problems.push({ kind: 'wrongPayload', payload: goal.payload });

  // Communications: Data the antenna can send each day, against what the Payload makes.
  const { dataPerDay, sendPerDay } = dataOf(design);
  const commsGauge = gauge(sendPerDay, dataPerDay, 'min', empty('comms', 'payload'));
  if (commsGauge.status === 'short') problems.push({ kind: 'commsShort', sendPerDay, dataPerDay });

  // Time: putting it together, shipping it and flying the Mission, against the days left before the deadline.
  const buildDays = assemblyDays(design);
  const needDays = buildDays + goal.shippingDays + goal.missionDays;
  const timeGauge = gauge(needDays, goal.daysLeft, 'max', empty('bus'));
  if (timeGauge.status === 'short') problems.push({ kind: 'late', needDays, daysLeft: goal.daysLeft });

  const gauges: Record<Resource, Gauge> = {
    mass: massGauge,
    power: powerGauge,
    budget: budgetGauge,
    data: dataGauge,
    communications: commsGauge,
    time: timeGauge,
  };
  const ready = isComplete(design) && RESOURCES.every((r) => gauges[r].status === 'ok');
  return { goal, gauges, problems, powerUseW, lastsDays, dataPerDay, sendPerDay, buildDays, ready };
}
