import { type Design, OPTIONS, SLOTS, isValidChoice, emptyDesign, buyMissing, contractNeeds, powerOf, dataOf } from './spacecraft';
import { newSiteState, type SiteState } from './siteState';
import { contractById, deadlineDay, type ContractId } from './contracts';
import { planLaunch, shipMission } from './mission';
import { realFlight, testRun, type Flight } from './flight';
import { LAUNCH_VEHICLES } from './launchVehicles';
import { JPL, weatherOn } from './places';
import { hashText, makeRng } from '../site/random';
import { randomSeed } from '../site/seed';

export const WEEKLY_BUDGET = 600_000;
const DAY_MS = 86_400_000;
/** Weeks start Monday 00:00 UTC, using the server's clock for online play. */
export function weeklyId(now = new Date()): string {
  const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  day.setUTCDate(day.getUTCDate() - (day.getUTCDay() + 6) % 7);
  return day.toISOString().slice(0, 10);
}
export function validWeek(id: unknown): id is string {
  if (typeof id !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(id)) return false;
  const d = new Date(`${id}T00:00:00Z`);
  return Number.isFinite(d.getTime()) && weeklyId(d) === id;
}
export function previousWeek(id: string): string {
  return weeklyId(new Date(new Date(`${id}T00:00:00Z`).getTime() - 7 * DAY_MS));
}
export function weeklyRules(week: string) {
  const n = Math.floor(new Date(`${week}T00:00:00Z`).getTime() / (7 * DAY_MS));
  return {
    week, seed: randomSeed(makeRng(hashText(`weekly-v1|${week}`))),
    contract: `free-${n * 3 + n % 2}` as ContractId,
    budget: WEEKLY_BUDGET,
  };
}
/** Same catalogue in both difficulty modes. No personal stock, tech, buildings or grants enter an attempt. */
export function weeklyAllows(id: keyof typeof OPTIONS): boolean {
  return id !== 'mainEngine' && id !== 'transponder';
}
export function weeklyState(week: string): SiteState {
  const state = newSiteState({ ...JPL }, 'advanced', 'freePlay');
  state.money = WEEKLY_BUDGET;
  state.hq = { x: 0, z: 0, level: 5, upgradeDay: null };
  state.assemblyHall = { x: 3, z: 0, level: 3, upgradeDay: null };
  state.warehouses = [{ x: 6, z: 0, level: 3, upgradeDay: null }];
  state.contracts = [{ id: weeklyRules(week).contract, acceptedDay: state.day }];
  return state;
}
/** Wait for the largest allowed Bus, then use one clear Launch day for every design. */
export function weeklyLaunchDay(week: string): number {
  const state = weeklyState(week);
  let day = planLaunch(state, { ...state.design, bus: 'largeBus' }).readyDay;
  while (weatherOn(state.launchSite, day).scrub) day++;
  return day;
}
/** Same fixed flight day and vehicle Reliability as the scored attempt, including previews. */
export function weeklyTestRun(week: string, design: Design) {
  const state = weeklyState(week);
  state.design = design;
  const day = weeklyLaunchDay(week);
  return testRun(weeklyRules(week).seed, {
    contract: weeklyRules(week).contract, design, vehicle: 'falcon9', site: state.launchSite, tech: [], ground: 1,
  }, day, deadlineDay(state.contracts[0]!), { reliability: LAUNCH_VEHICLES.falcon9.reliability });
}
export interface WeeklyResult {
  success: boolean;
  score: number;
  reliability: number;
  science: number;
  money: number;
  mass: number;
  cost: number;
  flight: Flight;
}
/** Only the design is submitted. The backend recreates all resources and the flight before scoring. */
export function evaluateWeekly(week: string, value: unknown): WeeklyResult | null {
  if (!validWeek(week) || !value || typeof value !== 'object' || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  if (Object.keys(raw).length !== SLOTS.length || SLOTS.some((s) => !isValidChoice(s, raw[s]) || raw[s] === null || !weeklyAllows(raw[s] as keyof typeof OPTIONS))) return null;
  const design = { ...emptyDesign(), ...raw } as Design;
  const state = weeklyState(week);
  state.design = design;
  if (!buyMissing(state, design).ok) return null;
  const rules = weeklyRules(week);
  const plan = planLaunch(state, design);
  if (!plan.ok || !shipMission(state, design).ok) return null;
  // All players fly on the same first clear day; elapsed real time never changes an attempt.
  const launchDay = weeklyLaunchDay(week);
  const mission = state.mission!;
  const deadline = deadlineDay(state.contracts[0]!);
  const run = weeklyTestRun(week, design);
  // The first Launch is safe from rocket failure, as in an ordinary new Company.
  // The Test Run still uses Falcon 9's Reliability for the score. No Anomaly mini-game in this design contest.
  const flight = realFlight(rules.seed, mission, launchDay, deadline, 1);
  const needs = contractNeeds(contractById(rules.contract));
  const power = powerOf(design, [], {}, needs.orbit);
  const data = dataOf(design);
  // Science values reserve to collect a second Mission's worth of Data, capped at 100%.
  const science = Math.min(1, Math.min(data.dataPerDay, data.sendPerDay) * Math.min(power.lastsDays, needs.missionDays * 2) / (data.dataPerDay * needs.missionDays * 2));
  const money = state.money / rules.budget;
  const mass = Math.max(0, (plan.liftKg - plan.massKg) / plan.liftKg);
  const estimated = run.successPercent / 100;
  const score = flight.success ? Math.round((0.4 * estimated + 0.3 * science + 0.2 * money + 0.1 * mass) * 10_000) : 0;
  return { success: flight.success, score, reliability: estimated, science, money, mass, cost: rules.budget - state.money, flight };
}
