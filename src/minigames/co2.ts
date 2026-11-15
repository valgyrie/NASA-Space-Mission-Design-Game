import { audio } from '../audio/sound';
import { t, type StringKey } from '../strings';
import { button, canvas2d, el } from '../ui/miniGame';
import {
  CANISTER_CAPACITY,
  CO2_CAUTION,
  CO2_DANGER,
  DX,
  DY,
  type Dir,
  FAST_FORWARD,
  PIECES,
  type PieceKind,
  activeBoard,
  allDone,
  cellKey,
  co2Stars,
  flowOf,
  jointPoint,
  leaks,
  newCo2Game,
  openings,
  piecesLeft,
  remove,
  scrubRate,
  stepCo2,
  tapeJoint,
  timeLeftS,
  trace,
  useOn,
} from './co2Model';
import { fixed, makeKit, typing } from './directorKit';
import type { Minigame, MinigameMaker } from './types';

/**
 * Square Peg, Round Hole on screen: a 1970-style Lunar Module panel. On the left, the CO₂ gauge with its
 * caution and danger lines, the master alarm and the canisters; in the middle, the grid where the air path is
 * built; on the right, the parts bin. Mouse: click to place or turn, right-click to take back, click a red joint
 * to tape it. Keys: arrows move, Space places or turns, X takes back, 1–5 choose a part, T tapes the next leak.
 */

const DIAL_MAX = 20;
const PANEL = '#3f4a43';
const PANEL_DARK = '#2c3530';
const HOSE = '#c9cfd4';
const HOSE_DARK = '#59626b';

export const makeCo2: MinigameMaker = (): Minigame => {
  let dispose: (() => void) | null = null;
  return {
    start(host, done) {
      const kit = makeKit(done);
      dispose = () => kit.dispose();
      const g = newCo2Game();
      let selected: PieceKind = 'hose';
      let cursor = { x: 1, y: 2 };
      let hover: { x: number; y: number } | null = null;
      let flowPhase = 0;
      let lastBoard = 0;
      let wasCaution = true;
      let flash = 0;

      host.textContent = '';
      const root = el('div', 'dg dg-co2');
      host.append(root);

      // Header
      const head = el('div', 'dg-head');
      const build = el('span', 'dg-chip');
      const mid = el('span', 'dg-head-mid');
      const clock = el('span', 'dg-chip');
      head.append(build, mid, clock);

      // Left: the CO₂ gauge, the master alarm, the canisters
      const left = el('section', 'dg-card dg-co2-left');
      left.append(el('strong', 'dg-panel-label', t('minigame.co2.gauge')));
      const dial = el('canvas', 'dg-dial');
      const reading = el('div', 'dg-co2-reading');
      const lamp = el('div', 'dg-lamp', t('minigame.co2.lamp'));
      const flowRow = el('div', 'dg-row');
      const cans = [0, 1].map((i) => {
        const label = el('div', 'dg-row');
        const bar = el('div', 'dg-bar dg-bar-can');
        const fill = bar.appendChild(el('span', 'dg-bar-fill'));
        left.append(label, bar);
        return { label, bar, fill, i };
      });
      left.insertBefore(dial, cans[0]!.label);
      left.insertBefore(reading, cans[0]!.label);
      left.insertBefore(lamp, cans[0]!.label);
      left.insertBefore(flowRow, cans[0]!.label);

      // Middle: the board
      const boardWrap = el('section', 'dg-card dg-co2-board');
      const canvas = el('canvas', 'dg-board');
      canvas.tabIndex = 0;
      canvas.setAttribute('aria-label', t('minigame.co2.boardLabel'));
      boardWrap.append(canvas);

      // Right: the parts bin
      const bin = el('section', 'dg-card dg-bin');
      bin.append(el('strong', 'dg-panel-label', t('minigame.co2.parts')));
      const partButtons = new Map<PieceKind, HTMLButtonElement>();
      PIECES.forEach((k) => {
        const b = button('dg-btn dg-part-btn', '');
        b.dataset.kind = k;
        b.addEventListener('click', () => choose(k));
        partButtons.set(k, b);
        bin.append(b);
      });
      const help = el('p', 'dg-help');
      const left2 = el('div', 'dg-row');
      bin.append(help, left2, el('p', 'dg-note', t('minigame.co2.tips')));

      const main = el('div', 'dg-co2-main');
      main.append(left, boardWrap, bin);

      const foot = el('div', 'dg-foot');
      const ticker = el('span', 'dg-ticker', t('minigame.co2.start'));
      foot.append(ticker, el('span', 'dg-keys', t('minigame.co2.keys')));
      root.append(head, main, foot);

      const say = (text: string, level: 'info' | 'warn' | 'bad' | 'good' = 'info') => {
        ticker.textContent = text;
        ticker.className = `dg-ticker dg-ticker-${level}`;
      };

      function choose(k: PieceKind): void {
        selected = k;
        refresh();
      }

      const pieceName = (k: PieceKind) => t(`minigame.co2.piece.${k}` as StringKey);

      /** Explain where the path stops, after a change. */
      function explain(): void {
        const b = activeBoard(g);
        const tr = trace(b);
        if (tr.complete) {
          const n = tr.joints.filter((j) => j.leaking).length;
          if (tr.unbraced > 0) say(t(tr.unbraced === 1 ? 'minigame.co2.collapse.one' : 'minigame.co2.collapse', { n: tr.unbraced }), 'warn');
          else if (n > 0) say(t(n === 1 ? 'minigame.co2.leaks.one' : 'minigame.co2.leaks', { n }), 'warn');
          return;
        }
        if (tr.end?.why === 'shape') say(t('minigame.co2.shape'), 'warn');
      }

      function act(x: number, y: number): void {
        if (g.state !== 'playing') return;
        const before = g.active;
        const r = useOn(g, x, y, selected);
        if (r === 'placed') audio.effect('build');
        else if (r === 'braced') audio.effect('build');
        else if (r === 'rotated') audio.effect('click');
        else if (r === 'none') say(t('minigame.co2.noneLeft', { piece: pieceName(selected) }), 'warn');
        else if (r === 'notBag') say(t('minigame.co2.cardboardHow'), 'warn');
        else if (selected === 'tape') say(t('minigame.co2.tapeHow'), 'info');
        if (g.active !== before) boardDone(before);
        else if (r === 'placed' || r === 'rotated' || r === 'braced') explain();
        refresh();
      }

      function takeBack(x: number, y: number): void {
        if (remove(g, x, y)) {
          audio.effect('click');
          explain();
          refresh();
        }
      }

      function tape(key: string): boolean {
        const before = g.active;
        const r = tapeJoint(g, key);
        if (r === 'taped') {
          audio.effect('click');
          if (g.active !== before || allDone(g)) boardDone(before);
          else explain();
          refresh();
          return true;
        }
        if (r === 'none') say(t('minigame.co2.noneLeft', { piece: pieceName('tape') }), 'warn');
        return false;
      }

      function boardDone(i: number): void {
        audio.effect('reward');
        flash = 1;
        say(t(i === 0 && !allDone(g) ? 'minigame.co2.done1' : 'minigame.co2.done2'), 'good');
      }

      // Board geometry
      let geo = { ox: 0, oy: 0, cell: 1, ratio: 1 };
      function cellAt(e: MouseEvent): { x: number; y: number; fx: number; fy: number } | null {
        const rect = canvas.getBoundingClientRect();
        const px = (e.clientX - rect.left) * geo.ratio;
        const py = (e.clientY - rect.top) * geo.ratio;
        const fx = (px - geo.ox) / geo.cell;
        const fy = (py - geo.oy) / geo.cell;
        const l = activeBoard(g).layout;
        if (fx < 0 || fy < 0 || fx >= l.w || fy >= l.h) return null;
        return { x: Math.floor(fx), y: Math.floor(fy), fx, fy };
      }
      /** A leaking joint near the pointer (within a fifth of a cell of it), if any. */
      function leakNear(fx: number, fy: number): string | null {
        let best: string | null = null;
        let bestD = 0.28;
        for (const k of leaks(g)) {
          const p = jointPoint(k);
          const d = Math.hypot(p.x - fx, p.y - fy);
          if (d < bestD) {
            best = k;
            bestD = d;
          }
        }
        return best;
      }

      kit.on(canvas, 'pointerdown', (e) => {
        if (g.state !== 'playing') return;
        const c = cellAt(e);
        if (!c) return;
        canvas.focus({ preventScroll: true });
        cursor = { x: c.x, y: c.y };
        if (e.button === 2 || e.shiftKey) {
          takeBack(c.x, c.y);
          return;
        }
        const leak = leakNear(c.fx, c.fy);
        if (leak && tape(leak)) return;
        if (selected === 'tape') {
          say(t('minigame.co2.tapeHow'), 'info');
          return;
        }
        act(c.x, c.y);
      });
      kit.on(canvas, 'pointermove', (e) => {
        const c = cellAt(e);
        hover = c ? { x: c.x, y: c.y } : null;
        canvas.style.cursor = c && leakNear(c.fx, c.fy) ? 'copy' : c ? 'pointer' : 'default';
      });
      kit.on(canvas, 'pointerleave', () => (hover = null));
      kit.on(canvas, 'contextmenu', (e) => e.preventDefault());

      kit.on(window, 'keydown', (e) => {
        if (typing(e) || e.ctrlKey || e.metaKey || e.altKey || g.state !== 'playing') return;
        const l = activeBoard(g).layout;
        const k = e.key.toLowerCase();
        const moves: Record<string, [number, number]> = { arrowup: [0, -1], arrowdown: [0, 1], arrowleft: [-1, 0], arrowright: [1, 0] };
        const n = Number(k);
        if (moves[k]) {
          const [dx, dy] = moves[k]!;
          cursor = { x: Math.max(0, Math.min(l.w - 1, cursor.x + dx)), y: Math.max(0, Math.min(l.h - 1, cursor.y + dy)) };
        } else if (n >= 1 && n <= PIECES.length && !e.repeat) {
          choose(PIECES[n - 1]!);
          audio.effect('click');
        } else if ((k === ' ' || k === 'enter') && !e.repeat) {
          if (document.activeElement instanceof HTMLButtonElement) return;
          act(cursor.x, cursor.y);
        } else if (k === 'r' && !e.repeat) {
          act(cursor.x, cursor.y);
        } else if ((k === 'x' || k === 'delete' || k === 'backspace') && !e.repeat) {
          takeBack(cursor.x, cursor.y);
        } else if (k === 't' && !e.repeat) {
          const first = leaks(g)[0];
          if (first) tape(first);
          else say(t('minigame.co2.noLeaks'), 'info');
        } else return;
        e.preventDefault();
      });

      function refresh(): void {
        build.textContent = t(allDone(g) ? 'minigame.co2.buildsDone' : 'minigame.co2.build', { n: g.active + 1 });
        mid.textContent = allDone(g) ? t('minigame.co2.fastForward', { x: FAST_FORWARD }) : t('minigame.co2.where', { n: g.active + 1 });
        clock.textContent = t('minigame.co2.splashdown', { s: fixed(Math.ceil(timeLeftS(g))) });
        for (const [k, btn] of partButtons) {
          btn.textContent = t('minigame.co2.partButton', { piece: pieceName(k), n: g.left[k], key: PIECES.indexOf(k) + 1 });
          btn.setAttribute('aria-pressed', String(k === selected));
          btn.classList.toggle('dg-empty', g.left[k] === 0);
        }
        help.textContent = t(`minigame.co2.help.${selected}` as StringKey);
        left2.textContent = t('minigame.co2.spare', { n: piecesLeft(g) });
      }

      function refreshGauges(): void {
        reading.textContent = t('minigame.co2.reading', { n: fixed(g.co2, 1) });
        reading.dataset.level = g.co2 >= CO2_DANGER - 2 ? 'bad' : g.co2 >= CO2_CAUTION ? 'warn' : 'ok';
        lamp.classList.toggle('dg-lamp-on', g.co2 >= CO2_CAUTION);
        const totalFlow = g.boards.reduce((f, b) => f + (b.capacity > 0 ? flowOf(b) : 0), 0);
        flowRow.textContent = t('minigame.co2.flow', { pct: fixed(Math.min(1, totalFlow) * 100), rate: fixed(scrubRate(g) * 60, 0) });
        cans.forEach(({ label, bar, fill, i }) => {
          const b = g.boards[i]!;
          const share = b.capacity / CANISTER_CAPACITY[i]!;
          label.textContent = t(
            b.capacity <= 0 ? 'minigame.co2.canSpent' : flowOf(b) > 0 ? 'minigame.co2.canWorking' : 'minigame.co2.canIdle',
            { n: i + 1, pct: fixed(share * 100) },
          );
          fill.style.width = `${share * 100}%`;
          bar.dataset.level = share < 0.25 ? 'bad' : share < 0.5 ? 'warn' : 'ok';
        });
      }

      // Drawing -----------------------------------------------------------------------------
      function drawDial(): void {
        const f = canvas2d(dial);
        if (!f) return;
        const { c, w, h, ratio: r } = f;
        c.clearRect(0, 0, w, h);
        const cx = w / 2;
        const cy = h * 0.82;
        const R = Math.min(w * 0.44, h * 0.74);
        const a0 = Math.PI * 0.95;
        const a1 = Math.PI * 2.05;
        const ang = (v: number) => a0 + (a1 - a0) * Math.min(1, Math.max(0, v / DIAL_MAX));
        // Face
        c.fillStyle = '#e9e4d4';
        c.beginPath();
        c.arc(cx, cy, R * 1.08, a0 - 0.08, a1 + 0.08);
        c.closePath();
        c.fill();
        c.lineWidth = 3 * r;
        c.strokeStyle = '#1c211e';
        c.stroke();
        const band = (from: number, to: number, colour: string) => {
          c.strokeStyle = colour;
          c.lineWidth = R * 0.13;
          c.beginPath();
          c.arc(cx, cy, R * 0.86, ang(from), ang(to));
          c.stroke();
        };
        band(0, CO2_CAUTION, '#4f9a62');
        band(CO2_CAUTION, CO2_DANGER, '#e0a030');
        band(CO2_DANGER, DIAL_MAX, '#c8372d');
        c.strokeStyle = '#1c211e';
        c.fillStyle = '#1c211e';
        c.font = `700 ${10 * r}px ui-monospace, Consolas, monospace`;
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        for (let v = 0; v <= DIAL_MAX; v += 1) {
          const a = ang(v);
          const major = v % 5 === 0;
          c.lineWidth = (major ? 2 : 1) * r;
          c.beginPath();
          c.moveTo(cx + Math.cos(a) * R * 0.72, cy + Math.sin(a) * R * 0.72);
          c.lineTo(cx + Math.cos(a) * R * (major ? 0.62 : 0.67), cy + Math.sin(a) * R * (major ? 0.62 : 0.67));
          c.stroke();
          if (major) c.fillText(fixed(v), cx + Math.cos(a) * R * 0.5, cy + Math.sin(a) * R * 0.5);
        }
        c.font = `700 ${9 * r}px system-ui, sans-serif`;
        c.fillText(t('minigame.co2.dialUnit'), cx, cy - R * 0.28);
        // Needle
        const a = ang(g.co2);
        c.strokeStyle = '#b3241b';
        c.lineWidth = 3 * r;
        c.lineCap = 'round';
        c.beginPath();
        c.moveTo(cx - Math.cos(a) * R * 0.1, cy - Math.sin(a) * R * 0.1);
        c.lineTo(cx + Math.cos(a) * R * 0.9, cy + Math.sin(a) * R * 0.9);
        c.stroke();
        c.lineCap = 'butt';
        c.fillStyle = '#1c211e';
        c.beginPath();
        c.arc(cx, cy, 5 * r, 0, Math.PI * 2);
        c.fill();
        // Peak marker
        const pa = ang(g.peak);
        c.fillStyle = '#b3241b';
        c.beginPath();
        c.arc(cx + Math.cos(pa) * R * 1.0, cy + Math.sin(pa) * R * 1.0, 3 * r, 0, Math.PI * 2);
        c.fill();
      }

      function rivets(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
        c.fillStyle = 'rgba(0,0,0,0.35)';
        for (const [px, py] of [[x + 8 * r, y + 8 * r], [x + w - 8 * r, y + 8 * r], [x + 8 * r, y + h - 8 * r], [x + w - 8 * r, y + h - 8 * r]] as const) {
          c.beginPath();
          c.arc(px, py, 3 * r, 0, Math.PI * 2);
          c.fill();
        }
      }

      /** The middle of a cell's edge in direction d, in pixels. */
      const edge = (x: number, y: number, d: Dir) => {
        const { ox, oy, cell } = geo;
        return { x: ox + (x + 0.5 + DX[d] * 0.5) * cell, y: oy + (y + 0.5 + DY[d] * 0.5) * cell };
      };
      const centre = (x: number, y: number) => ({ x: geo.ox + (x + 0.5) * geo.cell, y: geo.oy + (y + 0.5) * geo.cell });

      function tube(c: CanvasRenderingContext2D, pts: { x: number; y: number }[], width: number, curve: boolean): void {
        const path = () => {
          c.beginPath();
          c.moveTo(pts[0]!.x, pts[0]!.y);
          if (curve && pts.length === 3) c.quadraticCurveTo(pts[1]!.x, pts[1]!.y, pts[2]!.x, pts[2]!.y);
          else for (const p of pts.slice(1)) c.lineTo(p.x, p.y);
        };
        c.lineCap = 'butt';
        c.strokeStyle = HOSE_DARK;
        c.lineWidth = width;
        path();
        c.stroke();
        c.strokeStyle = HOSE;
        c.lineWidth = width * 0.72;
        path();
        c.stroke();
        c.strokeStyle = 'rgba(80,90,100,0.55)';
        c.lineWidth = width * 0.72;
        c.setLineDash([2 * geo.ratio, 4 * geo.ratio]);
        path();
        c.stroke();
        c.setLineDash([]);
        c.strokeStyle = 'rgba(255,255,255,0.5)';
        c.lineWidth = width * 0.12;
        path();
        c.stroke();
      }

      function drawBoard(dt: number): void {
        const f = canvas2d(canvas);
        if (!f) return;
        const { c, w, h, ratio: r } = f;
        const b = activeBoard(g);
        const l = b.layout;
        const pad = 14 * r;
        const cell = Math.floor(Math.min((w - pad * 2) / l.w, (h - pad * 2) / l.h));
        geo = { ox: Math.round((w - cell * l.w) / 2), oy: Math.round((h - cell * l.h) / 2), cell, ratio: r };
        const { ox, oy } = geo;
        c.clearRect(0, 0, w, h);
        // The panel
        const grad = c.createLinearGradient(0, oy, 0, oy + cell * l.h);
        grad.addColorStop(0, '#4a564e');
        grad.addColorStop(1, PANEL);
        c.fillStyle = grad;
        c.fillRect(ox - pad * 0.6, oy - pad * 0.6, cell * l.w + pad * 1.2, cell * l.h + pad * 1.2);
        rivets(c, ox - pad * 0.6, oy - pad * 0.6, cell * l.w + pad * 1.2, cell * l.h + pad * 1.2, r);
        c.strokeStyle = 'rgba(0,0,0,0.25)';
        c.lineWidth = r;
        for (let x = 0; x < l.w; x++) {
          for (let y = 0; y < l.h; y++) {
            c.fillStyle = (x + y) % 2 ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.025)';
            c.fillRect(ox + x * cell + 1, oy + y * cell + 1, cell - 2, cell - 2);
            c.strokeRect(ox + x * cell + 0.5, oy + y * cell + 0.5, cell - 1, cell - 1);
          }
        }
        const tr = trace(b);
        const onPath = new Set(tr.cells.map((p) => cellKey(p.x, p.y)));
        const flow = b.capacity > 0 ? flowOf(b) : 0;

        // Path glow under the pieces
        if (tr.cells.length > 1) {
          c.strokeStyle = tr.complete ? `rgba(110, 230, 255, ${0.15 + 0.25 * flow})` : 'rgba(255, 220, 140, 0.12)';
          c.lineWidth = cell * 0.55;
          c.lineJoin = 'round';
          c.beginPath();
          tr.cells.forEach((p, i) => {
            const q = centre(p.x, p.y);
            if (i === 0) c.moveTo(q.x, q.y);
            else c.lineTo(q.x, q.y);
          });
          c.stroke();
        }

        // Fixed parts
        for (const [k, fx] of Object.entries(l.fixed)) {
          const [x, y] = k.split(',').map(Number) as [number, number];
          const x0 = ox + x * cell;
          const y0 = oy + y * cell;
          if (fx.kind === 'block') {
            c.fillStyle = PANEL_DARK;
            c.fillRect(x0 + cell * 0.06, y0 + cell * 0.06, cell * 0.88, cell * 0.88);
            c.strokeStyle = 'rgba(255,255,255,0.08)';
            c.strokeRect(x0 + cell * 0.06, y0 + cell * 0.06, cell * 0.88, cell * 0.88);
            c.strokeStyle = 'rgba(0,0,0,0.4)';
            c.lineWidth = 2 * r;
            for (let i = 1; i < 4; i++) {
              c.beginPath();
              c.moveTo(x0 + cell * 0.2, y0 + cell * (0.2 + i * 0.15));
              c.lineTo(x0 + cell * 0.8, y0 + cell * (0.2 + i * 0.15));
              c.stroke();
            }
            c.fillStyle = '#c9a227';
            c.beginPath();
            c.arc(x0 + cell * 0.22, y0 + cell * 0.22, cell * 0.05, 0, Math.PI * 2);
            c.fill();
          } else if (fx.kind === 'canister') {
            const s = cell * 0.84;
            const cx0 = x0 + (cell - s) / 2;
            const cy0 = y0 + (cell - s) / 2;
            const cg = c.createLinearGradient(cx0, cy0, cx0 + s, cy0 + s);
            cg.addColorStop(0, '#d6d9dc');
            cg.addColorStop(1, '#8c949b');
            c.fillStyle = cg;
            c.fillRect(cx0, cy0, s, s);
            c.strokeStyle = '#3a4046';
            c.lineWidth = 2 * r;
            c.strokeRect(cx0, cy0, s, s);
            // Square ports on its open sides
            const sides: Dir[] = fx.axis === 'ew' ? [1, 3] : [0, 2];
            for (const d of sides) {
              const e = edge(x, y, d);
              const pw = cell * 0.5;
              const pt = cell * 0.12;
              c.fillStyle = '#20262b';
              if (d === 1 || d === 3) c.fillRect(e.x - (d === 1 ? pt : 0), e.y - pw / 2, pt, pw);
              else c.fillRect(e.x - pw / 2, e.y - (d === 2 ? pt : 0), pw, pt);
            }
            c.strokeStyle = 'rgba(40,46,52,0.6)';
            c.lineWidth = r;
            for (let i = 1; i < 6; i++) {
              c.beginPath();
              c.moveTo(cx0 + s * 0.2, cy0 + (s * i) / 6);
              c.lineTo(cx0 + s * 0.8, cy0 + (s * i) / 6);
              c.stroke();
            }
            c.fillStyle = '#1e2a33';
            c.font = `800 ${Math.max(9 * r, cell * 0.16)}px system-ui, sans-serif`;
            c.textAlign = 'center';
            c.textBaseline = 'middle';
            c.fillStyle = '#f4f1e6';
            c.fillRect(cx0 + s * 0.18, cy0 + s * 0.38, s * 0.64, s * 0.24);
            c.fillStyle = '#1e2a33';
            c.fillText(t('minigame.co2.lioh'), cx0 + s / 2, cy0 + s / 2);
            if (b.capacity <= 0) {
              c.fillStyle = 'rgba(120,20,20,0.45)';
              c.fillRect(cx0, cy0, s, s);
            }
          } else {
            // Round port: the cabin fan outlet or the suit-loop socket.
            const e = edge(x, y, fx.dir);
            const q = centre(x, y);
            c.fillStyle = PANEL_DARK;
            c.beginPath();
            c.arc(q.x, q.y, cell * 0.36, 0, Math.PI * 2);
            c.fill();
            tube(c, [q, e], cell * 0.3, false);
            c.fillStyle = fx.kind === 'outlet' ? '#d65a3a' : '#3a8ad6';
            c.beginPath();
            c.arc(q.x, q.y, cell * 0.2, 0, Math.PI * 2);
            c.fill();
            c.fillStyle = '#111';
            c.beginPath();
            c.arc(q.x, q.y, cell * 0.1, 0, Math.PI * 2);
            c.fill();
            c.fillStyle = '#f4f1e6';
            c.font = `700 ${Math.max(9 * r, cell * 0.13)}px system-ui, sans-serif`;
            c.textAlign = 'center';
            c.textBaseline = 'top';
            c.fillText(t(fx.kind === 'outlet' ? 'minigame.co2.outlet' : 'minigame.co2.socket'), q.x, y0 + cell * 0.8);
          }
        }

        // Placed pieces
        for (const [k, p] of Object.entries(b.placed)) {
          const [x, y] = k.split(',').map(Number) as [number, number];
          const open = [...openings(b, x, y).entries()];
          const q = centre(x, y);
          c.globalAlpha = onPath.has(k) ? 1 : 0.75;
          if (p.kind === 'hose' || p.kind === 'bend') {
            const [a, bb] = open as [[Dir, string], [Dir, string]];
            tube(c, [edge(x, y, a[0]), q, edge(x, y, bb[0])], cell * 0.3, p.kind === 'bend');
          } else {
            drawBag(c, x, y, open as [Dir, string][], p.braced);
          }
          c.globalAlpha = 1;
        }

        // Tape on joints
        for (const key of b.taped) {
          const p = jointPoint(key);
          const vertical = key.endsWith(',1');
          const px = ox + p.x * cell;
          const py = oy + p.y * cell;
          c.save();
          c.translate(px, py);
          c.rotate(vertical ? 0.08 : Math.PI / 2 + 0.08);
          c.fillStyle = '#b9bec4';
          c.fillRect(-cell * 0.08, -cell * 0.3, cell * 0.16, cell * 0.6);
          c.fillStyle = 'rgba(255,255,255,0.35)';
          c.fillRect(-cell * 0.08, -cell * 0.3, cell * 0.04, cell * 0.6);
          c.restore();
        }

        // Flow particles along the path
        flowPhase += dt * (0.6 + 1.6 * flow);
        if (tr.complete && flow > 0) {
          const pts = tr.cells.map((p) => centre(p.x, p.y));
          const n = pts.length - 1;
          c.fillStyle = `rgba(190, 245, 255, ${0.35 + 0.6 * flow})`;
          const count = Math.round(n * 3);
          for (let i = 0; i < count; i++) {
            const s = ((i / 3 + flowPhase) % n + n) % n;
            const j = Math.floor(s);
            const u = s - j;
            const a = pts[j]!;
            const bpt = pts[j + 1]!;
            c.beginPath();
            c.arc(a.x + (bpt.x - a.x) * u, a.y + (bpt.y - a.y) * u, cell * 0.045, 0, Math.PI * 2);
            c.fill();
          }
        }

        // Leaks: red pulsing joints, with puffs if air is flowing
        const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 160);
        for (const j of tr.joints) {
          if (!j.leaking) continue;
          const p = jointPoint(j.key);
          const px = ox + p.x * cell;
          const py = oy + p.y * cell;
          c.strokeStyle = `rgba(255, 80, 70, ${0.5 + 0.5 * pulse})`;
          c.lineWidth = 3 * r;
          c.beginPath();
          c.arc(px, py, cell * (0.12 + 0.04 * pulse), 0, Math.PI * 2);
          c.stroke();
          if (tr.complete) {
            c.fillStyle = 'rgba(230, 240, 255, 0.5)';
            for (let i = 0; i < 4; i++) {
              const s = (flowPhase * 1.7 + i / 4) % 1;
              const a = i * 1.7 + Number(j.key.length);
              c.beginPath();
              c.arc(px + Math.cos(a) * s * cell * 0.3, py + Math.sin(a) * s * cell * 0.3, cell * 0.03 * (1 - s), 0, Math.PI * 2);
              c.fill();
            }
          }
        }

        // The open end of the path: where the air stops
        if (tr.end && g.state === 'playing' && !b.done) {
          const e = edge(tr.end.x, tr.end.y, tr.end.dir);
          const bad = tr.end.why === 'shape' || tr.end.why === 'blocked' || tr.end.why === 'edge';
          c.fillStyle = bad ? `rgba(255, 90, 80, ${0.4 + 0.5 * pulse})` : `rgba(255, 210, 120, ${0.4 + 0.5 * pulse})`;
          c.save();
          c.translate(e.x, e.y);
          c.rotate((tr.end.dir - 1) * (Math.PI / 2));
          c.beginPath();
          c.moveTo(cell * 0.16, 0);
          c.lineTo(-cell * 0.04, -cell * 0.12);
          c.lineTo(-cell * 0.04, cell * 0.12);
          c.closePath();
          c.fill();
          c.restore();
        }

        // Hover ghost and keyboard cursor
        const ghost = hover ?? null;
        if (ghost && g.state === 'playing' && !l.fixed[cellKey(ghost.x, ghost.y)] && !b.placed[cellKey(ghost.x, ghost.y)] && (selected === 'hose' || selected === 'bend' || selected === 'bag')) {
          c.fillStyle = 'rgba(255,255,255,0.08)';
          c.fillRect(ox + ghost.x * cell + 2, oy + ghost.y * cell + 2, cell - 4, cell - 4);
        }
        c.strokeStyle = document.activeElement === canvas ? '#ffd27a' : 'rgba(255,210,122,0.45)';
        c.lineWidth = 2 * r;
        c.setLineDash([6 * r, 4 * r]);
        c.strokeRect(ox + cursor.x * cell + 3 * r, oy + cursor.y * cell + 3 * r, cell - 6 * r, cell - 6 * r);
        c.setLineDash([]);

        // A flash when a build starts working
        if (flash > 0) {
          c.fillStyle = `rgba(120, 255, 180, ${flash * 0.25})`;
          c.fillRect(0, 0, w, h);
          flash = Math.max(0, flash - dt * 1.5);
        }
      }

      function drawBag(c: CanvasRenderingContext2D, x: number, y: number, open: [Dir, string][], braced: boolean): void {
        const sq = open.find(([, s]) => s === 'square')![0];
        const rd = open.find(([, s]) => s === 'round')![0];
        const cell = geo.cell;
        const q = centre(x, y);
        const er = edge(x, y, rd);
        c.save();
        c.translate(q.x, q.y);
        c.rotate((sq - 3) * (Math.PI / 2)); // square side to the left (west)
        const half = cell / 2;
        // The bag: wide at the square side, gathered at the round side
        c.fillStyle = 'rgba(225, 235, 245, 0.55)';
        c.strokeStyle = 'rgba(255,255,255,0.85)';
        c.lineWidth = 1.5 * geo.ratio;
        c.beginPath();
        c.moveTo(-half, -half * 0.62);
        c.quadraticCurveTo(0, -half * 0.75, half * 0.35, -half * 0.18);
        c.lineTo(half * 0.35, half * 0.18);
        c.quadraticCurveTo(0, half * 0.75, -half, half * 0.62);
        c.closePath();
        c.fill();
        c.stroke();
        c.strokeStyle = 'rgba(255,255,255,0.4)';
        for (const k of [-0.3, 0.05, 0.3]) {
          c.beginPath();
          c.moveTo(-half * 0.8, half * k);
          c.lineTo(half * 0.2, half * k * 0.4);
          c.stroke();
        }
        if (braced) {
          c.strokeStyle = '#a77a43';
          c.lineWidth = cell * 0.07;
          c.strokeRect(-half + cell * 0.04, -half * 0.6, cell * 0.22, half * 1.2);
        } else {
          // Not braced: a hint of a crease, it would collapse
          c.strokeStyle = 'rgba(255,180,100,0.8)';
          c.setLineDash([3 * geo.ratio, 3 * geo.ratio]);
          c.lineWidth = 1.5 * geo.ratio;
          c.strokeRect(-half + cell * 0.04, -half * 0.6, cell * 0.22, half * 1.2);
          c.setLineDash([]);
        }
        c.restore();
        // The hose stub on the round side
        const mid = { x: q.x + (er.x - q.x) * 0.35, y: q.y + (er.y - q.y) * 0.35 };
        tube(c, [mid, er], cell * 0.3, false);
      }

      // Loop ------------------------------------------------------------------------------------
      kit.loop((dt) => {
        if (g.state === 'playing') {
          stepCo2(g, dt);
          if (g.active !== lastBoard) lastBoard = g.active;
          const caution = g.co2 >= CO2_CAUTION;
          if (caution && !wasCaution) {
            audio.effect('alarm');
            say(t('minigame.co2.risingAgain'), 'bad');
          }
          wasCaution = caution;
          if (g.boards[0]!.done && g.boards[0]!.capacity <= 0 && !g.boards[1]!.done && !spentSaid) {
            spentSaid = true;
            audio.effect('alarm');
            say(t('minigame.co2.spent'), 'bad');
          }
          refresh();
        }
        if (g.state !== 'playing' && !ended) end();
        refreshGauges();
        drawDial();
        drawBoard(dt);
      });
      let spentSaid = false;

      let ended = false;
      function end(): void {
        ended = true;
        const won = g.state === 'won';
        const stars = co2Stars(g);
        audio.effect(won ? 'reward' : 'alarm');
        const headline = t(won ? 'minigame.co2.won' : 'minigame.co2.lost');
        const line = won ? t('minigame.co2.line.won', { peak: fixed(g.peak, 1), n: piecesLeft(g) }) : t('minigame.co2.line.lost');
        root.classList.add('dg-over');
        kit.finish(root, { won, stars, line }, headline);
      }

      refresh();
      refreshGauges();
      canvas.focus({ preventScroll: true });
    },
    destroy() {
      dispose?.();
      dispose = null;
    },
  };
};
