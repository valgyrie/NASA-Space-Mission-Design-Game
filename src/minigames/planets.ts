import { t } from '../strings';
import {
  bigText, bigTextWrapped, clamp, drawStars, enter, fitView, Floaters, GAME_KEYS, makeStage, Particles, reducedMotion,
  Runner, sfx, starField, toLogical, type View,
} from './kit';
import type { Minigame, MinigameMaker, MinigameResult } from './types';

/**
 * Planet Parade (Explorer). Round 1: drag the eight planets onto their orbits, in order from the Sun. Round 2: line
 * them up by size, smallest to biggest or biggest to smallest. A wrong drop bounces back with a gentle hint.
 * Facts: the order and the diameters from NASA's Planetary Fact Sheet (docs/research/minigames.md). The sizes drawn
 * are not to scale (Jupiter would be 29 Mercurys wide) but keep the true order.
 */

/** In order from the Sun. */
export const PLANETS = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'] as const;
export type PlanetId = (typeof PLANETS)[number];

/** Equatorial diameters in km, NASA NSSDC Planetary Fact Sheet. */
export const PLANET_DIAMETERS_KM: Record<PlanetId, number> = {
  mercury: 4879, venus: 12104, earth: 12756, mars: 6792, jupiter: 142984, saturn: 120536, uranus: 51118, neptune: 49528,
};

/** Drawn radius (logical px): not to scale, but in the same order as the diameters. */
export const PLANET_RADII: Record<PlanetId, number> = {
  mercury: 11, mars: 13, venus: 17, earth: 18, neptune: 24, uranus: 25, saturn: 27, jupiter: 33,
};

export type SizeDirection = 'up' | 'down';

/** Smallest to biggest (`up`) or biggest to smallest (`down`), from the diameters. */
export function sizeOrder(dir: SizeDirection): PlanetId[] {
  const up = [...PLANETS].sort((a, b) => PLANET_DIAMETERS_KM[a] - PLANET_DIAMETERS_KM[b]);
  return dir === 'up' ? up : up.reverse();
}

/** Where a planet belongs: its place from the Sun (round 1) or in the size line (round 2), counting from 0. */
export function rightSlot(round: 1 | 2, planet: PlanetId, dir: SizeDirection): number {
  return round === 1 ? PLANETS.indexOf(planet) : sizeOrder(dir).indexOf(planet);
}

/** Stars from mistakes over both rounds. */
export function planetStars(mistakes: number): 1 | 2 | 3 {
  if (mistakes <= 1) return 3;
  if (mistakes <= 4) return 2;
  return 1;
}

const nthText = (n: number) => t(`minigame.planets.nth.${n as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8}`);

/**
 * The hint after a wrong drop: where this planet really goes. Sizes count from the nearer end ("2nd biggest", never
 * "7th smallest").
 */
export function planetHint(round: 1 | 2, planet: PlanetId, dir: SizeDirection): string {
  const name = t(`minigame.planets.name.${planet}`);
  if (round === 1) return t('minigame.planets.hint.order', { planet: name, nth: nthText(rightSlot(1, planet, dir) + 1) });
  const small = sizeOrder('up').indexOf(planet) + 1;
  if (small === 1) return t('minigame.planets.hint.smallest', { planet: name });
  if (small === PLANETS.length) return t('minigame.planets.hint.biggest', { planet: name });
  if (small <= PLANETS.length / 2) return t('minigame.planets.hint.small', { planet: name, nth: nthText(small) });
  return t('minigame.planets.hint.big', { planet: name, nth: nthText(PLANETS.length + 1 - small) });
}

// ---- Drawing a planet ----

function clipCircle(c: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.clip();
}

function saturnRings(c: CanvasRenderingContext2D, x: number, y: number, r: number, back: boolean): void {
  c.save();
  c.translate(x, y);
  c.rotate(-0.35);
  c.scale(1, 0.32);
  c.lineWidth = r * 0.42;
  c.strokeStyle = 'rgba(222, 204, 152, 0.85)';
  c.beginPath();
  c.arc(0, 0, r * 1.75, back ? Math.PI : 0, back ? Math.PI * 2 : Math.PI);
  c.stroke();
  c.lineWidth = r * 0.16;
  c.strokeStyle = 'rgba(160, 140, 100, 0.8)';
  c.beginPath();
  c.arc(0, 0, r * 2.08, back ? Math.PI : 0, back ? Math.PI * 2 : Math.PI);
  c.stroke();
  c.restore();
}

/** One planet in its real colours, lit from the left (the Sun's side). */
export function drawPlanet(c: CanvasRenderingContext2D, id: PlanetId, x: number, y: number, r: number, time: number): void {
  if (id === 'saturn') saturnRings(c, x, y, r, true);
  c.save();
  clipCircle(c, x, y, r);
  const base: Record<PlanetId, [string, string]> = {
    mercury: ['#b4b0ab', '#6a6662'],
    venus: ['#f6e2b4', '#c9a15d'],
    earth: ['#3f86e0', '#173d86'],
    mars: ['#e0744a', '#8c3216'],
    jupiter: ['#e6c9a2', '#a77a52'],
    saturn: ['#f0dca6', '#b99a5e'],
    uranus: ['#b9eef3', '#6bbccb'],
    neptune: ['#5b86f0', '#243c9c'],
  };
  const [light, dark] = base[id];
  const g = c.createRadialGradient(x - r * 0.4, y - r * 0.35, r * 0.1, x, y, r * 1.1);
  g.addColorStop(0, light);
  g.addColorStop(1, dark);
  c.fillStyle = g;
  c.fillRect(x - r, y - r, r * 2, r * 2);
  const spin = (time * 0.15) % 1;
  if (id === 'jupiter' || id === 'saturn') {
    const bands = id === 'jupiter'
      ? [[-0.62, 0.12, '#b98258'], [-0.32, 0.14, '#f2e1c4'], [-0.08, 0.16, '#b0764c'], [0.22, 0.12, '#efdcbc'], [0.45, 0.14, '#a9704a'], [0.7, 0.1, '#d8b48c']]
      : [[-0.5, 0.14, '#d8bd80'], [-0.15, 0.12, '#f6e6bb'], [0.15, 0.16, '#cfb072'], [0.5, 0.12, '#e8d39c']];
    for (const [k, h, col] of bands as [number, number, string][]) {
      c.fillStyle = col;
      c.globalAlpha = 0.75;
      c.fillRect(x - r, y + k * r, r * 2, h * r * 1.6);
    }
    c.globalAlpha = 1;
    if (id === 'jupiter') {
      c.fillStyle = '#c5573a';
      c.beginPath();
      c.ellipse(x - r * 0.9 + ((spin * 2.6 + 0.6) % 2.6) * r, y + r * 0.32, r * 0.22, r * 0.13, 0, 0, Math.PI * 2);
      c.fill();
    }
  } else if (id === 'earth') {
    c.fillStyle = '#3e9b4f';
    for (const [lx, ly, lr] of [[-0.3, -0.2, 0.42], [0.45, 0.25, 0.32], [-0.6, 0.45, 0.25], [0.2, -0.55, 0.2]] as const) {
      const xx = x + (((lx + spin * 2 + 1) % 2) - 1) * r * 1.3;
      c.beginPath();
      c.arc(xx, y + ly * r, lr * r, 0, Math.PI * 2);
      c.fill();
    }
    c.fillStyle = 'rgba(255,255,255,0.75)';
    for (const [cx, cy, cw] of [[-0.5, -0.5, 0.7], [0.2, 0.05, 0.8], [-0.2, 0.6, 0.6]] as const) {
      const xx = x + (((cx + spin * 3 + 1) % 2) - 1) * r * 1.3;
      c.beginPath();
      c.ellipse(xx, y + cy * r, cw * r * 0.5, r * 0.09, 0, 0, Math.PI * 2);
      c.fill();
    }
  } else if (id === 'mars') {
    c.fillStyle = 'rgba(110, 35, 15, 0.45)';
    c.beginPath();
    c.ellipse(x + r * 0.15, y + r * 0.1, r * 0.5, r * 0.2, 0.3, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#f8f2ee';
    c.beginPath();
    c.ellipse(x, y - r * 0.95, r * 0.45, r * 0.18, 0, 0, Math.PI * 2);
    c.fill();
  } else if (id === 'mercury') {
    c.fillStyle = 'rgba(70, 66, 62, 0.5)';
    for (const [cx, cy, cr] of [[-0.3, -0.3, 0.2], [0.35, 0.1, 0.16], [-0.1, 0.45, 0.13], [0.3, -0.5, 0.1]] as const) {
      c.beginPath();
      c.arc(x + cx * r, y + cy * r, cr * r, 0, Math.PI * 2);
      c.fill();
    }
  } else if (id === 'venus') {
    c.strokeStyle = 'rgba(255, 250, 230, 0.45)';
    c.lineWidth = r * 0.12;
    for (const k of [-0.4, 0, 0.4]) {
      c.beginPath();
      c.arc(x + r * 0.2, y + k * r, r * 0.9, Math.PI * 0.75, Math.PI * 1.25);
      c.stroke();
    }
  } else if (id === 'neptune') {
    c.fillStyle = 'rgba(20, 30, 90, 0.6)';
    c.beginPath();
    c.ellipse(x - r * 0.15, y + r * 0.25, r * 0.25, r * 0.14, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = 'rgba(255, 255, 255, 0.5)';
    c.fillRect(x - r * 0.6, y - r * 0.2, r * 0.7, r * 0.06);
  }
  // Shade the night side.
  const shade = c.createLinearGradient(x - r, y, x + r, y);
  shade.addColorStop(0, 'rgba(255,255,255,0.12)');
  shade.addColorStop(0.55, 'rgba(0,0,0,0)');
  shade.addColorStop(1, 'rgba(0,0,15,0.55)');
  c.fillStyle = shade;
  c.fillRect(x - r, y - r, r * 2, r * 2);
  c.restore();
  if (id === 'saturn') saturnRings(c, x, y, r, false);
}

// ---- The game ----

const LW = 1000;
const LH = 620;
const TRAY_Y = 556;
const SUN = { x: -200, y: 290 };
const ORBIT_R = (i: number) => 330 + i * 108;
/** Round 1 slots sit on their orbits, a little up and down for a parade look. */
const ORBIT_DY = [-30, 46, -54, 40, -70, 58, -40, 62];

interface Body {
  id: PlanetId;
  x: number;
  y: number;
  homeX: number;
  homeY: number;
  slot: number;
  anim: { fx: number; fy: number; tx: number; ty: number; t: number; dur: number; back: boolean } | null;
  lift: number;
  shake: number;
  hop: number;
}

function shuffle<T>(list: T[]): T[] {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j]!, list[i]!];
  }
  return list;
}

export const makePlanets: MinigameMaker = (): Minigame => {
  let runner: Runner | null = null;
  let cleanup: (() => void) | null = null;
  let finish: ((r: MinigameResult) => void) | null = null;

  function start(host: HTMLElement, done: (r: MinigameResult) => void): void {
    finish = done;
    const { canvas } = makeStage(host, t('minigame.planets.label'));
    const stars = starField(140, 11);
    const parts = new Particles();
    const words = new Floaters();
    const still = reducedMotion();
    let view: View | null = null;

    let round: 1 | 2 = 1;
    const dir: SizeDirection = Math.random() < 0.5 ? 'up' : 'down';
    let mistakes = 0;
    let clock = 0;
    let phase: 'intro' | 'play' | 'cheer' | 'between' | 'end' = 'intro';
    let phaseT = 0;
    let hint: { text: string; t: number } | null = null;
    let bodies: Body[] = [];
    let drag: { body: Body; dx: number; dy: number } | null = null;
    // Keyboard: a cursor over the tray, then over the slots once a planet is picked up.
    let kbd = false;
    let sel = 0;
    let held: Body | null = null;
    let slotCursor = 0;

    function slotPos(i: number): { x: number; y: number } {
      if (round === 1) {
        const r = ORBIT_R(i);
        const dy = ORBIT_DY[i]!;
        return { x: SUN.x + Math.sqrt(r * r - dy * dy), y: SUN.y + dy };
      }
      const h = podium(i);
      return { x: 95 + i * 115, y: 452 - h - 38 };
    }
    function podium(i: number): number {
      const k = dir === 'up' ? i : 7 - i;
      return 26 + k * 21;
    }

    function deal(): void {
      const ids = shuffle([...PLANETS]);
      bodies = ids.map((id, i) => {
        const homeX = 70 + i * 123;
        return { id, x: homeX, y: LH + 80 + i * 20, homeX, homeY: TRAY_Y, slot: -1, anim: null, lift: 0, shake: 0, hop: 0 };
      });
      // Fly in from below.
      bodies.forEach((b, i) => { b.anim = { fx: b.x, fy: b.y, tx: b.homeX, ty: b.homeY, t: -i * 0.06, dur: 0.55, back: true }; });
      sel = 0;
      held = null;
    }
    deal();

    const tray = () => bodies.filter((b) => b.slot < 0 && b !== drag?.body);
    const filled = (i: number) => bodies.some((b) => b.slot === i);

    function placeAt(b: Body, slot: number): void {
      const right = rightSlot(round, b.id, dir) === slot;
      if (filled(slot)) { sendHome(b); return; }
      if (right) {
        const p = slotPos(slot);
        b.slot = slot;
        // Round 2: the planet sits on its podium.
        const ty = round === 2 ? 452 - podium(slot) - PLANET_RADII[b.id] - 3 : p.y;
        b.anim = { fx: b.x, fy: b.y, tx: p.x, ty, t: 0, dur: 0.22, back: false };
        b.hop = 1;
        parts.burst(p.x, p.y, ['#ffffff', '#ffe27a', '#9fd0ff'], { count: 24, speed: 220, size: 4, spark: true });
        words.add(t('minigame.planets.yes'), p.x, p.y - 50, '#ffe27a', 26);
        sfx('build');
        if (bodies.every((x) => x.slot >= 0)) {
          phase = 'cheer';
          phaseT = 0;
          sfx('reward');
          bodies.forEach((x) => { x.hop = 0; });
        }
      } else {
        mistakes++;
        hint = { text: planetHint(round, b.id, dir), t: 0 };
        b.shake = 1;
        sendHome(b);
        sfx('click');
      }
    }
    function sendHome(b: Body): void {
      b.anim = { fx: b.x, fy: b.y, tx: b.homeX, ty: b.homeY, t: 0, dur: 0.45, back: true };
    }

    function nearestSlot(x: number, y: number): number {
      let best = -1;
      let bestD = 70;
      for (let i = 0; i < PLANETS.length; i++) {
        const p = slotPos(i);
        const d = Math.hypot(p.x - x, p.y - y);
        if (d < bestD) { best = i; bestD = d; }
      }
      return best;
    }

    function step(dt: number): void {
      clock += dt;
      phaseT += dt;
      parts.step(dt);
      words.step(dt);
      if (hint) { hint.t += dt; if (hint.t > 3.6) hint = null; }
      for (const b of bodies) {
        b.lift = clamp(b.lift + (drag?.body === b || held === b ? dt * 8 : -dt * 8), 0, 1);
        b.shake = Math.max(0, b.shake - dt * 2.2);
        b.hop = Math.max(0, b.hop - dt * 2.5);
        if (b.anim && dt > 0) {
          b.anim.t += dt;
          const k = clamp(b.anim.t / b.anim.dur, 0, 1);
          // A springy ease: overshoot, then settle.
          const e = b.anim.back ? 1 - Math.pow(1 - k, 3) : 1 + 2.2 * Math.pow(k - 1, 3) + 1.2 * Math.pow(k - 1, 2);
          b.x = b.anim.fx + (b.anim.tx - b.anim.fx) * e;
          b.y = b.anim.fy + (b.anim.ty - b.anim.fy) * e;
          if (k >= 1) { b.x = b.anim.tx; b.y = b.anim.ty; b.anim = null; }
        }
      }
      if (phase === 'intro' && phaseT > 1.3) { phase = 'play'; phaseT = 0; sfx('countdown'); }
      if (phase === 'cheer') {
        if (Math.random() < dt * 12) parts.burst(150 + Math.random() * 750, 80 + Math.random() * 380, ['#ffffff', '#ffd27a', '#9fd0ff'], { count: 10, speed: 160, size: 4, spark: true });
        if (phaseT > 3) {
          if (round === 1) {
            round = 2;
            phase = 'between';
            phaseT = 0;
            for (const b of bodies) { b.slot = -1; }
            deal();
          } else {
            phase = 'end';
            phaseT = 0;
          }
        }
      }
      if (phase === 'between' && phaseT > 1.6) { phase = 'play'; phaseT = 0; }
      if (phase === 'end' && phaseT > 0.2 && finish) {
        const f = finish;
        finish = null;
        const stars = planetStars(mistakes);
        f({ won: true, stars, line: t(`minigame.planets.line.${stars}`) });
      }
    }

    // ---- Drawing ----

    function drawSun(c: CanvasRenderingContext2D): void {
      const pulse = 1 + Math.sin(clock * 2) * 0.02;
      const glow = c.createRadialGradient(SUN.x, SUN.y, 200, SUN.x, SUN.y, 330 * pulse);
      glow.addColorStop(0, 'rgba(255, 200, 90, 0.5)');
      glow.addColorStop(1, 'rgba(255, 160, 60, 0)');
      c.fillStyle = glow;
      c.beginPath();
      c.arc(SUN.x, SUN.y, 330 * pulse, 0, Math.PI * 2);
      c.fill();
      const g = c.createRadialGradient(SUN.x + 120, SUN.y - 40, 20, SUN.x, SUN.y, 250);
      g.addColorStop(0, '#fff6c8');
      g.addColorStop(0.55, '#ffc34a');
      g.addColorStop(1, '#ff8a1e');
      c.fillStyle = g;
      c.beginPath();
      c.arc(SUN.x, SUN.y, 250, 0, Math.PI * 2);
      c.fill();
      c.font = '850 22px system-ui, sans-serif';
      c.textAlign = 'left';
      c.textBaseline = 'middle';
      c.fillStyle = '#7a3500';
      c.fillText(t('minigame.planets.sun'), 8, SUN.y);
    }

    function drawSlots(c: CanvasRenderingContext2D): void {
      for (let i = 0; i < PLANETS.length; i++) {
        const p = slotPos(i);
        const has = filled(i);
        const cursor = kbd && held && slotCursor === i;
        const near = drag && nearestSlot(drag.body.x, drag.body.y) === i;
        if (round === 2) {
          const h = podium(i);
          const pg = c.createLinearGradient(0, 452 - h, 0, 452);
          pg.addColorStop(0, 'rgba(120, 170, 240, 0.45)');
          pg.addColorStop(1, 'rgba(60, 90, 150, 0.2)');
          c.fillStyle = pg;
          c.beginPath();
          c.roundRect(p.x - 40, 452 - h, 80, h, 6);
          c.fill();
          c.strokeStyle = 'rgba(160, 200, 255, 0.5)';
          c.lineWidth = 1.5;
          c.stroke();
        }
        if (!has) {
          c.setLineDash([7, 6]);
          c.lineDashOffset = -clock * 12;
          c.strokeStyle = cursor || near ? '#ffe27a' : 'rgba(200, 225, 255, 0.55)';
          c.lineWidth = cursor || near ? 3.5 : 2;
          c.beginPath();
          c.arc(p.x, p.y, 36, 0, Math.PI * 2);
          c.stroke();
          c.setLineDash([]);
          if (cursor || near) {
            c.fillStyle = 'rgba(255, 226, 122, 0.12)';
            c.fill();
          }
        }
        if (round === 1) {
          c.font = '800 16px system-ui, sans-serif';
          c.textAlign = 'center';
          c.textBaseline = 'middle';
          c.fillStyle = has ? 'rgba(255,255,255,0.45)' : '#cfe6ff';
          c.fillText(t(`minigame.planets.nth.${(i + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8}`), p.x, p.y + (ORBIT_DY[i]! < 0 ? -50 : 52));
        }
      }
    }

    function drawBody(c: CanvasRenderingContext2D, b: Body, index: number): void {
      const r = PLANET_RADII[b.id];
      const wave = phase === 'cheer' && !still ? Math.max(0, Math.sin(phaseT * 6 - index * 0.7)) * 22 : 0;
      const bob = b.slot < 0 && !b.lift && !b.anim ? Math.sin(clock * 2 + index) * 3 : 0;
      const sx = b.shake ? Math.sin(b.shake * 40) * 10 * b.shake : 0;
      const x = b.x + sx;
      const y = b.y - b.lift * 10 - wave - b.hop * 14 + bob;
      const s = 1 + b.lift * 0.18 + b.hop * 0.12;
      if (b.lift > 0) {
        c.fillStyle = `rgba(0, 0, 0, ${0.35 * b.lift})`;
        c.beginPath();
        c.ellipse(b.x, b.y + r * 0.9, r * 0.9, r * 0.3, 0, 0, Math.PI * 2);
        c.fill();
      }
      drawPlanet(c, b.id, x, y, r * s, clock + index);
      const selected = kbd && phase === 'play' && ((held === b) || (!held && tray()[sel] === b));
      if (selected) {
        c.strokeStyle = '#ffe27a';
        c.lineWidth = 3;
        c.setLineDash([6, 5]);
        c.beginPath();
        c.arc(x, y, r * s + 9, 0, Math.PI * 2);
        c.stroke();
        c.setLineDash([]);
      }
      c.font = '800 16px system-ui, sans-serif';
      c.textAlign = 'center';
      c.textBaseline = 'top';
      c.lineWidth = 4;
      c.strokeStyle = 'rgba(4, 8, 16, 0.85)';
      const name = t(`minigame.planets.name.${b.id}`);
      const ny = y + r * s + (b.id === 'saturn' ? 10 : 5);
      c.strokeText(name, x, ny);
      c.fillStyle = '#ffffff';
      c.fillText(name, x, ny);
    }

    function draw(): void {
      view = fitView(canvas, LW, LH);
      if (!view) return;
      const v = view;
      const { c } = v;
      const bg = c.createLinearGradient(0, 0, v.cw, v.ch);
      bg.addColorStop(0, '#0a0f26');
      bg.addColorStop(1, '#120a26');
      c.fillStyle = bg;
      c.fillRect(0, 0, v.cw, v.ch);
      drawStars(c, stars, v.cw, v.ch, clock);
      // Tray band across the whole width.
      const ty = v.oy + (TRAY_Y - 62) * v.scale;
      c.fillStyle = 'rgba(10, 17, 30, 0.75)';
      c.fillRect(0, ty, v.cw, v.ch - ty);
      c.fillStyle = 'rgba(79, 163, 255, 0.5)';
      c.fillRect(0, ty, v.cw, 2);
      c.save();
      enter(v);
      if (round === 1) {
        // Orbits, clipped above the tray.
        c.save();
        c.beginPath();
        c.rect(-LW, -LH, LW * 3, TRAY_Y - 64 + LH);
        c.clip();
        c.strokeStyle = 'rgba(160, 200, 255, 0.28)';
        c.lineWidth = 1.5;
        for (let i = 0; i < PLANETS.length; i++) {
          c.beginPath();
          c.arc(SUN.x, SUN.y, ORBIT_R(i), -0.9, 0.9);
          c.stroke();
        }
        drawSun(c);
        c.restore();
      } else {
        // The size line: an arrow from small to big.
        const y = 470;
        c.strokeStyle = 'rgba(255, 226, 122, 0.8)';
        c.fillStyle = 'rgba(255, 226, 122, 0.8)';
        c.lineWidth = 4;
        const x0 = dir === 'up' ? 60 : 940;
        const x1 = dir === 'up' ? 940 : 60;
        c.beginPath();
        c.moveTo(x0, y);
        c.lineTo(x1, y);
        c.stroke();
        c.beginPath();
        const s = dir === 'up' ? 1 : -1;
        c.moveTo(x1 + s * 6, y);
        c.lineTo(x1 - s * 12, y - 10);
        c.lineTo(x1 - s * 12, y + 10);
        c.fill();
        c.font = '800 18px system-ui, sans-serif';
        c.textBaseline = 'middle';
        c.textAlign = 'left';
        c.fillStyle = '#ffe27a';
        c.fillText(t(dir === 'up' ? 'minigame.planets.smallest' : 'minigame.planets.biggest'), 60, 100);
        c.textAlign = 'right';
        c.fillText(t(dir === 'up' ? 'minigame.planets.biggest' : 'minigame.planets.smallest'), 940, 100);
      }
      drawSlots(c);
      // Placed planets first, then the tray, then the one in hand on top.
      const order = [...bodies].sort((a, b) => (a.slot >= 0 ? 0 : 1) - (b.slot >= 0 ? 0 : 1) + ((drag?.body === a || held === a) ? 2 : 0) - ((drag?.body === b || held === b) ? 2 : 0));
      for (const b of order) drawBody(c, b, PLANETS.indexOf(b.id));
      parts.draw(c);
      words.draw(c);
      // Title and hint.
      const title = round === 1 ? t('minigame.planets.round1') : t(dir === 'up' ? 'minigame.planets.round2.up' : 'minigame.planets.round2.down');
      bigText(c, title, LW / 2 + (round === 1 ? 70 : 0), 36, 28, '#ffffff');
      if (hint) {
        c.globalAlpha = hint.t > 3 ? Math.max(0, (3.6 - hint.t) / 0.6) : 1;
        const pop = hint.t < 0.15 ? 0.8 + hint.t / 0.75 : 1;
        c.fillStyle = 'rgba(10, 17, 30, 0.88)';
        c.strokeStyle = '#ffb36b';
        c.lineWidth = 2;
        c.beginPath();
        c.roundRect(LW / 2 - 330 + (round === 1 ? 70 : 0), 62, 660, 50, 14);
        c.fill();
        c.stroke();
        bigTextWrapped(c, hint.text, LW / 2 + (round === 1 ? 70 : 0), 87, 22 * pop, 640, '#ffe0c0');
        c.globalAlpha = 1;
      }
      if (phase === 'intro') bigText(c, t(phaseT < 0.85 ? 'minigames.ready' : 'minigames.go'), LW / 2 + 70, 240, 64);
      if (phase === 'cheer') bigText(c, t(round === 1 ? 'minigame.planets.round1Done' : 'minigame.planets.done'), LW / 2, 250, 40, '#ffe27a');
      if (phase === 'between') bigText(c, t('minigame.planets.round2Next'), LW / 2, 250, 44, '#ffffff');
      c.restore();
    }

    // ---- Input ----
    const hit = (x: number, y: number): Body | null => {
      let best: Body | null = null;
      let bestD = Infinity;
      for (const b of tray()) {
        const d = Math.hypot(b.x - x, b.y - y);
        if (d < Math.max(PLANET_RADII[b.id], 26) + 8 && d < bestD) { best = b; bestD = d; }
      }
      return best;
    };
    const down = (e: PointerEvent) => {
      if (phase !== 'play' || drag) return;
      canvas.focus();
      kbd = false;
      held = null;
      const p = toLogical(view, canvas, e);
      const b = hit(p.x, p.y);
      if (!b) return;
      b.anim = null;
      drag = { body: b, dx: b.x - p.x, dy: b.y - p.y };
      try { canvas.setPointerCapture(e.pointerId); } catch { /* not a live pointer */ }
      sfx('click');
    };
    const move = (e: PointerEvent) => {
      const p = toLogical(view, canvas, e);
      if (!drag) {
        canvas.style.cursor = phase === 'play' && hit(p.x, p.y) ? 'grab' : 'default';
        return;
      }
      canvas.style.cursor = 'grabbing';
      drag.body.x = clamp(p.x + drag.dx, 0, LW);
      drag.body.y = clamp(p.y + drag.dy, 0, LH);
    };
    const up = () => {
      if (!drag) return;
      const b = drag.body;
      drag = null;
      const slot = nearestSlot(b.x, b.y);
      if (slot >= 0 && phase === 'play') placeAt(b, slot);
      else sendHome(b);
    };
    const key = (e: KeyboardEvent) => {
      if (phase !== 'play' || drag) {
        if (GAME_KEYS.has(e.key)) e.preventDefault();
        return;
      }
      const list = tray();
      const k = e.key;
      if (k === 'ArrowLeft' || k === 'ArrowRight' || k === 'ArrowUp' || k === 'ArrowDown') {
        e.preventDefault();
        const step = k === 'ArrowLeft' || k === 'ArrowUp' ? -1 : 1;
        if (!kbd) { kbd = true; return; }
        if (held) {
          const empty = [...Array(PLANETS.length).keys()].filter((i) => !filled(i));
          const at = Math.max(0, empty.indexOf(slotCursor));
          slotCursor = empty[(at + step + empty.length) % empty.length] ?? 0;
        } else if (list.length) sel = (sel + step + list.length) % list.length;
      } else if (k === 'Enter' || k === ' ') {
        e.preventDefault();
        if (!kbd) { kbd = true; return; }
        if (held) {
          const b = held;
          held = null;
          b.x = slotPos(slotCursor).x;
          b.y = slotPos(slotCursor).y - 50;
          placeAt(b, slotCursor);
          sel = Math.min(sel, Math.max(0, tray().length - 1));
        } else if (list[sel]) {
          held = list[sel]!;
          slotCursor = [...Array(PLANETS.length).keys()].find((i) => !filled(i)) ?? 0;
          sfx('click');
        }
      } else if (k === 'Backspace' && held) {
        e.preventDefault();
        sendHome(held);
        held = null;
      }
    };
    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    window.addEventListener('keydown', key);
    cleanup = () => {
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', up);
      canvas.removeEventListener('pointercancel', up);
      window.removeEventListener('keydown', key);
    };

    runner = new Runner(host, (dt) => {
      step(dt);
      // A held planet (keyboard) floats over its slot.
      if (held) {
        const p = slotPos(slotCursor);
        held.anim = null;
        held.x += (p.x - held.x) * Math.min(1, dt * 14);
        held.y += (p.y - 50 - held.y) * Math.min(1, dt * 14);
      }
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
    },
  };
};
