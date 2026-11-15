import { missionLinks } from './learnMore';
import { contractById, type ContractId } from '../game/contracts';
import { type Satellite, placeOf } from '../game/space';
import type { Flight, TestRun } from '../game/flight';
import { t } from '../strings';
import { contractText, formatNumber } from './format';
import { findingText } from './missionReport';
import { chanceWord } from '../game/explorer';

/**
 * The Test Run screen, shown inside the Mission Designer in place of the Launch planner: a top-down
 * orbit view, battery and Data graphs over the Mission's days, the estimated success and the
 * predicted problems. A replay runs the days by in a few seconds, with a cursor on both graphs.
 */

export interface TestRunScreen {
  readonly root: HTMLElement;
  show(run: TestRun, contract: ContractId): void;
  stop(): void;
}

/** Real seconds the replay takes to run through every Mission day. */
const PLAY_SECONDS = 8;
/** Real seconds for one lap of the orbit view (not to scale: Explorer 1 took 115 minutes). */
const LAP_SECONDS = 2.4;
/** Earth's mean radius in km. */
const EARTH_KM = 6_371;

const COLOURS = {
  ocean: '#2a6fb5',
  oceanDeep: '#123a66',
  night: 'rgba(3, 8, 18, 0.55)',
  path: 'rgba(160, 190, 230, 0.45)',
  craft: '#4fa3ff',
  silent: '#7b8798',
  label: '#9fb0c6',
};

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  e.className = className;
  if (text) e.textContent = text;
  return e;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

function svg<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>, className = ''): SVGElementTagNameMap[K] {
  const e = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  if (className) e.setAttribute('class', className);
  return e;
}

/** The value on day `day` (which may be part-way through a day), read off a per-day list. */
export function at(values: readonly number[], day: number): number {
  const i = Math.max(0, Math.min(values.length - 1, Math.floor(day)));
  const j = Math.min(values.length - 1, i + 1);
  return values[i]! + (values[j]! - values[i]!) * (day - i);
}

/**
 * Every predicted problem in plain words: what the design does as labelled, then thin margins found by the runs.
 * `explorer`: the same lines without numbers.
 */
export function predictedProblems(run: TestRun, explorer = false): string[] {
  const findings = run.asLabelled.findings;
  const lines = findings.filter((f) => !f.ok).map((f) => findingText(f, true, explorer));
  for (const kind of ['power', 'comms'] as const) {
    const failsAnyway = findings.some((f) => f.kind === kind && !f.ok);
    const count = run.missed[kind];
    if (count > 0 && !failsAnyway) {
      lines.push(explorer ? t(`explorer.thin.${kind}`) : t(`testRun.thin.${kind}`, { count: formatNumber(count), runs: formatNumber(run.runs) }));
    }
  }
  return lines;
}

// ---- Graphs ----

interface Graph {
  readonly root: SVGSVGElement;
  setCursor(day: number): void;
}

const W = 320;
const H = 150;
const PAD = { left: 56, right: 12, top: 12, bottom: 24 };

function lineGraph(opts: {
  days: number;
  max: number;
  line: readonly number[];
  low?: readonly number[];
  high?: readonly number[];
  goal?: number;
  /** Values marked on the left with a grid line. */
  marks: readonly number[];
  value(v: number): string;
  /** The words under the start, middle and end of the days (default "Day 0", "Day 15", "Day 30"). */
  dayWords?: readonly [string, string, string];
}): Graph {
  const { days, max, line } = opts;
  const x = (d: number) => PAD.left + (d / Math.max(days, 1)) * (W - PAD.left - PAD.right);
  const y = (v: number) => PAD.top + (1 - v / max) * (H - PAD.top - PAD.bottom);
  const root = svg('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img' }, 'testrun-graph');

  for (const v of opts.marks) {
    root.append(svg('line', { x1: PAD.left, x2: W - PAD.right, y1: y(v), y2: y(v) }, 'graph-grid'));
    const label = svg('text', { x: PAD.left - 6, y: y(v) + 4, 'text-anchor': 'end' }, 'graph-label');
    label.textContent = opts.value(v);
    root.append(label);
  }
  for (const [i, d] of [0, Math.round(days / 2), days].entries()) {
    const label = svg('text', { x: x(d), y: H - 6, 'text-anchor': d === 0 ? 'start' : d === days ? 'end' : 'middle' }, 'graph-label');
    label.textContent = opts.dayWords ? opts.dayWords[i]! : t('testRun.dayTick', { day: formatNumber(d) });
    root.append(label);
  }
  if (opts.low && opts.high) {
    const top = opts.high.map((v, d) => `${x(d)},${y(v)}`);
    const bottom = opts.low.map((v, d) => `${x(d)},${y(v)}`).reverse();
    root.append(svg('polygon', { points: [...top, ...bottom].join(' ') }, 'graph-band'));
  }
  if (opts.goal !== undefined) {
    root.append(svg('line', { x1: PAD.left, x2: W - PAD.right, y1: y(opts.goal), y2: y(opts.goal) }, 'graph-goal'));
    const label = svg('text', { x: W - PAD.right, y: y(opts.goal) - 5, 'text-anchor': 'end' }, 'graph-label goal');
    label.textContent = t('testRun.goal');
    root.append(label);
  }
  root.append(svg('polyline', { points: line.map((v, d) => `${x(d)},${y(v)}`).join(' ') }, 'graph-line'));
  const cursor = svg('line', { y1: PAD.top, y2: H - PAD.bottom }, 'graph-cursor');
  const dot = svg('circle', { r: 4 }, 'graph-dot');
  root.append(cursor, dot);

  return {
    root,
    setCursor(day) {
      const cx = x(day);
      cursor.setAttribute('x1', String(cx));
      cursor.setAttribute('x2', String(cx));
      dot.setAttribute('cx', String(cx));
      dot.setAttribute('cy', String(y(at(line, day))));
    },
  };
}

// ---- Orbit view ----

/** Solve Kepler's equation: where the Spacecraft is on its ellipse after a share of one lap (0–1). */
function eccentricAnomaly(lap: number, e: number): number {
  const m = lap * Math.PI * 2;
  let ea = m;
  for (let i = 0; i < 6; i++) ea -= (ea - e * Math.sin(ea) - m) / (1 - e * Math.cos(ea));
  return ea;
}

export function drawOrbit(
  canvas: HTMLCanvasElement,
  orbitKm: { low: number; high: number },
  lap: number,
  powered: boolean,
  place: Satellite['place'] = 'earth',
  /** Mark the lowest and highest points in km (Mission Director). */
  heights = true,
): void {
  if (place !== 'earth') {
    drawMoonTrip(canvas, 1, powered, place === 'moonGround', lap);
    return;
  }
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
  g.clearRect(0, 0, w, h);

  // The ellipse, with Earth's centre at one focus and the lowest point (perigee) on the right.
  const rp = EARTH_KM + orbitKm.low;
  const ra = EARTH_KM + orbitKm.high;
  const a = (rp + ra) / 2;
  const e = (ra - rp) / (ra + rp);
  const b = a * Math.sqrt(1 - e * e);
  const scale = Math.min((w * 0.84) / (2 * a), (h * 0.84) / (2 * b));
  const cx = w / 2;
  const cy = h / 2;
  const ex = cx + a * e * scale;

  // Earth: lit from the right, night on the left.
  const r = EARTH_KM * scale;
  const shade = g.createRadialGradient(ex + r * 0.3, cy - r * 0.3, r * 0.1, ex, cy, r);
  shade.addColorStop(0, COLOURS.ocean);
  shade.addColorStop(1, COLOURS.oceanDeep);
  g.fillStyle = shade;
  g.beginPath();
  g.arc(ex, cy, r, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = COLOURS.night;
  g.beginPath();
  g.arc(ex, cy, r, Math.PI / 2, (Math.PI * 3) / 2);
  g.fill();

  g.strokeStyle = COLOURS.path;
  g.lineWidth = 1.5 * ratio;
  g.setLineDash([5 * ratio, 5 * ratio]);
  g.beginPath();
  g.ellipse(cx, cy, a * scale, b * scale, 0, 0, Math.PI * 2);
  g.stroke();
  g.setLineDash([]);

  if (heights) {
    g.fillStyle = COLOURS.label;
    g.font = `${11 * ratio}px system-ui, sans-serif`;
    g.textBaseline = 'middle';
    g.textAlign = 'right';
    g.fillText(t('testRun.km', { km: formatNumber(orbitKm.low) }), w - 4 * ratio, cy);
    g.textAlign = 'left';
    g.fillText(t('testRun.km', { km: formatNumber(orbitKm.high) }), 4 * ratio, cy);
  }

  const ea = eccentricAnomaly(lap, e);
  const sx = cx + a * Math.cos(ea) * scale;
  const sy = cy - b * Math.sin(ea) * scale;
  g.fillStyle = powered ? COLOURS.craft : COLOURS.silent;
  if (powered) {
    g.shadowColor = COLOURS.craft;
    g.shadowBlur = 10 * ratio;
  }
  g.beginPath();
  g.arc(sx, sy, 5 * ratio, 0, Math.PI * 2);
  g.fill();
  g.shadowBlur = 0;
}

/**
 * The simple 2D picture of a trip to the Moon (for slow devices): Earth on the left, the Moon on the right, a dashed
 * path between them, and the Spacecraft `share` (0–1) of the way along. Once there it circles the Moon, or sits on
 * it when `ground`; `lap` turns it round the Moon.
 */
export function drawMoonTrip(canvas: HTMLCanvasElement, share: number, powered: boolean, ground = false, lap = 0): void {
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
  g.clearRect(0, 0, w, h);
  const cy = h / 2;
  const earth = { x: w * 0.18, r: Math.min(w, h) * 0.12 };
  const moon = { x: w * 0.82, r: earth.r * 0.27 };
  const shade = g.createRadialGradient(earth.x + earth.r * 0.3, cy - earth.r * 0.3, earth.r * 0.1, earth.x, cy, earth.r);
  shade.addColorStop(0, COLOURS.ocean);
  shade.addColorStop(1, COLOURS.oceanDeep);
  g.fillStyle = shade;
  g.beginPath();
  g.arc(earth.x, cy, earth.r, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#b9b4aa';
  g.beginPath();
  g.arc(moon.x, cy, moon.r, 0, Math.PI * 2);
  g.fill();
  // The path: an arc from Earth over to the Moon.
  const lift = h * 0.28;
  const point = (s: number) => ({
    x: earth.x + earth.r + (moon.x - moon.r * 2.2 - earth.x - earth.r) * s,
    y: cy - Math.sin(Math.PI * s) * lift,
  });
  g.strokeStyle = COLOURS.path;
  g.lineWidth = 1.5 * ratio;
  g.setLineDash([5 * ratio, 5 * ratio]);
  g.beginPath();
  for (let i = 0; i <= 40; i++) {
    const p = point(i / 40);
    if (i === 0) g.moveTo(p.x, p.y);
    else g.lineTo(p.x, p.y);
  }
  g.stroke();
  g.setLineDash([]);
  const s = Math.min(1, Math.max(0, share));
  let craft = point(s);
  if (s >= 1) {
    const turn = lap * Math.PI * 2;
    craft = ground
      ? { x: moon.x, y: cy - moon.r - 3 * ratio }
      : { x: moon.x + Math.cos(turn) * moon.r * 2, y: cy + Math.sin(turn) * moon.r * 2 };
  }
  g.fillStyle = powered ? COLOURS.craft : COLOURS.silent;
  if (powered) {
    g.shadowColor = COLOURS.craft;
    g.shadowBlur = 10 * ratio;
  }
  g.beginPath();
  g.arc(craft.x, craft.y, 4 * ratio, 0, Math.PI * 2);
  g.fill();
  g.shadowBlur = 0;
}

// ---- The screen ----

export function makeTestRunScreen(hooks: { onBack(): void; designBack?: boolean; /** Explorer: words instead of numbers. */ explorer?: boolean; /** Mission Director: repeat runs of a design cost a fee. */ paid?: boolean }): TestRunScreen {
  const explorer = !!hooks.explorer;
  const dayWords = explorer ? ([t('explorer.testRun.start'), t('explorer.testRun.middle'), t('explorer.testRun.end')] as const) : undefined;
  const root = el('div', 'testrun');
  root.hidden = true;
  const back = el('button', 'small planner-back', t(hooks.designBack ? 'planner.back' : 'testRun.back'));
  back.type = 'button';
  back.dataset.tutorial = 'testrun-back';
  back.addEventListener('click', () => hooks.onBack());

  // Orbit
  const orbitCard = el('section', 'planner-card testrun-orbit');
  const orbitHint = el('p', 'planner-hint');
  const sources = el('div', '');
  const canvas = el('canvas', 'testrun-canvas');
  const day = el('p', 'testrun-day');
  day.setAttribute('aria-live', 'off');
  const replay = el('button', 'small testrun-replay', t('testRun.replay'));
  replay.type = 'button';
  orbitCard.append(el('h3', '', t('testRun.orbit')), orbitHint, sources, canvas, day, replay);

  // Graphs
  const batteryCard = el('section', 'planner-card');
  const batteryBox = el('div', 'testrun-graph-box');
  batteryCard.append(el('h3', '', t('testRun.battery')), el('p', 'planner-hint', t('testRun.batteryHint')), batteryBox);
  const dataCard = el('section', 'planner-card');
  const dataHint = el('p', 'planner-hint');
  const dataBox = el('div', 'testrun-graph-box');
  dataCard.append(el('h3', '', t('testRun.data')), dataHint, dataBox);
  const graphs = el('div', 'testrun-graphs');
  graphs.append(batteryCard, dataCard);

  // Estimate and problems
  const verdict = el('section', 'planner-card testrun-verdict');
  const percent = el('p', 'testrun-percent');
  const runs = el('p', 'planner-hint');
  const rocket = el('p', 'planner-hint');
  const problems = el('ul', 'testrun-problems');
  const none = el('p', 'testrun-none', t('testRun.none'));
  verdict.append(
    el('h3', '', t('testRun.success')),
    percent,
    rocket,
    runs,
    el('h3', '', t('testRun.problems')),
    problems,
    none,
    el('p', 'planner-hint', t(hooks.paid ? 'modes.testRunNote' : 'testRun.free')),
  );

  const grid = el('div', 'testrun-grid');
  grid.append(orbitCard, graphs, verdict);
  root.append(back, grid);

  let frame = 0;
  let started = 0;
  let flight: Flight | null = null;
  let orbitKm = { low: 0, high: 0 };
  let place: Satellite['place'] = 'earth';
  let cursors: Graph[] = [];
  const still = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

  const tick = (now: number) => {
    if (!flight) return;
    const seconds = (now - started) / 1000;
    const days = flight.missionDays;
    const d = still() ? days : Math.min(days, (seconds / PLAY_SECONDS) * days);
    const out = flight.powerOutDay;
    const powered = out === null || d < out;
    day.textContent = powered
      ? t('testRun.day', { day: formatNumber(Math.floor(d)), days: formatNumber(days) })
      : t('testRun.powerOut', { day: formatNumber(Math.floor(out)) });
    day.classList.toggle('warn', !powered);
    for (const c of cursors) c.setCursor(d);
    // A Spacecraft without Power still orbits: it just goes quiet.
    drawOrbit(canvas, orbitKm, still() ? 0.15 : seconds / LAP_SECONDS, powered, place, !explorer);
    frame = requestAnimationFrame(tick);
  };

  const play = () => {
    cancelAnimationFrame(frame);
    started = performance.now();
    frame = requestAnimationFrame(tick);
  };
  replay.addEventListener('click', play);

  return {
    root,
    show(run, contract) {
      const f = run.asLabelled;
      flight = f;
      orbitKm = contractById(contract).orbitKm;
      place = placeOf(contract);
      sources.replaceChildren(missionLinks(contract));
      orbitHint.textContent = t(contractById(contract).kind === 'generated' ? 'testRun.orbitGoal' : 'testRun.orbitHint', { contract: contractText(contract) });

      const labelledWh = f.batteryWh[0] ?? 0;
      const battery = lineGraph({
        days: f.missionDays,
        max: Math.max(1, run.batteryHighWh[0] ?? 0, labelledWh) * 1.03,
        marks: [labelledWh, 0],
        line: f.batteryWh,
        low: run.batteryLowWh,
        high: run.batteryHighWh,
        value: (v) => (explorer ? t(v > 0 ? 'explorer.testRun.full' : 'explorer.testRun.empty') : t('testRun.wh', { wh: formatNumber(Math.round(v)) })),
        dayWords,
      });
      battery.root.setAttribute('aria-label', t('testRun.batteryHint'));
      batteryBox.replaceChildren(battery.root);
      cursors = [battery];

      if (f.dataGoalKb > 0) {
        const data = lineGraph({
          days: f.missionDays,
          max: f.dataGoalKb * 1.15,
          line: f.dataSentKb,
          goal: f.dataGoalKb,
          marks: explorer ? [0] : [f.dataGoalKb, 0],
          value: (v) => (explorer ? t('explorer.testRun.none') : t('testRun.kb', { kb: formatNumber(Math.round(v)) })),
          dayWords,
        });
        dataHint.textContent = explorer ? t('explorer.testRun.dataHint') : t('testRun.dataHint', { kb: formatNumber(f.dataGoalKb) });
        data.root.setAttribute('aria-label', dataHint.textContent);
        dataBox.replaceChildren(data.root);
        cursors.push(data);
      } else {
        dataHint.textContent = t('testRun.noData');
        dataBox.replaceChildren();
      }

      percent.textContent = explorer ? t(`explorer.chance.${chanceWord(run.successPercent)}`) : t('testRun.percent', { percent: formatNumber(run.successPercent) });
      percent.dataset.level = run.successPercent >= 90 ? 'good' : run.successPercent >= 50 ? 'fair' : 'poor';
      runs.textContent = t('testRun.runs', { runs: formatNumber(run.runs) });
      // The rocket can fail too: the estimate is the design's runs times the rocket's record in the game.
      const odds = { design: formatNumber(run.designPercent), rocket: formatNumber(Math.round(run.reliability * 100)), vehicle: t(`launchVehicle.${run.vehicle}`) };
      rocket.textContent = explorer
        ? t(run.reliability < 1 ? 'explorer.testRun.rocket' : 'planner.firstLaunch.short')
        : t(run.reliability < 1 ? 'testRun.rocket' : 'testRun.rocketFirst', odds);
      runs.hidden = explorer;
      const lines = predictedProblems(run, explorer);
      problems.replaceChildren(...lines.map((line) => el('li', '', line)));
      none.hidden = lines.length > 0;
      play();
    },
    stop() {
      cancelAnimationFrame(frame);
      frame = 0;
    },
  };
}
