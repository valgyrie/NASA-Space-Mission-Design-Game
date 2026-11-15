import { t } from '../strings';
import type { Minigame, MinigameMaker } from './types';

/** Placeholder until the real game lands: says so and finishes at once. Replace this whole file. */
export const makeSignal: MinigameMaker = (): Minigame => {
  let done: ((r: { won: boolean; stars: 0 }) => void) | null = null;
  return {
    start(host, finish) {
      done = finish;
      host.textContent = t('minigame.signal.title');
      queueMicrotask(() => done?.({ won: true, stars: 0 }));
    },
    destroy() {
      done = null;
    },
  };
};
