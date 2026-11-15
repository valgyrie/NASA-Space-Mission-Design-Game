import { t } from '../strings';
import { el } from '../ui/miniGame';
import type { MinigameResult } from './types';
import './director.css';

/**
 * What the three Mission Director games share: one place that owns every listener, timer and animation frame
 * (so destroy() stops them all, safely twice), the frame loop, and the short end banner shown before `done`.
 */
export interface Kit {
  on<K extends keyof HTMLElementEventMap>(target: HTMLElement | Window | Document, type: K, fn: (e: HTMLElementEventMap[K]) => void, opts?: AddEventListenerOptions): void;
  /** Run `step(dt)` every frame, dt in seconds (clamped to 0.1 so a hidden tab doesn't jump). */
  loop(step: (dt: number) => void): void;
  after(ms: number, fn: () => void): void;
  /** Show the end banner for a moment, then call `done` once. */
  finish(root: HTMLElement, result: MinigameResult, headline: string): void;
  dispose(): void;
  readonly alive: boolean;
}

export function makeKit(done: (r: MinigameResult) => void): Kit {
  const offs: (() => void)[] = [];
  let frame = 0;
  let alive = true;
  let finished = false;
  const kit: Kit = {
    get alive() {
      return alive;
    },
    on(target, type, fn, opts) {
      const handler = fn as EventListener;
      target.addEventListener(type, handler, opts);
      offs.push(() => target.removeEventListener(type, handler, opts));
    },
    loop(step) {
      let last = performance.now();
      const tick = (now: number) => {
        if (!alive) return;
        const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
        last = now;
        step(dt);
        if (alive) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    },
    after(ms, fn) {
      const id = window.setTimeout(() => alive && fn(), ms);
      offs.push(() => window.clearTimeout(id));
    },
    finish(root, result, headline) {
      if (finished) return;
      finished = true;
      const banner = el('div', `dg-end ${result.won ? 'dg-end-won' : 'dg-end-lost'}`);
      banner.append(el('strong', 'dg-end-title', headline));
      const stars = el('div', 'dg-end-stars');
      stars.setAttribute('aria-label', t('minigame.director.stars', { n: result.stars }));
      for (let i = 0; i < 3; i++) stars.append(el('span', i < result.stars ? 'dg-star dg-star-on' : 'dg-star'));
      banner.append(stars);
      if (result.line) banner.append(el('p', 'dg-end-line', result.line));
      root.append(banner);
      kit.after(2200, () => done(result));
    },
    dispose() {
      alive = false;
      cancelAnimationFrame(frame);
      while (offs.length) offs.pop()!();
    },
  };
  return kit;
}

/** True if a key event came from a text field (never steal typing). */
export const typing = (e: KeyboardEvent): boolean => e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;

/** "12.3" with a fixed number of decimals, locale-free (instrument readouts). */
export const fixed = (n: number, digits = 0): string => (Object.is(Math.round(n * 10 ** digits) / 10 ** digits, -0) ? 0 : n).toFixed(digits);
