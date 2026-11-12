import type { Part } from '../economy/part';
import { GROUND_STATION_STEP, MARK_STEP, OPTION_STATS, type OptionStats, RECIPES, SUNLIT_SHARE } from './balance';
import { type Era, eraOf, isBuildingOpen, isPartOpen, partEra } from './eras';
import { type Difficulty, partInMode } from './modes';
import { type Contract, type Orbit, type PayloadKind, contractById, CONTRACT_IDS, availableContracts, daysLeft } from './contracts';
import type { HistoryCardId } from './history';
import { type Boosted, type TechId, boost } from './research';
import { LAUNCH_VEHICLE_IDS, type LaunchSiteId, type LaunchVehicleId, isVehicleOpen, liftFrom } from './launchVehicles';
import { shippingTo } from './places';
import { type TradeResult, buy, buyPrice } from './market';
import { type SiteState, bestMark, levelBoost, partMass, storageFree } from './siteState';
import { type BusId, hallLevel, hallLevelFor, hallTakes } from './upgrades';

/**
 * The Spacecraft the player designs in the Mission Designer: one option per slot.
 * Nothing is used up here; the Parts leave the Warehouse when the Mission ships (mission.ts).
 */

export const SLOTS = ['bus', 'power', 'battery', 'comms', 'pointing', 'propulsion', 'payload'] as const;
export type Slot = (typeof SLOTS)[number];

/**
 * Slots the Mission Designer shows only from an Era on. Until then they hold their no-Part option
 * (Propulsion: none), so Era 1 designs need no engine and the tutorial has one slot fewer.
 */
export const SLOT_ERA: Partial<Record<Slot, Era>> = { propulsion: 2 };

/** Every option in every slot. Options that need a Part share its id; the rest need no Part. */
export const OPTION_IDS = [
  'smallBus',
  'mediumBus',
  'largeBus',
  'batteriesOnly',
  'solarCells',
  'smallBattery',
  'mediumBattery',
  'largeBattery',
  'simpleAntenna',
  'lowPowerAntenna',
  'spin',
  'noEngine',
  'mainEngine',
  'radiationDetector',
  'tvCamera',
  'transponder',
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
  largeBus: option('largeBus', 'bus', 'largeBus'),
  batteriesOnly: option('batteriesOnly', 'power', null),
  solarCells: option('solarCells', 'power', 'solarCells'),
  smallBattery: option('smallBattery', 'battery', 'smallBattery'),
  largeBattery: option('largeBattery', 'battery', 'largeBattery'),
  mediumBattery: option('mediumBattery', 'battery', 'mediumBattery'),
  simpleAntenna: option('simpleAntenna', 'comms', 'simpleAntenna'),
  lowPowerAntenna: option('lowPowerAntenna', 'comms', 'lowPowerAntenna'),
  // Explorer 1 kept steady by spinning around its long axis at 750 rpm: no Part needed.
  spin: option('spin', 'pointing', null),
  noEngine: option('noEngine', 'propulsion', null),
  // A solid apogee motor, as Syncom carried: it fires once at the top of the transfer orbit.
  mainEngine: option('mainEngine', 'propulsion', 'mainEngine'),
  radiationDetector: option('radiationDetector', 'payload', 'radiationDetector', 'radiationDetector'),
  tvCamera: option('tvCamera', 'payload', 'tvCamera', 'tvCamera'),
  transponder: option('transponder', 'payload', 'transponder', 'transponder'),
};

/**
 * Options shown but locked until a Real History card is unlocked. Explorer 1 flew on batteries alone;
 * Vanguard 1 (17 March 1958) was the first solar-powered satellite, so Solar Cells come with its card.
 */
export const UNLOCKED_BY: Partial<Record<OptionId, HistoryCardId>> = { solarCells: 'vanguard1' };

/** The Era an option opens in: its Part's (Era 1 for options with no Part). */
export function optionEra(id: OptionId): Era {
  const part = OPTIONS[id].part;
  return part ? partEra(part) : 1;
}

export function isUnlocked(state: Pick<SiteState, 'history' | 'hq'> & Partial<Pick<SiteState, 'difficulty' | 'playMode'>>, id: OptionId): boolean {
  const card = UNLOCKED_BY[id];
  const part = OPTIONS[id].part;
  return (state.playMode === 'freePlay' || !card || state.history.includes(card)) && (!part || isPartOpen(state, part));
}

/** Does the Mission Designer show this slot yet? */
export function isSlotShown(state: Pick<SiteState, 'hq'>, slot: Slot): boolean {
  return eraOf(state) >= (SLOT_ERA[slot] ?? 1);
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

/** The options for a slot, in menu order. Without a difficulty, includes both sets. */
export function optionsFor(slot: Slot, difficulty?: Difficulty): SpacecraftOption[] {
  return OPTION_IDS.map((id) => OPTIONS[id]).filter((o) =>
    o.slot === slot && (!difficulty || !o.part || partInMode(difficulty, o.part)),
  );
}

/** The option picked for each slot, or null while it is empty. */
export type Design = Record<Slot, OptionId | null>;

/** An empty table. Propulsion starts as none: Era 1 has no engines, and most Missions need none. */
export function emptyDesign(): Design {
  return { bus: null, power: null, battery: null, comms: null, pointing: null, propulsion: 'noEngine', payload: null };
}

/** Pick an option for its slot. Options locked for this Company (`state`, when given) are refused. */
export function choose(design: Design, id: OptionId, state?: Pick<SiteState, 'history' | 'hq'> & Partial<Pick<SiteState, 'difficulty'>>): boolean {
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
  /** How much the Company's Ground Stations multiply what an antenna sends home (1 with none). */
  ground: number;
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
  const contract = taken ? contractById(taken.id) : (offered ?? contractById(state.completed.at(-1) ?? CONTRACT_IDS[0]));
  const status = taken ? 'accepted' : offered ? 'offered' : 'done';
  const { orbit, payload, missionDays } = contractNeeds(contract);
  const vehicle: LaunchVehicleId = state.vehicle;
  const site: LaunchSiteId = state.launchSite;
  return {
    contract,
    status,
    missionDays,
    payload,
    daysLeft: taken ? daysLeft(state, taken) : contract.deadlineDays,
    orbit,
    vehicle,
    liftKg: liftFrom(vehicle, orbit, site),
    site,
    shippingDays: shippingTo(state.place, site).days,
    ground: groundBoost(state),
  };
}

// ---- Ground Stations ----

/**
 * How much the Company's Ground Stations multiply what every antenna can send home: 1 with none (Spacecraft use
 * the stations they borrow), and each station adds GROUND_STATION_STEP times its level's boost.
 */
export function groundBoost(state: Pick<SiteState, 'groundStations'>): number {
  return 1 + state.groundStations.reduce((sum, g) => sum + GROUND_STATION_STEP * levelBoost(g.level), 0);
}

/** The Spacecraft carries a main engine: it can climb from a transfer orbit to a geostationary one. */
export function hasMainEngine(design: Design): boolean {
  return design.propulsion === 'mainEngine';
}

/** The orbit needs the Spacecraft's own main engine to reach it (a geostationary orbit does). */
export function needsMainEngine(orbit: Orbit): boolean {
  return orbit === 'geostationary';
}

// ---- How the Spacecraft works in flight ----

/**
 * Power over a Mission: watts used, watts from sunlight on average, energy stored, and days it lasts.
 * Higher orbits spend more of each lap in sunlight (a geostationary one almost all of it).
 */
export function powerOf(
  design: Design,
  tech: readonly TechId[] = [],
  marks: Marks = {},
  orbit: Orbit = 'lowEarthOrbit',
): { powerUseW: number; sunW: number; batteryWh: number; lastsDays: number } {
  const options = picked(design);
  const powerUseW = sum(options, 'powerUseW', tech, marks);
  const sunW = sum(options, 'solarW', tech, marks) * SUNLIT_SHARE[orbit];
  const batteryWh = sum(options, 'batteryWh', tech, marks);
  const drainW = powerUseW - sunW;
  return { powerUseW, sunW, batteryWh, lastsDays: drainW > 0 ? batteryWh / drainW / 24 : Infinity };
}

/** Kilobytes of Data the Payload makes each day, and what the Comms can send home through the Ground Stations. */
export function dataOf(design: Design, tech: readonly TechId[] = [], ground = 1): { dataPerDay: number; sendPerDay: number } {
  const options = picked(design);
  return { dataPerDay: sum(options, 'dataPerDay', tech), sendPerDay: sum(options, 'sendPerDay', tech) * ground };
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
  | { kind: 'cantReach'; orbit: Orbit; bigger: LaunchVehicleId | null }
  | { kind: 'needsEngine' }
  | { kind: 'busFull'; bus: OptionId; carriesKg: number; partsKg: number }
  | { kind: 'hallTooSmall'; bus: OptionId; need: number; level: number }
  | { kind: 'powerShort'; lastsDays: number; needDays: number }
  | { kind: 'money'; short: number }
  | { kind: 'wrongPayload'; payload: PayloadKind }
  | { kind: 'commsShort'; sendPerDay: number; dataPerDay: number; stations: boolean }
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
    const bigger = LAUNCH_VEHICLE_IDS.find((id) => isVehicleOpen(state, id) && liftFrom(id, goal.orbit, goal.site) >= mass) ?? null;
    if (goal.liftKg <= 0) problems.push({ kind: 'cantReach', orbit: goal.orbit, bigger });
    else problems.push({ kind: 'tooHeavy', overKg: mass - goal.liftKg, bigger });
  }
  // A geostationary orbit needs the Spacecraft's own main engine for the last climb.
  if (needsMainEngine(goal.orbit) && !hasMainEngine(design)) problems.push({ kind: 'needsEngine' });
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
  const { powerUseW, sunW, batteryWh, lastsDays } = powerOf(design, tech, marks, goal.orbit);
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
  const { dataPerDay, sendPerDay } = dataOf(design, tech, goal.ground);
  const commsGauge = gauge(sendPerDay, dataPerDay, 'min', empty('comms', 'payload'));
  if (commsGauge.status === 'short') {
    problems.push({ kind: 'commsShort', sendPerDay, dataPerDay, stations: isBuildingOpen(state, 'groundStation') });
  }

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
  const engineOk = !needsMainEngine(goal.orbit) || hasMainEngine(design);
  const ready = isComplete(design) && hallOk && engineOk && RESOURCES.every((r) => gauges[r].status === 'ok');
  return { goal, gauges, problems, marks, powerUseW, lastsDays, dataPerDay, sendPerDay, buildDays, ready };
}
