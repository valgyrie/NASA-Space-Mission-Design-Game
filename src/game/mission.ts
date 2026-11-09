import type { Part } from '../economy/part';
import { type ContractId, type Orbit, type PayloadKind, CONTRACTS, accepted, completeContract, deadlineDay } from './contracts';
import {
  LAUNCH_SITES,
  LAUNCH_VEHICLES,
  type LaunchSiteId,
  type LaunchVehicleId,
  rideshareCost,
} from './launchVehicles';
import type { SiteState } from './siteState';
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
  dataOf,
  emptySlots,
  hasRightPayload,
  missionGoal,
  partsNeeded,
  partsToBuy,
  powerOf,
  spacecraftMass,
} from './spacecraft';

/**
 * A Mission from shipping to Mission Report. The player books a Rideshare and ships the Spacecraft:
 * the Parts leave the Warehouse, the money is paid, and the Spacecraft is assembled and shipped to the
 * Launch Site while the Site keeps running. Once it arrives the player Launches, and the flight is
 * worked out from the design (no luck yet: risk comes with ticket 17).
 */

/** A Spacecraft on its way to Launch. */
export interface Mission {
  contract: ContractId;
  /** The design as it shipped; the Mission Designer's table is free for the next one. */
  design: Design;
  vehicle: LaunchVehicleId;
  site: LaunchSiteId;
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
  vehicle: LaunchVehicleId = 'juno1',
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
 * Book the Rideshare and ship: pay for both, take the Parts out of the Warehouse and start the Mission.
 * Does nothing unless the plan has no problems.
 */
export function shipMission(
  state: SiteState,
  design: Design,
  vehicle: LaunchVehicleId = 'juno1',
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
    startDay,
    shipDay: startDay + plan.assemblyDays,
    readyDay: plan.readyDay,
  };
  return plan;
}

/** Where the Mission is now, and whole game days until the next stage. */
export function missionStage(state: SiteState): { stage: 'assembling' | 'shipping' | 'ready'; daysLeft: number } | null {
  const m = state.mission;
  if (!m) return null;
  const today = Math.floor(state.day);
  if (today < m.shipDay) return { stage: 'assembling', daysLeft: m.shipDay - today };
  if (today < m.readyDay) return { stage: 'shipping', daysLeft: m.readyDay - today };
  return { stage: 'ready', daysLeft: 0 };
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
  /** Money paid for it (0 on failure). */
  reward: number;
  findings: Finding[];
}

/** Work out how the flight goes, from the design alone. */
export function flightFindings(mission: Mission, launchDay: number, deadline: number | null): Finding[] {
  const contract = CONTRACTS[mission.contract];
  const { orbit, payload, missionDays } = contractNeeds(contract);
  const design = mission.design;
  const massKg = spacecraftMass(design);
  const liftKg = LAUNCH_VEHICLES[mission.vehicle].liftKg[orbit];
  const power = powerOf(design);
  const data = dataOf(design);
  const endDay = launchDay + missionDays;
  return [
    { kind: 'orbit', ok: massKg <= liftKg + 1e-9, orbit, vehicle: mission.vehicle, massKg, liftKg },
    { kind: 'payload', ok: hasRightPayload(design, payload), payload, carried: design.payload },
    {
      kind: 'power',
      ok: power.lastsDays >= missionDays - 1e-9,
      battery: design.battery,
      batteryWh: power.batteryWh,
      powerUseW: power.powerUseW,
      lastsDays: Number.isFinite(power.lastsDays) ? power.lastsDays : null,
      needDays: missionDays,
    },
    { kind: 'comms', ok: data.sendPerDay >= data.dataPerDay - 1e-9, ...data },
    { kind: 'time', ok: deadline === null || endDay <= deadline, endDay, deadlineDay: deadline ?? endDay },
  ];
}

/** Launch the Mission waiting at the Launch Site: fly it, pay the reward on success and file the Mission Report. */
export function launch(state: SiteState): MissionReport | null {
  const m = state.mission;
  if (!m || missionStage(state)?.stage !== 'ready') return null;
  const launchDay = Math.floor(state.day);
  const taken = accepted(state, m.contract);
  const findings = flightFindings(m, launchDay, taken ? deadlineDay(taken) : null);
  const success = findings.every((f) => f.ok);
  const reward = success ? completeContract(state, m.contract) : 0;
  const report: MissionReport = { contract: m.contract, vehicle: m.vehicle, site: m.site, launchDay, success, reward, findings };
  state.reports.push(report);
  state.mission = null;
  return report;
}
