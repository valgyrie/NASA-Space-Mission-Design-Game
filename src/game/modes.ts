import type { Part } from '../economy/part';

/** Chosen when the Company starts. Both modes fly the same Mission rules. */
export const DIFFICULTIES = ['easy', 'advanced'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const PLAY_MODES = ['campaign', 'freePlay'] as const;
export type PlayMode = (typeof PLAY_MODES)[number];

export const ADVANCED_PARTS: readonly Part[] = ['mediumBattery', 'lowPowerAntenna'];

export function partInMode(mode: Difficulty, part: Part): boolean {
  return mode === 'advanced' || !ADVANCED_PARTS.includes(part);
}

/**
 * Explorer (difficulty 'easy') shows the same rules with pictures and plain words instead of numbers; Mission
 * Director (difficulty 'advanced') shows every number. Use this for display decisions only, never for the rules.
 */
export function isExplorer(state: { difficulty: Difficulty } | null | undefined): boolean {
  return state?.difficulty === 'easy';
}
