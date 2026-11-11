import type { Part } from '../economy/part';
import { type ContractId, type Orbit, type PayloadKind, CONTRACTS, accepted, completeContract, deadlineDay } from './contracts';
import { INSURANCE } from './balance';
import { LAUNCH_VEHICLES, type LaunchSiteId, type LaunchVehicleId, isVehicleOpen, launchCost, liftFrom } from './launchVehicles';
import { type Weather, shippingTo, weatherOn } from './places';
import { type Anomaly, rollAnomaly } from './anomalies';
import { awardMission } from './history';
import { type Flight, type TestRun, realFlight, testRun } from './flight';
import type { SiteState } from './siteState';
import type { TechId } from './research';
import {
  type Design,
  type DesignProblem,
  type Marks,
  type MissionGoal,
  type OptionId,
  type Slot,
  OPTIONS,
  assemblyDays,
  carriedMass,
  contractNeeds,
  emptySlots,
  hallFits,
  hallNeeded,
  marksFor,
  missionGoal,
  partsNeeded,
  partsToBuy,
  spacecraftMass,
} from './spacecraft';
import { takePart } from './siteState';
import { hallLevel } from './upgrades';

/**
 * A Mission from shipping to Mission Report. The player books a Rideshare and ships the Spacecraft:
 * the Parts leave the Warehouse, the money is paid, and the Spacecraft is assembled and shipped to the
 * Launch Site while the Site keeps running. Once it arrives the player Launches, and the flight is
 * worked out from the design (flight.ts): small differences between Parts mean thin margins can fail.
 */

/** A Spacecraft on its way to Launch. */
export interface Mission {
  contract: ContractId;
  /** The design as it shipped; the Mission Designer's table is free for the next one. */
  design: Design;
  vehicle: LaunchVehicleId;
  site: LaunchSiteId;
  /** Tech tree Upgrades the Company had when it shipped: its Parts were built with them. */
  tech: TechId[];
  /** The Mark of each Part it took from the Warehouse. */
  marks: Marks;
  /** How much the Company's Ground Stations multiplied its antenna when it shipped (1 with none). */
  ground: number;
  /** Game day it was booked and assembly began. */
  startDay: number;
  /** Game day assembly ends and Shipping begins. */
  shipDay: number;
  /** Game day it arrives at the Launch Site, ready to Launch. */
  readyDay: number;
  /** The Launch Insurance bought with it, or null. */
  insurance: Insurance | null;
}

/** Launch Insurance: paid when shipping; pays back `payout` if the Mission fails. */
export interface Insurance {
  price: number;
  payout: number;
}

/** Why the Spacecraft can't ship yet. */
export type PlanProblem =
  | { kind: 'noContract' }
  | { kind: 'underway' }
  | { kind: 'vehicleClosed' }
  | { kind: 'emptySlots'; slots: Slot[] }
  | { kind: 'tooHeavy'; overKg: number }
  | { kind: 'cantReach' }
  | Extract<DesignProblem, { kind: 'busFull' | 'hallTooSmall' }>
  | { kind: 'missingParts'; parts: Part[] }
  | { kind: 'money'; short: number };

/** Everything the Launch planner shows: costs, days and anything that blocks shipping. */
export interface LaunchPlan {
  goal: MissionGoal;
  vehicle: LaunchVehicleId;
  site: LaunchSiteId;
  /** The Marks of the Parts it would take from the Warehouse. */
  marks: Marks;
  massKg: number;
  liftKg: number;
  /** What the Launch costs: a Rideshare by the kilogram, or the whole rocket when `wholeLaunch`. */
  rideshare: number;
  /** The client pays for the whole Launch Vehicle, as AT&T did for Telstar 1. */
  wholeLaunch: boolean;
  shipping: number;
  /** Rideshare and Shipping: what the Mission costs. */
  total: number;
  /** The Launch Insurance price, when it is bought (0 when not). */
  insurance: number;
  assemblyDays: number;
  shippingDays: number;
  /** Game day it would reach the Launch Site if shipped today. */
  readyDay: number;
  /** Game day the Mission would end if launched as soon as it arrives. */
  endDay: number;
  /** The Contract's deadline, or null if it isn't accepted. */
  deadlineDay: number | null;
  problems: PlanProblem[];
  ok: boolean;
}

export function planLaunch(
  state: SiteState,
  design: Design,
  vehicle: LaunchVehicleId = state.vehicle,
  site: LaunchSiteId = state.launchSite,
  insurance = 0,
): LaunchPlan {
  const goal = missionGoal(state);
  const taken = goal.status === 'accepted' ? accepted(state, goal.contract.id) : undefined;
  const marks = marksFor(state, design);
  const massKg = spacecraftMass(design, marks);
  const liftKg = liftFrom(vehicle, goal.orbit, site);
  const wholeLaunch = !!goal.contract.wholeLaunch && LAUNCH_VEHICLES[vehicle].launchPrice !== undefined;
  const rideshare = launchCost(vehicle, massKg, wholeLaunch);
  const route = shippingTo(state.place, site);
  const shipping = route.cost;
  const total = rideshare + shipping;
  const building = assemblyDays(design);
  const shippingDays = route.days;
  const today = Math.floor(state.day);
  const readyDay = today + building + shippingDays;

  const problems: PlanProblem[] = [];
  if (!taken) problems.push({ kind: 'noContract' });
  if (state.mission) problems.push({ kind: 'underway' });
  if (!isVehicleOpen(state, vehicle)) problems.push({ kind: 'vehicleClosed' });
  const slots = emptySlots(design);
  if (slots.length > 0) problems.push({ kind: 'emptySlots', slots });
  if (liftKg <= 0) problems.push({ kind: 'cantReach' });
  else if (massKg > liftKg + 1e-9) problems.push({ kind: 'tooHeavy', overKg: massKg - liftKg });
  const bus = design.bus;
  const carriesKg = bus ? (OPTIONS[bus].stats.carriesKg ?? 0) : Infinity;
  const partsKg = carriedMass(design, marks);
  if (bus && partsKg > carriesKg) problems.push({ kind: 'busFull', bus, carriesKg, partsKg });
  if (bus && !hallFits(state, design)) problems.push({ kind: 'hallTooSmall', bus, need: hallNeeded(design), level: hallLevel(state) });
  const missing = partsToBuy(state, design);
  if (missing.length > 0) problems.push({ kind: 'missingParts', parts: missing });
  if (state.money < total + insurance) problems.push({ kind: 'money', short: total + insurance - state.money });

  return {
    goal,
    vehicle,
    site,
    marks,
    massKg,
    liftKg,
    rideshare,
    wholeLaunch,
    shipping,
    total,
    insurance,
    assemblyDays: building,
    shippingDays,
    readyDay,
    endDay: readyDay + goal.missionDays,
    deadlineDay: taken ? deadlineDay(taken) : null,
    problems,
    ok: problems.length === 0,
  };
}

/**
 * A free Test Run of the design, as if it shipped today: same Launch day and deadline as the plan.
 * It needs no Contract, Parts or money, so the player can test before buying anything.
 */
export function testRunFor(
  state: SiteState,
  seed: string,
  design: Design,
  vehicle: LaunchVehicleId = state.vehicle,
  site: LaunchSiteId = state.launchSite,
): TestRun {
  const plan = planLaunch(state, design, vehicle, site);
  const flightPlan = {
    contract: plan.goal.contract.id,
    design,
    vehicle,
    site,
    tech: [...state.research.tech],
    marks: plan.marks,
    ground: plan.goal.ground,
  };
  return testRun(seed, flightPlan, plan.readyDay, plan.deadlineDay, { reliability: rocketReliability(state, vehicle) });
}

/**
 * Share of Launches the rocket gets a light enough Spacecraft to orbit. The Company's first Launch always
 * works, as Explorer 1's did, so the tutorial can't be lost to luck; after that, the Launch Vehicle's own.
 */
export function rocketReliability(state: Pick<SiteState, 'reports'>, vehicle: LaunchVehicleId): number {
  return state.reports.length === 0 ? 1 : LAUNCH_VEHICLES[vehicle].reliability;
}

/** What Launch Insurance would cost for this design, or why nobody will sell it. */
export type InsuranceQuote =
  | { ok: true; price: number; payout: number; successPercent: number }
  | { ok: false; payout: number; successPercent: number };

const thousands = (n: number) => Math.max(1_000, Math.round(n / 1_000) * 1_000);

/**
 * Price Launch Insurance from the Test Run's estimated success: it pays back most of the Rideshare and
 * Shipping if the Mission fails, and costs that payout times the chance of failure, plus the insurer's
 * margin. Too risky a flight (under half) can't be insured.
 */
export function insuranceQuote(
  state: SiteState,
  seed: string,
  design: Design,
  vehicle: LaunchVehicleId = state.vehicle,
  site: LaunchSiteId = state.launchSite,
): InsuranceQuote {
  const plan = planLaunch(state, design, vehicle, site);
  const { successPercent } = testRunFor(state, seed, design, vehicle, site);
  const payout = thousands(plan.total * INSURANCE.payoutShare);
  if (successPercent < INSURANCE.minSuccess * 100) return { ok: false, payout, successPercent };
  const failShare = 1 - successPercent / 100;
  const price = thousands(Math.max(INSURANCE.minShare, failShare * INSURANCE.margin) * payout);
  return { ok: true, price, payout, successPercent };
}

/**
 * Book the Rideshare and ship: pay for both, take the Parts out of the Warehouse and start the Mission.
 * The Assembly Hall puts it together, then it is shipped. With `insure` (and the Seed, for the Test Run
 * behind the price) it also buys Launch Insurance, if it can be had.
 * Does nothing unless the plan has no problems.
 */
export function shipMission(
  state: SiteState,
  design: Design,
  vehicle: LaunchVehicleId = state.vehicle,
  site: LaunchSiteId = state.launchSite,
  { insure = false, seed = '' }: { insure?: boolean; seed?: string } = {},
): LaunchPlan {
  const quote = insure ? insuranceQuote(state, seed, design, vehicle, site) : null;
  const insurance = quote?.ok ? { price: quote.price, payout: quote.payout } : null;
  const plan = planLaunch(state, design, vehicle, site, insurance?.price ?? 0);
  if (!plan.ok) return plan;
  state.money -= plan.total + plan.insurance;
  // The best Parts in the Warehouse go: the Marks the plan was worked out with.
  for (const p of partsNeeded(design)) takePart(state, p, 'best');
  const startDay = Math.floor(state.day);
  state.mission = {
    contract: plan.goal.contract.id,
    design: { ...design },
    vehicle,
    site,
    tech: [...state.research.tech],
    marks: { ...plan.marks },
    ground: plan.goal.ground,
    startDay,
    shipDay: startDay + plan.assemblyDays,
    readyDay: plan.readyDay,
    insurance,
  };
  return plan;
}

/** Where the Mission is now: the stage, whole game days until the next one, and how far through this one (0–1). */
export interface MissionStage {
  stage: 'assembling' | 'shipping' | 'ready';
  daysLeft: number;
  fraction: number;
}

export function missionStage(state: SiteState): MissionStage | null {
  const m = state.mission;
  if (!m) return null;
  const today = Math.floor(state.day);
  const through = (from: number, to: number) => (to > from ? Math.min(1, Math.max(0, (state.day - from) / (to - from))) : 1);
  if (today < m.shipDay) return { stage: 'assembling', daysLeft: m.shipDay - today, fraction: through(m.startDay, m.shipDay) };
  if (today < m.readyDay) return { stage: 'shipping', daysLeft: m.readyDay - today, fraction: through(m.shipDay, m.readyDay) };
  return { stage: 'ready', daysLeft: 0, fraction: 1 };
}

/** The dates still to come, for the Mission tracker. */
export interface MissionTimeline {
  startDay: number;
  shipDay: number;
  readyDay: number;
  /** Earliest Game day it can Launch: when it arrives, or today if it is already there. */
  launchDay: number;
  /** Game day the Mission would end if it Launched on `launchDay`. */
  endDay: number;
  /** The Contract's deadline, or null if it is no longer accepted. */
  deadlineDay: number | null;
}

export function missionTimeline(state: SiteState): MissionTimeline | null {
  const m = state.mission;
  if (!m) return null;
  const launchDay = Math.max(m.readyDay, Math.floor(state.day));
  const taken = accepted(state, m.contract);
  return {
    startDay: m.startDay,
    shipDay: m.shipDay,
    readyDay: m.readyDay,
    launchDay,
    endDay: launchDay + contractNeeds(CONTRACTS[m.contract]).missionDays,
    deadlineDay: taken ? deadlineDay(taken) : null,
  };
}

// ---- Flight and Mission Report ----

/** One thing the Contract asked for, whether the Spacecraft did it, and the design numbers that explain why. */
export type Finding =
  | {
      kind: 'orbit';
      ok: boolean;
      orbit: Orbit;
      vehicle: LaunchVehicleId;
      massKg: number;
      liftKg: number;
      /** The rocket stage that failed, or null when the rocket worked. Missing in saves from before rocket failures. */
      failedStage?: number | null;
      /** It reached the transfer orbit but had no main engine to climb to a geostationary one. */
      noEngine?: boolean;
    }
  | { kind: 'payload'; ok: boolean; payload: PayloadKind | null; carried: OptionId | null }
  | {
      kind: 'power';
      ok: boolean;
      battery: OptionId | null;
      batteryWh: number;
      powerUseW: number;
      /** Days the Power lasted; null when sunlight alone kept it going. */
      lastsDays: number | null;
      needDays: number;
    }
  | { kind: 'comms'; ok: boolean; sendPerDay: number; dataPerDay: number }
  | { kind: 'time'; ok: boolean; endDay: number; deadlineDay: number };

export interface MissionReport {
  contract: ContractId;
  vehicle: LaunchVehicleId;
  site: LaunchSiteId;
  launchDay: number;
  /** Every finding was ok, so the Contract was fulfilled. */
  success: boolean;
  /** Money paid for it (0 on failure). Until its Anomaly is settled, the full reward, held back. */
  reward: number;
  findings: Finding[];
  /** The design that flew, for the Space view. Null in saves from before it was kept. */
  design: Design | null;
  /** The Anomaly met in flight, or null. Null in saves from before Anomalies. */
  anomaly: Anomaly | null;
  /** Money Launch Insurance paid back after a failure (0 when it wasn't bought or the Mission worked). */
  insurancePaid: number;
}

/** What a Launch gives back: the Mission Report (also filed in the state) and the flight behind it, for the show. */
export interface LaunchResult {
  report: MissionReport;
  flight: Flight;
  /** The design that flew. */
  design: Design;
}

/**
 * Launch the Mission waiting at the Launch Site: fly it, pay the reward on success and file the Mission Report.
 * The flight is drawn from the Site's Seed and the Launch day, like one run of a Test Run. If an Anomaly
 * strikes, the reward is held back until it is settled (anomalies.ts), since it can cut the pay.
 * Success also earns a Mission Patch and the Milestone's "after" Real History card (history.ts).
 */
/** Today's weather at the Launch Site the Mission waits at, or null when no Mission is ready. */
export function launchWeather(state: SiteState): Weather | null {
  const m = state.mission;
  if (!m || missionStage(state)?.stage !== 'ready') return null;
  return weatherOn(m.site, state.day);
}

export function launch(state: SiteState, seed: string): LaunchResult | null {
  const m = state.mission;
  if (!m || missionStage(state)?.stage !== 'ready') return null;
  // Weather over the limits Scrubs the Launch: nothing happens, try another day (launchWeather says why).
  if (weatherOn(m.site, state.day).scrub) return null;
  const launchDay = Math.floor(state.day);
  const taken = accepted(state, m.contract);
  const flight = realFlight(seed, m, launchDay, taken ? deadlineDay(taken) : null, rocketReliability(state, m.vehicle));
  const { findings, success } = flight;
  const anomaly = rollAnomaly(state, seed, m, flight, launchDay);
  const reward = success ? completeContract(state, m.contract, !anomaly) : 0;
  // Launch Insurance pays back most of the cost of a failed Mission.
  const insurancePaid = !success && m.insurance ? m.insurance.payout : 0;
  state.money += insurancePaid;
  const report: MissionReport = {
    contract: m.contract,
    vehicle: m.vehicle,
    site: m.site,
    launchDay,
    success,
    reward,
    findings,
    design: { ...m.design },
    anomaly,
    insurancePaid,
  };
  state.reports.push(report);
  state.mission = null;
  awardMission(state, report);
  return { report, flight, design: m.design };
}
