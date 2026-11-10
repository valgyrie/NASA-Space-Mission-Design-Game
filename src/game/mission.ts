import type { Part } from '../economy/part';
import { type ContractId, type Orbit, type PayloadKind, CONTRACTS, accepted, completeContract, deadlineDay } from './contracts';
import {
  LAUNCH_SITES,
  LAUNCH_VEHICLES,
  type LaunchSiteId,
  type LaunchVehicleId,
  isVehicleOpen,
  rideshareCost,
} from './launchVehicles';
import { type Anomaly, rollAnomaly } from './anomalies';
import { awardMission } from './history';
import { type Flight, type TestRun, realFlight, testRun } from './flight';
import type { SiteState } from './siteState';
import type { TechId } from './research';
import {
  type Design,
  type DesignProblem,
  type MissionGoal,
  type OptionId,
  type Slot,
  OPTIONS,
  assemblyDays,
  carriedMass,
  contractNeeds,
  emptySlots,
  missionGoal,
  partsNeeded,
  partsToBuy,
  spacecraftMass,
} from './spacecraft';

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
  /** Game day it was booked and assembly began. */
  startDay: number;
  /** Game day assembly ends and Shipping begins. */
  shipDay: number;
  /** Game day it arrives at the Launch Site, ready to Launch. */
  readyDay: number;
}

/** Why the Spacecraft can't ship yet. */
export type PlanProblem =
  | { kind: 'noContract' }
  | { kind: 'underway' }
  | { kind: 'vehicleClosed' }
  | { kind: 'emptySlots'; slots: Slot[] }
  | { kind: 'tooHeavy'; overKg: number }
  | Extract<DesignProblem, { kind: 'busFull' }>
  | { kind: 'missingParts'; parts: Part[] }
  | { kind: 'money'; short: number };

/** Everything the Launch planner shows: costs, days and anything that blocks shipping. */
export interface LaunchPlan {
  goal: MissionGoal;
  vehicle: LaunchVehicleId;
  site: LaunchSiteId;
  massKg: number;
  liftKg: number;
  rideshare: number;
  shipping: number;
  total: number;
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
  site: LaunchSiteId = 'capeCanaveral',
): LaunchPlan {
  const goal = missionGoal(state);
  const taken = goal.status === 'accepted' ? accepted(state, goal.contract.id) : undefined;
  const massKg = spacecraftMass(design);
  const liftKg = LAUNCH_VEHICLES[vehicle].liftKg[goal.orbit];
  const rideshare = rideshareCost(vehicle, massKg);
  const shipping = LAUNCH_SITES[site].shippingCost;
  const total = rideshare + shipping;
  const building = assemblyDays(design);
  const shippingDays = LAUNCH_SITES[site].shippingDays;
  const today = Math.floor(state.day);
  const readyDay = today + building + shippingDays;

  const problems: PlanProblem[] = [];
  if (!taken) problems.push({ kind: 'noContract' });
  if (state.mission) problems.push({ kind: 'underway' });
  if (!isVehicleOpen(state, vehicle)) problems.push({ kind: 'vehicleClosed' });
  const slots = emptySlots(design);
  if (slots.length > 0) problems.push({ kind: 'emptySlots', slots });
  if (massKg > liftKg + 1e-9) problems.push({ kind: 'tooHeavy', overKg: massKg - liftKg });
  const bus = design.bus;
  const carriesKg = bus ? (OPTIONS[bus].stats.carriesKg ?? 0) : Infinity;
  const partsKg = carriedMass(design);
  if (bus && partsKg > carriesKg) problems.push({ kind: 'busFull', bus, carriesKg, partsKg });
  const missing = partsToBuy(state, design);
  if (missing.length > 0) problems.push({ kind: 'missingParts', parts: missing });
  if (state.money < total) problems.push({ kind: 'money', short: total - state.money });

  return {
    goal,
    vehicle,
    site,
    massKg,
    liftKg,
    rideshare,
    shipping,
    total,
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
  site: LaunchSiteId = 'capeCanaveral',
): TestRun {
  const plan = planLaunch(state, design, vehicle, site);
  return testRun(seed, { contract: plan.goal.contract.id, design, vehicle, tech: [...state.research.tech] }, plan.readyDay, plan.deadlineDay);
}

/**
 * Book the Rideshare and ship: pay for both, take the Parts out of the Warehouse and start the Mission.
 * Does nothing unless the plan has no problems.
 */
export function shipMission(
  state: SiteState,
  design: Design,
  vehicle: LaunchVehicleId = state.vehicle,
  site: LaunchSiteId = 'capeCanaveral',
): LaunchPlan {
  const plan = planLaunch(state, design, vehicle, site);
  if (!plan.ok) return plan;
  state.money -= plan.total;
  for (const p of partsNeeded(design)) state.parts[p] -= 1;
  const startDay = Math.floor(state.day);
  state.mission = {
    contract: plan.goal.contract.id,
    design: { ...design },
    vehicle,
    site,
    tech: [...state.research.tech],
    startDay,
    shipDay: startDay + plan.assemblyDays,
    readyDay: plan.readyDay,
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
  | { kind: 'orbit'; ok: boolean; orbit: Orbit; vehicle: LaunchVehicleId; massKg: number; liftKg: number }
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
export function launch(state: SiteState, seed: string): LaunchResult | null {
  const m = state.mission;
  if (!m || missionStage(state)?.stage !== 'ready') return null;
  const launchDay = Math.floor(state.day);
  const taken = accepted(state, m.contract);
  const flight = realFlight(seed, m, launchDay, taken ? deadlineDay(taken) : null);
  const { findings, success } = flight;
  const anomaly = rollAnomaly(state, seed, m, flight, launchDay);
  const reward = success ? completeContract(state, m.contract, !anomaly) : 0;
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
  };
  state.reports.push(report);
  state.mission = null;
  awardMission(state, report);
  return { report, flight, design: m.design };
}
