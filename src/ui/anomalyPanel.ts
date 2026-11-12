import { playEffect } from '../audio/sfx';
import { type Anomaly, type AnomalyAnswer, type AnomalyKind, lostDaysFor } from '../game/anomalies';
import { t } from '../strings';
import { antennaView } from './antennaView';
import { eclipseView } from './eclipseView';
import { formatNumber } from './format';
import { type MiniGameMaker, type MiniGameView, button, el } from './miniGame';
import { panelView } from './panelView';

/**
 * The Anomaly mini-game, over the Launch show: what went wrong, how to play, the game itself, then the
 * score and the Data it cost. The first of each kind must be played; later ones offer a skip that takes the
 * best past score. Each kind's game lives in its own view (antennaView, panelView, eclipseView).
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

const VIEWS: Record<AnomalyKind, MiniGameMaker> = { antenna: antennaView, panel: panelView, eclipse: eclipseView };

/** "No Data was lost." / "1 day of Data was lost." / "3 days of Data were lost." */
export function lostText(days: number): string {
  if (days <= 0) return t('anomaly.lost.none');
  if (days === 1) return t('anomaly.lost.one');
  return t('anomaly.lost.many', { days: formatNumber(days) });
}

export const percentText = (score: number): string => formatNumber(Math.round(score * 100));

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
  const meter = el('span', 'anomaly-signal');
  const meterLabel = el('span', '');
  const meterTrack = el('span', 'anomaly-signal-track');
  const meterFill = el('span', 'anomaly-signal-fill');
  meterTrack.append(meterFill);
  meter.append(meterLabel, meterTrack);
  status.append(timeLeft, meter);
  const line = el('p', 'anomaly-line');
  const controls = el('div', 'anomaly-game-controls');
  const result = el('p', 'anomaly-result');
  result.setAttribute('aria-live', 'polite');
  const note = el('p', 'anomaly-note', t('anomaly.mustPlay'));
  const buttons = el('div', 'anomaly-buttons');
  const start = button('anomaly-start', t('anomaly.start'));
  const skip = button('small anomaly-skip', '');
  const carryOn = button('anomaly-start', t('anomaly.carryOn'));
  buttons.append(skip, start, carryOn);
  panel.append(label, title, intro, how, canvas, status, line, controls, result, note, buttons);
  backdrop.append(panel);
  root.append(backdrop);

  let anomaly: Anomaly | null = null;
  let hooks: AnomalyHooks | null = null;
  let game: MiniGameView | null = null;
  let phase: 'intro' | 'play' | 'result' = 'intro';
  let frame = 0;
  let last = 0;

  const setPhase = (p: typeof phase) => {
    phase = p;
    how.hidden = p !== 'intro';
    start.hidden = p !== 'intro';
    skip.hidden = p !== 'intro' || hooks?.best === null;
    note.hidden = p !== 'intro' || hooks?.best !== null;
    status.hidden = p === 'intro';
    line.hidden = p !== 'play' || !line.textContent;
    controls.hidden = p !== 'play' || controls.childElementCount === 0;
    result.hidden = p !== 'result';
    carryOn.hidden = p !== 'result';
  };

  const updateStatus = () => {
    if (!game) return;
    const s = game.status();
    timeLeft.textContent = s.time;
    timeLeft.classList.toggle('warn', s.warn);
    meterLabel.textContent = s.meterLabel;
    meterFill.style.width = `${Math.max(0, Math.min(1, s.meter)) * 100}%`;
    line.textContent = s.line ?? '';
    line.classList.toggle('warn', !!s.lineWarn);
    line.hidden = phase !== 'play' || !s.line;
  };

  const finish = () => {
    if (!anomaly || !hooks || !game) return;
    const score = game.score();
    const head = game.result();
    result.textContent = `${head.text} ${t('anomaly.score', { score: percentText(score), lost: lostText(lostDaysFor(anomaly, score)) })}`;
    result.classList.toggle('warn', !head.won);
    playEffect(head.won ? 'reward' : 'denied');
    hooks.onAnswer(score, 'played');
    setPhase('result');
    carryOn.focus();
  };

  const tick = (now: number) => {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (game) {
      if (phase === 'play') {
        game.step(dt);
        updateStatus();
        if (game.over()) finish();
      }
      game.draw(canvas, dt);
    }
    frame = requestAnimationFrame(tick);
  };

  const close = () => {
    if (backdrop.hidden) return;
    cancelAnimationFrame(frame);
    frame = 0;
    backdrop.hidden = true;
    controls.replaceChildren();
    game = null;
    const h = hooks;
    anomaly = null;
    hooks = null;
    h?.onClose();
  };

  const onPointer = (e: PointerEvent) => {
    if (phase === 'play') game?.pointer?.(e, canvas);
  };
  canvas.addEventListener('pointermove', onPointer);
  canvas.addEventListener('pointerdown', onPointer);

  const onKey = (e: KeyboardEvent, down: boolean) => {
    if (backdrop.hidden || phase !== 'play' || !game?.key) return;
    if (game.key(e, down)) e.preventDefault();
  };
  window.addEventListener('keydown', (e) => onKey(e, true));
  window.addEventListener('keyup', (e) => onKey(e, false));

  start.addEventListener('click', () => {
    if (!anomaly) return;
    // A fresh game, so what moved on the intro doesn't count.
    game = VIEWS[anomaly.kind](anomaly);
    controls.replaceChildren(...(game.controls ? [game.controls] : []));
    setPhase('play');
    updateStatus();
    (game.focus ?? canvas).focus();
  });
  carryOn.addEventListener('click', close);

  const api: AnomalyPanel = {
    open(a, h) {
      anomaly = a;
      hooks = h;
      game = VIEWS[a.kind](a);
      controls.replaceChildren();
      title.textContent = t(`anomaly.${a.kind}.name`);
      intro.textContent = t(`anomaly.${a.kind}.intro`, { day: formatNumber(a.day) });
      how.textContent = t(`anomaly.${a.kind}.how`);
      if (h.best !== null) skip.textContent = t('anomaly.skip', { score: percentText(h.best) });
      setPhase('intro');
      backdrop.hidden = false;
      playEffect('alarm');
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
