import type { BuildingKind, Part } from '../economy/part';
import { START_DATE_UTC } from './balance';
import { CONTRACTS, CONTRACT_IDS } from './contracts';
import type { SiteState } from './siteState';
import { partInMode } from './modes';

/**
 * Eras: periods of real space history that set which Milestones, Parts, buildings and Launch Vehicles exist.
 * The Company's Era is its HQ's level. Once an Era's Milestones are done, the HQ Upgrade moves it to the next
 * one, and the Game date jumps to the new Era's first year (never backwards). Dates: docs/research/milestones.md.
 */

export const ERAS = [1, 2] as const;
export const MODERN_ERA = 5;
export type Era = (typeof ERAS)[number] | typeof MODERN_ERA;

/** The first day of each Era: 1958 (a month before Explorer 1) and 1962 (Telstar 1's year). */
export const ERA_START_UTC: Record<Era, number> = {
  1: START_DATE_UTC,
  2: Date.UTC(1962, 0, 1),
  5: Date.UTC(2026, 0, 1),
};

/** The real years each Era covers, for the HQ and the new-Era card. */
export const ERA_YEARS: Record<Era, { from: number; to: number }> = {
  1: { from: 1958, to: 1960 },
  2: { from: 1962, to: 1964 },
  5: { from: 2026, to: 2026 },
};

const DAY_MS = 86_400_000;

/** The Game day an Era starts on. */
export function eraStartDay(era: Era): number {
  return Math.round((ERA_START_UTC[era] - START_DATE_UTC) / DAY_MS);
}

/** The Company's Era: its HQ's level. Every Site starts with a level 1 HQ, even before it has been given a tile. */
export function eraOf(state: Pick<SiteState, 'hq'> & Partial<Pick<SiteState, 'playMode'>>): Era {
  if (state.playMode === 'freePlay') return MODERN_ERA;
  if (state.hq?.level === MODERN_ERA) return MODERN_ERA;
  return Math.min(ERAS.at(-1)!, Math.max(1, state.hq?.level ?? 1)) as Era;
}

/** The last Era built so far. */
export const LAST_ERA: Era = ERAS.at(-1)!;

/** The Milestones of an Era. */
export function eraMilestones(era: Era) {
  return CONTRACT_IDS.filter((id) => CONTRACTS[id].kind === 'milestone' && CONTRACTS[id].era === era);
}

/** Every Milestone of the Era is done: the HQ Upgrade to the next one is open. */
export function milestonesDone(state: Pick<SiteState, 'completed'>, era: Era): boolean {
  return eraMilestones(era).every((id) => state.completed.includes(id));
}

/** Parts that open in a later Era: their Factories can't make them, the Market doesn't sell them, and the Mission Designer shows them locked. */
export const PART_ERA: Partial<Record<Part, Era>> = {
  largeBus: 2,
  transponder: 2,
  mainEngine: 2,
};

/** Buildings that open in a later Era. Ground Stations came with the first communications satellites. */
export const BUILDING_ERA: Partial<Record<BuildingKind, Era>> = {
  groundStation: 2,
};

export function partEra(part: Part): Era {
  return PART_ERA[part] ?? 1;
}

export function isPartOpen(state: Pick<SiteState, 'hq'> & Partial<Pick<SiteState, 'difficulty'>>, part: Part): boolean {
  return partInMode(state.difficulty ?? 'easy', part) && eraOf(state) >= partEra(part);
}

export function buildingEra(kind: BuildingKind): Era {
  return BUILDING_ERA[kind] ?? 1;
}

export function isBuildingOpen(state: Pick<SiteState, 'hq'>, kind: BuildingKind): boolean {
  return eraOf(state) >= buildingEra(kind);
}
