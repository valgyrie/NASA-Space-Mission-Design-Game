import type { Part } from '../economy/part';
import type { SiteState } from './siteState';

/**
 * Chosen when the Company starts: 'easy' is shown as Explorer, 'advanced' as Mission Director. Both modes fly the
 * same physics and Mission rules; the economy differs (balance.ts, "Game modes: rules").
 */
export const DIFFICULTIES = ['easy', 'advanced'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const PLAY_MODES = ['campaign', 'freePlay'] as const;
export type PlayMode = (typeof PLAY_MODES)[number];

export const ADVANCED_PARTS: readonly Part[] = ['mediumBattery', 'lowPowerAntenna'];

export function partInMode(mode: Difficulty, part: Part): boolean {
  return mode === 'advanced' || !ADVANCED_PARTS.includes(part);
}

/** Mission Director: offers expire, repeat Test Runs cost money, Ground Tests cost more and Deposits run out. */
export function isDirector(state: Pick<SiteState, 'difficulty'>): boolean {
  return state.difficulty === 'advanced';
}

/** Explorer: shorter waits, no Ground Tests, and a failed Mission's launch costs come back once per Contract. */
export function isExplorer(state: Pick<SiteState, 'difficulty'>): boolean {
  return state.difficulty === 'easy';
}

/**
 * Move an Explorer Company to Mission Director, for good. Deposits start full and Contracts on the board start
 * their days from now (`refreshOffers` dates them). Returns false if it already is one.
 */
export function switchToDirector(state: Pick<SiteState, 'difficulty' | 'offerDays'>): boolean {
  if (isDirector(state)) return false;
  state.difficulty = 'advanced';
  state.offerDays = {};
  return true;
}
