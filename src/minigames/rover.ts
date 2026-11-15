import { t } from '../strings';
import { button, el } from '../ui/miniGame';
import {
  bigText, clamp, drawBar, enter, fitView, Floaters, GAME_KEYS, lerp, makeStage, Particles, reducedMotion, Runner, seeded,
  sfx, toLogical, type View,
} from './kit';
import type { Minigame, MinigameMaker, MinigameResult } from './types';

/**
 * Rover Rescue (Explorer). Drive a rover across Mars (top-down) to three glowing rocks, hold Drill to take a sample
 * from each, and bring the samples to the lab to study them. Boulders block the way, soft sand slows it, and the
 * battery runs down while driving and drilling and charges from the Sun while parked.
 * Fact: Perseverance collects rock samples; Curiosity drills rocks and studies them in its own lab
 * (docs/research/minigames.md). Speeds, battery use and times are game choices.
 */

export const ROVER_SAMPLES = 3;
/** Seconds of holding Drill per sample. */
export const DRILL_TIME = 2.6;
/** Seconds to study the samples at the lab. */
export const SCAN_TIME = 1.8;
/** Seconds before the Mars day ends. */
export const ROVER_TIME = 150;

/** The samples: drilled, carried and studied. Pure, so it can be tested. */
export class RoverMission {
  readonly progress: number[];
  readonly sampled: boolean[];
  carried = 0;
  studied = 0;

  constructor(readonly count = ROVER_SAMPLES) {
    this.progress = Array.from({ length: count }, () => 0);
    this.sampled = Array.from({ length: count }, () => false);
  }

  /** Hold Drill on rock `i` for `dt` seconds: 'sampled' the moment it is done. Progress is kept if Drill is let go. */
  drill(i: number, dt: number): 'drilling' | 'sampled' | 'empty' {
    if (this.sampled[i] || i < 0 || i >= this.count) return 'empty';
    this.progress[i] = Math.min(1, this.progress[i]! + dt / DRILL_TIME);
    if (this.progress[i]! < 1) return 'drilling';
    this.sampled[i] = true;
    this.carried++;
    return 'sampled';
  }

  /** At the lab: every carried sample is studied. Returns how many. */
  study(): number {
    const n = this.carried;
    this.studied += n;
    this.carried = 0;
    return n;
  }

  get won(): boolean {
    return this.studied >= this.count;
  }
}

export interface BatteryUse {
  /** Share of full speed, 0–1. */
  driving: number;
  sand: boolean;
  drilling: boolean;
}

/** Battery (0–1) after `dt` seconds: driving and drilling use it; standing still, the solar panels charge it slowly. */
export function batteryStep(level: number, use: BatteryUse, dt: number): number {
  let rate = 0;
  if (use.drilling) rate -= 0.05;
  if (use.driving > 0.05) rate -= 0.038 * use.driving * (use.sand ? 1.8 : 1);
  if (!use.drilling && use.driving <= 0.05) rate += 0.08;
  return clamp(level + rate * dt, 0, 1);
}

/** Stars once all samples are studied: quick, with battery to spare. */
export function roverStars(seconds: number, battery: number): 1 | 2 | 3 {
  if (seconds <= 75 && battery >= 0.15) return 3;
  if (seconds <= 115) return 2;
  return 1;
}

// ---- The map ----

const LW = 1000;
const LH = 620;
const TOP = 58; // the status strip
/** Top speed (logical px per second); soft sand cuts it to a third. */
const SPEED = 145;
const LAB = { x: 105, y: 520, r: 62 };
const START = { x: 200, y: 500 };
const BOULDERS: readonly { x: number; y: number; r: number }[] = [
  { x: 380, y: 450, r: 34 }, { x: 640, y: 190, r: 40 }, { x: 760, y: 380, r: 36 }, { x: 255, y: 300, r: 30 },
  { x: 540, y: 525, r: 32 }, { x: 885, y: 300, r: 28 }, { x: 430, y: 180, r: 26 },
];
const SAND: readonly { x: number; y: number; rx: number; ry: number }[] = [
  { x: 620, y: 440, rx: 88, ry: 50 }, { x: 180, y: 200, rx: 70, ry: 44 }, { x: 815, y: 225, rx: 62, ry: 38 }, { x: 470, y: 262, rx: 72, ry: 38 },
];
const SPOTS: readonly { x: number; y: number }[] = [
  { x: 820, y: 130 }, { x: 560, y: 115 }, { x: 885, y: 480 }, { x: 470, y: 340 }, { x: 705, y: 565 }, { x: 300, y: 165 }, { x: 640, y: 305 },
];

/** Three spots for the glowing rocks, apart from each other. `random` is 0–1. */
export function pickSpots(random: () => number): { x: number; y: number }[] {
  for (let tries = 0; tries < 50; tries++) {
    const pool = [...SPOTS];
    const picked: { x: number; y: number }[] = [];
    while (picked.length < ROVER_SAMPLES && pool.length) {
      const s = pool.splice(Math.floor(random() * pool.length), 1)[0]!;
      if (picked.every((p) => Math.hypot(p.x - s.x, p.y - s.y) >= 200)) picked.push(s);
    }
    if (picked.length === ROVER_SAMPLES) return picked;
  }
  return [SPOTS[0]!, SPOTS[2]!, SPOTS[5]!];
}

export function inSand(x: number, y: number): boolean {
  return SAND.some((s) => ((x - s.x) / s.rx) ** 2 + ((y - s.y) / s.ry) ** 2 < 1);
}

/** The ground, drawn once: rusty dust, darker patches, craters, pebbles, soft sand and boulders' shadows. */
function paintTerrain(scale: number): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  cv.width = Math.round(LW * scale);
  cv.height = Math.round(LH * scale);
  const c = cv.getContext('2d')!;
  c.scale(scale, scale);
  const rnd = seeded(42);
  const g = c.createLinearGradient(0, 0, LW, LH);
  g.addColorStop(0, '#b4552e');
  g.addColorStop(0.5, '#c46a3c');
  g.addColorStop(1, '#a24a28');
  c.fillStyle = g;
  c.fillRect(0, 0, LW, LH);
  // Blotches.
  for (let i = 0; i < 70; i++) {
    const x = rnd() * LW;
    const y = rnd() * LH;
    const r = 30 + rnd() * 90;
    const b = c.createRadialGradient(x, y, 0, x, y, r);
    const dark = rnd() < 0.5;
    b.addColorStop(0, dark ? 'rgba(110, 40, 20, 0.22)' : 'rgba(230, 150, 100, 0.18)');
    b.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = b;
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fill();
  }
  // Fine grain.
  for (let i = 0; i < 2600; i++) {
    c.fillStyle = rnd() < 0.5 ? 'rgba(80, 30, 15, 0.18)' : 'rgba(255, 200, 160, 0.14)';
    c.fillRect(rnd() * LW, rnd() * LH, 1.4, 1.4);
  }
  // Craters (light from the top left).
  for (const [x, y, r] of [[330, 560, 46], [700, 90, 34], [930, 590, 52], [120, 120, 30], [560, 420, 22], [960, 140, 26], [300, 400, 18]] as const) {
    c.fillStyle = 'rgba(90, 30, 12, 0.35)';
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fill();
    const inner = c.createRadialGradient(x - r * 0.25, y - r * 0.25, r * 0.1, x, y, r);
    inner.addColorStop(0, 'rgba(70, 22, 8, 0.55)');
    inner.addColorStop(1, 'rgba(70, 22, 8, 0)');
    c.fillStyle = inner;
    c.fill();
    c.strokeStyle = 'rgba(255, 190, 140, 0.45)';
    c.lineWidth = 3;
    c.beginPath();
    c.arc(x, y, r, -0.2, Math.PI * 0.95);
    c.stroke();
  }
  // Soft sand: pale, with ripples.
  for (const s of SAND) {
    c.save();
    c.translate(s.x, s.y);
    c.scale(1, s.ry / s.rx);
    const sg = c.createRadialGradient(0, 0, s.rx * 0.2, 0, 0, s.rx);
    sg.addColorStop(0, 'rgba(240, 190, 120, 0.85)');
    sg.addColorStop(0.85, 'rgba(225, 160, 95, 0.75)');
    sg.addColorStop(1, 'rgba(225, 160, 95, 0)');
    c.fillStyle = sg;
    c.beginPath();
    c.arc(0, 0, s.rx, 0, Math.PI * 2);
    c.fill();
    c.restore();
    c.strokeStyle = 'rgba(170, 95, 50, 0.45)';
    c.lineWidth = 1.6;
    for (let k = -3; k <= 3; k++) {
      const yy = s.y + k * (s.ry / 4.2);
      const half = s.rx * Math.sqrt(Math.max(0, 1 - ((yy - s.y) / s.ry) ** 2)) * 0.8;
      c.beginPath();
      for (let xx = -half; xx <= half; xx += 6) c.lineTo(s.x + xx, yy + Math.sin(xx / 9) * 2.5);
      c.stroke();
    }
  }
  // Pebbles.
  for (let i = 0; i < 160; i++) {
    const x = rnd() * LW;
    const y = rnd() * LH;
    const r = 1.5 + rnd() * 4;
    c.fillStyle = 'rgba(60, 25, 12, 0.35)';
    c.beginPath();
    c.ellipse(x + 1.5, y + 1.5, r, r * 0.75, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = rnd() < 0.5 ? '#8c4a2c' : '#a8644a';
    c.beginPath();
    c.ellipse(x, y, r, r * 0.75, rnd() * 3, 0, Math.PI * 2);
    c.fill();
  }
  // Boulders.
  for (const b of BOULDERS) {
    c.fillStyle = 'rgba(50, 18, 8, 0.45)';
    c.beginPath();
    c.ellipse(b.x + b.r * 0.35, b.y + b.r * 0.4, b.r * 1.05, b.r * 0.8, 0.4, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    for (let i = 0; i < 11; i++) {
      const a = (i / 11) * Math.PI * 2;
      const k = 0.86 + rnd() * 0.18;
      c.lineTo(b.x + Math.cos(a) * b.r * k, b.y + Math.sin(a) * b.r * k);
    }
    c.closePath();
    const bg = c.createRadialGradient(b.x - b.r * 0.4, b.y - b.r * 0.45, 2, b.x, b.y, b.r * 1.1);
    bg.addColorStop(0, '#b9785a');
    bg.addColorStop(0.6, '#7c3f26');
    bg.addColorStop(1, '#4a2112');
    c.fillStyle = bg;
    c.fill();
    c.strokeStyle = 'rgba(40, 14, 6, 0.6)';
    c.lineWidth = 2;
    c.stroke();
    c.strokeStyle = 'rgba(255, 210, 170, 0.35)';
    c.beginPath();
    c.moveTo(b.x - b.r * 0.5, b.y - b.r * 0.1);
    c.lineTo(b.x - b.r * 0.1, b.y - b.r * 0.45);
    c.stroke();
  }
  return cv;
}

export const makeRover: MinigameMaker = (): Minigame => {
  let runner: Runner | null = null;
  let cleanup: (() => void) | null = null;
  let finish: ((r: MinigameResult) => void) | null = null;

  function start(host: HTMLElement, done: (r: MinigameResult) => void): void {
    finish = done;
    const { canvas, layer } = makeStage(host, t('minigame.rover.label'));
    const drillButton = button('mg-drill', t('minigame.rover.drill'));
    drillButton.disabled = true;
    const hint = el('p', 'mg-drill-hint');
    hint.setAttribute('aria-live', 'polite');
    layer.append(hint, drillButton);

    const still = reducedMotion();
    const parts = new Particles();
    const words = new Floaters();
    const mission = new RoverMission();
    const rocks = pickSpots(Math.random);
    let terrain: HTMLCanvasElement | null = null;
    let terrainScale = 0;
    let view: View | null = null;

    const rover = { x: START.x, y: START.y, a: 0, v: 0 };
    let battery = 1;
    let emptyLock = false;
    let target: { x: number; y: number } | null = null;
    let dragging = false;
    const keys = { up: false, down: false, left: false, right: false };
    let drillKey = false;
    let drillHeld = false;
    let drilling = false;
    let scan = -1; // seconds into a scan at the lab, or -1
    let time = 0;
    let clock = 0;
    let intro = 1.3;
    let state: 'play' | 'won' | 'lost' = 'play';
    let endT = 0;
    let wasSand = false;
    let bumpCool = 0;
    let shake = 0;
    const tracks: { x: number; y: number; a: number }[] = [];
    let trackDist = 0;

    const nearRock = (): number => {
      let best = -1;
      let bestD = 52;
      rocks.forEach((r, i) => {
        if (mission.sampled[i]) return;
        const d = Math.hypot(r.x - rover.x, r.y - rover.y);
        if (d < bestD) { best = i; bestD = d; }
      });
      return best;
    };
    const atLab = () => Math.hypot(rover.x - LAB.x, rover.y - LAB.y) < LAB.r;

    function finishGame(won: boolean): void {
      state = won ? 'won' : 'lost';
      endT = 0;
      drillButton.disabled = true;
      drillButton.classList.remove('ready', 'held');
      hint.textContent = '';
      if (won) {
        sfx('reward');
        parts.burst(LAB.x, LAB.y, ['#ffffff', '#ffd27a', '#7cf0a8'], { count: 80, speed: 380, size: 6, spark: true });
      } else sfx('alarm');
    }

    function step(dt: number): void {
      clock += dt;
      parts.step(dt);
      words.step(dt);
      shake = Math.max(0, shake - dt * 2);
      bumpCool = Math.max(0, bumpCool - dt);
      if (state !== 'play') {
        endT += dt;
        if (state === 'won' && Math.random() < dt * 10) {
          parts.burst(200 + Math.random() * 600, 120 + Math.random() * 300, ['#ffffff', '#ffd27a', '#7cf0a8', '#9fd0ff'], { count: 18, speed: 220, size: 4, spark: true, gravity: 120 });
        }
        if (endT > 2.6 && finish) {
          const f = finish;
          finish = null;
          f(state === 'won'
            ? { won: true, stars: roverStars(time, battery), line: t('minigame.rover.line.won') }
            : { won: false, stars: 0, line: t('minigame.rover.line.lost') });
        }
        return;
      }
      if (intro > 0) {
        const before = intro;
        intro -= dt;
        if (before > 0.45 && intro <= 0.45) sfx('countdown');
        return;
      }
      if (dt === 0) return;
      time += dt;
      if (time >= ROVER_TIME) { finishGame(false); return; }

      // Drilling: hold Drill (button or Space) next to a glowing rock.
      const rockI = nearRock();
      drilling = false;
      if ((drillHeld || drillKey) && rockI >= 0 && !emptyLock) {
        drilling = true;
        rover.v = 0;
        target = null;
        const r = rocks[rockI]!;
        if (mission.drill(rockI, dt) === 'sampled') {
          sfx('reward');
          parts.burst(r.x, r.y, ['#ffffff', '#ffd27a', '#9fd0ff'], { count: 40, speed: 260, size: 5, spark: true });
          words.add(t('minigame.rover.sample'), r.x, r.y - 40, '#ffe27a', 30);
        } else {
          if (Math.random() < dt * 30) parts.burst(r.x, r.y, ['#c97a4f', '#8c4a2c', '#e8b48c'], { count: 2, speed: 120, size: 3, gravity: 200 });
          if (!still) shake = Math.max(shake, 0.12);
        }
      }

      // Driving: arrow keys (screen directions) or towards a clicked spot.
      let dx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
      let dy = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
      if (dx || dy) target = null;
      else if (target) {
        dx = target.x - rover.x;
        dy = target.y - rover.y;
        // Sent to a glowing rock: stop beside it, in reach of the drill, not on top of it.
        const atRock = rocks.some((r, i) => !mission.sampled[i] && Math.hypot(r.x - target!.x, r.y - target!.y) < 24);
        if (Math.hypot(dx, dy) < (atRock ? 30 : 8)) { target = null; dx = dy = 0; }
      }
      const sand = inSand(rover.x, rover.y);
      if (sand && !wasSand && rover.v > 20) words.add(t('minigame.rover.sand'), rover.x, rover.y - 36, '#ffe0b0', 22);
      wasSand = sand;
      const top = sand ? 55 : SPEED;
      let want = 0;
      if ((dx || dy) && !drilling && !emptyLock) {
        const goal = Math.atan2(dy, dx);
        let diff = goal - rover.a;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        rover.a += clamp(diff, -6 * dt, 6 * dt);
        want = top * Math.max(0.15, Math.cos(diff));
      }
      rover.v = lerp(rover.v, want, Math.min(1, dt * (want > rover.v ? 3 : 7)));
      const ox = rover.x;
      const oy = rover.y;
      rover.x += Math.cos(rover.a) * rover.v * dt;
      rover.y += Math.sin(rover.a) * rover.v * dt;
      // Boulders block; the rover slides around them.
      for (const b of BOULDERS) {
        const ddx = rover.x - b.x;
        const ddy = rover.y - b.y;
        const d = Math.hypot(ddx, ddy);
        const min = b.r + 16;
        if (d < min && d > 0.01) {
          rover.x = b.x + (ddx / d) * min;
          rover.y = b.y + (ddy / d) * min;
          if (rover.v > 70 && bumpCool <= 0) {
            bumpCool = 1.2;
            words.add(t('minigame.rover.bump'), rover.x, rover.y - 34, '#ffd0b0', 22);
            sfx('click');
            if (!still) shake = 0.4;
          }
        }
      }
      rover.x = clamp(rover.x, 22, LW - 22);
      rover.y = clamp(rover.y, TOP + 18, LH - 18);
      const moved = Math.hypot(rover.x - ox, rover.y - oy);
      if (moved > 0.01) {
        trackDist += moved;
        if (trackDist > 7) {
          trackDist = 0;
          tracks.push({ x: rover.x, y: rover.y, a: rover.a });
          if (tracks.length > 420) tracks.shift();
        }
        if (Math.random() < dt * (sand ? 26 : 12)) {
          parts.burst(rover.x - Math.cos(rover.a) * 18, rover.y - Math.sin(rover.a) * 18, ['rgba(210,140,90,0.7)', 'rgba(240,180,130,0.6)'], { count: 2, speed: 40, size: 6, life: 0.9 });
        }
      }

      // Battery.
      const before = battery;
      battery = batteryStep(battery, { driving: moved / dt / SPEED, sand, drilling }, dt);
      if (battery <= 0 && before > 0) {
        emptyLock = true;
        target = null;
        sfx('alarm');
      }
      if (emptyLock && battery >= 0.2) emptyLock = false;

      // At the lab with samples: study them.
      if (atLab() && mission.carried > 0 && rover.v < 40) {
        if (scan < 0) scan = 0;
        scan += dt;
        if (scan >= SCAN_TIME) {
          mission.study();
          scan = -1;
          sfx('reward');
          words.add(t('minigame.rover.studied'), LAB.x + 20, LAB.y - 70, '#9ff0bf', 30);
          parts.burst(LAB.x, LAB.y - 20, ['#7cf0a8', '#ffffff', '#9fd0ff'], { count: 40, speed: 240, size: 5, spark: true });
          if (mission.won) finishGame(true);
        }
      } else scan = -1;

      // The Drill button and its hint.
      if (state !== 'play') return;
      const canDrill = rockI >= 0 && !emptyLock;
      if (!canDrill) drillHeld = false;
      drillButton.disabled = !canDrill;
      drillButton.classList.toggle('ready', canDrill && !drilling);
      drillButton.classList.toggle('held', drilling);
      const say = emptyLock ? 'minigame.rover.hint.empty'
        : scan >= 0 ? 'minigame.rover.hint.scan'
          : canDrill ? 'minigame.rover.hint.drill'
            : mission.carried > 0 && mission.carried + mission.studied >= mission.count ? 'minigame.rover.hint.lab'
              : 'minigame.rover.hint.drive';
      const text = t(say);
      if (hint.textContent !== text) hint.textContent = text;
    }

    // ---- Drawing ----

    function drawRock(c: CanvasRenderingContext2D, i: number): void {
      const r = rocks[i]!;
      const done = mission.sampled[i];
      const p = mission.progress[i]!;
      // Glow and ring.
      if (!done) {
        const pulse = 0.6 + Math.sin(clock * 4 + i) * 0.4;
        const g = c.createRadialGradient(r.x, r.y, 6, r.x, r.y, 60);
        g.addColorStop(0, `rgba(140, 220, 255, ${0.45 * pulse})`);
        g.addColorStop(1, 'rgba(140, 220, 255, 0)');
        c.fillStyle = g;
        c.beginPath();
        c.arc(r.x, r.y, 60, 0, Math.PI * 2);
        c.fill();
      }
      c.fillStyle = 'rgba(50, 18, 8, 0.4)';
      c.beginPath();
      c.ellipse(r.x + 5, r.y + 6, 20, 14, 0.3, 0, Math.PI * 2);
      c.fill();
      // A layered rock.
      const rg = c.createLinearGradient(r.x - 18, r.y - 14, r.x + 18, r.y + 14);
      rg.addColorStop(0, done ? '#8e7a70' : '#c9c3d6');
      rg.addColorStop(1, done ? '#5a4a42' : '#6f6a8c');
      c.fillStyle = rg;
      c.beginPath();
      c.moveTo(r.x - 19, r.y + 4);
      c.lineTo(r.x - 12, r.y - 13);
      c.lineTo(r.x + 8, r.y - 15);
      c.lineTo(r.x + 20, r.y - 2);
      c.lineTo(r.x + 14, r.y + 13);
      c.lineTo(r.x - 10, r.y + 14);
      c.closePath();
      c.fill();
      c.strokeStyle = 'rgba(255,255,255,0.35)';
      c.lineWidth = 1.5;
      for (const k of [-6, 0, 6]) {
        c.beginPath();
        c.moveTo(r.x - 14, r.y + k);
        c.lineTo(r.x + 15, r.y + k - 3);
        c.stroke();
      }
      if (p > 0 && !done) {
        c.fillStyle = '#2a140a';
        c.beginPath();
        c.arc(r.x, r.y, 2 + p * 3, 0, Math.PI * 2);
        c.fill();
      }
      if (done) {
        c.fillStyle = '#2a140a';
        c.beginPath();
        c.arc(r.x, r.y, 5, 0, Math.PI * 2);
        c.fill();
        // A tick.
        c.strokeStyle = '#7cf0a8';
        c.lineWidth = 5;
        c.lineCap = 'round';
        c.beginPath();
        c.moveTo(r.x + 14, r.y - 26);
        c.lineTo(r.x + 21, r.y - 19);
        c.lineTo(r.x + 34, r.y - 34);
        c.stroke();
        c.lineCap = 'butt';
      } else {
        // A bobbing arrow above it.
        const by = r.y - 44 + Math.sin(clock * 5 + i) * 5;
        c.fillStyle = '#9fe0ff';
        c.strokeStyle = 'rgba(4,8,16,0.8)';
        c.lineWidth = 3;
        c.beginPath();
        c.moveTo(r.x, by + 14);
        c.lineTo(r.x - 11, by);
        c.lineTo(r.x - 4, by);
        c.lineTo(r.x - 4, by - 10);
        c.lineTo(r.x + 4, by - 10);
        c.lineTo(r.x + 4, by);
        c.lineTo(r.x + 11, by);
        c.closePath();
        c.stroke();
        c.fill();
      }
      // The drill ring.
      if (p > 0 && !done) {
        c.lineWidth = 7;
        c.strokeStyle = 'rgba(4, 8, 16, 0.6)';
        c.beginPath();
        c.arc(r.x, r.y, 32, 0, Math.PI * 2);
        c.stroke();
        c.strokeStyle = '#ffb36b';
        c.beginPath();
        c.arc(r.x, r.y, 32, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2);
        c.stroke();
      }
    }

    function drawLab(c: CanvasRenderingContext2D): void {
      const pulse = 0.5 + Math.sin(clock * 3) * 0.5;
      c.strokeStyle = `rgba(124, 240, 168, ${0.45 + pulse * 0.4})`;
      c.lineWidth = 4;
      c.setLineDash([12, 8]);
      c.lineDashOffset = -clock * 20;
      c.beginPath();
      c.arc(LAB.x, LAB.y, LAB.r, 0, Math.PI * 2);
      c.stroke();
      c.setLineDash([]);
      c.fillStyle = 'rgba(124, 240, 168, 0.1)';
      c.fill();
      // The lab: a white module with a dish and solar wings.
      const x = LAB.x - 30;
      const y = LAB.y - 26;
      c.fillStyle = 'rgba(40, 14, 6, 0.4)';
      c.fillRect(x + 6, y + 8, 64, 50);
      c.fillStyle = '#2f5fa8';
      c.fillRect(x - 26, y + 14, 24, 26);
      c.fillRect(x + 62, y + 14, 24, 26);
      c.strokeStyle = 'rgba(200, 230, 255, 0.5)';
      c.lineWidth = 1;
      for (const sx of [x - 26, x + 62]) {
        c.strokeRect(sx, y + 14, 24, 26);
        c.beginPath();
        c.moveTo(sx + 12, y + 14);
        c.lineTo(sx + 12, y + 40);
        c.stroke();
      }
      const mg = c.createLinearGradient(x, y, x + 60, y + 52);
      mg.addColorStop(0, '#ffffff');
      mg.addColorStop(1, '#b9c6d6');
      c.fillStyle = mg;
      c.beginPath();
      c.roundRect(x, y, 60, 52, 8);
      c.fill();
      c.fillStyle = '#ffb36b';
      c.fillRect(x + 6, y + 40, 48, 5);
      c.fillStyle = scan >= 0 ? '#7cf0a8' : '#4fa3ff';
      c.beginPath();
      c.arc(x + 46, y + 14, 5, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = '#d9e3ee';
      c.lineWidth = 3;
      c.beginPath();
      c.arc(x + 18, y + 18, 10, Math.PI * 0.8, Math.PI * 1.9);
      c.stroke();
      bigText(c, t('minigame.rover.lab'), LAB.x, LAB.y + LAB.r + 14, 18, '#bff7d2');
    }

    function drawRover(c: CanvasRenderingContext2D): void {
      c.save();
      c.translate(rover.x, rover.y);
      c.fillStyle = 'rgba(40, 14, 6, 0.4)';
      c.beginPath();
      c.ellipse(5, 7, 26, 20, rover.a, 0, Math.PI * 2);
      c.fill();
      c.rotate(rover.a);
      const bounce = rover.v > 5 ? Math.sin(clock * 30) * 0.6 : 0;
      // Wheels.
      c.fillStyle = '#26272c';
      for (const wx of [-14, 0, 14]) for (const wy of [-16, 16]) {
        c.beginPath();
        c.roundRect(wx - 5, wy - 4 + (wy > 0 ? bounce : -bounce), 10, 8, 3);
        c.fill();
      }
      // Solar panels.
      c.fillStyle = '#284f8f';
      c.fillRect(-20, -13, 30, 26);
      c.strokeStyle = 'rgba(180, 220, 255, 0.55)';
      c.lineWidth = 1;
      for (const lx of [-10, 0]) { c.beginPath(); c.moveTo(lx, -13); c.lineTo(lx, 13); c.stroke(); }
      c.beginPath(); c.moveTo(-20, 0); c.lineTo(10, 0); c.stroke();
      // Body.
      const bg = c.createLinearGradient(0, -10, 0, 10);
      bg.addColorStop(0, '#ffffff');
      bg.addColorStop(1, '#c4ccd6');
      c.fillStyle = bg;
      c.beginPath();
      c.roundRect(6, -9, 16, 18, 4);
      c.fill();
      c.fillStyle = '#e0a33a';
      c.fillRect(8, -7, 4, 14);
      // Mast and camera head.
      c.fillStyle = '#e9edf2';
      c.beginPath();
      c.arc(18, -5, 4.5, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#1c2a3c';
      c.fillRect(20, -7, 3, 4);
      // The arm reaches out while drilling.
      if (drilling) {
        c.strokeStyle = '#d9dee6';
        c.lineWidth = 4;
        c.beginPath();
        c.moveTo(20, 6);
        c.lineTo(34 + Math.sin(clock * 50), 8);
        c.stroke();
        c.fillStyle = '#ffb36b';
        c.beginPath();
        c.arc(36, 8, 4, 0, Math.PI * 2);
        c.fill();
      }
      // Carried samples: little tubes on the deck.
      for (let i = 0; i < mission.carried; i++) {
        c.fillStyle = '#ffd27a';
        c.fillRect(-17 + i * 7, -8, 4, 16);
      }
      c.restore();
    }

    function drawStatus(c: CanvasRenderingContext2D): void {
      c.fillStyle = 'rgba(8, 12, 22, 0.78)';
      c.fillRect(0, 0, LW, TOP - 6);
      c.fillStyle = 'rgba(255, 179, 107, 0.6)';
      c.fillRect(0, TOP - 7, LW, 2);
      c.textBaseline = 'middle';
      // Battery.
      c.font = '800 17px system-ui, sans-serif';
      c.textAlign = 'left';
      c.fillStyle = '#ffffff';
      c.fillText(t('minigame.rover.battery'), 18, 26);
      const bw = 190;
      const color = battery < 0.2 ? '#ff7a4d' : battery < 0.45 ? '#ffd24a' : '#7cf0a8';
      drawBar(c, 112, 15, bw, 22, battery, color);
      const charging = battery < 1 && rover.v < 5 && !drilling && state === 'play' && intro <= 0;
      if (charging) {
        const sx = 112 + bw + 22;
        c.fillStyle = '#ffd24a';
        c.globalAlpha = 0.6 + Math.sin(clock * 6) * 0.4;
        c.beginPath();
        c.arc(sx, 26, 7, 0, Math.PI * 2);
        c.fill();
        c.strokeStyle = '#ffd24a';
        c.lineWidth = 2;
        for (let k = 0; k < 8; k++) {
          const a = (k / 8) * Math.PI * 2 + clock;
          c.beginPath();
          c.moveTo(sx + Math.cos(a) * 10, 26 + Math.sin(a) * 10);
          c.lineTo(sx + Math.cos(a) * 14, 26 + Math.sin(a) * 14);
          c.stroke();
        }
        c.globalAlpha = 1;
        c.font = '700 14px system-ui, sans-serif';
        c.fillStyle = '#ffe27a';
        c.fillText(t('minigame.rover.charging'), sx + 20, 26);
      }
      // Samples: empty, carried, studied.
      c.font = '800 17px system-ui, sans-serif';
      c.fillStyle = '#ffffff';
      c.textAlign = 'right';
      c.fillText(t('minigame.rover.samples'), 590, 26);
      for (let i = 0; i < mission.count; i++) {
        const x = 606 + i * 30;
        const studied = i < mission.studied;
        const carried = !studied && i < mission.studied + mission.carried;
        c.fillStyle = studied ? '#7cf0a8' : carried ? '#ffd27a' : 'rgba(255,255,255,0.12)';
        c.strokeStyle = 'rgba(255,255,255,0.7)';
        c.lineWidth = 2;
        c.beginPath();
        c.roundRect(x, 10, 16, 32, 8);
        c.fill();
        c.stroke();
        if (studied) {
          c.strokeStyle = '#0b2a18';
          c.lineWidth = 3;
          c.beginPath();
          c.moveTo(x + 3, 27);
          c.lineTo(x + 7, 31);
          c.lineTo(x + 13, 22);
          c.stroke();
        }
      }
      // Time.
      c.font = '800 17px system-ui, sans-serif';
      c.textAlign = 'left';
      c.fillStyle = '#ffffff';
      c.fillText(t('minigames.time'), 726, 26);
      const left = 1 - time / ROVER_TIME;
      drawBar(c, 784, 15, 196, 22, left, left < 0.2 ? '#ff9a4d' : '#4fa3ff');
    }

    /** An arrow by the rover pointing to where to go next. */
    function drawGuide(c: CanvasRenderingContext2D): void {
      let goal: { x: number; y: number } | null = null;
      const left = rocks.filter((_, i) => !mission.sampled[i]);
      if (mission.carried > 0 && left.length === 0) goal = LAB;
      else {
        let best = Infinity;
        for (const r of left) {
          const d = Math.hypot(r.x - rover.x, r.y - rover.y);
          if (d < best) { best = d; goal = r; }
        }
      }
      if (!goal) return;
      const d = Math.hypot(goal.x - rover.x, goal.y - rover.y);
      if (d < 80) return;
      const a = Math.atan2(goal.y - rover.y, goal.x - rover.x);
      const x = rover.x + Math.cos(a) * 46;
      const y = rover.y + Math.sin(a) * 46;
      c.save();
      c.translate(x, y);
      c.rotate(a);
      c.globalAlpha = 0.65 + Math.sin(clock * 5) * 0.25;
      c.fillStyle = goal === LAB ? '#7cf0a8' : '#9fe0ff';
      c.beginPath();
      c.moveTo(10, 0);
      c.lineTo(-6, -8);
      c.lineTo(-2, 0);
      c.lineTo(-6, 8);
      c.closePath();
      c.fill();
      c.restore();
    }

    function draw(): void {
      view = fitView(canvas, LW, LH);
      if (!view) return;
      const v = view;
      const { c } = v;
      c.fillStyle = '#5a2412';
      c.fillRect(0, 0, v.cw, v.ch);
      c.save();
      enter(v);
      if (shake > 0) c.translate((Math.random() - 0.5) * 8 * shake, (Math.random() - 0.5) * 8 * shake);
      const want = Math.min(2.5, v.scale * (window.devicePixelRatio || 1));
      if (!terrain || Math.abs(want - terrainScale) > 0.25) {
        terrainScale = want;
        terrain = paintTerrain(want);
      }
      c.drawImage(terrain, 0, 0, LW, LH);
      // Wheel tracks.
      c.fillStyle = 'rgba(80, 30, 12, 0.32)';
      for (const tr of tracks) {
        const nx = -Math.sin(tr.a) * 14;
        const ny = Math.cos(tr.a) * 14;
        c.fillRect(tr.x + nx - 2, tr.y + ny - 2, 4, 4);
        c.fillRect(tr.x - nx - 2, tr.y - ny - 2, 4, 4);
      }
      drawLab(c);
      rocks.forEach((_, i) => drawRock(c, i));
      // Where a click sent the rover.
      if (target) {
        c.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        c.lineWidth = 2.5;
        c.beginPath();
        c.arc(target.x, target.y, 10 + Math.sin(clock * 8) * 3, 0, Math.PI * 2);
        c.stroke();
      }
      if (state === 'play') drawGuide(c);
      drawRover(c);
      // Scanning beam at the lab.
      if (scan >= 0) {
        const k = scan / SCAN_TIME;
        const y = rover.y - 26 + ((k * 3) % 1) * 52;
        c.fillStyle = 'rgba(124, 240, 168, 0.25)';
        c.fillRect(rover.x - 30, rover.y - 26, 60, 52);
        c.fillStyle = '#7cf0a8';
        c.fillRect(rover.x - 34, y - 2, 68, 4);
        c.lineWidth = 6;
        c.strokeStyle = '#7cf0a8';
        c.beginPath();
        c.arc(rover.x, rover.y, 40, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2);
        c.stroke();
      }
      parts.draw(c);
      words.draw(c);
      // A light dust haze.
      c.fillStyle = 'rgba(255, 170, 110, 0.05)';
      c.fillRect(0, 0, LW, LH);
      drawStatus(c);
      if (intro > 0 && state === 'play') bigText(c, t(intro > 0.45 ? 'minigames.ready' : 'minigames.go'), LW / 2, LH / 2, 64);
      if (emptyLock && state === 'play') bigText(c, t('minigame.rover.empty'), LW / 2, 110, 34, '#ffb36b');
      if (state === 'won' && endT > 0.3) bigText(c, t('minigame.rover.done'), LW / 2, LH / 2 - 20, 54, '#ffe27a');
      if (state === 'lost') bigText(c, t('minigame.rover.timeUp'), LW / 2, LH / 2 - 20, 56, '#ffb36b');
      c.restore();
    }

    // ---- Input ----
    const point = (e: PointerEvent) => {
      const p = toLogical(view, canvas, e);
      target = { x: clamp(p.x, 22, LW - 22), y: clamp(p.y, TOP + 18, LH - 18) };
    };
    const down = (e: PointerEvent) => {
      if (state !== 'play') return;
      canvas.focus();
      dragging = true;
      try { canvas.setPointerCapture(e.pointerId); } catch { /* not a live pointer */ }
      point(e);
    };
    const move = (e: PointerEvent) => { if (dragging && state === 'play') point(e); };
    const up = () => { dragging = false; };
    const drillDown = (e: PointerEvent) => {
      e.preventDefault();
      drillHeld = true;
      try { drillButton.setPointerCapture(e.pointerId); } catch { /* not a live pointer */ }
    };
    const drillUp = () => { drillHeld = false; };
    const key = (e: KeyboardEvent, isDown: boolean) => {
      const k = e.key.toLowerCase();
      if (k === 'arrowleft' || k === 'a') keys.left = isDown;
      else if (k === 'arrowright' || k === 'd') keys.right = isDown;
      else if (k === 'arrowup' || k === 'w') keys.up = isDown;
      else if (k === 'arrowdown' || k === 's') keys.down = isDown;
      else if (k === ' ' || k === 'spacebar') drillKey = isDown;
      else if (!GAME_KEYS.has(e.key)) return;
      e.preventDefault();
    };
    const kd = (e: KeyboardEvent) => key(e, true);
    const ku = (e: KeyboardEvent) => key(e, false);
    const blur = () => { keys.up = keys.down = keys.left = keys.right = false; drillKey = drillHeld = false; };
    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    drillButton.addEventListener('pointerdown', drillDown);
    drillButton.addEventListener('pointerup', drillUp);
    drillButton.addEventListener('pointercancel', drillUp);
    drillButton.addEventListener('lostpointercapture', drillUp);
    drillButton.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    window.addEventListener('blur', blur);
    cleanup = () => {
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', up);
      canvas.removeEventListener('pointercancel', up);
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup', ku);
      window.removeEventListener('blur', blur);
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
    },
  };
};
