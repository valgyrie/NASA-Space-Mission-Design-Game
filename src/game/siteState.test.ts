import { describe, expect, it } from 'vitest';
import { generateSite } from '../site/site';
import { MINE_COST, MINE_OUTPUT_PER_DAY, SECONDS_PER_DAY, START_MONEY } from './balance';
import { advanceDays, checkMine, daysFor, newSiteState, placeMine } from './siteState';

const site = generateSite('K7QXM2');
const tileIndex = (pred: (i: number) => boolean) => site.tiles.findIndex((_, i) => pred(i));
const xz = (i: number) => [i % site.size, Math.floor(i / site.size)] as const;
const copper = xz(tileIndex((i) => site.tiles[i]!.deposit === 'copper'));
const silicon = xz(tileIndex((i) => site.tiles[i]!.deposit === 'silicon'));
const bare = xz(tileIndex((i) => site.tiles[i]!.deposit === null));

describe('Mines', () => {
  it('can only go on a Deposit', () => {
    const state = newSiteState();
    expect(placeMine(site, state, ...bare)).toEqual({ ok: false, problem: 'noDeposit' });
    expect(placeMine(site, state, -1, 0)).toEqual({ ok: false, problem: 'noDeposit' });
    expect(state.mines).toEqual([]);
  });

  it('dig up whatever their Deposit holds', () => {
    const state = newSiteState();
    expect(placeMine(site, state, ...copper)).toEqual({ ok: true, material: 'copper' });
  });

  it('cost money, and need enough of it', () => {
    const state = newSiteState();
    placeMine(site, state, ...copper);
    expect(state.money).toBe(START_MONEY - MINE_COST);
    state.money = MINE_COST - 1;
    expect(checkMine(site, state, ...silicon)).toEqual({ ok: false, problem: 'money' });
  });

  it('cannot share a tile', () => {
    const state = newSiteState();
    placeMine(site, state, ...copper);
    expect(placeMine(site, state, ...copper)).toEqual({ ok: false, problem: 'occupied' });
  });
});

describe('time', () => {
  it('makes Mines produce, in proportion to days passed', () => {
    const state = newSiteState();
    placeMine(site, state, ...copper);
    advanceDays(site, state, 3.5);
    expect(state.day).toBe(3.5);
    expect(state.stock.copper).toBeCloseTo(3.5 * MINE_OUTPUT_PER_DAY);
    expect(state.stock.silicon).toBe(0);
  });

  it('runs twice as fast at 2× and stops when paused', () => {
    expect(daysFor(0.1, 1)).toBeCloseTo(0.1 / SECONDS_PER_DAY);
    expect(daysFor(0.1, 2)).toBeCloseTo(daysFor(0.1, 1) * 2);
    expect(daysFor(0.1, 4)).toBeCloseTo(daysFor(0.1, 1) * 4);
    expect(daysFor(0.1, 0)).toBe(0);
  });

  it('does not jump ahead after a long pause in frames', () => {
    expect(daysFor(30, 1)).toBe(daysFor(1, 1));
  });
});
