import { type Anomaly, type AnomalyAnswer, lostDaysFor } from '../game/anomalies';
import {
  ANTENNA_HOLD_S,
  ANTENNA_TIME_S,
  AIM_MAX_DEG,
  type AntennaGame,
  BEAM_HALF_DEG,
  aimAt,
  antennaScore,
  newAntennaGame,
  onStation,
  stationDeg,
  stepAntenna,
} from '../game/antennaGame';
import { t } from '../strings';
import { formatDecimal, formatNumber } from './format';

/**
 * The Anomaly mini-game, over the Launch show: what went wrong, how to play, the game itself, then the
 * score and the Data it cost. The first of each kind must be played; later ones offer a skip that takes the
 * best past score.
 */

export interface AnomalyHooks {
  /** Best past score (0–1), or null when the Company has never played this kind: then it can't be skipped. */
  best: number | null;
  /** The player finished or skipped it: settle it now. */
  onAnswer(score: number, answer: Exclude<AnomalyAnswer, 'unanswered'>): void;
  /** The panel closed: carry on with the show. */
  onClose(): void;
}

export interface AnomalyPanel {
  open(anomaly: Anomaly, hooks: AnomalyHooks): void;
  /** Skip it, if this one may be skipped. True if the panel closed. */
  trySkip(): boolean;
  readonly isOpen: boolean;
}

/** Degrees a second the antenna's aim moves while ← or → is held. */
const KEY_TURN_DEG_S = 90;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  e.className = className;
  if (text) e.textContent = text;
  return e;
}

function button(className: string, text: string): HTMLButtonElement {
  const b = el('button', className, text);
  b.type = 'button';
  return b;
}

/** "No Data was lost." / "1 day of Data was lost." / "3 days of Data were lost." */
export function lostText(days: number): string {
  if (days <= 0) return t('anomaly.lost.none');
  if (days === 1) return t('anomaly.lost.one');
  return t('anomaly.lost.many', { days: formatNumber(days) });
}

export const percentText = (score: number): string => formatNumber(Math.round(score * 100));

const rad = (deg: number) => (deg * Math.PI) / 180;

/** Where a ray from (x, y) going `deg` from straight down first meets a circle, or null if it misses. */
function hitCircle(x: number, y: number, deg: number, cx: number, cy: number, r: number): { x: number; y: number } | null {
  const dx = Math.sin(rad(deg));
  const dy = Math.cos(rad(deg));
  const fx = x - cx;
  const fy = y - cy;
  const b = fx * dx + fy * dy;
  const c = fx * fx + fy * fy - r * r;
  const disc = b * b - c;
  if (disc < 0) return null;
  const d = -b - Math.sqrt(disc);
  return d > 0 ? { x: x + dx * d, y: y + dy * d } : null;
}

/** Fixed stars for the background, as shares of the canvas. */
const STARS = Array.from({ length: 70 }, (_, i) => ({ x: ((i * 0.6180339887) % 1), y: ((i * 0.7548776662) % 1) * 0.7, r: (i % 3) * 0.4 + 0.5 }));

function drawScene(canvas: HTMLCanvasElement, g: AntennaGame, earthTurn: number): void {
  const ratio = window.devicePixelRatio || 1;
  const w = Math.round(canvas.clientWidth * ratio);
  const h = Math.round(canvas.clientHeight * ratio);
  if (w === 0 || h === 0) return;
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  const c = canvas.getContext('2d');
  if (!c) return;
  c.fillStyle = '#030814';
  c.fillRect(0, 0, w, h);
  c.fillStyle = 'rgba(220, 232, 250, 0.7)';
  for (const s of STARS) {
    c.beginPath();
    c.arc(s.x * w, s.y * h, s.r * ratio, 0, Math.PI * 2);
    c.fill();
  }

  // Earth fills the bottom; the Spacecraft hangs above the middle.
  const r = w * 1.1;
  const cx = w / 2;
  const cy = h * 0.72 + r;
  const sx = w / 2;
  const sy = h * 0.2;
  const glow = c.createRadialGradient(cx, cy, r * 0.98, cx, cy, r * 1.04);
  glow.addColorStop(0, 'rgba(110, 170, 255, 0.5)');
  glow.addColorStop(1, 'rgba(110, 170, 255, 0)');
  c.fillStyle = glow;
  c.beginPath();
  c.arc(cx, cy, r * 1.04, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#2a6fb5';
  c.beginPath();
  c.arc(cx, cy, r, 0, Math.PI * 2);
  c.fill();
  // Land drifting by as Earth turns: a few patches along the curve.
  c.save();
  c.beginPath();
  c.arc(cx, cy, r, 0, Math.PI * 2);
  c.clip();
  c.fillStyle = '#4c8a42';
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i - 2.5) * 0.16 - earthTurn;
    const px = cx + Math.cos(a) * r;
    const py = cy + Math.sin(a) * r;
    c.beginPath();
    c.ellipse(px, py, w * (0.05 + (i % 2) * 0.03), h * 0.07, a + Math.PI / 2, 0, Math.PI * 2);
    c.fill();
  }
  c.restore();

  // The Ground Station: a dish on the ground where the station's direction meets Earth.
  const st = hitCircle(sx, sy, stationDeg(g, g.elapsedS), cx, cy, r);
  if (st) {
    const up = Math.atan2(st.y - cy, st.x - cx);
    c.save();
    c.translate(st.x, st.y);
    c.rotate(up + Math.PI / 2);
    c.fillStyle = '#dfe7f2';
    c.fillRect(-2 * ratio, -10 * ratio, 4 * ratio, 10 * ratio);
    c.beginPath();
    c.arc(0, -12 * ratio, 9 * ratio, Math.PI, 0);
    c.closePath();
    c.fill();
    c.restore();
    c.fillStyle = '#dfe7f2';
    c.font = `${12 * ratio}px system-ui, sans-serif`;
    c.textAlign = 'center';
    c.fillText(t('anomaly.antenna.station'), st.x, st.y + 22 * ratio);
  }

  // The beam: a wedge from the antenna, bright while it covers the station.
  const on = onStation(g);
  const len = Math.hypot(w, h);
  c.fillStyle = on ? 'rgba(79, 163, 255, 0.35)' : 'rgba(255, 179, 107, 0.18)';
  c.beginPath();
  c.moveTo(sx, sy);
  for (const d of [g.aimDeg - BEAM_HALF_DEG, g.aimDeg + BEAM_HALF_DEG]) c.lineTo(sx + Math.sin(rad(d)) * len, sy + Math.cos(rad(d)) * len);
  c.closePath();
  c.fill();

  // The Spacecraft: a long body with the antenna pointing along the beam.
  c.save();
  c.translate(sx, sy);
  c.rotate(-rad(g.aimDeg));
  c.fillStyle = '#c9d3df';
  c.fillRect(-7 * ratio, -22 * ratio, 14 * ratio, 30 * ratio);
  c.fillStyle = '#8a97a8';
  c.fillRect(-7 * ratio, -22 * ratio, 14 * ratio, 6 * ratio);
  c.strokeStyle = '#e8eef7';
  c.lineWidth = 2 * ratio;
  c.beginPath();
  c.moveTo(0, 8 * ratio);
  c.lineTo(0, 24 * ratio);
  c.stroke();
  c.fillStyle = on ? '#4fa3ff' : '#ffb36b';
  c.beginPath();
  c.arc(0, 26 * ratio, 4 * ratio, 0, Math.PI * 2);
  c.fill();
  c.restore();
}

export function showAnomalyPanel(root: HTMLElement): AnomalyPanel {
  const backdrop = el('div', 'anomaly');
  backdrop.hidden = true;
  const panel = el('div', 'anomaly-panel');
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-labelledby', 'anomaly-title');
  const label = el('p', 'anomaly-label', t('anomaly.label'));
  const title = el('h2', 'anomaly-title');
  title.id = 'anomaly-title';
  const intro = el('p', 'anomaly-intro');
  const how = el('p', 'anomaly-how');
  const canvas = el('canvas', 'anomaly-canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.tabIndex = -1;
  const status = el('div', 'anomaly-status');
  const timeLeft = el('span', 'anomaly-time');
  timeLeft.setAttribute('aria-live', 'polite');
  const signal = el('span', 'anomaly-signal');
  const signalTrack = el('span', 'anomaly-signal-track');
  const signalFill = el('span', 'anomaly-signal-fill');
  signalTrack.append(signalFill);
  signal.append(el('span', '', t('anomaly.antenna.signal')), signalTrack);
  status.append(timeLeft, signal);
  const result = el('p', 'anomaly-result');
  result.setAttribute('aria-live', 'polite');
  const note = el('p', 'anomaly-note', t('anomaly.mustPlay'));
  const buttons = el('div', 'anomaly-buttons');
  const start = button('anomaly-start', t('anomaly.start'));
  const skip = button('small anomaly-skip', '');
  const carryOn = button('anomaly-start', t('anomaly.carryOn'));
  buttons.append(skip, start, carryOn);
  panel.append(label, title, intro, how, canvas, status, result, note, buttons);
  backdrop.append(panel);
  root.append(backdrop);

  let anomaly: Anomaly | null = null;
  let hooks: AnomalyHooks | null = null;
  let game: AntennaGame = newAntennaGame();
  let phase: 'intro' | 'play' | 'result' = 'intro';
  let frame = 0;
  let last = 0;
  let earthTurn = 0;
  const held = { left: false, right: false };

  const setPhase = (p: typeof phase) => {
    phase = p;
    how.hidden = p !== 'intro';
    start.hidden = p !== 'intro';
    skip.hidden = p !== 'intro' || hooks?.best === null;
    note.hidden = p !== 'intro' || hooks?.best !== null;
    status.hidden = p === 'intro';
    result.hidden = p !== 'result';
    carryOn.hidden = p !== 'result';
  };

  const updateStatus = () => {
    timeLeft.textContent = t('anomaly.antenna.timeLeft', { s: formatNumber(Math.ceil(ANTENNA_TIME_S - game.elapsedS)) });
    timeLeft.classList.toggle('warn', ANTENNA_TIME_S - game.elapsedS < 5);
    signalFill.style.width = `${(game.lockS / ANTENNA_HOLD_S) * 100}%`;
  };

  const finish = () => {
    if (!anomaly || !hooks) return;
    const score = antennaScore(game);
    const head = game.state === 'won' ? t('anomaly.antenna.won', { s: formatDecimal(game.lockedAtS ?? 0) }) : t('anomaly.antenna.lost');
    result.textContent = `${head} ${t('anomaly.score', { score: percentText(score), lost: lostText(lostDaysFor(anomaly, score)) })}`;
    result.classList.toggle('warn', game.state !== 'won');
    hooks.onAnswer(score, 'played');
    setPhase('result');
    carryOn.focus();
  };

  const tick = (now: number) => {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    earthTurn += dt * 0.02;
    if (phase === 'play') {
      const keys = (held.right ? 1 : 0) - (held.left ? 1 : 0);
      if (keys !== 0) aimAt(game, game.wantDeg + keys * KEY_TURN_DEG_S * dt);
      stepAntenna(game, dt);
      updateStatus();
      if (game.state !== 'playing') finish();
    }
    drawScene(canvas, game, earthTurn);
    frame = requestAnimationFrame(tick);
  };

  const close = () => {
    if (backdrop.hidden) return;
    cancelAnimationFrame(frame);
    frame = 0;
    backdrop.hidden = true;
    held.left = held.right = false;
    const h = hooks;
    anomaly = null;
    hooks = null;
    h?.onClose();
  };

  // Aim with the mouse (or a finger): the antenna turns towards the pointer.
  const aimFromPointer = (e: PointerEvent) => {
    if (phase !== 'play') return;
    const box = canvas.getBoundingClientRect();
    const dx = e.clientX - (box.left + box.width / 2);
    const dy = e.clientY - (box.top + box.height * 0.2);
    aimAt(game, Math.max(-AIM_MAX_DEG, Math.min(AIM_MAX_DEG, (Math.atan2(dx, Math.max(1, dy)) * 180) / Math.PI)));
  };
  canvas.addEventListener('pointermove', aimFromPointer);
  canvas.addEventListener('pointerdown', aimFromPointer);

  const onKey = (e: KeyboardEvent, down: boolean) => {
    if (backdrop.hidden) return;
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') held.left = down;
    else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') held.right = down;
    else return;
    e.preventDefault();
  };
  window.addEventListener('keydown', (e) => onKey(e, true));
  window.addEventListener('keyup', (e) => onKey(e, false));

  start.addEventListener('click', () => {
    game = newAntennaGame(game.drift);
    setPhase('play');
    updateStatus();
    canvas.focus();
  });
  carryOn.addEventListener('click', close);

  const api: AnomalyPanel = {
    open(a, h) {
      anomaly = a;
      hooks = h;
      game = newAntennaGame(a.day % 2 === 0 ? -1 : 1);
      title.textContent = t('anomaly.antenna.name');
      intro.textContent = t('anomaly.antenna.intro', { day: formatNumber(a.day) });
      how.textContent = t('anomaly.antenna.how');
      if (h.best !== null) skip.textContent = t('anomaly.skip', { score: percentText(h.best) });
      setPhase('intro');
      backdrop.hidden = false;
      start.focus();
      last = performance.now();
      frame = requestAnimationFrame(tick);
    },
    trySkip() {
      if (backdrop.hidden || !hooks) return false;
      if (phase === 'result') {
        close();
        return true;
      }
      if (hooks.best === null) {
        note.hidden = false;
        note.classList.remove('flash');
        void note.offsetWidth;
        note.classList.add('flash');
        return false;
      }
      hooks.onAnswer(hooks.best, 'skipped');
      close();
      return true;
    },
    get isOpen() {
      return !backdrop.hidden;
    },
  };
  skip.addEventListener('click', () => api.trySkip());
  return api;
}
