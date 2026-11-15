import { audio, type Effect } from '../audio/sound';
import { canvas2d, el } from '../ui/miniGame';
import { PAUSE_EVENT } from './shell';

/**
 * Small drawing and timing helpers shared by the Explorer minigames (pluto, rover, planets): a frame loop that
 * pauses with the shell, a canvas scaled to a fixed logical size, particles, floating words and a few shapes.
 * Everything is drawn in code: no images.
 */

/** A seeded random number generator (mulberry32), for layouts that look the same each frame. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let x = a;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

export const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
export const lerp = (a: number, b: number, k: number): number => a + (b - a) * k;

export const reducedMotion = (): boolean =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Play one of the game's own short sound effects; silent if sound is off or not ready. */
export function sfx(kind: Effect): void {
  try { audio.effect(kind); } catch { /* sound must never stop a game */ }
}

/** The game's canvas and an HTML layer over it, inside the shell's host. */
export function makeStage(host: HTMLElement, label: string): { canvas: HTMLCanvasElement; layer: HTMLElement } {
  host.classList.add('mg-host');
  const canvas = el('canvas', 'mg-canvas');
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', label);
  const layer = el('div', 'mg-layer');
  host.append(canvas, layer);
  return { canvas, layer };
}

/**
 * Calls `frame(dt)` every animation frame until stopped. `dt` is seconds (at most 1/20 s, so a slow frame or a
 * hidden tab never jumps the game), and 0 while the shell has paused the game: it still draws.
 */
export class Runner {
  private raf = 0;
  private last = 0;
  private stopped = false;
  paused = false;
  private readonly onPause = (e: Event) => { this.paused = !!(e as CustomEvent<boolean>).detail; };

  constructor(private readonly host: HTMLElement, private readonly frame: (dt: number) => void) {
    host.addEventListener(PAUSE_EVENT, this.onPause);
    this.raf = requestAnimationFrame(this.tick);
  }

  private readonly tick = (now: number) => {
    if (this.stopped) return;
    const dt = this.last ? Math.min(0.05, Math.max(0, (now - this.last) / 1000)) : 0;
    this.last = now;
    this.frame(this.paused ? 0 : dt);
    if (!this.stopped) this.raf = requestAnimationFrame(this.tick);
  };

  stop(): void {
    this.stopped = true;
    cancelAnimationFrame(this.raf);
    this.host.removeEventListener(PAUSE_EVENT, this.onPause);
  }
}

/** The canvas this frame: CSS-pixel size, and the scale and offset that fit a logical `lw × lh` world in the middle. */
export interface View {
  c: CanvasRenderingContext2D;
  /** Canvas size in CSS pixels. */
  cw: number;
  ch: number;
  scale: number;
  ox: number;
  oy: number;
}

/** Size the canvas and get the view; the context is left in CSS pixels (call `enter` to draw in logical units). */
export function fitView(canvas: HTMLCanvasElement, lw: number, lh: number): View | null {
  const s = canvas2d(canvas);
  if (!s) return null;
  const cw = s.w / s.ratio;
  const ch = s.h / s.ratio;
  const scale = Math.min(cw / lw, ch / lh);
  s.c.setTransform(s.ratio, 0, 0, s.ratio, 0, 0);
  return { c: s.c, cw, ch, scale, ox: (cw - lw * scale) / 2, oy: (ch - lh * scale) / 2 };
}

/** Switch the context to logical units (from CSS pixels). */
export function enter(v: View): void {
  v.c.translate(v.ox, v.oy);
  v.c.scale(v.scale, v.scale);
}

/** A pointer event's position in logical units. */
export function toLogical(v: View | null, canvas: HTMLCanvasElement, e: { clientX: number; clientY: number }): { x: number; y: number } {
  const r = canvas.getBoundingClientRect();
  if (!v) return { x: e.clientX - r.left, y: e.clientY - r.top };
  return { x: (e.clientX - r.left - v.ox) / v.scale, y: (e.clientY - r.top - v.oy) / v.scale };
}

// ---- Particles and floating words ----

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  gravity: number;
  spark: boolean;
}

export interface BurstOptions {
  count?: number;
  speed?: number;
  size?: number;
  life?: number;
  gravity?: number;
  /** Four-point twinkles instead of round dots. */
  spark?: boolean;
  /** Spread angle (radians) around `angle`; full circle by default. */
  spread?: number;
  angle?: number;
}

export class Particles {
  private items: Particle[] = [];

  burst(x: number, y: number, color: string | string[], o: BurstOptions = {}): void {
    const count = o.count ?? 14;
    const colors = Array.isArray(color) ? color : [color];
    for (let i = 0; i < count; i++) {
      const a = (o.angle ?? 0) + (o.spread === undefined ? Math.random() * Math.PI * 2 : (Math.random() - 0.5) * o.spread);
      const sp = (o.speed ?? 160) * (0.35 + Math.random() * 0.75);
      const life = (o.life ?? 0.7) * (0.6 + Math.random() * 0.6);
      this.items.push({
        x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life, max: life,
        size: (o.size ?? 4) * (0.6 + Math.random() * 0.8), color: colors[i % colors.length]!,
        gravity: o.gravity ?? 0, spark: !!o.spark,
      });
    }
  }

  step(dt: number): void {
    for (const p of this.items) {
      p.life -= dt;
      p.vy += p.gravity * dt;
      p.vx *= 1 - Math.min(1, dt * 1.6);
      p.vy *= 1 - Math.min(1, dt * 1.2);
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    this.items = this.items.filter((p) => p.life > 0);
  }

  draw(c: CanvasRenderingContext2D): void {
    for (const p of this.items) {
      const k = p.life / p.max;
      c.globalAlpha = Math.min(1, k * 1.4);
      c.fillStyle = p.color;
      if (p.spark) star4(c, p.x, p.y, p.size * (0.5 + k));
      else {
        c.beginPath();
        c.arc(p.x, p.y, p.size * (0.4 + 0.6 * k), 0, Math.PI * 2);
        c.fill();
      }
    }
    c.globalAlpha = 1;
  }

  clear(): void {
    this.items = [];
  }
}

interface Floater { text: string; x: number; y: number; t: number; color: string; size: number }

/** Words that pop up, rise and fade ("Rock!", "Sample!"). */
export class Floaters {
  private items: Floater[] = [];

  add(text: string, x: number, y: number, color = '#ffffff', size = 26): void {
    this.items.push({ text, x, y, t: 0, color, size });
  }

  step(dt: number): void {
    for (const f of this.items) f.t += dt;
    this.items = this.items.filter((f) => f.t < 1.3);
  }

  draw(c: CanvasRenderingContext2D): void {
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    for (const f of this.items) {
      const pop = f.t < 0.15 ? 0.6 + (f.t / 0.15) * 0.55 : f.t < 0.3 ? 1.15 - ((f.t - 0.15) / 0.15) * 0.15 : 1;
      c.globalAlpha = f.t > 0.9 ? Math.max(0, 1 - (f.t - 0.9) / 0.4) : 1;
      c.font = `800 ${Math.round(f.size * pop)}px system-ui, sans-serif`;
      const y = f.y - f.t * 46;
      c.lineWidth = 5;
      c.strokeStyle = 'rgba(4, 8, 16, 0.85)';
      c.strokeText(f.text, f.x, y);
      c.fillStyle = f.color;
      c.fillText(f.text, f.x, y);
    }
    c.globalAlpha = 1;
  }
}

// ---- Shapes ----

/** A four-point twinkle. */
export function star4(c: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  c.beginPath();
  c.moveTo(x, y - r);
  c.quadraticCurveTo(x, y, x + r, y);
  c.quadraticCurveTo(x, y, x, y + r);
  c.quadraticCurveTo(x, y, x - r, y);
  c.quadraticCurveTo(x, y, x, y - r);
  c.fill();
}

/** A five-point star (for scores drawn on canvas). */
export function star5(c: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  c.closePath();
}

/** Fixed background stars as shares of the area. */
export function starField(count: number, seed: number): { x: number; y: number; r: number; p: number }[] {
  const rnd = seeded(seed);
  return Array.from({ length: count }, () => ({ x: rnd(), y: rnd(), r: rnd() * 1.3 + 0.4, p: rnd() * Math.PI * 2 }));
}

export function drawStars(c: CanvasRenderingContext2D, stars: ReturnType<typeof starField>, w: number, h: number, time: number): void {
  c.fillStyle = '#e6eeff';
  for (const s of stars) {
    c.globalAlpha = 0.45 + 0.4 * Math.sin(time * 1.7 + s.p);
    c.beginPath();
    c.arc(s.x * w, s.y * h, s.r, 0, Math.PI * 2);
    c.fill();
  }
  c.globalAlpha = 1;
}

/** A rounded bar with a label inside, for timers and meters. */
export function drawBar(
  c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, frac: number, fill: string, back = 'rgba(255,255,255,0.12)',
): void {
  c.fillStyle = back;
  c.beginPath();
  c.roundRect(x, y, w, h, h / 2);
  c.fill();
  const f = clamp(frac, 0, 1);
  if (f > 0) {
    c.fillStyle = fill;
    c.beginPath();
    c.roundRect(x, y, Math.max(h, w * f), h, h / 2);
    c.fill();
    c.fillStyle = 'rgba(255,255,255,0.25)';
    c.beginPath();
    c.roundRect(x + 3, y + 2, Math.max(0, Math.max(h, w * f) - 6), h * 0.32, h * 0.16);
    c.fill();
  }
}

/** Big outlined text that reads over any background. */
export function bigText(c: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, color = '#ffffff', align: CanvasTextAlign = 'center'): void {
  c.font = `800 ${size}px system-ui, sans-serif`;
  c.textAlign = align;
  c.textBaseline = 'middle';
  c.lineJoin = 'round';
  c.lineWidth = Math.max(3, size / 6);
  c.strokeStyle = 'rgba(4, 8, 16, 0.85)';
  c.strokeText(text, x, y);
  c.fillStyle = color;
  c.fillText(text, x, y);
}

/** Keys the games read, so arrow keys and Space never scroll or press a focused button. */
export const GAME_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'Spacebar', 'Enter']);

/** Split `text` into lines no wider than `maxW` in the current font. */
export function wrapLines(c: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (line && c.measureText(next).width > maxW) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

/** `bigText` wrapped to `maxW`, lines centred around `y`. Returns the height used. */
export function bigTextWrapped(c: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, maxW: number, color = '#ffffff'): number {
  c.font = `800 ${size}px system-ui, sans-serif`;
  const lines = wrapLines(c, text, maxW);
  const lh = size * 1.18;
  const top = y - ((lines.length - 1) * lh) / 2;
  lines.forEach((line, i) => bigText(c, line, x, top + i * lh, size, color));
  return lines.length * lh;
}
