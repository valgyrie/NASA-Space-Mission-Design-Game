import { describe, expect, it } from 'vitest';
import { JPL } from './places';
import { generateSite, tileAt } from '../site/site';
import {
  ASSEMBLY_HALL_COST,
  BUILD_COST,
  LAB_KB_PER_DAY,
  MINE_OUTPUT_PER_DAY,
  RECIPES,
  UPGRADE,
  WAREHOUSE_STORAGE_KG,
} from './balance';
import { acceptContract } from './contracts';
import { sell } from './market';
import { planLaunch, shipMission, testRunFor } from './mission';
import { labRate } from './research';
import {
  type SiteState,
  addPart,
  advanceDays,
  bestMark,
  build,
  buildingAt,
  checkBuild,
  footprint,
  newSiteState,
  partsByMark,
  placeAssemblyHall,
  storageCapacity,
  storageUsed,
  takePart,
} from './siteState';
import { type OptionId, OPTIONS, checkDesign, choose, emptyDesign, partsNeeded, powerOf, spacecraftMass, statsOf } from './spacecraft';
import { checkUpgrade, hallLevel, maxLevel, nextUpgrade, startUpgrade, upgradeDaysLeft } from './upgrades';

const site = generateSite('K7QXM2');
const xz = (i: number) => [i % site.size, Math.floor(i / site.size)] as const;
/** Spots a building fits, far enough apart for one on each. */
const bare = site.tiles
  .flatMap((_, i) => (checkBuild(site, newSiteState(), 'warehouse', ...xz(i)).ok ? [xz(i)] : []))
  .filter(([x, z], _i, all) => (x - all[0]![0]) % 4 === 0 && (z - all[0]![1]) % 4 === 0);
const copper = xz(site.tiles.findIndex((tile, i) => tile.deposit === 'copper' && checkBuild(site, newSiteState(), 'mine', ...xz(i)).ok));

const EXPLORER: OptionId[] = ['smallBus', 'batteriesOnly', 'largeBattery', 'simpleAntenna', 'spin', 'radiationDetector'];
const TIROS: OptionId[] = ['mediumBus', 'batteriesOnly', 'largeBattery', 'simpleAntenna', 'spin', 'radiationDetector'];

function withDesign(ids: OptionId[]): SiteState {
  const state = newSiteState();
  state.money = 50_000_000;
  acceptContract(state, 'explorer1');
  for (const id of ids) choose(state.design, id);
  for (const p of partsNeeded(state.design)) state.parts[p] += 1;
  return state;
}

describe('Building Upgrades', () => {
  it('cost money and take days; the building keeps its level until they are done', () => {
    const state = newSiteState();
    build(site, state, 'warehouse', ...bare[0]!);
    const w = state.warehouses[0]!;
    expect(w.level).toBe(1);
    const next = nextUpgrade('warehouse', w)!;
    expect(next).toEqual({ level: 2, cost: BUILD_COST.warehouse * UPGRADE[2].costShare, days: UPGRADE[2].days });
    const money = state.money;
    expect(startUpgrade(state, 'warehouse', w)).toEqual({ ok: true });
    expect(state.money).toBe(money - next.cost);
    expect(checkUpgrade(state, 'warehouse', w)).toEqual({ ok: false, problem: 'underway' });
    expect(upgradeDaysLeft(state, w)).toBe(UPGRADE[2].days);
    advanceDays(site, state, UPGRADE[2].days - 1);
    expect(w.level).toBe(1);
    expect(upgradeDaysLeft(state, w)).toBe(1);
    advanceDays(site, state, 1);
    expect(w.level).toBe(2);
    expect(w.upgradeDay).toBeNull();
    expect(upgradeDaysLeft(state, w)).toBeNull();
  });

  it('stop at the top level and need the money', () => {
    const state = newSiteState();
    build(site, state, 'warehouse', ...bare[0]!);
    const w = state.warehouses[0]!;
    w.level = maxLevel('warehouse');
    expect(nextUpgrade('warehouse', w)).toBeNull();
    expect(checkUpgrade(state, 'warehouse', w)).toEqual({ ok: false, problem: 'topLevel' });
    w.level = 1;
    state.money = 0;
    expect(startUpgrade(state, 'warehouse', w)).toEqual({ ok: false, problem: 'money' });
    expect(w.upgradeDay).toBeNull();
  });

  it('raise Mine output, Warehouse storage and Research Lab pace', () => {
    const state = newSiteState(JPL, 'advanced');
    build(site, state, 'mine', ...copper);
    build(site, state, 'warehouse', ...bare[0]!);
    build(site, state, 'researchLab', ...bare[1]!);
    const before = storageCapacity(state);
    for (const list of [state.mines, state.warehouses, state.labs]) list[0]!.level = 3;
    expect(storageCapacity(state)).toBe(before + WAREHOUSE_STORAGE_KG);
    expect(labRate(state)).toBe(LAB_KB_PER_DAY * 2);
    advanceDays(site, state, 1);
    expect(state.stock.copper).toBeCloseTo(MINE_OUTPUT_PER_DAY * 2, 6);
  });

  it('show on every building, the Assembly Hall included', () => {
    const state = newSiteState();
    const hall = placeAssemblyHall(site, state);
    expect(buildingAt(state, hall.x, hall.z)).toMatchObject({ kind: 'assemblyHall', building: { level: 1 } });
    expect(nextUpgrade('assemblyHall', hall)?.cost).toBe(ASSEMBLY_HALL_COST);
  });
});

describe('Part Marks', () => {
  it('a Factory makes Parts of its own level', () => {
    const state = newSiteState();
    build(site, state, 'batteryPlant', ...bare[0]!);
    const plant = state.factories[0]!;
    plant.level = 2;
    state.stock.copper = 100;
    advanceDays(site, state, RECIPES.smallBattery.days);
    expect(partsByMark(state, 'smallBattery')).toEqual([0, 1]);
    expect(bestMark(state, 'smallBattery')).toBe(2);
  });

  it('Spacecraft take the best, the Market buys the worst', () => {
    const state = newSiteState();
    addPart(state, 'smallBus', 1);
    addPart(state, 'smallBus', 3);
    addPart(state, 'smallBus', 2);
    expect(partsByMark(state, 'smallBus')).toEqual([1, 1, 1]);
    sell(state, 'smallBus');
    expect(partsByMark(state, 'smallBus')).toEqual([0, 1, 1]);
    expect(takePart(state, 'smallBus', 'best')).toBe(3);
    expect(partsByMark(state, 'smallBus')).toEqual([0, 1, 0]);
    expect(state.parts.smallBus).toBe(1);
    expect(takePart(state, 'smallBus', 'worst')).toBe(2);
    expect(takePart(state, 'smallBus', 'worst')).toBe(0);
  });

  it('better Marks are lighter and use less power, in storage too', () => {
    const state = newSiteState();
    addPart(state, 'mediumBus', 3);
    expect(storageUsed(state)).toBeCloseTo(RECIPES.mediumBus.massKg * 0.7, 6);
    const design = emptyDesign();
    for (const id of EXPLORER) choose(design, id);
    expect(spacecraftMass(design, { bus: 2 })).toBeCloseTo(spacecraftMass(design) - RECIPES.smallBus.massKg * 0.15, 6);
    expect(statsOf(OPTIONS.simpleAntenna, [], 2).powerUseW).toBeCloseTo(OPTIONS.simpleAntenna.stats.powerUseW! * 0.9, 6);
    expect(statsOf(OPTIONS.solarCells, [], 3).solarW).toBeCloseTo(OPTIONS.solarCells.stats.solarW! * 1.2, 6);
    expect(powerOf(design, [], { comms: 2, payload: 2 }).lastsDays).toBeGreaterThan(powerOf(design).lastsDays);
  });

  it('a Mission ships with the best Parts in the Warehouse and flies their Marks', () => {
    const state = withDesign(EXPLORER);
    addPart(state, 'smallBus', 2);
    const check = checkDesign(state, state.design);
    expect(check.marks).toEqual({ bus: 2 });
    const plan = planLaunch(state, state.design);
    expect(plan.massKg).toBeCloseTo(spacecraftMass(state.design, { bus: 2 }), 6);
    expect(testRunFor(state, 'K7QXM2', state.design).asLabelled.findings[0]).toMatchObject({ massKg: plan.massKg });
    expect(shipMission(state, state.design).ok).toBe(true);
    expect(state.mission?.marks).toEqual({ bus: 2 });
    expect(partsByMark(state, 'smallBus')).toEqual([1, 0]);
  });
});

describe('Assembly Hall', () => {
  it('stands on free dry land near the middle, once', () => {
    const state = newSiteState();
    const hall = placeAssemblyHall(site, state);
    for (const t of footprint(hall.x, hall.z)) {
      const tile = tileAt(site, t.x, t.z)!;
      expect(tile.terrain).not.toBe('water');
      expect(tile.deposit).toBeNull();
    }
    expect(placeAssemblyHall(site, state)).toBe(hall);
    expect(build(site, state, 'warehouse', hall.x, hall.z)).toEqual({ ok: false, problem: 'occupied' });
  });

  it('takes only a Small Bus at level 1: a Medium Bus can be designed and tested, not shipped', () => {
    const state = withDesign(TIROS);
    placeAssemblyHall(site, state);
    expect(hallLevel(state)).toBe(1);
    const check = checkDesign(state, state.design);
    expect(check.problems).toContainEqual({ kind: 'hallTooSmall', bus: 'mediumBus', need: 2, level: 1 });
    expect(check.ready).toBe(false);
    expect(testRunFor(state, 'K7QXM2', state.design).runs).toBeGreaterThan(0);
    expect(planLaunch(state, state.design).problems).toContainEqual({ kind: 'hallTooSmall', bus: 'mediumBus', need: 2, level: 1 });
    expect(shipMission(state, state.design).ok).toBe(false);
  });

  it('takes a Medium Bus once upgraded to level 2, its top level for now', () => {
    const state = withDesign(TIROS);
    const hall = placeAssemblyHall(site, state);
    expect(startUpgrade(state, 'assemblyHall', hall).ok).toBe(true);
    advanceDays(site, state, UPGRADE[2].days);
    expect(hallLevel(state)).toBe(2);
    expect(nextUpgrade('assemblyHall', hall)).toBeNull();
    expect(planLaunch(state, state.design).problems.map((p) => p.kind)).not.toContain('hallTooSmall');
  });
});
