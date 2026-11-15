import { describe, expect, it } from 'vitest';
import {
  CO2_DANGER,
  type Co2Game,
  type PieceKind,
  SUPPLY,
  activeBoard,
  allDone,
  cellKey,
  co2Stars,
  flowOf,
  leaks,
  newCo2Game,
  openings,
  piecesLeft,
  remove,
  rotate,
  stepCo2,
  tapeJoint,
  trace,
  useOn,
} from './co2Model';

type Step = [x: number, y: number, kind: PieceKind, rot: number];

/** Known solutions: [x, y, piece, quarter turns]. */
const SOLUTIONS: Step[][] = [
  [
    [1, 2, 'hose', 0],
    [2, 2, 'bag', 2],
    [4, 2, 'bag', 0],
    [5, 2, 'bend', 0],
    [5, 1, 'hose', 1],
    [5, 0, 'bend', 2],
  ],
  [
    [1, 4, 'hose', 0],
    [2, 4, 'hose', 0],
    [3, 4, 'bend', 0],
    [3, 3, 'bag', 1],
    [3, 1, 'bag', 3],
    [3, 0, 'bend', 2],
    [4, 0, 'hose', 0],
    [5, 0, 'bend', 3],
    [5, 1, 'bend', 1],
  ],
];

/** Lay a solution's pieces at the right rotation (without bracing or tape). */
function lay(g: Co2Game, steps: Step[]): void {
  for (const [x, y, kind, rot] of steps) {
    expect(useOn(g, x, y, kind)).toBe('placed');
    const p = activeBoard(g).placed[cellKey(x, y)]!;
    while (p.rot !== rot) rotate(g, x, y);
  }
}

/** Brace the bags and tape the leaks, finishing the board. */
function finish(g: Co2Game, steps: Step[]): void {
  for (const [x, y, kind] of steps) if (kind === 'bag') expect(useOn(g, x, y, 'cardboard')).toBe('braced');
  for (const k of leaks(g)) expect(tapeJoint(g, k)).toBe('taped');
}

describe('Square Peg, Round Hole: the model', () => {
  it('has a square canister and round outlet and socket', () => {
    const g = newCo2Game();
    const b = activeBoard(g);
    expect([...openings(b, 3, 2).values()]).toEqual(['square', 'square']);
    expect([...openings(b, 0, 2).values()]).toEqual(['round']);
    expect([...openings(b, 6, 0).values()]).toEqual(['round']);
  });

  it("won't join a round hose straight to the square canister", () => {
    const g = newCo2Game();
    useOn(g, 1, 2, 'hose');
    useOn(g, 2, 2, 'hose');
    const tr = trace(activeBoard(g));
    expect(tr.complete).toBe(false);
    expect(tr.end).toMatchObject({ x: 2, y: 2, why: 'shape' });
  });

  it('turns a bag to fit the open end when it is placed', () => {
    const g = newCo2Game();
    useOn(g, 1, 2, 'hose');
    useOn(g, 2, 2, 'bag');
    expect(activeBoard(g).placed['2,2']!.rot).toBe(2);
    expect(trace(activeBoard(g)).cells.map((c) => cellKey(c.x, c.y))).toContain('3,2');
  });

  it('turns each piece to join the path when they are placed in order from the fan', () => {
    const g = newCo2Game();
    for (const steps of SOLUTIONS) {
      for (const [x, y, kind] of steps) useOn(g, x, y, kind);
      expect(trace(activeBoard(g)).complete).toBe(true);
      finish(g, steps);
    }
    expect(allDone(g)).toBe(true);
  });

  it('flows only when the path reaches the socket, and better once sealed and braced', () => {
    const g = newCo2Game();
    const b = activeBoard(g);
    lay(g, SOLUTIONS[0]!.slice(0, -1));
    expect(flowOf(b)).toBe(0);
    lay(g, SOLUTIONS[0]!.slice(-1));
    const tr = trace(b);
    expect(tr.complete).toBe(true);
    expect(tr.unbraced).toBe(2);
    expect(leaks(g)).toHaveLength(4);
    const leaky = flowOf(b);
    expect(leaky).toBeGreaterThan(0);
    expect(leaky).toBeLessThan(0.2);
    finish(g, SOLUTIONS[0]!);
    expect(flowOf(b)).toBe(1);
    expect(b.done).toBe(true);
    expect(g.active).toBe(1);
  });

  it('counts pieces: none left means none placed, and removing gives them back', () => {
    const g = newCo2Game();
    for (let i = 0; i < SUPPLY.bag; i++) expect(useOn(g, i, 4, 'bag')).toBe(i === 4 ? 'fixed' : 'placed');
    expect(g.left.bag).toBe(1);
    expect(useOn(g, 5, 4, 'bag')).toBe('placed');
    expect(g.left.bag).toBe(0);
    expect(useOn(g, 6, 4, 'bag')).toBe('none');
    expect(useOn(g, 0, 4, 'cardboard')).toBe('braced');
    expect(remove(g, 0, 4)).toBe(true);
    expect(g.left.bag).toBe(1);
    expect(g.left.cardboard).toBe(SUPPLY.cardboard);
  });

  it('tapes only leaking joints, one strip each', () => {
    const g = newCo2Game();
    lay(g, SOLUTIONS[0]!);
    expect(tapeJoint(g, '0,0,1')).toBe('notLeak');
    const [first] = leaks(g);
    expect(tapeJoint(g, first!)).toBe('taped');
    expect(tapeJoint(g, first!)).toBe('notLeak');
    expect(g.left.tape).toBe(SUPPLY.tape - 1);
  });

  it('has enough pieces for both builds, with some to spare', () => {
    const g = newCo2Game();
    lay(g, SOLUTIONS[0]!);
    useOn(g, 0, 4, 'hose'); // a stray piece, handed back when the build locks
    finish(g, SOLUTIONS[0]!);
    expect(g.boards[0]!.done).toBe(true);
    lay(g, SOLUTIONS[1]!);
    expect(trace(activeBoard(g)).complete).toBe(true);
    finish(g, SOLUTIONS[1]!);
    expect(allDone(g)).toBe(true);
    expect(piecesLeft(g)).toBeGreaterThanOrEqual(5);
  });

  it('reaches the danger line if nothing is built', () => {
    const g = newCo2Game();
    for (let i = 0; i < 10000 && g.state === 'playing'; i++) stepCo2(g, 0.1);
    expect(g.state).toBe('lost');
    expect(g.co2).toBeGreaterThanOrEqual(CO2_DANGER);
    expect(co2Stars(g)).toBe(0);
  });

  it('brings the CO₂ down with a quick first build, then needs the second', () => {
    const g = newCo2Game();
    for (let i = 0; i < 150; i++) stepCo2(g, 0.1); // 15 s to build
    lay(g, SOLUTIONS[0]!);
    finish(g, SOLUTIONS[0]!);
    const at = g.co2;
    for (let i = 0; i < 100; i++) stepCo2(g, 0.1);
    expect(g.co2).toBeLessThan(at);
    // The first canister saturates; without the second build the CO₂ climbs to danger.
    for (let i = 0; i < 10000 && g.state === 'playing'; i++) stepCo2(g, 0.1);
    expect(g.boards[0]!.capacity).toBe(0);
    expect(g.state).toBe('lost');
  });

  it('wins with both builds done in time, three stars when quick', () => {
    const g = newCo2Game();
    for (let i = 0; i < 150; i++) stepCo2(g, 0.1);
    lay(g, SOLUTIONS[0]!);
    finish(g, SOLUTIONS[0]!);
    for (let i = 0; i < 200; i++) stepCo2(g, 0.1);
    lay(g, SOLUTIONS[1]!);
    finish(g, SOLUTIONS[1]!);
    for (let i = 0; i < 10000 && g.state === 'playing'; i++) stepCo2(g, 0.1);
    expect(g.state).toBe('won');
    expect(co2Stars(g)).toBe(3);
  });
});
