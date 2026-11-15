import { t } from '../strings';
import { button, el } from '../ui/miniGame';
import {
  bigText, bigTextWrapped, clamp, drawBar, drawStars, enter, fitView, Floaters, GAME_KEYS, lerp, makeStage, Particles, reducedMotion,
  Runner, sfx, starField, star4, toLogical, type View,
} from './kit';
import type { Minigame, MinigameMaker, MinigameResult } from './types';

/**
 * Build Pluto (Explorer). Pluto moves left and right at the bottom, catching falling rock and ice and dodging gas
 * clouds: rocks build its core first, then ice makes its shell. Then one question: what is Pluto?
 * Fact: Pluto "probably has a rocky core surrounded by a mantle of water ice"; a dwarf planet since 2006
 * (docs/research/minigames.md). Fall speeds, counts and the time limit are game choices.
 */

export type Chunk = 'rock' | 'ice' | 'gas';

/** Rocks needed for the core, then ice for the shell. */
export const PLUTO_CORE = 8;
export const PLUTO_SHELL = 10;
/** Seconds to build it. */
export const PLUTO_TIME = 80;

export interface PlutoBuild {
  core: number;
  shell: number;
}

/** What Pluto needs next: rock for the core, then ice; null when built. */
export function plutoNeed(b: PlutoBuild): 'rock' | 'ice' | null {
  if (b.core < PLUTO_CORE) return 'rock';
  if (b.shell < PLUTO_SHELL) return 'ice';
  return null;
}

export type CatchOutcome = 'core' | 'coreDone' | 'shell' | 'built' | 'coreFirst' | 'coreFull' | 'gas';

/**
 * Pluto touches a chunk. Rock adds to the core until it is full; ice adds to the shell only once the core is done
 * (before that it slides off). Gas knocks off the newest piece: ice if the shell has any, else rock while the core is
 * still building (a finished core is never broken).
 */
export function plutoCatch(b: PlutoBuild, kind: Chunk): { build: PlutoBuild; outcome: CatchOutcome; lost: 'rock' | 'ice' | null } {
  const need = plutoNeed(b);
  if (kind === 'gas') {
    if (b.shell > 0) return { build: { ...b, shell: b.shell - 1 }, outcome: 'gas', lost: 'ice' };
    if (need === 'rock' && b.core > 0) return { build: { ...b, core: b.core - 1 }, outcome: 'gas', lost: 'rock' };
    return { build: { ...b }, outcome: 'gas', lost: null };
  }
  if (kind === 'rock') {
    if (need !== 'rock') return { build: { ...b }, outcome: 'coreFull', lost: null };
    const core = b.core + 1;
    return { build: { ...b, core }, outcome: core === PLUTO_CORE ? 'coreDone' : 'core', lost: null };
  }
  if (need === 'rock') return { build: { ...b }, outcome: 'coreFirst', lost: null };
  if (need === null) return { build: { ...b }, outcome: 'coreFull', lost: null };
  const shell = b.shell + 1;
  return { build: { ...b, shell }, outcome: shell === PLUTO_SHELL ? 'built' : 'shell', lost: null };
}

/** Stars once Pluto is built: few gas hits and few needed chunks let fall. */
export function plutoStars(gasHits: number, missed: number): 1 | 2 | 3 {
  if (gasHits <= 1 && missed <= 4) return 3;
  if (gasHits <= 3 && missed <= 9) return 2;
  return 1;
}

/** Which chunk falls next: mostly the one Pluto needs, about a third gas. `r` is 0–1. */
export function nextChunk(need: 'rock' | 'ice' | null, r: number): Chunk {
  if (r < 0.3) return 'gas';
  const other = need === 'ice' ? 'rock' : 'ice';
  return r < 0.78 ? (need ?? 'ice') : other;
}

// ---- The game ----

const LW = 1000;
const LH = 640;
const FIELD = 750; // play area width; the meter panel is to the right
const FLOOR = 580; // Pluto's centre line

interface Falling {
  kind: Chunk;
  x: number;
  y: number;
  vy: number;
  vx: number;
  r: number;
  spin: number;
  angle: number;
  /** Bounced off Pluto (not taken): flies away and fades. */
  off: number;
  shape: number[];
  near: boolean;
}

const COLORS = {
  rock: ['#8a7466', '#6d5a4f', '#a58f7f'],
  ice: ['#e8f6ff', '#bfe4ff', '#9fd2f5'],
  gas: ['#c9e98a', '#a8d86b', '#e2f5b0'],
};

function rockShape(): number[] {
  return Array.from({ length: 9 }, () => 0.78 + Math.random() * 0.3);
}

export const makePluto: MinigameMaker = (): Minigame => {
  let runner: Runner | null = null;
  let cleanup: (() => void) | null = null;
  let finish: ((r: MinigameResult) => void) | null = null;
  let timer = 0;

  function start(host: HTMLElement, done: (r: MinigameResult) => void): void {
    finish = done;
    const { canvas, layer } = makeStage(host, t('minigame.pluto.label'));
    const stars = starField(120, 7);
    const belt = Array.from({ length: 70 }, (_, i) => ({ x: Math.random() * LW, y: 130 + Math.sin(i) * 40 + Math.random() * 60, r: Math.random() * 1.6 + 0.6, s: 6 + Math.random() * 10 }));
    const parts = new Particles();
    const words = new Floaters();
    const still = reducedMotion();

    let build: PlutoBuild = { core: 0, shell: 0 };
    let px = FIELD / 2;
    let pvx = 0;
    let target: number | null = null;
    const keys = { left: false, right: false };
    let items: Falling[] = [];
    let spawnIn = 0.6;
    let sinceNeed = 0;
    let time = 0; // play time
    let clock = 0; // all time, for drawing
    let intro = 1.3; // "Ready? Go!"
    let state: 'play' | 'built' | 'timeUp' | 'quiz' = 'play';
    let endT = 0;
    let gasHits = 0;
    let missed = 0;
    let squash = 0;
    let wobble = 0;
    let shake = 0;
    let banner: { text: string; t: number } | null = null;
    let view: View | null = null;
    let quizShown = false;
    let built = false;

    const radii = () => {
      const coreR = 16 + build.core * 2.1;
      return { coreR, r: coreR + build.shell * 2.1 + 3 };
    };

    function spawn(): void {
      const need = plutoNeed(build);
      let kind = nextChunk(need, Math.random());
      if (need && kind !== need) sinceNeed++;
      else sinceNeed = 0;
      if (need && sinceNeed >= 3) { kind = need; sinceNeed = 0; }
      const r = kind === 'gas' ? 30 : kind === 'rock' ? 19 : 17;
      const speed = 120 + Math.min(time, 70) * 1.9;
      items.push({
        kind, x: 40 + Math.random() * (FIELD - 80), y: -r - 10, vy: speed * (0.85 + Math.random() * 0.3),
        vx: kind === 'gas' ? (Math.random() - 0.5) * 50 : 0, r, spin: (Math.random() - 0.5) * 3, angle: Math.random() * 6,
        off: 0, shape: rockShape(), near: false,
      });
    }

    function take(item: Falling): void {
      const res = plutoCatch(build, item.kind);
      build = res.build;
      const { r } = radii();
      const top = FLOOR - r;
      switch (res.outcome) {
        case 'core':
        case 'shell':
          squash = 1;
          parts.burst(item.x, top, COLORS[item.kind], { count: 16, speed: 200, size: 4, spark: item.kind === 'ice' });
          words.add(t(item.kind === 'rock' ? 'minigame.pluto.got.rock' : 'minigame.pluto.got.ice'), px, top - 30, item.kind === 'rock' ? '#f3d2b8' : '#d9f1ff');
          sfx('build');
          return;
        case 'coreDone':
          squash = 1.4;
          parts.burst(px, FLOOR, ['#ffd27a', '#ffffff', '#a58f7f'], { count: 40, speed: 320, size: 5, spark: true });
          banner = { text: t('minigame.pluto.coreDone'), t: 0 };
          sfx('reward');
          return;
        case 'built':
          squash = 1.6;
          parts.burst(px, FLOOR, ['#ffffff', '#bfe4ff', '#ffd27a'], { count: 70, speed: 380, size: 6, spark: true });
          sfx('reward');
          state = 'built';
          built = true;
          endT = 0;
          return;
        case 'coreFirst':
        case 'coreFull':
          item.off = 0.001;
          item.vy = -260;
          item.vx = item.x < px ? -180 : 180;
          words.add(t(res.outcome === 'coreFirst' ? 'minigame.pluto.coreFirst' : 'minigame.pluto.coreFull'), px, top - 30, '#ffe27a', 24);
          sfx('click');
          return;
        case 'gas':
          gasHits++;
          wobble = 1;
          shake = still ? 0 : 0.5;
          parts.burst(item.x, top, COLORS.gas, { count: 26, speed: 150, size: 9, life: 0.9 });
          if (res.lost) {
            parts.burst(px, top, COLORS[res.lost], { count: 6, speed: 260, size: 6, gravity: 500, spread: 1.4, angle: -Math.PI / 2 });
          }
          words.add(t('minigame.pluto.gasHit'), clamp(px, 170, FIELD - 170), top - 34, '#d8f59a', 24);
          sfx('alarm');
      }
    }

    function step(dt: number): void {
      clock += dt;
      parts.step(dt);
      words.step(dt);
      if (banner) { banner.t += dt; if (banner.t > 2) banner = null; }
      squash = Math.max(0, squash - dt * 4);
      wobble = Math.max(0, wobble - dt * 1.3);
      shake = Math.max(0, shake - dt);

      if (state !== 'play') {
        endT += dt;
        if (built && Math.random() < dt * 10) parts.burst(FIELD / 2 + (Math.random() - 0.5) * 300, 250 + (Math.random() - 0.5) * 240, ['#ffffff', '#ffd27a', '#bfe4ff'], { count: 3, speed: 60, size: 5, spark: true });
        for (const it of items) { it.vy += (it.off ? 900 : 300) * dt; it.y += it.vy * dt; it.x += it.vx * dt; }
        items = items.filter((it) => it.y - it.r <= LH);
        if (endT > 2.4 && !quizShown) showQuiz();
        return;
      }
      if (state !== 'play') return;
      if (intro > 0) {
        const before = intro;
        intro -= dt;
        if (before > 0.45 && intro <= 0.45) sfx('countdown');
        return;
      }
      time += dt;
      if (time >= PLUTO_TIME) {
        state = 'timeUp';
        endT = 0;
        sfx('alarm');
        return;
      }

      // Move: keys, or glide towards the pointer.
      const dir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
      const { r } = radii();
      if (dir) {
        target = null;
        pvx = lerp(pvx, dir * 620, Math.min(1, dt * 12));
      } else if (target !== null) {
        pvx = clamp((target - px) * 9, -760, 760);
      } else pvx = lerp(pvx, 0, Math.min(1, dt * 10));
      px = clamp(px + pvx * dt, r + 4, FIELD - r - 4);

      spawnIn -= dt;
      if (spawnIn <= 0) {
        spawn();
        spawnIn = Math.max(0.62, 0.98 - time * 0.005) * (0.8 + Math.random() * 0.4);
      }

      for (const it of items) {
        if (it.off) {
          it.off += dt;
          it.vy += 900 * dt;
          it.x += it.vx * dt;
          it.y += it.vy * dt;
          it.angle += it.spin * 4 * dt;
          continue;
        }
        it.y += it.vy * dt;
        it.x = clamp(it.x + it.vx * dt + (it.kind === 'gas' ? Math.sin(clock * 2 + it.angle) * 30 * dt : 0), it.r, FIELD - it.r);
        it.angle += it.spin * dt;
        // Touching Pluto?
        const dx = it.x - px;
        const dy = it.y - FLOOR;
        const reach = r + it.r * (it.kind === 'gas' ? 0.55 : 0.8) + (it.kind === 'gas' ? 0 : 8);
        if (dx * dx + dy * dy < reach * reach) {

          take(it);
          if (!it.off) it.y = LH + 200; // taken (gone)
          continue;
        }
        if (it.kind === 'gas' && !it.near && it.y > FLOOR - 10 && Math.abs(dx) < r + it.r + 70) {
          it.near = true;
          words.add(t('minigame.pluto.dodged'), it.x, FLOOR - 70, '#bff7c8', 20);
        }
      }
      // Count needed chunks that fell past, then drop everything off the bottom.
      const need = plutoNeed(build);
      for (const it of items) {
        if (!it.off && it.y - it.r > LH && it.y < LH + 150 && it.kind === need) missed++;
      }
      items = items.filter((it) => it.y - it.r <= LH && it.off < 1.2);
    }

    // ---- Drawing ----

    function drawBackground(v: View): void {
      const { c, cw, ch } = v;
      const g = c.createLinearGradient(0, 0, 0, ch);
      g.addColorStop(0, '#060a1c');
      g.addColorStop(0.6, '#0d0f2a');
      g.addColorStop(1, '#1a1236');
      c.fillStyle = g;
      c.fillRect(0, 0, cw, ch);
      drawStars(c, stars, cw, ch, clock);
      // A soft glow along the bottom, where Pluto moves.
      const top = v.oy + (FLOOR - 50) * v.scale;
      const floor = c.createLinearGradient(0, top, 0, ch);
      floor.addColorStop(0, 'rgba(79, 163, 255, 0)');
      floor.addColorStop(1, 'rgba(79, 163, 255, 0.18)');
      c.fillStyle = floor;
      c.fillRect(0, top, cw, ch - top);
    }

    function drawChunk(c: CanvasRenderingContext2D, it: Falling, label: boolean): void {
      c.save();
      c.translate(it.x, it.y);
      if (it.off) c.globalAlpha = clamp(1 - it.off / 1.2, 0, 1);
      if (it.kind === 'rock') {
        c.rotate(it.angle);
        c.beginPath();
        it.shape.forEach((k, i) => {
          const a = (i / it.shape.length) * Math.PI * 2;
          c.lineTo(Math.cos(a) * it.r * k, Math.sin(a) * it.r * k);
        });
        c.closePath();
        const g = c.createRadialGradient(-it.r * 0.3, -it.r * 0.3, 2, 0, 0, it.r);
        g.addColorStop(0, '#b59d8a');
        g.addColorStop(1, '#5e4b40');
        c.fillStyle = g;
        c.fill();
        c.strokeStyle = '#3f3129';
        c.lineWidth = 2;
        c.stroke();
        c.fillStyle = 'rgba(50, 36, 28, 0.6)';
        for (const [sx, sy, sr] of [[-5, 3, 3], [6, -4, 2.4], [2, 8, 1.8]] as const) {
          c.beginPath();
          c.arc(sx, sy, sr, 0, Math.PI * 2);
          c.fill();
        }
      } else if (it.kind === 'ice') {
        c.rotate(it.angle * 0.5);
        c.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          c.lineTo(Math.cos(a) * it.r, Math.sin(a) * it.r);
        }
        c.closePath();
        const g = c.createLinearGradient(-it.r, -it.r, it.r, it.r);
        g.addColorStop(0, '#ffffff');
        g.addColorStop(0.5, '#bfe4ff');
        g.addColorStop(1, '#7fbde8');
        c.fillStyle = g;
        c.fill();
        c.strokeStyle = '#e9f7ff';
        c.lineWidth = 2;
        c.stroke();
        c.strokeStyle = 'rgba(255,255,255,0.7)';
        c.beginPath();
        c.moveTo(-it.r * 0.5, 0);
        c.lineTo(0, -it.r * 0.6);
        c.lineTo(it.r * 0.5, 0);
        c.stroke();
        c.fillStyle = '#ffffff';
        star4(c, it.r * 0.45, -it.r * 0.5, 4 + Math.sin(clock * 6 + it.angle) * 2);
      } else {
        const wob = Math.sin(clock * 3 + it.angle);
        c.fillStyle = 'rgba(190, 228, 120, 0.42)';
        for (const [bx, by, br] of [[-12, 4, 15], [10, 6, 14], [0, -6, 17], [-3, 10, 12], [14, -5, 10]] as const) {
          c.beginPath();
          c.arc(bx + wob * 2, by - wob, br * (it.r / 30), 0, Math.PI * 2);
          c.fill();
        }
        c.strokeStyle = 'rgba(232, 255, 190, 0.7)';
        c.lineWidth = 2;
        c.beginPath();
        c.arc(0, 2, 7, 0.5 + clock * 2, 4.6 + clock * 2);
        c.stroke();
      }
      c.restore();
      if (label && !it.off) {
        c.font = '700 14px system-ui, sans-serif';
        c.textAlign = 'center';
        c.textBaseline = 'top';
        c.fillStyle = it.kind === 'gas' ? '#d8f59a' : it.kind === 'ice' ? '#d9f1ff' : '#e8cdb8';
        c.fillText(t(`minigame.pluto.${it.kind}`), it.x, it.y + it.r + 3);
      }
    }

    /** Pluto as a cut-through ball: brown rocky core inside, pale icy shell outside. `whole` shows its outside instead. */
    function drawPluto(c: CanvasRenderingContext2D, x: number, y: number, scale: number, whole: number): void {
      const { coreR, r } = radii();
      const sq = squash * 0.12;
      const wob = Math.sin(clock * 30) * wobble * 0.18;
      c.save();
      c.translate(x, y);
      c.rotate(wob);
      c.scale(scale * (1 + sq), scale * (1 - sq));
      // glow
      const glow = c.createRadialGradient(0, 0, r * 0.6, 0, 0, r * 1.7);
      glow.addColorStop(0, 'rgba(160, 200, 255, 0.25)');
      glow.addColorStop(1, 'rgba(160, 200, 255, 0)');
      c.fillStyle = glow;
      c.beginPath();
      c.arc(0, 0, r * 1.7, 0, Math.PI * 2);
      c.fill();
      // shell
      if (build.shell > 0) {
        const g = c.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.2, 0, 0, r);
        g.addColorStop(0, '#f4fbff');
        g.addColorStop(1, '#8fc4ea');
        c.fillStyle = g;
        c.beginPath();
        c.arc(0, 0, r, 0, Math.PI * 2);
        c.fill();
        c.strokeStyle = 'rgba(255,255,255,0.8)';
        c.lineWidth = 2;
        c.stroke();
      }
      // core
      const g2 = c.createRadialGradient(-coreR * 0.3, -coreR * 0.35, 2, 0, 0, coreR);
      g2.addColorStop(0, '#b8977c');
      g2.addColorStop(1, '#5a4235');
      c.fillStyle = g2;
      c.beginPath();
      c.arc(0, 0, coreR, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = 'rgba(60, 40, 30, 0.55)';
      for (let i = 0; i < build.core; i++) {
        const a = i * 2.4;
        c.beginPath();
        c.arc(Math.cos(a) * coreR * 0.55, Math.sin(a) * coreR * 0.55, 2 + (i % 3), 0, Math.PI * 2);
        c.fill();
      }
      // The outside, as seen at the end: pale tan with a big bright heart-shaped plain.
      if (whole > 0) {
        c.globalAlpha = whole;
        const g3 = c.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r);
        g3.addColorStop(0, '#f2e2cc');
        g3.addColorStop(0.7, '#c9a57f');
        g3.addColorStop(1, '#6e5440');
        c.fillStyle = g3;
        c.beginPath();
        c.arc(0, 0, r, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = 'rgba(255, 248, 236, 0.85)';
        const hs = r * 0.42;
        c.beginPath();
        c.moveTo(r * 0.12, r * 0.42);
        c.bezierCurveTo(r * 0.12 - hs * 1.4, r * 0.05, r * 0.12 - hs * 0.9, -hs * 0.9, r * 0.12, -hs * 0.25);
        c.bezierCurveTo(r * 0.12 + hs * 0.9, -hs * 0.9, r * 0.12 + hs * 1.4, r * 0.05, r * 0.12, r * 0.42);
        c.fill();
        c.fillStyle = 'rgba(90, 50, 35, 0.35)';
        c.beginPath();
        c.ellipse(-r * 0.45, r * 0.25, r * 0.25, r * 0.4, 0.4, 0, Math.PI * 2);
        c.fill();
        c.globalAlpha = 1;
      }
      c.restore();
    }

    function drawPanel(c: CanvasRenderingContext2D): void {
      const x = FIELD + 18;
      const w = LW - x - 14;
      c.fillStyle = 'rgba(10, 17, 30, 0.82)';
      c.strokeStyle = 'rgba(120, 170, 230, 0.45)';
      c.lineWidth = 2;
      c.beginPath();
      c.roundRect(x, 14, w, LH - 28, 16);
      c.fill();
      c.stroke();
      const cx = x + w / 2;
      bigTextWrapped(c, t('minigame.pluto.meter'), cx, 50, 21, w - 24, '#ffffff');
      // Core and shell meters.
      const need = plutoNeed(build);
      const row = (y: number, label: string, frac: number, color: string, on: boolean) => {
        c.font = '800 18px system-ui, sans-serif';
        c.textAlign = 'left';
        c.textBaseline = 'middle';
        c.fillStyle = on ? '#ffffff' : '#9fb0c6';
        c.fillText(label, x + 16, y);
        drawBar(c, x + 16, y + 16, w - 32, 22, frac, color);
        if (frac >= 1) {
          c.fillStyle = '#ffffff';
          star4(c, x + w - 26, y, 9);
        }
      };
      row(108, t('minigame.pluto.core'), build.core / PLUTO_CORE, '#b0896b', need === 'rock');
      row(170, t('minigame.pluto.shell'), build.shell / PLUTO_SHELL, '#9fd2f5', need === 'ice');
      // The goal, big.
      const goal = need === 'rock' ? t('minigame.pluto.goal.rock') : need === 'ice' ? t('minigame.pluto.goal.ice') : t('minigame.pluto.built');
      const pulse = 1 + Math.sin(clock * 4) * 0.04;
      c.save();
      c.translate(cx, 250);
      c.scale(pulse, pulse);
      bigTextWrapped(c, goal, 0, 0, 27, w - 24, need === 'ice' ? '#bfe4ff' : '#ffd9a8');
      c.restore();
      // Legend: what to catch, what to dodge.
      const legend = (y: number, kind: Chunk, word: string, color: string) => {
        drawChunk(c, { kind, x: x + 40, y, vy: 0, vx: 0, r: kind === 'gas' ? 22 : 16, spin: 0, angle: 0.3, off: 0, shape: [1, 0.85, 0.95, 0.8, 1, 0.9, 0.85, 1, 0.9], near: false }, false);
        c.font = '800 19px system-ui, sans-serif';
        c.textAlign = 'left';
        c.textBaseline = 'middle';
        c.fillStyle = color;
        c.fillText(`${t(`minigame.pluto.${kind}`)}: ${word}`, x + 72, y);
      };
      legend(320, 'rock', t('minigame.pluto.catch'), '#f0d6c0');
      legend(380, 'ice', t('minigame.pluto.catch'), '#d9f1ff');
      legend(446, 'gas', t('minigame.pluto.dodge'), '#d8f59a');
      // Time.
      const left = 1 - time / PLUTO_TIME;
      drawBar(c, x + 16, LH - 58, w - 32, 22, left, left < 0.2 ? '#ff9a4d' : '#4fa3ff');
      c.font = '700 15px system-ui, sans-serif';
      c.textAlign = 'center';
      c.fillStyle = '#c7d6ea';
      c.fillText(t('minigames.time'), cx, LH - 74);
    }

    function draw(): void {
      view = fitView(canvas, LW, LH);
      if (!view) return;
      const v = view;
      const { c } = v;
      drawBackground(v);
      c.save();
      enter(v);
      if (shake > 0) c.translate((Math.random() - 0.5) * 12 * shake, (Math.random() - 0.5) * 12 * shake);
      // The far-away Sun, small and bright, and the icy Kuiper Belt.
      const sun = c.createRadialGradient(70, 70, 0, 70, 70, 60);
      sun.addColorStop(0, 'rgba(255, 244, 200, 1)');
      sun.addColorStop(0.08, 'rgba(255, 220, 140, 0.9)');
      sun.addColorStop(1, 'rgba(255, 200, 120, 0)');
      c.fillStyle = sun;
      c.beginPath();
      c.arc(70, 70, 60, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = 'rgba(200, 220, 255, 0.35)';
      for (const b of belt) {
        const bx = (b.x + clock * b.s) % FIELD;
        c.beginPath();
        c.arc(bx, b.y, b.r, 0, Math.PI * 2);
        c.fill();
      }

      for (const it of items) drawChunk(c, it, true);

      // Pluto: at the end it rises, grows and turns to show its outside.
      const end = built ? clamp(endT / 1.4, 0, 1) : 0;
      const ease = end * end * (3 - 2 * end);
      drawPluto(c, lerp(px, FIELD / 2, ease), lerp(FLOOR, 250, ease), 1 + ease * 1.2, built ? clamp((endT - 0.6) / 1, 0, 1) : 0);
      parts.draw(c);
      words.draw(c);
      drawPanel(c);

      if (intro > 0 && state === 'play') bigText(c, t(intro > 0.45 ? 'minigames.ready' : 'minigames.go'), FIELD / 2, 300, 64, '#ffffff');
      if (banner) {
        const k = banner.t < 0.2 ? banner.t / 0.2 : 1;
        c.globalAlpha = banner.t > 1.6 ? Math.max(0, (2 - banner.t) / 0.4) : 1;
        bigText(c, banner.text, FIELD / 2, 250, 40 * (0.7 + 0.3 * k), '#ffd27a');
        bigText(c, t('minigame.pluto.goal.ice'), FIELD / 2, 300, 30 * (0.7 + 0.3 * k), '#bfe4ff');
        c.globalAlpha = 1;
      }
      if (built && endT > 0.8) bigText(c, t('minigame.pluto.built'), FIELD / 2, 90, 48, '#ffffff');
      if (state === 'timeUp' || (state === 'quiz' && !built)) bigText(c, t('minigame.pluto.timeUp'), FIELD / 2, 280, 56, '#ffb36b');
      c.restore();
    }

    // ---- The question: what is Pluto? ----
    function showQuiz(): void {
      quizShown = true;
      state = 'quiz';
      const box = el('div', 'mg-quiz');
      box.setAttribute('role', 'dialog');
      const q = el('p', 'mg-quiz-q', t('minigame.pluto.quiz'));
      const row = el('div', 'mg-quiz-answers');
      const say = el('p', 'mg-quiz-say');
      say.setAttribute('aria-live', 'polite');
      const answers = (['planet', 'dwarf', 'star'] as const).map((a) => {
        const b = button('menu-button mg-quiz-answer', t(`minigame.pluto.${a}`));
        b.addEventListener('click', () => {
          if (a === 'dwarf') {
            b.classList.add('right');
            for (const other of answers) other.disabled = true;
            say.textContent = t('minigame.pluto.right');
            say.className = 'mg-quiz-say right';
            sfx('reward');
            parts.burst(FIELD / 2, 300, ['#ffffff', '#ffd27a', '#bfe4ff'], { count: 60, speed: 360, size: 6, spark: true });
            const won = build.shell >= PLUTO_SHELL;
            const result: MinigameResult = won
              ? { won: true, stars: plutoStars(gasHits, missed), line: t('minigame.pluto.line.won') }
              : { won: false, stars: 0, line: t('minigame.pluto.line.lost') };
            timer = window.setTimeout(() => { const f = finish; finish = null; f?.(result); }, 1700);
          } else {
            b.classList.add('wrong');
            b.disabled = true;
            say.textContent = t(`minigame.pluto.wrong.${a}`);
            say.className = 'mg-quiz-say wrong';
            sfx('click');
          }
        });
        return b;
      });
      row.append(...answers);
      box.append(q, row, say);
      layer.append(box);
      answers[0]!.focus();
    }

    // ---- Input ----
    const pointer = (e: PointerEvent) => {
      if (state !== 'play') return;
      if (e.pointerType !== 'mouse' && e.buttons === 0 && e.type === 'pointermove') return;
      target = clamp(toLogical(view, canvas, e).x, 0, FIELD);
    };
    const down = (e: PointerEvent) => {
      canvas.focus();
      pointer(e);
    };
    const leaveCanvas = () => { target = null; };
    const key = (e: KeyboardEvent, isDown: boolean) => {
      if (state === 'quiz') return;
      const k = e.key.toLowerCase();
      if (k === 'arrowleft' || k === 'a') keys.left = isDown;
      else if (k === 'arrowright' || k === 'd') keys.right = isDown;
      else if (!GAME_KEYS.has(e.key)) return;
      e.preventDefault();
    };
    const kd = (e: KeyboardEvent) => key(e, true);
    const ku = (e: KeyboardEvent) => key(e, false);
    canvas.addEventListener('pointermove', pointer);
    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointerleave', leaveCanvas);
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    cleanup = () => {
      canvas.removeEventListener('pointermove', pointer);
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointerleave', leaveCanvas);
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup', ku);
    };

    runner = new Runner(host, (dt) => {
      step(dt);
      draw();
    });
    canvas.focus();
  }

  return {
    start,
    destroy() {
      runner?.stop();
      runner = null;
      cleanup?.();
      cleanup = null;
      finish = null;
      window.clearTimeout(timer);
    },
  };
};
