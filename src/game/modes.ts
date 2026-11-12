import type { Part } from '../economy/part';

/** Chosen when the Company starts. Both modes fly the same Mission rules. */
export const DIFFICULTIES = ['easy', 'advanced'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const ADVANCED_PARTS: readonly Part[] = ['mediumBattery', 'lowPowerAntenna'];

export function partInMode(mode: Difficulty, part: Part): boolean {
  return mode === 'advanced' || !ADVANCED_PARTS.includes(part);
}
