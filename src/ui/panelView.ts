import { PANEL_TIME_S, type PanelGame, goodMoment, newPanelGame, panelScore, pushPanel, stepPanel, swingPeak } from '../game/panelGame';
import { t } from '../strings';
import { drawEarthBelow } from './antennaView';
import { formatDecimal, formatNumber } from './format';
import { type MiniGameMaker, button, canvas2d, drawSpace, el } from './miniGame';

/**
 * Stuck solar panel on screen: the Spacecraft from the side, one panel open and the other caught on its hinge,
 * swinging. The panel glows green at the best moment to push; each push flashes the thruster and says whether
 * it went with the swing or against it.
 */

/** Seconds the "with/against the swing" word stays up after a push. */
const SAY_S = 0.7;

function drawScene(canvas: HTMLCanvasElement, g: PanelGame, earthTurn: number, flame: number, said: { text: string; good: boolean; age: number } | null): void {
  const frame = canvas2d(canvas);
  if (!frame) return;
  const { c, w, h, ratio } = frame;
  drawSpace(c, w, h, ratio);
  drawEarthBelow(c, w, h, earthTurn);

  const u = Math.min(w, h) / 300;
  const bx = w / 2;
  const by = h * 0.36;
  const bodyW = 46 * u;
  const bodyH = 58 * u;
  const panelLen = 110 * u;
  const panelThick = 9 * u;

  const drawPanel = (angleFromDown: number, side: 1 | -1, glow: boolean) => {
    c.save();
    c.translate(bx + (side * bodyW) / 2, by - bodyH / 2 + 6 * u);
    c.rotate(-side * angleFromDown);
    if (glow) {
      c.shadowColor = '#7ee07e';
      c.shadowBlur = 16 * ratio;
    }
    c.fillStyle = glow ? '#3f8f5a' : '#2c4f8a';
    c.fillRect(-panelThick / 2, 0, panelThick, panelLen);
    c.shadowBlur = 0;
    c.strokeStyle = glow ? '#9cf09c' : '#6f93c9';
    c.lineWidth = 1 * ratio;
    for (let i = 1; i < 5; i++) {
      c.beginPath();
      c.moveTo(-panelThick / 2, (panelLen * i) / 5);
      c.lineTo(panelThick / 2, (panelLen * i) / 5);
      c.stroke();
    }
    c.restore();
  };

  // The good panel, fully open to the left.
  drawPanel(Math.PI / 2, -1, false);
  // Where the stuck one latches: a faint outline straight out to the right.
  c.save();
  c.setLineDash([5 * ratio, 5 * ratio]);
  c.strokeStyle = 'rgba(232, 238, 247, 0.35)';
  c.lineWidth = 1.5 * ratio;
  c.strokeRect(bx + bodyW / 2, by - bodyH / 2 + 6 * u - panelThick / 2, panelLen, panelThick);
  c.restore();
  // The stuck one, swinging on its hinge (it can swing a little in towards the body, never through it).
  const share = Math.max(-0.08, Math.min(1, g.open));
  drawPanel((share * Math.PI) / 2, 1, goodMoment(g));

  // The body, with the thruster at the bottom left.
  c.fillStyle = '#c9d3df';
  c.fillRect(bx - bodyW / 2, by - bodyH / 2, bodyW, bodyH);
  c.fillStyle = '#8a97a8';
  c.fillRect(bx - bodyW / 2, by - bodyH / 2, bodyW, 8 * u);
  c.fillStyle = '#6b7788';
  c.fillRect(bx - bodyW / 2 - 6 * u, by + bodyH / 2 - 14 * u, 6 * u, 10 * u);
  if (flame > 0) {
    c.fillStyle = `rgba(255, 196, 120, ${flame})`;
    c.beginPath();
    c.moveTo(bx - bodyW / 2 - 6 * u, by + bodyH / 2 - 14 * u);
    c.lineTo(bx - bodyW / 2 - 6 * u - 26 * u * flame, by + bodyH / 2 - 9 * u);
    c.lineTo(bx - bodyW / 2 - 6 * u, by + bodyH / 2 - 4 * u);
    c.closePath();
    c.fill();
  }

  c.font = `600 ${13 * ratio}px system-ui, sans-serif`;
  c.textAlign = 'center';
  if (said) {
    c.fillStyle = said.good ? `rgba(143, 209, 143, ${1 - said.age / SAY_S})` : `rgba(255, 179, 107, ${1 - said.age / SAY_S})`;
    c.fillText(said.text, bx + bodyW / 2 + panelLen / 2, by - bodyH / 2 - 12 * u);
  } else if (goodMoment(g)) {
    c.fillStyle = '#9cf09c';
    c.fillText(t('anomaly.panel.now'), bx + bodyW / 2 + panelLen / 2, by - bodyH / 2 - 12 * u);
  }
}

export const panelView: MiniGameMaker = () => {
  const game = newPanelGame();
  let earthTurn = 0;
  let flame = 0;
  let said: { text: string; good: boolean; age: number } | null = null;

  const push = () => {
    const how = pushPanel(game);
    if (!how) return;
    flame = 1;
    said = { text: t(how === 'out' ? 'anomaly.panel.with' : 'anomaly.panel.against'), good: how === 'out', age: 0 };
  };

  const controls = el('div', 'anomaly-controls');
  const pushButton = button('anomaly-push', t('anomaly.panel.push'));
  pushButton.addEventListener('click', push);
  controls.append(pushButton);

  return {
    controls,
    focus: pushButton,
    status: () => ({
      time: t('anomaly.panel.timeLeft', { s: formatNumber(Math.ceil(PANEL_TIME_S - game.elapsedS)) }),
      warn: PANEL_TIME_S - game.elapsedS < 5,
      meterLabel: t('anomaly.panel.meter'),
      meter: Math.max(0, Math.min(1, swingPeak(game))),
    }),
    step(dt) {
      stepPanel(game, dt);
    },
    draw(canvas, dt) {
      earthTurn += dt * 0.02;
      flame = Math.max(0, flame - dt * 4);
      if (said) {
        said.age += dt;
        if (said.age >= SAY_S) said = null;
      }
      drawScene(canvas, game, earthTurn, flame, said);
    },
    over: () => game.state !== 'playing',
    score: () => panelScore(game),
    result: () =>
      game.state === 'won'
        ? { text: t('anomaly.panel.won', { s: formatDecimal(game.openedAtS ?? 0) }), won: true }
        : { text: t('anomaly.panel.lost'), won: false },
    pointer(e) {
      if (e.type === 'pointerdown') push();
    },
    key(e, down) {
      if (e.key !== ' ' && e.code !== 'Space') return false;
      if (down && !e.repeat) push();
      return true;
    },
  };
};
