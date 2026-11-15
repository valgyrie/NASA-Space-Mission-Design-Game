import { audio } from '../audio/sound';
import { t, type StringKey } from '../strings';
import { button, canvas2d, el } from '../ui/miniGame';
import { fixed, makeKit, typing } from './directorKit';
import {
  BATTERY_WH,
  DAMAGE_S,
  DOWNLINKS,
  GAME_S,
  LOUVER_MAX,
  LOUVER_TOTAL,
  MINUTES_PER_S,
  ORBIT_S,
  PARTS,
  PART_SPECS,
  type Part,
  SCIENCE,
  SHADOW_SHARE,
  bandShare,
  budgetW,
  busyAt,
  inBand,
  inSurvival,
  loadW,
  louversOpen,
  moveLouver,
  newThermalGame,
  partW,
  phaseAt,
  shadowSpans,
  solarW,
  stepThermal,
  sunlitAt,
  thermalStars,
  timeLeftS,
  toggleHeater,
} from './thermalModel';
import type { Minigame, MinigameMaker } from './types';

/**
 * Too Hot, Too Cold on screen: the orbit and a timeline of sunlight, shadow, science passes and downlinks along
 * the top; one card per part with its temperature trace over its bands, its heater and its louvers; the power
 * panel on the right. Keys: 1–4 heaters, Q W E R open louvers, A S D F close them.
 */

const HEAT_KEYS = ['1', '2', '3', '4'];
const OPEN_KEYS = ['q', 'w', 'e', 'r'];
const CLOSE_KEYS = ['a', 's', 'd', 'f'];
/** Seconds of history each trace shows. */
const HISTORY_S = 16;
const SAMPLE_S = 0.1;

const COL = {
  ok: '#5fd38d',
  warn: '#ffb36b',
  bad: '#ff5d5d',
  sun: '#ffd27a',
  shadow: '#1a2740',
  science: '#b48cff',
  downlink: '#4fd3ff',
  text: '#e8eef7',
  muted: '#8fa3bd',
};

const partName = (p: Part) => t(`minigame.thermal.part.${p}` as StringKey);
const partOf = (p: Part) => t(`minigame.thermal.the.${p}` as StringKey);
const deg = (n: number) => t('minigame.thermal.deg', { n: fixed(n) });

interface Card {
  root: HTMLElement;
  status: HTMLElement;
  temp: HTMLElement;
  job: HTMLElement;
  chart: HTMLCanvasElement;
  heater: HTMLButtonElement;
  pips: HTMLElement[];
  open: HTMLButtonElement;
  close: HTMLButtonElement;
  history: number[];
}

export const makeThermal: MinigameMaker = (): Minigame => {
  let dispose: (() => void) | null = null;
  return {
    start(host, done) {
      const kit = makeKit(done);
      dispose = () => kit.dispose();
      const g = newThermalGame();
      host.textContent = '';
      const root = el('div', 'dg dg-thermal');
      host.append(root);

      // Header
      const head = el('div', 'dg-head');
      const orbit = el('span', 'dg-chip');
      const speed = el('span', 'dg-head-mid', t('minigame.thermal.speed', { min: fixed(MINUTES_PER_S) }));
      const score = el('span', 'dg-chip dg-chip-score');
      const clock = el('span', 'dg-chip');
      head.append(orbit, speed, score, clock);

      // Timeline
      const timeline = el('canvas', 'dg-timeline');

      // Part cards
      const main = el('div', 'dg-thermal-main');
      const cards = new Map<Part, Card>();
      PARTS.forEach((p, i) => {
        const s = PART_SPECS[p];
        const card = el('section', 'dg-card dg-part');
        const top = el('div', 'dg-part-top');
        top.append(el('strong', 'dg-part-name', partName(p)));
        const status = el('span', 'dg-tag');
        top.append(status);
        const band = el('div', 'dg-part-band', t('minigame.thermal.band', { lo: fixed(s.op[0]), hi: fixed(s.op[1]), slo: fixed(s.survival[0]), shi: fixed(s.survival[1]) }));
        const chart = el('canvas', 'dg-part-chart');
        const readout = el('div', 'dg-part-readout');
        const temp = el('span', 'dg-part-temp');
        const job = el('span', 'dg-part-job');
        readout.append(temp, job);

        const heater = button('dg-btn dg-heater', '');
        heater.addEventListener('click', () => heat(p));
        const louver = el('div', 'dg-louver');
        const close = button('dg-btn dg-mini', t('minigame.director.minus'));
        close.setAttribute('aria-label', t('minigame.thermal.louverClose', { part: partOf(p) }));
        close.addEventListener('click', () => vent(p, -1));
        const open = button('dg-btn dg-mini', t('minigame.director.plus'));
        open.setAttribute('aria-label', t('minigame.thermal.louverOpen', { part: partOf(p) }));
        open.addEventListener('click', () => vent(p, 1));
        const pipBox = el('span', 'dg-pips');
        const pips = Array.from({ length: LOUVER_MAX }, () => pipBox.appendChild(el('span', 'dg-pip')));
        louver.append(el('span', 'dg-louver-label', t('minigame.thermal.louvers')), close, pipBox, open);
        louver.append(el('span', 'dg-keys', t('minigame.thermal.louverKeys', { open: OPEN_KEYS[i]!.toUpperCase(), close: CLOSE_KEYS[i]!.toUpperCase() })));

        card.append(top, band, chart, readout, heater, louver);
        main.append(card);
        cards.set(p, { root: card, status, temp, job, chart, heater, pips, open, close, history: [] });
      });

      // Power panel
      const power = el('section', 'dg-card dg-power');
      power.append(el('strong', 'dg-power-title', t('minigame.thermal.power')));
      const light = el('div', 'dg-light');
      const solar = el('div', 'dg-row');
      const loadLabel = el('div', 'dg-row');
      const loadBar = el('div', 'dg-bar');
      const loadFill = loadBar.appendChild(el('span', 'dg-bar-fill'));
      const chargeLabel = el('div', 'dg-row');
      const chargeBar = el('div', 'dg-bar dg-bar-charge');
      const chargeFill = chargeBar.appendChild(el('span', 'dg-bar-fill'));
      const radiator = el('div', 'dg-row');
      const radBar = el('div', 'dg-steps');
      const radSteps = Array.from({ length: LOUVER_TOTAL }, () => radBar.appendChild(el('span', 'dg-step')));
      power.append(light, solar, loadLabel, loadBar, chargeLabel, chargeBar, radiator, radBar);
      power.append(el('p', 'dg-note', t('minigame.thermal.batteryNote', { wh: fixed(BATTERY_WH) })));
      main.append(power);

      // Footer: the last message, and the keys
      const foot = el('div', 'dg-foot');
      const ticker = el('span', 'dg-ticker', t('minigame.thermal.start'));
      foot.append(ticker, el('span', 'dg-keys', t('minigame.thermal.keys')));

      root.append(head, timeline, main, foot);

      let tickerT = 0;
      const say = (text: string, level: 'info' | 'warn' | 'bad' = 'info') => {
        ticker.textContent = text;
        ticker.className = `dg-ticker dg-ticker-${level}`;
        tickerT = 0;
      };

      const heat = (p: Part) => {
        const r = toggleHeater(g, p);
        if (r === 'power') {
          audio.effect('alarm');
          say(t('minigame.thermal.noPower', { part: partOf(p), w: fixed(PART_SPECS[p].heaterW), max: fixed(budgetW(g)) }), 'warn');
        }
        refresh();
      };
      const vent = (p: Part, by: 1 | -1) => {
        if (moveLouver(g, p, by) === 'full') {
          audio.effect('alarm');
          say(t('minigame.thermal.full', { n: LOUVER_TOTAL }), 'warn');
        }
        refresh();
      };

      kit.on(window, 'keydown', (e) => {
        if (typing(e) || e.repeat || e.ctrlKey || e.metaKey || e.altKey || g.state !== 'playing') return;
        const k = e.key.toLowerCase();
        let i = HEAT_KEYS.indexOf(k);
        if (i >= 0) {
          heat(PARTS[i]!);
          audio.effect('click');
          e.preventDefault();
          return;
        }
        i = OPEN_KEYS.indexOf(k);
        if (i >= 0) {
          vent(PARTS[i]!, 1);
          audio.effect('click');
          e.preventDefault();
          return;
        }
        i = CLOSE_KEYS.indexOf(k);
        if (i >= 0) {
          vent(PARTS[i]!, -1);
          audio.effect('click');
          e.preventDefault();
        }
      });

      function statusOf(p: Part): 'ok' | 'hot' | 'cold' | 'damage' {
        if (!inSurvival(g, p)) return 'damage';
        if (inBand(g, p)) return 'ok';
        return g.temp[p] > PART_SPECS[p].op[1] ? 'hot' : 'cold';
      }

      function jobText(p: Part): string {
        const busy = busyAt(p, g.timeS);
        const w = fixed(partW(g, p), 1);
        if (p === 'battery') return t('minigame.thermal.job.battery');
        if (!busy) return t('minigame.thermal.job.idle', { w });
        return t(p === 'radio' ? 'minigame.thermal.job.downlink' : p === 'instrument' ? 'minigame.thermal.job.science' : 'minigame.thermal.job.busy', { w });
      }

      /** Update every text and button (cheap; runs each frame). */
      function refresh(): void {
        const orbitN = Math.min(Math.floor((g.timeS + phaseAt(0) * ORBIT_S) / ORBIT_S) + 1, Math.ceil(GAME_S / ORBIT_S));
        orbit.textContent = t('minigame.thermal.orbit', { n: orbitN, total: Math.ceil(GAME_S / ORBIT_S) });
        const share = bandShare(g);
        score.textContent = t('minigame.thermal.inBand', { pct: fixed(share * 100) });
        score.dataset.level = share >= 0.85 ? 'ok' : share >= 0.65 ? 'warn' : 'bad';
        clock.textContent = t('minigame.director.timeLeft', { s: fixed(Math.ceil(timeLeftS(g))) });

        for (const p of PARTS) {
          const c = cards.get(p)!;
          const st = statusOf(p);
          c.status.textContent = t(`minigame.thermal.status.${st}`);
          c.status.dataset.level = st === 'ok' ? 'ok' : st === 'damage' ? 'bad' : 'warn';
          c.root.dataset.level = c.status.dataset.level;
          c.temp.textContent = deg(g.temp[p]);
          c.job.textContent = jobText(p);
          c.job.classList.toggle('dg-busy', busyAt(p, g.timeS));
          const on = g.heater[p];
          c.heater.textContent = t('minigame.thermal.heater', { w: fixed(PART_SPECS[p].heaterW), state: t(on ? 'minigame.director.on' : 'minigame.director.off'), key: HEAT_KEYS[PARTS.indexOf(p)]! });
          c.heater.setAttribute('aria-pressed', String(on));
          c.pips.forEach((pip, i) => pip.classList.toggle('dg-pip-on', i < g.louver[p]));
          c.close.disabled = g.louver[p] === 0;
          c.open.disabled = g.louver[p] >= LOUVER_MAX;
        }

        const sun = sunlitAt(g.timeS);
        light.textContent = t(sun ? 'minigame.thermal.sun' : 'minigame.thermal.shadow');
        light.dataset.sun = String(sun);
        solar.textContent = t('minigame.thermal.solar', { w: fixed(solarW(g)) });
        const load = loadW(g);
        const budget = budgetW(g);
        loadLabel.textContent = t(sun ? 'minigame.thermal.load' : 'minigame.thermal.loadShadow', { w: fixed(load, 1), max: fixed(budget) });
        loadFill.style.width = `${Math.min(100, (load / budget) * 100)}%`;
        loadBar.dataset.level = load / budget > 0.9 ? 'bad' : load > solarW(g) ? 'warn' : 'ok';
        chargeLabel.textContent = t('minigame.thermal.charge', { pct: fixed(g.charge * 100) });
        chargeFill.style.width = `${g.charge * 100}%`;
        chargeBar.dataset.level = g.charge < 0.25 ? 'bad' : g.charge < 0.45 ? 'warn' : 'ok';
        radiator.textContent = t('minigame.thermal.radiator', { n: louversOpen(g), max: LOUVER_TOTAL });
        radSteps.forEach((s, i) => s.classList.toggle('dg-step-on', i < louversOpen(g)));
      }

      // Drawing
      function drawTimeline(): void {
        const f = canvas2d(timeline);
        if (!f) return;
        const { c, w, h, ratio: r } = f;
        c.clearRect(0, 0, w, h);
        // Orbit diagram on the left: the Sun off to the right, Earth's shadow to the left.
        const box = Math.min(h, 150 * r);
        const cx = box / 2 + 4 * r;
        const cy = h / 2;
        const R = box * 0.2;
        const orbitR = box * 0.38;
        const half = SHADOW_SHARE * Math.PI;
        c.fillStyle = 'rgba(0,0,0,0.55)';
        c.beginPath();
        c.moveTo(cx, cy);
        c.arc(cx, cy, orbitR + 8 * r, Math.PI - half, Math.PI + half);
        c.closePath();
        c.fill();
        const earth = c.createRadialGradient(cx + R * 0.4, cy - R * 0.3, R * 0.1, cx, cy, R);
        earth.addColorStop(0, '#7cc0ff');
        earth.addColorStop(0.6, '#2a69b8');
        earth.addColorStop(1, '#0b2547');
        c.fillStyle = earth;
        c.beginPath();
        c.arc(cx, cy, R, 0, Math.PI * 2);
        c.fill();
        c.strokeStyle = 'rgba(232,238,247,0.25)';
        c.lineWidth = r;
        c.beginPath();
        c.arc(cx, cy, orbitR, 0, Math.PI * 2);
        c.stroke();
        // Sunlight arrows from the right.
        c.strokeStyle = 'rgba(255,210,122,0.6)';
        for (const dy of [-0.3, 0, 0.3]) {
          const y = cy + dy * box;
          c.beginPath();
          c.moveTo(box + 2 * r, y);
          c.lineTo(box - 10 * r, y);
          c.lineTo(box - 6 * r, y - 3 * r);
          c.moveTo(box - 10 * r, y);
          c.lineTo(box - 6 * r, y + 3 * r);
          c.stroke();
        }
        const phase = phaseAt(g.timeS);
        const angle = Math.PI + 2 * Math.PI * (phase - (1 - SHADOW_SHARE / 2));
        const sx = cx + Math.cos(angle) * orbitR;
        const sy = cy - Math.sin(angle) * orbitR;
        const sun = sunlitAt(g.timeS);
        c.fillStyle = sun ? COL.sun : '#6c7a8e';
        c.fillRect(sx - 4 * r, sy - 4 * r, 8 * r, 8 * r);
        c.fillStyle = '#2c4f8a';
        c.fillRect(sx - 11 * r, sy - 2 * r, 6 * r, 4 * r);
        c.fillRect(sx + 5 * r, sy - 2 * r, 6 * r, 4 * r);

        // The timeline strip.
        const x0 = box + 70 * r;
        const x1 = w - 10 * r;
        const xs = (s: number) => x0 + ((x1 - x0) * s) / GAME_S;
        const rows = [t('minigame.thermal.row.light'), t('minigame.thermal.row.science'), t('minigame.thermal.row.downlink')];
        const rowH = Math.min(22 * r, (h - 24 * r) / 3);
        const top = (h - rowH * 3 - 8 * r) / 2;
        c.font = `600 ${11 * r}px system-ui, sans-serif`;
        c.textBaseline = 'middle';
        c.textAlign = 'right';
        rows.forEach((label, i) => {
          c.fillStyle = COL.muted;
          c.fillText(label, x0 - 8 * r, top + rowH * i + rowH / 2 + i * 4 * r);
        });
        const rowY = (i: number) => top + rowH * i + i * 4 * r;
        c.fillStyle = 'rgba(255,210,122,0.35)';
        c.fillRect(x0, rowY(0), x1 - x0, rowH);
        c.fillStyle = COL.shadow;
        for (const [a, b] of shadowSpans()) c.fillRect(xs(a), rowY(0), xs(b) - xs(a), rowH);
        c.fillStyle = 'rgba(255,255,255,0.04)';
        c.fillRect(x0, rowY(1), x1 - x0, rowH);
        c.fillRect(x0, rowY(2), x1 - x0, rowH);
        const blocks = (spans: readonly (readonly [number, number])[], row: number, colour: string) => {
          for (const [a, b] of spans) {
            const active = g.timeS >= a && g.timeS < b;
            c.fillStyle = colour;
            c.globalAlpha = active ? 1 : 0.6;
            c.fillRect(xs(a), rowY(row) + 2 * r, xs(b) - xs(a), rowH - 4 * r);
          }
          c.globalAlpha = 1;
        };
        blocks(SCIENCE, 1, COL.science);
        blocks(DOWNLINKS, 2, COL.downlink);
        // Orbit ticks.
        c.strokeStyle = 'rgba(232,238,247,0.15)';
        for (let s = ORBIT_S - phaseAt(0) * ORBIT_S; s < GAME_S; s += ORBIT_S) {
          c.beginPath();
          c.moveTo(xs(s), rowY(0) - 3 * r);
          c.lineTo(xs(s), rowY(2) + rowH + 3 * r);
          c.stroke();
        }
        // The past, dimmed; now, a bright line.
        const now = xs(g.timeS);
        c.fillStyle = 'rgba(3,8,20,0.55)';
        c.fillRect(x0, rowY(0) - 4 * r, now - x0, rowH * 3 + 16 * r);
        c.strokeStyle = COL.text;
        c.lineWidth = 2 * r;
        c.beginPath();
        c.moveTo(now, rowY(0) - 6 * r);
        c.lineTo(now, rowY(2) + rowH + 6 * r);
        c.stroke();
        c.fillStyle = COL.text;
        c.beginPath();
        c.moveTo(now - 5 * r, rowY(0) - 9 * r);
        c.lineTo(now + 5 * r, rowY(0) - 9 * r);
        c.lineTo(now, rowY(0) - 3 * r);
        c.fill();
      }

      function drawChart(p: Part, card: Card): void {
        const f = canvas2d(card.chart);
        if (!f) return;
        const { c, w, h, ratio: r } = f;
        const s = PART_SPECS[p];
        const lo = s.survival[0] - 15;
        const hi = s.survival[1] + 15;
        const ys = (v: number) => h - ((v - lo) / (hi - lo)) * h;
        c.clearRect(0, 0, w, h);
        c.fillStyle = 'rgba(255,93,93,0.22)';
        c.fillRect(0, 0, w, ys(s.survival[1]));
        c.fillRect(0, ys(s.survival[0]), w, h - ys(s.survival[0]));
        c.fillStyle = 'rgba(255,179,107,0.13)';
        c.fillRect(0, ys(s.survival[1]), w, ys(s.op[1]) - ys(s.survival[1]));
        c.fillRect(0, ys(s.op[0]), w, ys(s.survival[0]) - ys(s.op[0]));
        c.fillStyle = 'rgba(95,211,141,0.16)';
        c.fillRect(0, ys(s.op[1]), w, ys(s.op[0]) - ys(s.op[1]));
        c.strokeStyle = 'rgba(95,211,141,0.6)';
        c.lineWidth = r;
        c.setLineDash([4 * r, 3 * r]);
        for (const v of s.op) {
          c.beginPath();
          c.moveTo(0, ys(v));
          c.lineTo(w, ys(v));
          c.stroke();
        }
        c.strokeStyle = 'rgba(255,93,93,0.7)';
        for (const v of s.survival) {
          c.beginPath();
          c.moveTo(0, ys(v));
          c.lineTo(w, ys(v));
          c.stroke();
        }
        c.setLineDash([]);
        c.font = `${10 * r}px ui-monospace, Consolas, monospace`;
        c.textAlign = 'left';
        c.textBaseline = 'bottom';
        c.fillStyle = 'rgba(232,238,247,0.55)';
        for (const v of [...s.op, ...s.survival]) c.fillText(fixed(v), 3 * r, ys(v) - 1 * r);
        // The trace.
        const hist = card.history;
        const n = HISTORY_S / SAMPLE_S;
        const xs = (i: number) => w - 8 * r - ((hist.length - 1 - i) / n) * (w - 8 * r);
        const st = statusOf(p);
        const colour = st === 'ok' ? COL.ok : st === 'damage' ? COL.bad : COL.warn;
        c.strokeStyle = colour;
        c.lineWidth = 2 * r;
        c.beginPath();
        hist.forEach((v, i) => (i === 0 ? c.moveTo(xs(i), ys(v)) : c.lineTo(xs(i), ys(v))));
        c.stroke();
        const y = ys(Math.max(lo, Math.min(hi, g.temp[p])));
        c.fillStyle = colour;
        c.shadowColor = colour;
        c.shadowBlur = 8 * r;
        c.beginPath();
        c.arc(w - 8 * r, y, 4.5 * r, 0, Math.PI * 2);
        c.fill();
        c.shadowBlur = 0;
        // Damage building up: a red bar along the bottom.
        if (g.damage[p] > 0) {
          c.fillStyle = COL.bad;
          c.fillRect(0, h - 4 * r, (w * Math.min(1, g.damage[p] / DAMAGE_S)), 4 * r);
        }
      }

      // Events worth a message: entering or leaving the shadow, a job starting, a part in danger.
      let wasSun = sunlitAt(0);
      let wasScience = false;
      let wasDownlink = false;
      const wasSafe = new Map<Part, boolean>(PARTS.map((p) => [p, true]));
      let sampleT = 0;
      let alarmT = 0;

      kit.loop((dt) => {
        if (g.state === 'playing') {
          stepThermal(g, dt);
          for (const p of g.tripped) say(t('minigame.thermal.trip', { part: partOf(p) }), 'warn');
          if (g.tripped.length) audio.effect('alarm');
          g.tripped = [];
          const sun = sunlitAt(g.timeS);
          if (sun !== wasSun) say(t(sun ? 'minigame.thermal.sunOut' : 'minigame.thermal.shadowIn'), sun ? 'info' : 'warn');
          wasSun = sun;
          const sci = busyAt('instrument', g.timeS);
          if (sci && !wasScience) say(t('minigame.thermal.scienceOn'));
          wasScience = sci;
          const dl = busyAt('radio', g.timeS);
          if (dl && !wasDownlink) say(t('minigame.thermal.downlinkOn'));
          wasDownlink = dl;
          alarmT -= dt;
          for (const p of PARTS) {
            const safe = inSurvival(g, p);
            if (!safe && wasSafe.get(p)) {
              say(t('minigame.thermal.danger', { part: partOf(p) }), 'bad');
              if (alarmT <= 0) {
                audio.effect('alarm');
                alarmT = 1;
              }
            }
            wasSafe.set(p, safe);
          }
          sampleT += dt;
          while (sampleT >= SAMPLE_S) {
            sampleT -= SAMPLE_S;
            for (const p of PARTS) {
              const h = cards.get(p)!.history;
              h.push(g.temp[p]);
              if (h.length > HISTORY_S / SAMPLE_S + 1) h.shift();
            }
          }
          if (g.state !== 'playing') end();
        }
        tickerT += dt;
        if (tickerT > 6 && ticker.className !== 'dg-ticker') ticker.className = 'dg-ticker dg-ticker-old';
        refresh();
        drawTimeline();
        for (const p of PARTS) drawChart(p, cards.get(p)!);
      });

      function end(): void {
        const stars = thermalStars(g);
        const won = g.state === 'won';
        audio.effect(won ? 'reward' : 'alarm');
        let headline: string;
        let line: string;
        if (won) {
          headline = t('minigame.thermal.won');
          line = t('minigame.thermal.line.won', { pct: fixed(bandShare(g) * 100) });
        } else if (g.lostTo === 'flat') {
          headline = t('minigame.thermal.lostFlat');
          line = t('minigame.thermal.line.flat');
        } else {
          const p = g.lostTo as Part;
          const hot = g.temp[p] > PART_SPECS[p].survival[1];
          headline = t(hot ? 'minigame.thermal.lostHot' : 'minigame.thermal.lostCold', { part: partOf(p) });
          line = t(hot ? 'minigame.thermal.line.hot' : 'minigame.thermal.line.cold');
        }
        root.classList.add('dg-over');
        kit.finish(root, { won, stars, line }, headline);
      }

      refresh();
      cards.get('battery')!.heater.focus({ preventScroll: true });
    },
    destroy() {
      dispose?.();
      dispose = null;
    },
  };
};
