import { describe, expect, it } from 'vitest';
import { t } from '../strings';
import { ERAS, MODERN_ERA } from './eras';
import { FACTORY_KINDS, PARTS } from '../economy/part';
import { RAW_MATERIALS, type RawMaterial } from '../economy/rawMaterial';
import { generateSite, tileAt } from '../site/site';
import {
  BASE_STORAGE_KG,
  BUILD_COST,
  MARKET_LOT_KG,
  MINE_COST,
  MINE_OUTPUT_PER_DAY,
  RECIPES,
  SECONDS_PER_DAY,
  START_MONEY,
  WAREHOUSE_STORAGE_KG,
} from './balance';
import { buy, buyPrice, checkBuy, makingCost, MARKET_ITEMS, sell, sellPrice } from './market';
import {
  FOOTPRINT,
  advanceDays,
  allBuildings,
  build,
  buildingAt,
  checkBuild,
  covers,
  daysFor,
  fitBuildings,
  footprint,
  foundationLevel,
  mineMaterial,
  newSiteState,
  partsMadeBy,
  setMaking,
  storageCapacity,
  storageUsed,
} from './siteState';

const site = generateSite('K7QXM2');
const tileIndex = (pred: (i: number) => boolean) => site.tiles.findIndex((_, i) => pred(i));
const xz = (i: number) => [i % site.size, Math.floor(i / site.size)] as const;
/** Is every tile under a building centred on tile i on the Site? */
const inside = (i: number) => footprint(...xz(i)).every((t) => tileAt(site, t.x, t.z));
const canMine = (material: RawMaterial) => (i: number) =>
  site.tiles[i]!.deposit === material && checkBuild(site, newSiteState(), 'mine', ...xz(i)).ok;
const copper = xz(tileIndex(canMine('copper')));
const silicon = xz(tileIndex(canMine('silicon')));
const bareTiles = site.tiles.flatMap((_, i) => (checkBuild(site, newSiteState(), 'warehouse', ...xz(i)).ok ? [xz(i)] : []));
const bare = bareTiles[0]!;
const water = xz(tileIndex((i) => site.tiles[i]!.terrain === 'water' && inside(i)));

describe('Mines', () => {
  it('can only go on a Deposit', () => {
    const state = newSiteState();
    expect(build(site, state, 'mine', ...bare)).toEqual({ ok: false, problem: 'noDeposit' });
    expect(build(site, state, 'mine', -1, 0)).toEqual({ ok: false, problem: 'edge' });
    expect(state.mines).toEqual([]);
  });

  it('only need to touch a Deposit, and dig the one nearest their middle', () => {
    const [x, z] = copper;
    const beside = footprint(x, z).find((t) => !tileAt(site, t.x, t.z)!.deposit && checkBuild(site, newSiteState(), 'mine', t.x, t.z).ok);
    expect(beside).toBeDefined();
    expect(mineMaterial(site, beside!)).toBe('copper');
    expect(mineMaterial(site, { x: bare[0], z: bare[1] })).toBeNull();
  });

  it('can dig every Raw Material on any Site', () => {
    for (const seed of ['K7QXM2', 'AB12CD', 'ZZ99', 'COAST1', 'maple-42', 'LAKE7', 'R1VER', 'DRY000']) {
      const s = generateSite(seed);
      for (const material of RAW_MATERIALS) {
        const spot = s.tiles.findIndex((_, i) => {
          const at = { x: i % s.size, z: Math.floor(i / s.size) };
          return mineMaterial(s, at) === material && checkBuild(s, newSiteState(), 'mine', at.x, at.z).ok;
        });
        expect(spot, `${material} on ${seed}`).toBeGreaterThanOrEqual(0);
      }
    }
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

describe('Building footprints', () => {
  it('take 3 × 3 tiles, centred on their own tile', () => {
    expect(FOOTPRINT).toBe(3);
    const tiles = footprint(10, 20);
    expect(tiles).toHaveLength(9);
    expect(tiles[0]).toEqual({ x: 10, z: 20 });
    expect(covers({ x: 10, z: 20 }, 11, 19)).toBe(true);
    expect(covers({ x: 10, z: 20 }, 12, 20)).toBe(false);
  });

  it('keep buildings from overlapping, and off the edge of the Site', () => {
    const state = newSiteState();
    const [x, z] = bare;
    build(site, state, 'warehouse', x, z);
    for (const t of footprint(x + 1, z + 1)) {
      expect(checkBuild(site, state, 'warehouse', t.x, t.z)).toMatchObject({ ok: false });
    }
    expect(buildingAt(state, x + 1, z - 1)).toMatchObject({ kind: 'warehouse' });
    expect(buildingAt(state, x + 2, z)).toBeNull();
    expect(checkBuild(site, newSiteState(), 'warehouse', 0, 0)).toEqual({ ok: false, problem: 'edge' });
    expect(checkBuild(site, newSiteState(), 'warehouse', site.size - 1, 5)).toEqual({ ok: false, problem: 'edge' });
  });

  it('stand on the highest ground under them', () => {
    for (const [x, z] of bareTiles.slice(0, 200)) {
      const levels = footprint(x, z).map((t) => tileAt(site, t.x, t.z)!.level);
      expect(foundationLevel(site, x, z)).toBe(Math.max(...levels));
    }
  });

  it('move apart in a save from when buildings took one tile', () => {
    const state = newSiteState();
    const [x, z] = bare;
    const at = (dx: number) => ({ x: x + dx, z, level: 2, upgradeDay: null });
    state.warehouses.push(at(0), at(1));
    state.labs.push(at(2));
    state.mines.push({ x: copper[0], z: copper[1], level: 1, upgradeDay: null });
    expect(fitBuildings(site, state)).toBe(true);
    const all = allBuildings(state).map((b) => b.building);
    for (const a of all) {
      for (const b of all) if (a !== b) expect(Math.abs(a.x - b.x) >= FOOTPRINT || Math.abs(a.z - b.z) >= FOOTPRINT).toBe(true);
    }
    // The first keeps its place and the Mine its Deposit; levels are untouched.
    expect(state.warehouses[0]).toMatchObject({ x, z, level: 2 });
    expect(state.mines[0]).toMatchObject({ x: copper[0], z: copper[1] });
    expect(mineMaterial(site, state.mines[0]!)).toBe('copper');
    expect(fitBuildings(site, state)).toBe(false);
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

  it("keeps room for a Factory's inputs, so its Part or returned inputs never overfill storage (ticket 05)", () => {
    const fill = (state: ReturnType<typeof newSiteState>) => {
      state.stock.copper += Math.max(0, BASE_STORAGE_KG - storageUsed(state));
    };
    // A Small Bus finishing into full storage.
    const finished = newSiteState();
    build(site, finished, 'metalWorks', ...bare);
    finished.stock.aluminium = RECIPES.smallBus.inputs.aluminium!;
    advanceDays(site, finished, 1);
    expect(finished.factories[0]!.progress).not.toBeNull();
    expect(storageUsed(finished)).toBeCloseTo(RECIPES.smallBus.inputs.aluminium!);
    fill(finished);
    advanceDays(site, finished, RECIPES.smallBus.days);
    expect(finished.parts.smallBus).toBe(1);
    expect(storageUsed(finished)).toBeLessThanOrEqual(BASE_STORAGE_KG);
    // Switching Part gives the inputs back into full storage.
    const switched = newSiteState();
    build(site, switched, 'metalWorks', ...bare);
    switched.stock.aluminium = RECIPES.smallBus.inputs.aluminium!;
    advanceDays(site, switched, 1);
    fill(switched);
    setMaking(switched, switched.factories[0]!, 'mediumBus');
    expect(switched.stock.aluminium).toBe(RECIPES.smallBus.inputs.aluminium!);
    expect(storageUsed(switched)).toBeLessThanOrEqual(BASE_STORAGE_KG + 1e-9);
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

  it.each(RAW_MATERIALS)('sells a lot of %s for money without a Factory', (material) => {
    const state = newSiteState();
    state.money = 0;
    state.stock[material] = MARKET_LOT_KG;
    const before = structuredClone(state);

    expect(sell(state, material)).toEqual({ ok: true });
    expect(state).toEqual({
      ...before,
      money: sellPrice(material),
      stock: { ...before.stock, [material]: 0 },
    });
  });

  it.each(RAW_MATERIALS)('keeps the fractional remainder when selling %s', (material) => {
    const state = newSiteState();
    state.stock[material] = MARKET_LOT_KG * 2 + 0.5;

    expect(sell(state, material)).toEqual({ ok: true });
    expect(sell(state, material)).toEqual({ ok: true });
    expect(state.stock[material]).toBe(0.5);
    expect(state.money).toBe(START_MONEY + sellPrice(material) * 2);
    const before = structuredClone(state);
    expect(sell(state, material)).toEqual({ ok: false, problem: 'none' });
    expect(state).toEqual(before);
  });

  it.each(RAW_MATERIALS)('needs a full lot of %s and leaves a refused sale unchanged', (material) => {
    for (const kg of [0, MARKET_LOT_KG - 0.001]) {
      const state = newSiteState();
      state.stock[material] = kg;
      const before = structuredClone(state);

      expect(sell(state, material)).toEqual({ ok: false, problem: 'none' });
      expect(state).toEqual(before);
    }
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

describe('Era cards', () => {
  it('opens a new Campaign with Era 1’s card, but not a new Free Play Company', () => {
    expect(newSiteState().eraSeen).toBe(0);
    expect(newSiteState(undefined, 'easy', 'freePlay').eraSeen).toBe(MODERN_ERA);
  });

  it('gives every Era an illustration description', () => {
    for (const era of [...ERAS, MODERN_ERA] as const) expect(t(`era.${era}.alt`)).toMatch(/^Illustration: /);
  });
});
