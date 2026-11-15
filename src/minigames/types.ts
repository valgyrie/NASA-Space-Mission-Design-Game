/**
 * Minigames (main menu → Minigames): short 2D games, each teaching one real space fact
 * (docs/research/minigames.md). Two sets, like the game modes: Explorer for young players and
 * Mission Director for realism. The shell (src/ui/minigames.ts) shuffles a set, shows each game's
 * intro card, runs the game, then shows the fact it taught.
 *
 * A game draws in 2D only (canvas and/or HTML), never Three.js or Blender models.
 */

export const MINIGAME_LEVELS = ['explorer', 'director'] as const;
export type MinigameLevel = (typeof MINIGAME_LEVELS)[number];

export const MINIGAME_IDS = ['pluto', 'rover', 'planets', 'thermal', 'co2', 'signal'] as const;
export type MinigameId = (typeof MINIGAME_IDS)[number];

/** How a game went. Stars: 3 = great, 2 = good, 1 = finished, 0 = failed. */
export interface MinigameResult {
  won: boolean;
  stars: 0 | 1 | 2 | 3;
  /** One short line on how it went, from strings.ts (optional). */
  line?: string;
}

/** A running game. The shell owns the frame (title bar, Quit, the fact card); the game owns `host`. */
export interface Minigame {
  /** Build the game inside `host` (already empty and sized), start it, and call `done` exactly once at the end. */
  start(host: HTMLElement, done: (result: MinigameResult) => void): void;
  /** Stop every timer, animation frame and listener (Quit, or after `done`). Must be safe to call twice. */
  destroy(): void;
}

export type MinigameMaker = () => Minigame;
