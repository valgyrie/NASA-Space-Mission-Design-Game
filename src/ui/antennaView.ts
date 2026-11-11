import {
  AIM_MAX_DEG,
  ANTENNA_HOLD_S,
  ANTENNA_TIME_S,
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
import { type MiniGameMaker, canvas2d, drawSpace } from './miniGame';

/** Point the antenna on screen: Earth below, the Ground Station sliding across, the beam to aim. */

/** Degrees a second the antenna's aim moves while ← or → is held. */
const KEY_TURN_DEG_S = 90;

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

/** Earth filling the bottom of the canvas, with land drifting by as it turns. Returns its centre and radius. */
export function drawEarthBelow(c: CanvasRenderingContext2D, w: number, h: number, earthTurn: number): { cx: number; cy: number; r: number } {
  const r = w * 1.1;
  const cx = w / 2;
  const cy = h * 0.72 + r;
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
  c.save();
  c.beginPath();
  c.arc(cx, cy, r, 0, Math.PI * 2);
  c.clip();
  c.fillStyle = '#4c8a42';
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i - 2.5) * 0.16 - earthTurn;
    c.beginPath();
    c.ellipse(cx + Math.cos(a) * r, cy + Math.sin(a) * r, w * (0.05 + (i % 2) * 0.03), h * 0.07, a + Math.PI / 2, 0, Math.PI * 2);
    c.fill();
  }
  c.restore();
  return { cx, cy, r };
}

function drawScene(canvas: HTMLCanvasElement, g: AntennaGame, earthTurn: number): void {
  const frame = canvas2d(canvas);
  if (!frame) return;
  const { c, w, h, ratio } = frame;
  drawSpace(c, w, h, ratio);
  const { cx, cy, r } = drawEarthBelow(c, w, h, earthTurn);
  const sx = w / 2;
  const sy = h * 0.2;

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

export const antennaView: MiniGameMaker = (anomaly) => {
  const game = newAntennaGame(anomaly.day % 2 === 0 ? -1 : 1);
  const held = { left: false, right: false };
  let earthTurn = 0;
  return {
    controls: null,
    status: () => ({
      time: t('anomaly.antenna.timeLeft', { s: formatNumber(Math.ceil(ANTENNA_TIME_S - game.elapsedS)) }),
      warn: ANTENNA_TIME_S - game.elapsedS < 5,
      meterLabel: t('anomaly.antenna.signal'),
      meter: game.lockS / ANTENNA_HOLD_S,
    }),
    step(dt) {
      const keys = (held.right ? 1 : 0) - (held.left ? 1 : 0);
      if (keys !== 0) aimAt(game, game.wantDeg + keys * KEY_TURN_DEG_S * dt);
      stepAntenna(game, dt);
    },
    draw(canvas, dt) {
      earthTurn += dt * 0.02;
      drawScene(canvas, game, earthTurn);
    },
    over: () => game.state !== 'playing',
    score: () => antennaScore(game),
    result: () =>
      game.state === 'won'
        ? { text: t('anomaly.antenna.won', { s: formatDecimal(game.lockedAtS ?? 0) }), won: true }
        : { text: t('anomaly.antenna.lost'), won: false },
    // Aim with the mouse (or a finger): the antenna turns towards the pointer.
    pointer(e, canvas) {
      const box = canvas.getBoundingClientRect();
      const dx = e.clientX - (box.left + box.width / 2);
      const dy = e.clientY - (box.top + box.height * 0.2);
      aimAt(game, Math.max(-AIM_MAX_DEG, Math.min(AIM_MAX_DEG, (Math.atan2(dx, Math.max(1, dy)) * 180) / Math.PI)));
    },
    key(e, down) {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') held.left = down;
      else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') held.right = down;
      else return false;
      return true;
    },
  };
};
