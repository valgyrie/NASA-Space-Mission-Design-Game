import {
  COLD_LIMIT_S,
  ECLIPSE_TIME_S,
  type EclipseGame,
  SYSTEMS,
  SYSTEM_W,
  type System,
  eclipseScore,
  lastsS,
  newEclipseGame,
  stepEclipse,
  sunriseInS,
  toggleSystem,
} from '../game/eclipseGame';
import { t } from '../strings';
import { formatDecimal, formatNumber } from './format';
import { type MiniGameMaker, button, canvas2d, drawSpace, el } from './miniGame';

/**
 * Survive the eclipse on screen: the Sun on the right, Earth and its shadow, and the Spacecraft crossing the
 * shadow towards sunrise. Under it, one switch per system with its watts.
 */

function drawScene(canvas: HTMLCanvasElement, g: EclipseGame): void {
  const frame = canvas2d(canvas);
  if (!frame) return;
  const { c, w, h, ratio } = frame;
  drawSpace(c, w, h, ratio, 0.5);

  // The Sun, off to the right.
  const sun = c.createRadialGradient(w * 1.02, h * 0.5, 0, w * 1.02, h * 0.5, w * 0.35);
  sun.addColorStop(0, 'rgba(255, 236, 170, 0.95)');
  sun.addColorStop(0.25, 'rgba(255, 210, 120, 0.35)');
  sun.addColorStop(1, 'rgba(255, 210, 120, 0)');
  c.fillStyle = sun;
  c.fillRect(0, 0, w, h);
  c.fillStyle = 'rgba(255, 236, 170, 0.9)';
  c.font = `600 ${12 * ratio}px system-ui, sans-serif`;
  c.textAlign = 'right';
  c.fillText(t('anomaly.eclipse.sun'), w - 10 * ratio, h * 0.5 - 30 * ratio);

  // Earth, and its shadow stretching away from the Sun.
  const cx = w * 0.58;
  const cy = h * 0.5;
  const r = Math.min(h * 0.26, w * 0.18);
  const orbit = r * 1.55;
  c.fillStyle = 'rgba(0, 0, 0, 0.55)';
  c.fillRect(0, cy - r, cx, r * 2);
  c.fillStyle = 'rgba(160, 175, 200, 0.6)';
  c.textAlign = 'left';
  c.fillText(t('anomaly.eclipse.shadow'), 10 * ratio, cy - r - 8 * ratio);
  const lit = c.createLinearGradient(cx - r, 0, cx + r, 0);
  lit.addColorStop(0, '#0c1f3a');
  lit.addColorStop(0.5, '#1d4f8a');
  lit.addColorStop(1, '#4c8fd6');
  c.fillStyle = lit;
  c.beginPath();
  c.arc(cx, cy, r, 0, Math.PI * 2);
  c.fill();

  // The orbit, and the stretch of it inside the shadow.
  c.strokeStyle = 'rgba(232, 238, 247, 0.25)';
  c.lineWidth = 1.5 * ratio;
  c.beginPath();
  c.arc(cx, cy, orbit, 0, Math.PI * 2);
  c.stroke();
  const edge = Math.asin(r / orbit);
  const from = Math.PI + edge; // where it went into the shadow (top left; y grows down)
  const to = Math.PI - edge; // where it comes out (bottom left)
  const share = Math.min(1, g.elapsedS / ECLIPSE_TIME_S);
  const out = g.state === 'won';
  const angle = from + (to - from) * share + (out ? -0.12 : 0);
  const sx = cx + Math.cos(angle) * orbit;
  const sy = cy + Math.sin(angle) * orbit;

  // The Spacecraft: dark in the shadow, bright again at sunrise; red when it went flat or froze.
  const colour = out ? '#ffd27a' : g.state === 'lost' ? '#d06a5a' : g.on.payload ? '#9fb0c6' : '#6c7a8e';
  c.save();
  c.translate(sx, sy);
  c.rotate(angle + Math.PI / 2);
  c.fillStyle = '#2c4f8a';
  c.fillRect(-26 * ratio, -3 * ratio, 18 * ratio, 6 * ratio);
  c.fillRect(8 * ratio, -3 * ratio, 18 * ratio, 6 * ratio);
  c.fillStyle = colour;
  c.fillRect(-8 * ratio, -8 * ratio, 16 * ratio, 16 * ratio);
  if (out) {
    c.shadowColor = '#ffd27a';
    c.shadowBlur = 14 * ratio;
    c.fillRect(-8 * ratio, -8 * ratio, 16 * ratio, 16 * ratio);
  }
  c.restore();
}

export const eclipseView: MiniGameMaker = (anomaly) => {
  const game = newEclipseGame(anomaly.battery ?? 'largeBattery');
  const controls = el('div', 'anomaly-controls');
  const switches = new Map<System, HTMLButtonElement>();

  const label = (s: System, i: number) =>
    t('anomaly.eclipse.system', {
      key: formatNumber(i + 1),
      name: t(`anomaly.eclipse.${s}`),
      w: formatNumber(SYSTEM_W[s]),
      state: t(s === 'computer' ? 'anomaly.eclipse.always' : game.on[s] ? 'anomaly.eclipse.on' : 'anomaly.eclipse.off'),
    });
  const refresh = () =>
    SYSTEMS.forEach((s, i) => {
      const b = switches.get(s)!;
      b.textContent = label(s, i);
      b.setAttribute('aria-pressed', String(game.on[s]));
    });
  const flip = (s: System) => {
    if (toggleSystem(game, s)) refresh();
  };
  SYSTEMS.forEach((s) => {
    const b = button('anomaly-system', '');
    b.disabled = s === 'computer';
    b.addEventListener('click', () => flip(s));
    switches.set(s, b);
    controls.append(b);
  });
  refresh();

  return {
    controls,
    focus: switches.get('radio'),
    status: () => {
      const cold = !game.on.heaters && game.coldS > 0;
      const lasts = lastsS(game);
      return {
        time: t('anomaly.eclipse.timeLeft', { s: formatNumber(Math.ceil(sunriseInS(game) - 1e-6)) }),
        warn: lasts < sunriseInS(game),
        meterLabel: `${t('anomaly.eclipse.meter')} ${formatNumber(Math.round(game.charge))}%`,
        meter: game.charge / 100,
        line: cold
          ? t('anomaly.eclipse.cold', { s: formatDecimal(Math.max(0, COLD_LIMIT_S - game.coldS)) })
          : lasts >= sunriseInS(game)
            ? t('anomaly.eclipse.lastsAll')
            : t('anomaly.eclipse.lasts', { s: formatDecimal(lasts) }),
        lineWarn: cold || lasts < sunriseInS(game),
      };
    },
    step(dt) {
      stepEclipse(game, dt);
    },
    draw(canvas) {
      drawScene(canvas, game);
    },
    over: () => game.state !== 'playing',
    score: () => eclipseScore(game),
    result: () =>
      game.state === 'won'
        ? { text: t('anomaly.eclipse.won', { s: formatDecimal(game.payloadS), total: formatNumber(ECLIPSE_TIME_S) }), won: true }
        : { text: t(game.lostTo === 'cold' ? 'anomaly.eclipse.frozen' : 'anomaly.eclipse.flat'), won: false },
    key(e, down) {
      const i = ['1', '2', '3', '4'].indexOf(e.key);
      if (i < 0) return false;
      if (down && !e.repeat) flip(SYSTEMS[i]!);
      return true;
    },
  };
};
