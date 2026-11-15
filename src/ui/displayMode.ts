import type { Difficulty } from '../game/modes';
import { type StringKey, textFor } from '../strings';

/**
 * The game mode on show: set when a Company is loaded, cleared on the main menu. It puts `mode-explorer` or
 * `mode-director` on <body> for the Explorer styles, and lets screens without the Site's state (loading tips,
 * Real History cards) pick their wording.
 */
let current: Difficulty | null = null;

export function setDisplayMode(difficulty: Difficulty | null): void {
  current = difficulty;
  document.body.classList.toggle('mode-explorer', difficulty === 'easy');
  document.body.classList.toggle('mode-director', difficulty === 'advanced');
}

/** Whether the loaded Company plays in Explorer mode. */
export function explorerShown(): boolean {
  return current === 'easy';
}

/** `t` for the mode on show: the `.short` wording in Explorer when there is one. */
export function tm(key: StringKey, values: Record<string, string | number> = {}): string {
  return textFor(key, explorerShown(), values);
}
