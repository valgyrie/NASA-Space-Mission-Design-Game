import type { SiteBuildingKind } from '../economy/part';
import { ASSEMBLY_HALL_COST, BUILD_COST, BUS_HALL_LEVEL, HALL_LEVEL_BY_ERA, HQ_COST, MAX_LEVEL, UPGRADE } from './balance';
import { type Era, eraOf, milestonesDone } from './eras';
import type { Building, SiteState } from './siteState';

/**
 * Building Upgrades: each building has a level, raised one at a time with money and game days, like town
 * halls in base-builders. The building keeps working meanwhile; the new level counts from the day it is done.
 * What a level does: Mines dig more, Warehouses store more, Research Labs research faster (`levelBoost`),
 * Factories make better Parts (their Mark, siteState.ts) and the Assembly Hall takes a bigger Bus.
 * The HQ's level is the Company's Era: its Upgrade opens once the Era's Milestones are done (eras.ts).
 */

/** The highest level a kind of building reaches in an Era. The Assembly Hall's level 3 waits for the Large Bus (Era 2). */
export function maxLevel(kind: SiteBuildingKind, era: Era = 1): number {
  if (kind === 'assemblyHall') return HALL_LEVEL_BY_ERA[era];
  if (kind === 'hq') return MAX_LEVEL.hq;
  return MAX_LEVEL.other;
}

/** What a building's Upgrades are priced from: what it cost to build, or for the hall and HQ, their set price. */
function priceOf(kind: SiteBuildingKind): number {
  if (kind === 'assemblyHall') return ASSEMBLY_HALL_COST;
  if (kind === 'hq') return HQ_COST;
  return BUILD_COST[kind];
}

/** The next level's Upgrade: what it costs and how many game days it takes. Null at the top level. */
export function nextUpgrade(
  kind: SiteBuildingKind,
  building: Building,
  era: Era = 1,
): { level: number; cost: number; days: number } | null {
  const level = building.level + 1;
  if (level > maxLevel(kind, era)) return null;
  const step = UPGRADE[level as keyof typeof UPGRADE];
  return { level, cost: Math.round(priceOf(kind) * step.costShare), days: step.days };
}

export type UpgradeProblem = 'topLevel' | 'underway' | 'money' | 'milestones';
export type UpgradeCheck = { ok: true } | { ok: false; problem: UpgradeProblem };

export function checkUpgrade(state: SiteState, kind: SiteBuildingKind, building: Building): UpgradeCheck {
  if (building.upgradeDay !== null) return { ok: false, problem: 'underway' };
  const next = nextUpgrade(kind, building, eraOf(state));
  if (!next) return { ok: false, problem: 'topLevel' };
  // The HQ moves the Company into the next Era only once this Era's Milestones are done.
  if (kind === 'hq' && !milestonesDone(state, eraOf(state))) return { ok: false, problem: 'milestones' };
  if (state.money < next.cost) return { ok: false, problem: 'money' };
  return { ok: true };
}

/** Pay for the next level and start the work. It is done `days` game days from now. */
export function startUpgrade(state: SiteState, kind: SiteBuildingKind, building: Building): UpgradeCheck {
  const check = checkUpgrade(state, kind, building);
  if (!check.ok) return check;
  const next = nextUpgrade(kind, building, eraOf(state))!;
  state.money -= next.cost;
  building.upgradeDay = state.day + next.days;
  return check;
}

/** Game days until the Upgrade under way is done (whole days, rounded up), or null when there is none. */
export function upgradeDaysLeft(state: SiteState, building: Building): number | null {
  return building.upgradeDay === null ? null : Math.max(0, Math.ceil(building.upgradeDay - state.day - 1e-9));
}

// ---- Assembly Hall ----

export type BusId = keyof typeof BUS_HALL_LEVEL;

/** The Assembly Hall level a Bus needs. */
export function hallLevelFor(bus: BusId): number {
  return BUS_HALL_LEVEL[bus];
}

/** The Assembly Hall's level now. Every Site starts with a level 1 hall, even before it has been given a tile. */
export function hallLevel(state: Pick<SiteState, 'assemblyHall'>): number {
  return state.assemblyHall?.level ?? 1;
}

/** Can the Assembly Hall put together a Spacecraft on this Bus? */
export function hallTakes(state: Pick<SiteState, 'assemblyHall'>, bus: BusId): boolean {
  return hallLevel(state) >= hallLevelFor(bus);
}

/** The Buses the Assembly Hall takes at a level, smallest first. */
export function busesAt(level: number): BusId[] {
  return (Object.keys(BUS_HALL_LEVEL) as BusId[]).filter((bus) => BUS_HALL_LEVEL[bus] <= level);
}
