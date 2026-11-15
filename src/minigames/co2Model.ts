/**
 * Square Peg, Round Hole: the model. Apollo 13's Lunar Module has too much carbon dioxide; its own lithium
 * hydroxide canisters are spent, and the Command Module's spares are square while the LM's openings are round
 * (docs/research/minigames.md). On a grid, the player builds an air path from the cabin fan's hose, through a
 * square canister, back to the LM's round suit-loop socket, from a limited supply of hoses, hose bends, plastic
 * bags (square on one side, round on the other), cardboard to brace the bags and tape to seal the joints. Two
 * builds: the first canister saturates, so a second "mailbox" is needed before the crew gets home.
 *
 * CO₂ levels, rise and scrub rates, canister capacity and piece counts are GAME ESTIMATES. Pure and
 * step-by-step, so it is tested without a screen.
 */

/** Directions: 0 north (up), 1 east, 2 south, 3 west. */
export type Dir = 0 | 1 | 2 | 3;
export const DX = [0, 1, 0, -1] as const;
export const DY = [-1, 0, 1, 0] as const;
export const opposite = (d: Dir): Dir => ((d + 2) % 4) as Dir;
const turn = (d: number, by: number): Dir => (((d + by) % 4) + 4) % 4 as Dir;

export type Shape = 'round' | 'square';
export const PIECES = ['hose', 'bend', 'bag', 'cardboard', 'tape'] as const;
export type PieceKind = (typeof PIECES)[number];
/** Pieces that sit in a grid cell (cardboard goes onto a bag, tape onto a joint). */
export type CellKind = 'hose' | 'bend' | 'bag';

/** Openings of each cell piece before rotation: direction → shape. A bag is square on its west side. */
const BASE: Record<CellKind, [Dir, Shape][]> = {
  hose: [[3, 'round'], [1, 'round']],
  bend: [[3, 'round'], [0, 'round']],
  bag: [[3, 'square'], [1, 'round']],
};

export interface Placed {
  kind: CellKind;
  /** Quarter turns clockwise, 0–3. */
  rot: number;
  /** A bag braced with cardboard (it doesn't collapse when the fan pulls). */
  braced: boolean;
}

export type Fixed =
  | { kind: 'outlet'; dir: Dir }
  | { kind: 'socket'; dir: Dir }
  | { kind: 'canister'; axis: 'ew' | 'ns' }
  | { kind: 'block' };

export interface Layout {
  w: number;
  h: number;
  fixed: Record<string, Fixed>;
}

export const cellKey = (x: number, y: number): string => `${x},${y}`;

/** Two builds: the first canister at the LM's side panel, the second, harder one by the aft bulkhead. */
export const LAYOUTS: readonly Layout[] = [
  {
    w: 7,
    h: 5,
    fixed: {
      '0,2': { kind: 'outlet', dir: 1 },
      '3,2': { kind: 'canister', axis: 'ew' },
      '6,0': { kind: 'socket', dir: 3 },
      '3,1': { kind: 'block' },
      '3,3': { kind: 'block' },
      '5,3': { kind: 'block' },
      '1,0': { kind: 'block' },
      '4,4': { kind: 'block' },
    },
  },
  {
    w: 7,
    h: 5,
    fixed: {
      '0,4': { kind: 'outlet', dir: 1 },
      '3,2': { kind: 'canister', axis: 'ns' },
      '6,1': { kind: 'socket', dir: 3 },
      '2,2': { kind: 'block' },
      '4,2': { kind: 'block' },
      '5,3': { kind: 'block' },
      '1,1': { kind: 'block' },
      '0,0': { kind: 'block' },
      '1,3': { kind: 'block' },
      '6,3': { kind: 'block' },
    },
  },
];

/** The supply for both builds together (game estimate): enough, with a little to spare if you're careful. */
export const SUPPLY: Record<PieceKind, number> = { hose: 6, bend: 7, bag: 5, cardboard: 5, tape: 10 };

/** CO₂ partial pressure, mmHg (game estimates): where it starts, the caution line, and the danger line. */
export const CO2_START = 7.8;
export const CO2_CAUTION = 7.6;
export const CO2_DANGER = 15;
/** Rise with three crew in a cabin built for two, mmHg per game second (game estimate). */
export const CO2_RISE = 0.14;
/** Scrubbing: share of the CO₂ removed per second at full flow (game estimate). */
export const SCRUB_K = 0.065;
/** How much CO₂ each canister can take before it saturates, mmHg (game estimates). */
export const CANISTER_CAPACITY = [6, 40] as const;
/** Flow kept through each unsealed joint and each unbraced bag (game estimates). */
export const LEAK_FLOW = 0.7;
export const COLLAPSE_FLOW = 0.5;
/** Game seconds until splashdown; after both builds work, time runs this much faster. */
export const RESCUE_S = 110;
export const FAST_FORWARD = 4;

export interface Board {
  layout: Layout;
  placed: Record<string, Placed>;
  /** Joint keys sealed with tape. */
  taped: Set<string>;
  /** Fully built and sealed: locked, its canister working. */
  done: boolean;
  /** CO₂ its canister can still take, mmHg. */
  capacity: number;
}

export interface Co2Game {
  boards: Board[];
  /** The board being built (index into boards). */
  active: number;
  left: Record<PieceKind, number>;
  co2: number;
  peak: number;
  timeS: number;
  state: 'playing' | 'won' | 'lost';
}

export function newCo2Game(): Co2Game {
  return {
    boards: LAYOUTS.map((layout, i) => ({ layout, placed: {}, taped: new Set(), done: false, capacity: CANISTER_CAPACITY[i]! })),
    active: 0,
    left: { ...SUPPLY },
    co2: CO2_START,
    peak: CO2_START,
    timeS: 0,
    state: 'playing',
  };
}

/** Openings of whatever is in a cell: direction → shape. */
export function openings(board: Board, x: number, y: number): Map<Dir, Shape> {
  const m = new Map<Dir, Shape>();
  const f = board.layout.fixed[cellKey(x, y)];
  if (f) {
    if (f.kind === 'outlet' || f.kind === 'socket') m.set(f.dir, 'round');
    if (f.kind === 'canister') {
      const [a, b]: Dir[] = f.axis === 'ew' ? [1, 3] : [0, 2];
      m.set(a!, 'square').set(b!, 'square');
    }
    return m;
  }
  const p = board.placed[cellKey(x, y)];
  if (p) for (const [d, s] of BASE[p.kind]) m.set(turn(d, p.rot), s);
  return m;
}

/** A joint between a cell and its neighbour in `dir`, the same key from either side. */
export function jointKey(x: number, y: number, dir: Dir): string {
  if (dir === 0) return `${x},${y - 1},2`;
  if (dir === 3) return `${x - 1},${y},1`;
  return `${x},${y},${dir}`;
}

/** Where a joint sits, in cell units (for drawing and clicking). */
export function jointPoint(key: string): { x: number; y: number } {
  const [x, y, d] = key.split(',').map(Number) as [number, number, number];
  return d === 1 ? { x: x + 1, y: y + 0.5 } : { x: x + 0.5, y: y + 1 };
}

export interface Joint {
  key: string;
  /** Needs tape: one side is improvised (a bag), and it isn't taped yet. */
  leaking: boolean;
  /** Was taped (sealed). */
  taped: boolean;
}

export interface Trace {
  /** Cells the air passes through, from the outlet. */
  cells: { x: number; y: number }[];
  complete: boolean;
  /** Where the path stops, if it isn't complete: the open end and why. */
  end: { x: number; y: number; dir: Dir; why: 'open' | 'edge' | 'blocked' | 'shape' } | null;
  joints: Joint[];
  /** Bags on the path without cardboard. */
  unbraced: number;
}

const inside = (l: Layout, x: number, y: number) => x >= 0 && y >= 0 && x < l.w && y < l.h;

/** Follow the air from the cabin outlet as far as the pieces carry it. */
export function trace(board: Board): Trace {
  const l = board.layout;
  const outletKey = Object.keys(l.fixed).find((k) => l.fixed[k]!.kind === 'outlet')!;
  const outlet = l.fixed[outletKey] as { kind: 'outlet'; dir: Dir };
  let [x, y] = outletKey.split(',').map(Number) as [number, number];
  let dir = outlet.dir;
  let shape: Shape = 'round';
  const cells = [{ x, y }];
  const joints: Joint[] = [];
  const seen = new Set([cellKey(x, y)]);
  let unbraced = 0;
  const improvised = (cx: number, cy: number) => board.placed[cellKey(cx, cy)]?.kind === 'bag';
  for (;;) {
    const nx = x + DX[dir];
    const ny = y + DY[dir];
    if (!inside(l, nx, ny)) return { cells, complete: false, end: { x, y, dir, why: 'edge' }, joints, unbraced };
    const open = openings(board, nx, ny);
    if (open.size === 0) {
      const why = l.fixed[cellKey(nx, ny)] ? 'blocked' : 'open';
      return { cells, complete: false, end: { x, y, dir, why }, joints, unbraced };
    }
    const back = opposite(dir);
    const fits = open.get(back);
    if (!fits) return { cells, complete: false, end: { x, y, dir, why: 'blocked' }, joints, unbraced };
    if (fits !== shape) return { cells, complete: false, end: { x, y, dir, why: 'shape' }, joints, unbraced };
    const key = jointKey(x, y, dir);
    const taped = board.taped.has(key);
    joints.push({ key, taped, leaking: (improvised(x, y) || improvised(nx, ny)) && !taped });
    if (seen.has(cellKey(nx, ny))) return { cells, complete: false, end: { x, y, dir, why: 'blocked' }, joints, unbraced };
    seen.add(cellKey(nx, ny));
    cells.push({ x: nx, y: ny });
    const p = board.placed[cellKey(nx, ny)];
    if (p?.kind === 'bag' && !p.braced) unbraced++;
    if (l.fixed[cellKey(nx, ny)]?.kind === 'socket') return { cells, complete: true, end: null, joints, unbraced };
    const out = [...open.entries()].find(([d]) => d !== back);
    if (!out) return { cells, complete: false, end: { x: nx, y: ny, dir: back, why: 'blocked' }, joints, unbraced };
    [x, y, dir, shape] = [nx, ny, out[0], out[1]];
  }
}

/** Share of full airflow through a board, 0–1: 0 until the path is complete. */
export function flowOf(board: Board): number {
  const tr = trace(board);
  if (!tr.complete) return 0;
  const leaks = tr.joints.filter((j) => j.leaking).length;
  return LEAK_FLOW ** leaks * COLLAPSE_FLOW ** tr.unbraced;
}

export const activeBoard = (g: Co2Game): Board => g.boards[g.active]!;

const playing = (g: Co2Game) => g.state === 'playing' && !activeBoard(g).done;

export type PlaceResult = 'placed' | 'braced' | 'rotated' | 'none' | 'fixed' | 'occupied' | 'notBag';

/** Use the selected piece on a cell: place it, brace a bag with cardboard, or turn a piece already there. */
export function useOn(g: Co2Game, x: number, y: number, kind: PieceKind): PlaceResult {
  if (!playing(g)) return 'fixed';
  const b = activeBoard(g);
  if (!inside(b.layout, x, y) || b.layout.fixed[cellKey(x, y)]) return 'fixed';
  const here = b.placed[cellKey(x, y)];
  if (kind === 'tape') return 'none';
  if (kind === 'cardboard') {
    if (!here || here.kind !== 'bag' || here.braced) return 'notBag';
    if (g.left.cardboard <= 0) return 'none';
    g.left.cardboard--;
    here.braced = true;
    checkDone(g);
    return 'braced';
  }
  if (here) {
    rotate(g, x, y);
    return 'rotated';
  }
  if (g.left[kind] <= 0) return 'none';
  g.left[kind]--;
  b.placed[cellKey(x, y)] = { kind, rot: 0, braced: false };
  autoTurn(b, x, y);
  checkDone(g);
  return 'placed';
}

/**
 * Turn a new piece the most helpful way, so placing feels smart: accept the air path's open end if it points
 * here, join as many neighbours as fit (same shape on both sides), and never point into the panel's edge or a
 * block. The player can still turn it by hand.
 */
function autoTurn(b: Board, x: number, y: number): void {
  const p = b.placed[cellKey(x, y)]!;
  const end = trace(b).end;
  const feeds = end && end.x + DX[end.dir] === x && end.y + DY[end.dir] === y ? end : null;
  let best = 0;
  let bestScore = -Infinity;
  for (let r = 0; r < 4; r++) {
    p.rot = r;
    let score = 0;
    for (const [d, shape] of openings(b, x, y)) {
      const nx = x + DX[d];
      const ny = y + DY[d];
      if (!inside(b.layout, nx, ny)) {
        score -= 4;
        continue;
      }
      const back = openings(b, nx, ny).get(opposite(d));
      if (back === shape) score += 3;
      else if (back) score -= 1;
      else if (b.layout.fixed[cellKey(nx, ny)]) score -= 3;
      if (feeds && d === opposite(feeds.dir) && back === shape) score += 10;
    }
    if (score > bestScore) {
      bestScore = score;
      best = r;
    }
  }
  p.rot = best;
}

/** Turn a placed piece a quarter turn clockwise. */
export function rotate(g: Co2Game, x: number, y: number): boolean {
  if (!playing(g)) return false;
  const p = activeBoard(g).placed[cellKey(x, y)];
  if (!p) return false;
  p.rot = (p.rot + 1) % 4;
  checkDone(g);
  return true;
}

/** Take a piece back off the grid (its cardboard too). Tape stays on its joint. */
export function remove(g: Co2Game, x: number, y: number): boolean {
  if (!playing(g)) return false;
  const b = activeBoard(g);
  const p = b.placed[cellKey(x, y)];
  if (!p) return false;
  g.left[p.kind]++;
  if (p.braced) g.left.cardboard++;
  delete b.placed[cellKey(x, y)];
  return true;
}

/** Tape a leaking joint on the path. */
export function tapeJoint(g: Co2Game, key: string): 'taped' | 'none' | 'notLeak' {
  if (!playing(g)) return 'notLeak';
  const b = activeBoard(g);
  if (!trace(b).joints.some((j) => j.key === key && j.leaking)) return 'notLeak';
  if (g.left.tape <= 0) return 'none';
  g.left.tape--;
  b.taped.add(key);
  checkDone(g);
  return 'taped';
}

/** Leaking joints on the active board's path. */
export const leaks = (g: Co2Game): string[] => trace(activeBoard(g)).joints.filter((j) => j.leaking).map((j) => j.key);

/** Lock the active board once its path is complete, sealed and braced; hand back the pieces not on the path. */
export function checkDone(g: Co2Game): boolean {
  const b = activeBoard(g);
  if (b.done) return false;
  const tr = trace(b);
  if (!tr.complete || tr.unbraced > 0 || tr.joints.some((j) => j.leaking)) return false;
  b.done = true;
  const used = new Set(tr.cells.map((c) => cellKey(c.x, c.y)));
  for (const [k, p] of Object.entries(b.placed)) {
    if (used.has(k)) continue;
    g.left[p.kind]++;
    if (p.braced) g.left.cardboard++;
    delete b.placed[k];
  }
  if (g.active < g.boards.length - 1) g.active++;
  return true;
}

/** Both builds done: time runs faster to splashdown. */
export const allDone = (g: Co2Game): boolean => g.boards.every((b) => b.done);
export const timeLeftS = (g: Co2Game): number => Math.max(0, RESCUE_S - g.timeS);
/** Pieces still in the supply. */
export const piecesLeft = (g: Co2Game): number => PIECES.reduce((n, k) => n + g.left[k], 0);

/** CO₂ removed per second right now, mmHg/s. A board scrubs while its path flows and its canister has room. */
export function scrubRate(g: Co2Game): number {
  return g.boards.reduce((s, b) => s + (b.capacity > 0 ? SCRUB_K * g.co2 * flowOf(b) : 0), 0);
}

/** Move the game on by `dt` real seconds. */
export function stepCo2(g: Co2Game, dt: number): void {
  if (g.state !== 'playing' || dt <= 0) return;
  const h = Math.min(dt, 0.25) * (allDone(g) ? FAST_FORWARD : 1);
  for (const b of g.boards) {
    if (b.capacity <= 0) continue;
    const s = SCRUB_K * g.co2 * flowOf(b) * h;
    const take = Math.min(s, b.capacity);
    b.capacity -= take;
    g.co2 -= take;
  }
  g.co2 = Math.max(0, g.co2 + CO2_RISE * h);
  g.peak = Math.max(g.peak, g.co2);
  g.timeS += h;
  if (g.co2 >= CO2_DANGER) g.state = 'lost';
  else if (timeLeftS(g) <= 0) g.state = 'won';
}

/** Stars: 0 if the CO₂ reached the danger line; then by the peak CO₂ and the pieces left. */
export function co2Stars(g: Co2Game): 0 | 1 | 2 | 3 {
  if (g.state !== 'won') return 0;
  if (g.peak < 11.5 && piecesLeft(g) >= 5) return 3;
  if (g.peak < 13) return 2;
  return 1;
}
