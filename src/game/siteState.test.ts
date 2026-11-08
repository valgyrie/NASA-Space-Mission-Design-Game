import { describe, expect, it } from 'vitest';
import { FACTORY_KINDS, PARTS } from '../economy/part';
import { RAW_MATERIALS } from '../economy/rawMaterial';
import { generateSite } from '../site/site';
import {
  BASE_STORAGE_KG,
  BUILD_COST,
  MINE_COST,
  MINE_OUTPUT_PER_DAY,
  RECIPES,
  SECONDS_PER_DAY,
  START_MONEY,
  WAREHOUSE_STORAGE_KG,
} from './balance';
import { buy, buyPrice, checkBuy, makingCost, MARKET_ITEMS, sell, sellPrice } from './market';
import {
  advanceDays,
  build,
  checkBuild,
  daysFor,
  newSiteState,
  partsMadeBy,
  setMaking,
  storageCapacity,
  storageUsed,
} from './siteState';

const site = generateSite('K7QXM2');
const tileIndex = (pred: (i: number) => boolean) => site.tiles.findIndex((_, i) => pred(i));
const xz = (i: number) => [i % site.size, Math.floor(i / site.size)] as const;
const copper = xz(tileIndex((i) => site.tiles[i]!.deposit === 'copper'));
const silicon = xz(tileIndex((i) => site.tiles[i]!.deposit === 'silicon'));
const bareTiles = site.tiles.flatMap((tile, i) => (tile.deposit === null && tile.terrain !== 'water' ? [xz(i)] : []));
const bare = bareTiles[0]!;
const water = xz(tileIndex((i) => site.tiles[i]!.terrain === 'water'));

describe('Mines', () => {
  it('can only go on a Deposit', () => {
    const state = newSiteState();
    expect(build(site, state, 'mine', ...bare)).toEqual({ ok: false, problem: 'noDeposit' });
    expect(build(site, state, 'mine', -1, 0)).toEqual({ ok: false, problem: 'noDeposit' });
    expect(state.mines).toEqual([]);
  });

  it('dig up whatever their Deposit holds', () => {
    const state = newSiteState();
    build(site, state, 'mine', ...copper);
    advanceDays(site, state, 2);
    expect(state.stock.copper).toBeCloseTo(2 * MINE_OUTPUT_PER_DAY);
  });

  it('cost money, and need enough of it', () => {
    const state = newSiteState();
    build(site, state, 'mine', ...copper);
    expect(state.money).toBe(START_MONEY - MINE_COST);
    state.money = MINE_COST - 1;
    expect(checkBuild(site, state, 'mine', ...silicon)).toEqual({ ok: false, problem: 'money' });
  });

  it('cannot share a tile', () => {
    const state = newSiteState();
    build(site, state, 'mine', ...copper);
    expect(build(site, state, 'mine', ...copper)).toEqual({ ok: false, problem: 'occupied' });
  });
});

describe('Factories and the Warehouse', () => {
  it('go on dry land without a Deposit', () => {
    const state = newSiteState();
    expect(build(site, state, 'metalWorks', ...copper)).toEqual({ ok: false, problem: 'onDeposit' });
    expect(build(site, state, 'warehouse', ...water)).toEqual({ ok: false, problem: 'water' });
    expect(build(site, state, 'metalWorks', ...bare)).toEqual({ ok: true });
    expect(build(site, state, 'warehouse', ...bare)).toEqual({ ok: false, problem: 'occupied' });
    expect(state.money).toBe(START_MONEY - BUILD_COST.metalWorks);
  });

  it('each make at least one Part', () => {
    for (const kind of FACTORY_KINDS) expect(partsMadeBy(kind).length).toBeGreaterThan(0);
  });

  it('keep chains to Mine → Factory → Part: every input is a Raw Material', () => {
    for (const part of PARTS) {
      const inputs = Object.keys(RECIPES[part].inputs);
      expect(inputs.length).toBeGreaterThan(0);
      for (const input of inputs) expect(RAW_MATERIALS).toContain(input);
    }
  });

  it('make Parts lighter than what goes in, so storage never overfills', () => {
    for (const part of PARTS) {
      const inputKg = Object.values(RECIPES[part].inputs).reduce((a, b) => a + b, 0);
      expect(RECIPES[part].massKg).toBeLessThan(inputKg);
    }
  });

  it('turn Raw Materials into Parts over time', () => {
    const state = newSiteState();
    build(site, state, 'batteryPlant', ...bare);
    const recipe = RECIPES.smallBattery;
    state.stock.copper = recipe.inputs.copper! * 2;
    advanceDays(site, state, recipe.days * 0.5);
    expect(state.parts.smallBattery).toBe(0);
    expect(state.stock.copper).toBe(recipe.inputs.copper!); // taken when it starts
    advanceDays(site, state, recipe.days);
    expect(state.parts.smallBattery).toBe(1);
    advanceDays(site, state, recipe.days * 10);
    expect(state.parts.smallBattery).toBe(2);
    expect(state.stock.copper).toBe(0);
    expect(state.factories[0]!.progress).toBeNull(); // waiting for copper
  });

  it('can switch Part; a started one gives its Raw Materials back', () => {
    const state = newSiteState();
    build(site, state, 'batteryPlant', ...bare);
    state.stock.copper = 100;
    advanceDays(site, state, 1);
    const factory = state.factories[0]!;
    setMaking(state, factory, 'largeBattery');
    expect(state.stock.copper).toBe(100);
    expect(factory).toMatchObject({ making: 'largeBattery', progress: null });
    setMaking(state, factory, 'smallBus'); // not something a Battery Plant makes
    expect(factory.making).toBe('largeBattery');
  });

  it('stop Mines when storage is full; a Warehouse adds room', () => {
    const state = newSiteState();
    build(site, state, 'mine', ...copper);
    expect(storageCapacity(state)).toBe(BASE_STORAGE_KG);
    advanceDays(site, state, 10_000);
    expect(storageUsed(state)).toBeCloseTo(BASE_STORAGE_KG);
    build(site, state, 'warehouse', ...bare);
    expect(storageCapacity(state)).toBe(BASE_STORAGE_KG + WAREHOUSE_STORAGE_KG);
    advanceDays(site, state, 1);
    expect(state.stock.copper).toBeCloseTo(BASE_STORAGE_KG + MINE_OUTPUT_PER_DAY);
  });
});

describe('Market', () => {
  it('sells above making cost and buys below it', () => {
    for (const item of MARKET_ITEMS) {
      expect(buyPrice(item)).toBeGreaterThan(makingCost(item));
      expect(sellPrice(item)).toBeLessThan(makingCost(item));
    }
  });

  it('values a Part above the Raw Materials in it', () => {
    expect(makingCost('smallBus')).toBeGreaterThan(makingCost('aluminium') * 4);
  });

  it('buys and sells with money and storage', () => {
    const state = newSiteState();
    expect(buy(state, 'solarCells')).toEqual({ ok: true });
    expect(state.parts.solarCells).toBe(1);
    expect(state.money).toBe(START_MONEY - buyPrice('solarCells'));
    expect(sell(state, 'solarCells')).toEqual({ ok: true });
    expect(sell(state, 'solarCells')).toEqual({ ok: false, problem: 'none' });
    state.money = 0;
    expect(checkBuy(state, 'copper')).toEqual({ ok: false, problem: 'money' });
    state.money = START_MONEY;
    state.stock.copper = BASE_STORAGE_KG;
    expect(checkBuy(state, 'copper')).toEqual({ ok: false, problem: 'space' });
  });
});

describe('time', () => {
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
