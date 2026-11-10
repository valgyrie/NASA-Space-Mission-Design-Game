import type { Part } from '../economy/part';
import { MARK_STEP, OPTION_STATS, type OptionStats, RECIPES, SUNLIT_SHARE } from './balance';
import { type Contract, type Orbit, type PayloadKind, CONTRACTS, CONTRACT_IDS, availableContracts, daysLeft } from './contracts';
import type { HistoryCardId } from './history';
import { type Boosted, type TechId, boost } from './research';
import { LAUNCH_SITES, LAUNCH_VEHICLES, LAUNCH_VEHICLE_IDS, type LaunchSiteId, type LaunchVehicleId, isVehicleOpen } from './launchVehicles';
import { type TradeResult, buy, buyPrice } from './market';
import { type SiteState, bestMark, partMass, storageFree } from './siteState';
import { type BusId, hallLevel, hallLevelFor, hallTakes } from './upgrades';

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
  'tvCamera',
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
  tvCamera: option('tvCamera', 'payload', 'tvCamera', 'tvCamera'),
};

/**
 * Options shown but locked until a Real History card is unlocked. Explorer 1 flew on batteries alone;
 * Vanguard 1 (17 March 1958) was the first solar-powered satellite, so Solar Cells come with its card.
 */
export const UNLOCKED_BY: Partial<Record<OptionId, HistoryCardId>> = { solarCells: 'vanguard1' };

export function isUnlocked(state: Pick<SiteState, 'history'>, id: OptionId): boolean {
  const card = UNLOCKED_BY[id];
  return !card || state.history.includes(card);
}

/** An option's numbers with the Company's tech tree Upgrades and its Part's Mark applied. */
export function statsOf(o: SpacecraftOption, tech: readonly TechId[] = [], mark = 1): OptionStats {
  if (tech.length === 0 && mark <= 1) return o.stats;
  const out: OptionStats = { ...o.stats };
  for (const stat of ['solarW', 'sendPerDay', 'batteryWh', 'powerUseW'] as Boosted[]) {
    if (out[stat] !== undefined) out[stat] = out[stat]! * boost(tech, stat);
  }
  if (out.powerUseW !== undefined) out.powerUseW *= 1 - MARK_STEP.lessPower * (mark - 1);
  if (out.solarW !== undefined) out.solarW *= 1 + MARK_STEP.moreSolar * (mark - 1);
  return out;
}

/**
 * The Mark of the Part in each slot: a Part's Mark is the level of the Factory that made it.
 * Missing slots are Mk 1 (options with no Part, and Parts bought on the Market).
 */
export type Marks = Partial<Record<Slot, number>>;

/** The Marks a Spacecraft would get if it shipped now: the best of each Part in the Warehouse. */
export function marksFor(state: SiteState, design: Design): Marks {
  const marks: Marks = {};
  for (const slot of SLOTS) {
    const part = design[slot] ? OPTIONS[design[slot]!].part : null;
    if (part) {
      const mark = bestMark(state, part);
      if (mark > 1) marks[slot] = mark;
    }
  }
  return marks;
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

/** Pick an option for its slot. Options locked for this Company (`state`, when given) are refused. */
export function choose(design: Design, id: OptionId, state?: Pick<SiteState, 'history'>): boolean {
  if (state && !isUnlocked(state, id)) return false;
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

const sum = (options: SpacecraftOption[], stat: keyof OptionStats, tech: readonly TechId[] = [], marks: Marks = {}) =>
  options.reduce((total, o) => total + (statsOf(o, tech, marks[o.slot])[stat] ?? 0), 0);

export function emptySlots(design: Design): Slot[] {
  return SLOTS.filter((slot) => design[slot] === null);
}

/** The Parts the design takes from the Warehouse, one per filled slot that needs one. */
export function partsNeeded(design: Design): Part[] {
  return picked(design).flatMap((o) => (o.part ? [o.part] : []));
}

/** Total Spacecraft mass in kilograms: the Bus plus everything on it. Better Marks are lighter. */
export function spacecraftMass(design: Design, marks: Marks = {}): number {
  return picked(design).reduce((kg, o) => kg + (o.part ? partMass(o.part, marks[o.slot]) : 0), 0);
}

/** Every slot is filled. */
export function isComplete(design: Design): boolean {
  return emptySlots(design).length === 0;
}

/** Kilograms of Parts carried by the Bus (everything except the Bus itself). */
export function carriedMass(design: Design, marks: Marks = {}): number {
  return picked(design)
    .filter((o) => o.slot !== 'bus' && o.part)
    .reduce((kg, o) => kg + partMass(o.part!, marks[o.slot]), 0);
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
  const vehicle: LaunchVehicleId = state.vehicle;
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
export function powerOf(
  design: Design,
  tech: readonly TechId[] = [],
  marks: Marks = {},
): { powerUseW: number; sunW: number; batteryWh: number; lastsDays: number } {
  const options = picked(design);
  const powerUseW = sum(options, 'powerUseW', tech, marks);
  const sunW = sum(options, 'solarW', tech, marks) * SUNLIT_SHARE;
  const batteryWh = sum(options, 'batteryWh', tech, marks);
  const drainW = powerUseW - sunW;
  return { powerUseW, sunW, batteryWh, lastsDays: drainW > 0 ? batteryWh / drainW / 24 : Infinity };
}

/** Kilobytes of Data the Payload makes each day, and what the Comms can send home. */
export function dataOf(design: Design, tech: readonly TechId[] = []): { dataPerDay: number; sendPerDay: number } {
  const options = picked(design);
  return { dataPerDay: sum(options, 'dataPerDay', tech), sendPerDay: sum(options, 'sendPerDay', tech) };
}

/** Does the Payload slot hold what the Contract asks for? Any Payload counts when it names none. */
export function hasRightPayload(design: Design, payload: PayloadKind | null): boolean {
  const p = design.payload ? OPTIONS[design.payload] : null;
  return !!p && (payload === null || p.payload === payload);
}

/** The Assembly Hall level the design's Bus needs, or 0 with no Bus. */
export function hallNeeded(design: Design): number {
  return design.bus ? hallLevelFor(design.bus as BusId) : 0;
}

/** Can the Company's Assembly Hall put this design together? True while there is no Bus yet. */
export function hallFits(state: Pick<SiteState, 'assemblyHall'>, design: Design): boolean {
  return !design.bus || hallTakes(state, design.bus as BusId);
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
  | { kind: 'tooHeavy'; overKg: number; bigger: LaunchVehicleId | null }
  | { kind: 'busFull'; bus: OptionId; carriesKg: number; partsKg: number }
  | { kind: 'hallTooSmall'; bus: OptionId; need: number; level: number }
  | { kind: 'powerShort'; lastsDays: number; needDays: number }
  | { kind: 'money'; short: number }
  | { kind: 'wrongPayload'; payload: PayloadKind }
  | { kind: 'commsShort'; sendPerDay: number; dataPerDay: number }
  | { kind: 'late'; needDays: number; daysLeft: number };

export interface DesignCheck {
  goal: MissionGoal;
  gauges: Record<Resource, Gauge>;
  problems: DesignProblem[];
  /** The Marks of the Parts it would take from the Warehouse. */
  marks: Marks;
  /** Watts used all the time. */
  powerUseW: number;
  /** Days the Power lasts (Infinity when sunlight alone covers it). */
  lastsDays: number;
  dataPerDay: number;
  sendPerDay: number;
  buildDays: number;
  /** Every slot filled, nothing short, and the Assembly Hall can put it together. */
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
  const marks = marksFor(state, design);
  const mass = spacecraftMass(design, marks);
  const massGauge = gauge(mass, goal.liftKg, 'max');
  if (massGauge.status === 'short') {
    // A Launch Vehicle the Company can book that would lift it, if there is one.
    const bigger = LAUNCH_VEHICLE_IDS.find((id) => isVehicleOpen(state, id) && LAUNCH_VEHICLES[id].liftKg[goal.orbit] >= mass) ?? null;
    problems.push({ kind: 'tooHeavy', overKg: mass - goal.liftKg, bigger });
  }
  const bus = design.bus;
  const carriesKg = bus ? (OPTIONS[bus].stats.carriesKg ?? 0) : Infinity;
  const partsKg = carriedMass(design, marks);
  if (bus && partsKg > carriesKg) {
    problems.push({ kind: 'busFull', bus, carriesKg, partsKg });
    massGauge.status = 'short';
  }
  // The Assembly Hall must be big enough for the Bus.
  const hallOk = hallFits(state, design);
  if (bus && !hallOk) problems.push({ kind: 'hallTooSmall', bus, need: hallNeeded(design), level: hallLevel(state) });

  // Power: energy stored plus sunlight, against what the Spacecraft uses over the Mission.
  const hours = goal.missionDays * 24;
  const tech = state.research.tech;
  const { powerUseW, sunW, batteryWh, lastsDays } = powerOf(design, tech, marks);
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
  const { dataPerDay, sendPerDay } = dataOf(design, tech);
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
  const ready = isComplete(design) && hallOk && RESOURCES.every((r) => gauges[r].status === 'ok');
  return { goal, gauges, problems, marks, powerUseW, lastsDays, dataPerDay, sendPerDay, buildDays, ready };
}
