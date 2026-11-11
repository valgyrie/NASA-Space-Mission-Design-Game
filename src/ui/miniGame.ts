import type { Anomaly } from '../game/anomalies';

/**
 * One Anomaly mini-game as the Anomaly panel shows it. The panel (anomalyPanel.ts) gives every kind the same
 * frame: what went wrong, how to play, a canvas, a time line and a meter, the score and the skip rules. Each
 * kind brings its own game, drawing and controls.
 */
export interface MiniGameView {
  /** The status line under the canvas. */
  status(): {
    time: string;
    /** Little time left: show the time in the warning colour. */
    warn: boolean;
    meterLabel: string;
    /** 0–1. */
    meter: number;
    /** An extra line under the status, if the game has one. */
    line?: string;
    lineWarn?: boolean;
  };
  /** Move the game on by `dt` seconds. */
  step(dt: number): void;
  /** Draw it. `dt` is the real time since the last frame, for drawing that moves on its own. */
  draw(canvas: HTMLCanvasElement, dt: number): void;
  /** The game is over: won or lost. */
  over(): boolean;
  /** 0–1, once over. */
  score(): number;
  /** The result's headline, once over. */
  result(): { text: string; won: boolean };
  /** Buttons shown under the canvas while playing, or null. */
  controls: HTMLElement | null;
  /** The mouse moved or pressed on the canvas while playing. */
  pointer?(e: PointerEvent, canvas: HTMLCanvasElement): void;
  /** A key went down or up while playing: true if the game used it. */
  key?(e: KeyboardEvent, down: boolean): boolean;
  /** What to focus when play starts (the canvas if left out). */
  focus?: HTMLElement;
}

/** Make a fresh game for an Anomaly. */
export type MiniGameMaker = (anomaly: Anomaly) => MiniGameView;

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  e.className = className;
  if (text) e.textContent = text;
  return e;
}

export function button(className: string, text: string): HTMLButtonElement {
  const b = el('button', className, text);
  b.type = 'button';
  return b;
}

/** Size the canvas to its box at the screen's pixel ratio; null if it has no size yet. */
export function canvas2d(canvas: HTMLCanvasElement): { c: CanvasRenderingContext2D; w: number; h: number; ratio: number } | null {
  const ratio = window.devicePixelRatio || 1;
  const w = Math.round(canvas.clientWidth * ratio);
  const h = Math.round(canvas.clientHeight * ratio);
  if (w === 0 || h === 0) return null;
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  const c = canvas.getContext('2d');
  return c ? { c, w, h, ratio } : null;
}

/** Fixed stars for the background, as shares of the canvas. */
const STARS = Array.from({ length: 70 }, (_, i) => ({ x: (i * 0.6180339887) % 1, y: ((i * 0.7548776662) % 1) * 0.7, r: (i % 3) * 0.4 + 0.5 }));

/** Black space with fixed stars. */
export function drawSpace(c: CanvasRenderingContext2D, w: number, h: number, ratio: number, alpha = 0.7): void {
  c.fillStyle = '#030814';
  c.fillRect(0, 0, w, h);
  c.fillStyle = `rgba(220, 232, 250, ${alpha})`;
  for (const s of STARS) {
    c.beginPath();
    c.arc(s.x * w, s.y * h, s.r * ratio, 0, Math.PI * 2);
    c.fill();
  }
}
