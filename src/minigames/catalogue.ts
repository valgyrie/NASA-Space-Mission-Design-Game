import { MINIGAME_SOURCES } from '../game/sources';
import { type MinigameId, type MinigameLevel, type MinigameMaker } from './types';
import { makePluto } from './pluto';
import { makeRover } from './rover';
import { makePlanets } from './planets';
import { makeThermal } from './thermal';
import { makeCo2 } from './co2';
import { makeSignal } from './signal';

/**
 * Which games each level plays, and how to make them. Player text for each game lives in strings.ts:
 * `minigame.<id>.title`, `.how` (how to play), `.fact` (what it taught) and its own in-game keys.
 * Its source is MINIGAME_SOURCES[id] (docs/research/minigames.md).
 */
export const MINIGAME_SETS: Record<MinigameLevel, readonly MinigameId[]> = {
  explorer: ['pluto', 'rover', 'planets'],
  director: ['thermal', 'co2', 'signal'],
};

export const MINIGAMES: Record<MinigameId, MinigameMaker> = {
  pluto: makePluto,
  rover: makeRover,
  planets: makePlanets,
  thermal: makeThermal,
  co2: makeCo2,
  signal: makeSignal,
};

export function minigameSource(id: MinigameId): string {
  return MINIGAME_SOURCES[id];
}

/** The level's games in a random order (`random` returns 0–1, for tests). */
export function shuffledSet(level: MinigameLevel, random: () => number = Math.random): MinigameId[] {
  const ids = [...MINIGAME_SETS[level]];
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [ids[i], ids[j]] = [ids[j]!, ids[i]!];
  }
  return ids;
}
