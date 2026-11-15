import { MINIGAME_IDS, type MinigameId, type MinigameResult } from './types';

/**
 * The pure parts of the Minigames shell (src/ui/minigames.ts): one run through a shuffled set, and the best stars
 * per game kept in the browser.
 */

export type Stars = MinigameResult['stars'];

/** localStorage key for the best stars per game: `{ "pluto": 3, ... }`. */
export const BEST_KEY = 'leap.minigames.best';

/**
 * The shell sends this event to a game's `host` with `detail: true` while its Quit question is open, and
 * `detail: false` when play goes on. Games may pause on it; a game that ignores it keeps running.
 */
export const PAUSE_EVENT = 'leap-minigame-pause';

type BestStore = Pick<Storage, 'getItem' | 'setItem'>;

function isStars(n: unknown): n is Stars {
  return n === 0 || n === 1 || n === 2 || n === 3;
}

/** Best stars per game; empty if nothing is saved, the save is broken, or storage is blocked. */
export function readBest(storage: BestStore | null): Partial<Record<MinigameId, Stars>> {
  const best: Partial<Record<MinigameId, Stars>> = {};
  try {
    const raw = storage?.getItem(BEST_KEY);
    if (!raw) return best;
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== 'object') return best;
    for (const id of MINIGAME_IDS) {
      const value = (data as Record<string, unknown>)[id];
      if (isStars(value)) best[id] = value;
    }
  } catch { /* blocked or broken storage: no bests */ }
  return best;
}

/** Keep `stars` if it beats the saved best. Returns the best now, and whether this was a new best. Never throws. */
export function recordBest(storage: BestStore | null, id: MinigameId, stars: Stars): { best: Stars; isNew: boolean } {
  const best = readBest(storage);
  const old = best[id];
  if (old !== undefined && old >= stars) return { best: old, isNew: false };
  best[id] = stars;
  try { storage?.setItem(BEST_KEY, JSON.stringify(best)); } catch { /* still shown for this page */ }
  return { best: stars, isNew: stars > 0 };
}

/** One run through a set: which game is on, and the best result of each game so far (Try again keeps the better one). */
export class MinigameRun {
  private index = 0;
  private results = new Map<MinigameId, MinigameResult>();

  constructor(readonly order: readonly MinigameId[]) {}

  get current(): MinigameId {
    return this.order[this.index]!;
  }
  /** 1-based, for "Game 2 of 3". */
  get number(): number {
    return this.index + 1;
  }
  get count(): number {
    return this.order.length;
  }
  get isLast(): boolean {
    return this.index >= this.order.length - 1;
  }

  /** Keep a game's result: the better of this one and any earlier try. */
  record(id: MinigameId, result: MinigameResult): void {
    const old = this.results.get(id);
    if (!old || result.stars > old.stars || (result.won && !old.won && result.stars === old.stars)) this.results.set(id, result);
  }

  result(id: MinigameId): MinigameResult | undefined {
    return this.results.get(id);
  }

  /** On to the next game; false at the end of the set. */
  next(): boolean {
    if (this.isLast) return false;
    this.index++;
    return true;
  }

  totalStars(): number {
    let total = 0;
    for (const id of this.order) total += this.results.get(id)?.stars ?? 0;
    return total;
  }

  maxStars(): number {
    return this.order.length * 3;
  }
}
