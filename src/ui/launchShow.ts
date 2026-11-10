import { withContactLost } from '../game/anomalies';
import { type Segment, type ShowMoment, flightShow, secondsAtDay, showAt, stageTimes } from '../game/ascent';
import { CONTRACTS } from '../game/contracts';
import { LAUNCH_VEHICLES } from '../game/launchVehicles';
import type { LaunchResult } from '../game/mission';
import { t } from '../strings';
import type { LaunchView } from '../world/launchView';
import { type AnomalyHooks, showAnomalyPanel } from './anomalyPanel';
import { formatDecimal, formatNumber } from './format';
import { at, drawOrbit } from './testRun';

/**
 * The Launch, played between pressing Launch and the Mission Report: liftoff, staging, orbit, then the
 * Mission's days with its battery and Data. It shows the flight already worked out, so it always ends
 * the way the report says. Draws in 3D, or in a simple 2D view on devices too slow for it.
 */

/** How the show settles an Anomaly met on the way. */
export type ShowAnomalyHooks = Pick<AnomalyHooks, 'best' | 'onAnswer'>;

export interface LaunchShow {
  play(result: LaunchResult, onDone: () => void, anomaly?: ShowAnomalyHooks): void;
  /**
   * Jump to the end: the Mission Report. An Anomaly still ahead is skipped with the best past score, or,
   * the first time, the show jumps to it instead, since that one must be played.
   */
  skip(): void;
  readonly isOpen: boolean;
}

const SPEEDS = [1, 2, 4] as const;
/** Frames to skip before timing (the first ones build things), and frames to time. */
const WARM_UP_FRAMES = 10;
const TIMED_FRAMES = 40;
/** Slower than this per frame (20 per second) and the simple view takes over. */
const SLOW_FRAME_S = 1 / 20;
/** Screen seconds for one lap in the simple orbit view. */
const LAP_SECONDS = 6;

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

/** T−00:03, T+02:35. */
export function clockText(seconds: number): string {
  const whole = Math.floor(Math.abs(seconds));
  const time = `${String(Math.floor(whole / 60)).padStart(2, '0')}:${String(whole % 60).padStart(2, '0')}`;
  return t('launch.clock', { sign: seconds < 0 ? '−' : '+', time });
}

/** The heading and the line under it for a moment of the show. */
export function showText(m: ShowMoment, result: LaunchResult, powered: boolean): { title: string; detail: string } {
  const { report, flight } = result;
  const lv = LAUNCH_VEHICLES[report.vehicle];
  const contract = t(`contract.${report.contract}.name`);
  const vehicle = t(`launchVehicle.${report.vehicle}`);
  const seg = m.segment;
  switch (seg.phase) {
    case 'countdown':
      return {
        title: t('launch.countdown'),
        detail: t(`launch.countdownDetail.${report.vehicle}`, { vehicle, m: formatDecimal(lv.heightM), site: t(`launchSite.${report.site}.short`) }),
      };
    case 'burn': {
      const n = seg.stage ?? 1;
      const stage = lv.stages[n - 1]!;
      const s = formatNumber(stage.burnS);
      if (n === 1) return { title: t('launch.liftoff'), detail: t('launch.firstStage', { s }) };
      const last = n === lv.stages.length;
      const detail =
        stage.motors > 1
          ? t('launch.motors', { count: formatNumber(stage.motors), s })
          : last
            ? t(lv.lastStageStays ? 'launch.motor' : 'launch.lastStage', { s })
            : t('launch.engine', { s });
      return { title: t('launch.stage', { n: formatNumber(n) }), detail };
    }
    case 'coast':
      return { title: t(`launch.coast.${report.vehicle}`), detail: t(`launch.coastDetail.${report.vehicle}`, { s: formatNumber(lv.coastS) }) };
    case 'orbit': {
      const km = CONTRACTS[report.contract].orbitKm;
      return { title: t('launch.orbit'), detail: t('launch.orbitDetail', { contract, low: formatNumber(km.low), high: formatNumber(km.high) }) };
    }
    case 'lost':
      if (seg.stage !== undefined) return { title: t('launch.rocketFailed', { n: formatNumber(seg.stage) }), detail: t('launch.rocketFailedDetail') };
      return { title: t('launch.lost'), detail: t('launch.lostDetail', { vehicle }) };
    case 'mission': {
      const a = report.anomaly;
      const noContact = a !== null && a.score !== null && m.value >= a.day && m.value < a.day + a.lostDays;
      const detail = !powered
        ? t('testRun.powerOut', { day: formatNumber(Math.floor(flight.powerOutDay ?? 0)) })
        : noContact
          ? t('launch.noContact')
          : t('launch.missionDetail');
      return { title: t('launch.mission', { contract }), detail };
    }
    case 'end':
      return { title: t(report.success ? 'launch.done' : 'launch.over'), detail: t('launch.toReport') };
  }
}

/** The simple view of the climb: Earth's curve, the path up and over, and where the rocket is on it. */
function drawClimb(canvas: HTMLCanvasElement, share: number, stages: number[]): void {
  const ratio = window.devicePixelRatio || 1;
  const w = Math.round(canvas.clientWidth * ratio);
  const h = Math.round(canvas.clientHeight * ratio);
  if (w === 0 || h === 0) return;
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  const g = canvas.getContext('2d');
  if (!g) return;
  const sky = g.createLinearGradient(0, 0, 0, h);
  const dark = Math.min(1, share * 2.5);
  sky.addColorStop(0, `rgb(${Math.round(60 * (1 - dark) + 3)}, ${Math.round(120 * (1 - dark) + 6)}, ${Math.round(190 * (1 - dark) + 15)})`);
  sky.addColorStop(1, `rgb(${Math.round(140 * (1 - dark) + 20)}, ${Math.round(196 * (1 - dark) + 40)}, ${Math.round(240 * (1 - dark) + 70)})`);
  g.fillStyle = sky;
  g.fillRect(0, 0, w, h);

  // Earth's curve along the bottom: land to the west of the pad, sea to the east.
  const r = w * 1.6;
  const cx = w / 2;
  const cy = h * 0.82 + r;
  const padX = w * 0.2;
  const start = { x: padX, y: cy - Math.sqrt(r * r - (padX - cx) ** 2) };
  const pad = Math.atan2(start.y - cy, start.x - cx);
  g.fillStyle = '#2a6fb5';
  g.beginPath();
  g.arc(cx, cy, r, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#4c8a42';
  g.beginPath();
  g.moveTo(cx, cy);
  g.arc(cx, cy, r, Math.PI, pad + 0.01);
  g.closePath();
  g.fill();

  // The path: up from the pad, leaning east, flattening out at the top.
  const bend = { x: w * 0.3, y: h * 0.2 };
  const end = { x: w * 0.85, y: h * 0.24 };
  const point = (s: number) => {
    const u = 1 - s;
    return { x: u * u * start.x + 2 * u * s * bend.x + s * s * end.x, y: u * u * start.y + 2 * u * s * bend.y + s * s * end.y };
  };
  g.lineWidth = 2 * ratio;
  g.setLineDash([6 * ratio, 6 * ratio]);
  g.strokeStyle = 'rgba(220, 232, 250, 0.5)';
  g.beginPath();
  for (let i = 0; i <= 40; i++) {
    const p = point(i / 40);
    if (i === 0) g.moveTo(p.x, p.y);
    else g.lineTo(p.x, p.y);
  }
  g.stroke();
  g.setLineDash([]);
  g.strokeStyle = '#ffb36b';
  g.beginPath();
  for (let i = 0; i <= 40; i++) {
    const p = point((i / 40) * share);
    if (i === 0) g.moveTo(p.x, p.y);
    else g.lineTo(p.x, p.y);
  }
  g.stroke();
  // A tick where each stage fires.
  g.fillStyle = 'rgba(220, 232, 250, 0.8)';
  for (const s of stages) {
    const p = point(s);
    g.beginPath();
    g.arc(p.x, p.y, 3 * ratio, 0, Math.PI * 2);
    g.fill();
  }
  const p = point(share);
  g.fillStyle = '#ffffff';
  g.shadowColor = '#ffb36b';
  g.shadowBlur = 12 * ratio;
  g.beginPath();
  g.arc(p.x, p.y, 6 * ratio, 0, Math.PI * 2);
  g.fill();
  g.shadowBlur = 0;
}

export function showLaunchShow(root: HTMLElement, makeView: () => LaunchView): LaunchShow {
  const screen = el('div', 'launch');
  screen.hidden = true;
  screen.setAttribute('role', 'dialog');
  screen.setAttribute('aria-modal', 'true');
  screen.setAttribute('aria-labelledby', 'launch-title');
  const simpleCanvas = el('canvas', 'launch-canvas launch-simple');
  const cut = el('div', 'launch-cut');

  const card = el('div', 'launch-card');
  const title = el('h2', 'launch-title');
  title.id = 'launch-title';
  title.setAttribute('aria-live', 'polite');
  const detail = el('p', 'launch-detail');
  const clock = el('p', 'launch-clock');
  const bars = el('div', 'launch-bars');
  const barRow = (label: string) => {
    const row = el('div', 'launch-bar');
    const fill = el('span', 'launch-bar-fill');
    const track = el('span', 'launch-bar-track');
    track.append(fill);
    const value = el('span', 'launch-bar-value');
    row.append(el('span', 'launch-bar-label', label), track, value);
    bars.append(row);
    return { row, fill, value };
  };
  const battery = barRow(t('testRun.battery'));
  const data = barRow(t('testRun.data'));
  card.append(title, detail, clock, bars);

  const note = el('p', 'launch-note', t('launch.slow'));
  note.hidden = true;

  const controls = el('div', 'launch-controls');
  const speeds = el('div', 'speeds launch-speeds');
  speeds.setAttribute('role', 'group');
  speeds.setAttribute('aria-label', t('speed.label'));
  const speedButtons = SPEEDS.map((s) => {
    const b = button('', t(`speed.${s}`));
    b.title = t(`speed.${s}.name`);
    b.addEventListener('click', () => setSpeed(s));
    speeds.append(b);
    return b;
  });
  const simpleButton = button('small launch-simple-toggle', t('launch.simpleView'));
  const skipButton = button('small launch-skip', t('launch.skip'));
  controls.append(speeds, simpleButton, skipButton);
  screen.append(simpleCanvas, cut, card, note, controls);
  root.append(screen);
  const anomalyPanel = showAnomalyPanel(screen);

  let view: LaunchView | null = null;
  let viewFailed = false;
  let result: LaunchResult | null = null;
  let anomalyHooks: ShowAnomalyHooks | null = null;
  let segments: Segment[] = [];
  let done: () => void = () => {};
  let speed: number = 1;
  let simple = false;
  let showSeconds = 0;
  let last = 0;
  let frame = 0;
  let shot = '';
  let timed: number[] = [];
  let frames = 0;
  let stageShares: number[] = [];
  let ascentEnd = 1;

  const setSpeed = (s: number) => {
    speed = s;
    speedButtons.forEach((b, i) => b.setAttribute('aria-pressed', String(SPEEDS[i] === s)));
  };
  const setSimple = (on: boolean) => {
    simple = on || !view;
    simpleButton.setAttribute('aria-pressed', String(simple));
    simpleCanvas.hidden = !simple;
    if (view) view.canvas.hidden = simple;
    shot = '';
  };
  simpleButton.addEventListener('click', () => setSimple(!simple));
  skipButton.addEventListener('click', () => api.skip());

  /** The Anomaly is settled: show the Data it cost from here on. */
  const answer: ShowAnomalyHooks['onAnswer'] = (score, how) => {
    const a = result?.report.anomaly;
    if (!result || !a || a.score !== null) return;
    anomalyHooks?.onAnswer(score, how);
    if (a.score !== null) result = { ...result, flight: withContactLost(result.flight, a) };
  };
  const anomalyAhead = () => {
    const a = result?.report.anomaly;
    return a && a.score === null ? a : null;
  };

  const finish = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    screen.hidden = true;
    view?.unload();
    result = null;
    done();
  };

  const tick = (now: number) => {
    if (!result) return;
    // The show waits while an Anomaly is being played.
    const dt = anomalyPanel.isOpen ? 0 : Math.min(0.1, (now - last) / 1000);
    last = now;
    showSeconds += dt * speed;
    let m = showAt(segments, showSeconds);
    const ahead = anomalyAhead();
    if (ahead && anomalyHooks && m.segment.phase === 'mission' && m.value >= ahead.day && !anomalyPanel.isOpen) {
      showSeconds = secondsAtDay(segments, ahead.day);
      m = showAt(segments, showSeconds);
      anomalyPanel.open(ahead, {
        best: anomalyHooks?.best ?? null,
        onAnswer: answer,
        onClose: () => skipButton.focus(),
      });
    }
    const { flight } = result;
    const phase = m.segment.phase;
    const day = phase === 'mission' ? m.value : phase === 'end' ? flight.missionDays : 0;
    const powered = flight.powerOutDay === null || day < flight.powerOutDay;

    if (simple || !view) {
      if (phase === 'orbit' || phase === 'mission' || phase === 'end') {
        drawOrbit(simpleCanvas, CONTRACTS[result.report.contract].orbitKm, showSeconds / LAP_SECONDS, powered);
      } else {
        // A failed stage stops the climb where it failed; too heavy, it falls back from the top.
        const tPlus = phase === 'lost' ? (m.segment.stage !== undefined ? m.segment.from : ascentEnd) : Math.max(0, m.value);
        drawClimb(simpleCanvas, Math.min(1, tPlus / ascentEnd), stageShares);
      }
    } else {
      const drawn = view.render(m, dt * speed, powered);
      if (shot && drawn !== shot) {
        cut.classList.remove('on');
        void cut.offsetWidth;
        cut.classList.add('on');
      }
      shot = drawn;
      // Too slow for 3D: switch to the simple view, once.
      if (++frames > WARM_UP_FRAMES && timed.length < TIMED_FRAMES) {
        timed.push(dt);
        if (timed.length === TIMED_FRAMES) {
          const sorted = [...timed].sort((a, b) => a - b);
          if (sorted[Math.floor(sorted.length / 2)]! > SLOW_FRAME_S) {
            setSimple(true);
            note.hidden = false;
          }
        }
      }
    }

    const text = showText(m, result, powered);
    if (title.textContent !== text.title) title.textContent = text.title;
    detail.textContent = text.detail;
    detail.classList.toggle('warn', !powered || phase === 'lost');
    clock.textContent =
      phase === 'mission' || phase === 'end'
        ? t('testRun.day', { day: formatNumber(Math.floor(day)), days: formatNumber(flight.missionDays) })
        : clockText(phase === 'orbit' || phase === 'lost' ? m.segment.from : m.value);
    const showBars = phase === 'mission' || phase === 'end';
    bars.hidden = !showBars;
    if (showBars) {
      const full = flight.batteryWh[0] ?? 0;
      const wh = at(flight.batteryWh, day);
      battery.fill.style.width = `${full > 0 ? (wh / full) * 100 : 0}%`;
      battery.value.textContent = t('testRun.wh', { wh: formatNumber(Math.round(wh)) });
      battery.row.classList.toggle('warn', !powered);
      data.row.hidden = flight.dataGoalKb <= 0;
      const kb = at(flight.dataSentKb, day);
      data.fill.style.width = `${flight.dataGoalKb > 0 ? Math.min(100, (kb / flight.dataGoalKb) * 100) : 0}%`;
      data.value.textContent = t('launch.dataOf', { kb: formatNumber(Math.round(kb)), goal: formatNumber(flight.dataGoalKb) });
    }

    if (m.done) finish();
    else frame = requestAnimationFrame(tick);
  };

  const api: LaunchShow = {
    play(r, onDone, anomaly) {
      result = r;
      done = onDone;
      anomalyHooks = anomaly ?? null;
      segments = flightShow(r.report.vehicle, r.flight);
      const times = stageTimes(r.report.vehicle);
      ascentEnd = times.at(-1)!.end;
      stageShares = times.map((s) => s.start / ascentEnd);
      if (!view && !viewFailed) {
        try {
          view = makeView();
          view.canvas.className = 'launch-canvas';
          screen.prepend(view.canvas);
        } catch {
          viewFailed = true;
        }
      }
      note.hidden = !viewFailed;
      try {
        view?.load(r.design, r.report.vehicle, CONTRACTS[r.report.contract].orbitKm);
      } catch {
        view = null;
        viewFailed = true;
        note.hidden = false;
      }
      setSimple(false);
      setSpeed(1);
      showSeconds = 0;
      frames = 0;
      timed = [];
      shot = '';
      screen.hidden = false;
      skipButton.focus();
      last = performance.now();
      frame = requestAnimationFrame(tick);
    },
    skip() {
      if (!result) return;
      const ahead = anomalyAhead();
      if (anomalyPanel.isOpen) {
        if (!anomalyPanel.trySkip()) return;
      } else if (ahead && anomalyHooks && anomalyHooks.best === null) {
        // The first one must be played: go straight to it.
        showSeconds = Math.max(showSeconds, secondsAtDay(segments, ahead.day));
        return;
      } else if (ahead && anomalyHooks) {
        answer(anomalyHooks.best!, 'skipped');
      }
      finish();
    },
    get isOpen() {
      return !screen.hidden;
    },
  };
  return api;
}
