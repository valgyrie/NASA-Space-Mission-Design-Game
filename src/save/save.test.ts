import { describe, expect, it } from 'vitest';
import { MARKET_LOT_KG } from '../game/balance';
import { acceptContract } from '../game/contracts';
import { sell, sellPrice } from '../game/market';
import { newSiteState } from '../game/siteState';
import { launch, shipMission } from '../game/mission';
import { type OptionId, choose, emptyDesign, partsNeeded } from '../game/spacecraft';
import { JPL } from '../game/places';
import { SAVE_KEY, SAVE_VERSION, type SaveData, type SaveStorage, loadGame, saveGame } from './save';

function memoryStorage(): SaveStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
  };
}

const EXPLORER: OptionId[] = ['smallBus', 'batteriesOnly', 'largeBattery', 'simpleAntenna', 'spin', 'radiationDetector'];

/** Where saves from before real places (version 12 and older) start: JPL, with their old made-up Site. */
const LEGACY = { ...JPL, start: 'legacy' as const };
const state = { ...newSiteState(LEGACY), money: 1_850_000, day: 12.5, mines: [{ x: 3, z: 4, level: 1, upgradeDay: null }] };
state.stock.copper = 125;
const game: SaveData = { version: 14, company: { name: 'Comet Works' }, site: { seed: 'K7QXM2' }, state };

describe('local save', () => {
  it('restores what was saved', () => {
    const storage = memoryStorage();
    expect(saveGame(storage, game)).toBe(true);
    expect(loadGame(storage)).toEqual(game);
  });

  it('has nothing to load on a new game', () => {
    expect(loadGame(memoryStorage())).toBeNull();
  });

  it('keeps money and remaining Raw Materials after a sale', () => {
    const storage = memoryStorage();
    const sold = structuredClone(game);
    expect(sell(sold.state, 'copper')).toEqual({ ok: true });
    expect(saveGame(storage, sold)).toBe(true);

    const loaded = loadGame(storage);
    expect(loaded?.state.money).toBe(game.state.money + sellPrice('copper'));
    expect(loaded?.state.stock.copper).toBe(game.state.stock.copper - MARKET_LOT_KG);
    expect(loaded).toEqual(sold);
  });

  it('ignores a broken or unknown save instead of crashing', () => {
    const storage = memoryStorage();
    storage.data.set(SAVE_KEY, '{not json');
    expect(loadGame(storage)).toBeNull();
    storage.data.set(SAVE_KEY, JSON.stringify({ version: 99, company: { name: 'X' } }));
    expect(loadGame(storage)).toBeNull();
    storage.data.set(SAVE_KEY, JSON.stringify({ ...game, state: { ...state, money: 'lots' } }));
    expect(loadGame(storage)).toBeNull();
  });

  it('upgrades a version 1 save: new Seed, fresh economy', () => {
    const storage = memoryStorage();
    storage.data.set(SAVE_KEY, JSON.stringify({ version: 1, company: { name: 'Comet Works' } }));
    expect(loadGame(storage, () => 'BCD234')).toEqual({
      version: SAVE_VERSION,
      company: { name: 'Comet Works' },
      site: { seed: 'BCD234' },
      state: newSiteState(LEGACY),
    });
  });

  it('upgrades a version 2 save: keeps the Seed, fresh economy', () => {
    const storage = memoryStorage();
    storage.data.set(SAVE_KEY, JSON.stringify({ version: 2, company: { name: 'A B' }, site: { seed: 'K7QXM2' } }));
    expect(loadGame(storage)?.site.seed).toBe('K7QXM2');
    expect(loadGame(storage)?.state).toEqual(newSiteState(LEGACY));
  });

  it('upgrades a version 3 save: keeps Mines and stock, adds Factories, Warehouses and Parts', () => {
    const storage = memoryStorage();
    const v3State = { money: 1_000_000, day: 40, mines: [{ x: 3, z: 4 }], stock: { aluminium: 5, copper: 6, silicon: 7 } };
    storage.data.set(SAVE_KEY, JSON.stringify({ version: 3, company: { name: 'A B' }, site: { seed: 'K7QXM2' }, state: v3State }));
    const loaded = loadGame(storage);
    expect(loaded?.version).toBe(SAVE_VERSION);
    expect(loaded?.state).toEqual({ ...newSiteState(LEGACY), ...v3State, mines: [{ x: 3, z: 4, level: 1, upgradeDay: null }] });
  });

  it('upgrades a version 4 save: keeps everything, no Contracts yet', () => {
    const storage = memoryStorage();
    const { contracts: _, ...v4State } = { ...newSiteState(LEGACY), money: 900_000, day: 80, mines: [{ x: 3, z: 4 }] };
    v4State.parts.smallBus = 2;
    storage.data.set(SAVE_KEY, JSON.stringify({ version: 4, company: { name: 'A B' }, site: { seed: 'K7QXM2' }, state: v4State }));
    const loaded = loadGame(storage);
    expect(loaded?.version).toBe(SAVE_VERSION);
    expect(loaded?.state).toEqual({ ...v4State, mines: [{ x: 3, z: 4, level: 1, upgradeDay: null }], contracts: [] });
  });

  it('upgrades a version 5 save: keeps everything, adds an empty design and the Radiation Detector Part', () => {
    const storage = memoryStorage();
    const { design: _, completed: _c, mission: _m, reports: _r, ...v5State } = structuredClone({ ...newSiteState(LEGACY), money: 700_000, day: 90 });
    const { radiationDetector: __, ...v5Parts } = { ...v5State.parts, smallBus: 1 };
    const v5 = { ...v5State, parts: v5Parts, contracts: [{ id: 'explorer1', acceptedDay: 3 }] };
    storage.data.set(SAVE_KEY, JSON.stringify({ version: 5, company: { name: 'A B' }, site: { seed: 'K7QXM2' }, state: v5 }));
    const loaded = loadGame(storage);
    expect(loaded?.version).toBe(SAVE_VERSION);
    expect(loaded?.state).toEqual({
      ...v5,
      parts: { ...v5Parts, radiationDetector: 0 },
      design: emptyDesign(),
      completed: [],
      mission: null,
      reports: [],
      history: ['explorer1Before'],
    });
  });

  it('upgrades a version 6 save: keeps everything, nothing shipped or done yet', () => {
    const storage = memoryStorage();
    const { completed: _c, mission: _m, reports: _r, ...v6State } = structuredClone({ ...newSiteState(LEGACY), money: 600_000 });
    storage.data.set(SAVE_KEY, JSON.stringify({ version: 6, company: { name: 'A B' }, site: { seed: 'K7QXM2' }, state: v6State }));
    const loaded = loadGame(storage);
    expect(loaded?.version).toBe(SAVE_VERSION);
    expect(loaded?.state).toEqual({ ...v6State, completed: [], mission: null, reports: [] });
  });

  it('upgrades a version 7 save: Mission Reports keep everything, with no design', () => {
    const storage = memoryStorage();
    const busy = structuredClone(game);
    for (const id of EXPLORER) choose(busy.state.design, id);
    for (const p of partsNeeded(busy.state.design)) busy.state.parts[p] += 1;
    acceptContract(busy.state, 'explorer1');
    shipMission(busy.state, busy.state.design);
    busy.state.day = busy.state.mission!.readyDay;
    launch(busy.state, busy.site.seed);
    const { design: _d, anomaly: _a, ...v7Report } = busy.state.reports[0]!;
    const { anomalyBest: _b, ...v7State } = busy.state;
    storage.data.set(SAVE_KEY, JSON.stringify({ ...busy, version: 7, state: { ...v7State, reports: [v7Report] } }));
    const loaded = loadGame(storage);
    expect(loaded?.version).toBe(SAVE_VERSION);
    expect(loaded?.state.reports).toEqual([{ ...v7Report, design: null, anomaly: null }]);
  });

  it('upgrades a version 8 save: no Anomaly in its reports, none played yet', () => {
    const storage = memoryStorage();
    const busy = structuredClone(game);
    for (const id of EXPLORER) choose(busy.state.design, id);
    for (const p of partsNeeded(busy.state.design)) busy.state.parts[p] += 1;
    acceptContract(busy.state, 'explorer1');
    shipMission(busy.state, busy.state.design);
    busy.state.day = busy.state.mission!.readyDay;
    launch(busy.state, busy.site.seed);
    const { anomaly: _a, ...v8Report } = busy.state.reports[0]!;
    const { anomalyBest: _b, ...v8State } = busy.state;
    storage.data.set(SAVE_KEY, JSON.stringify({ ...busy, version: 8, state: { ...v8State, reports: [v8Report] } }));
    const loaded = loadGame(storage);
    expect(loaded?.version).toBe(SAVE_VERSION);
    expect(loaded?.state.reports).toEqual([{ ...v8Report, anomaly: null }]);
    expect(loaded?.state.anomalyBest).toEqual({});
  });

  it('upgrades a version 9 save: patches and cards for what it already did, tutorial not skipped', () => {
    const storage = memoryStorage();
    const busy = structuredClone(game);
    for (const id of EXPLORER) choose(busy.state.design, id);
    for (const p of partsNeeded(busy.state.design)) busy.state.parts[p] += 1;
    acceptContract(busy.state, 'explorer1');
    shipMission(busy.state, busy.state.design);
    busy.state.day = busy.state.mission!.readyDay;
    launch(busy.state, busy.site.seed);
    const { history: _h, patches: _p, tutorial: _t, ...v9State } = busy.state;
    storage.data.set(SAVE_KEY, JSON.stringify({ ...busy, version: 9, state: v9State }));
    const loaded = loadGame(storage)!;
    expect(loaded.version).toBe(SAVE_VERSION);
    const success = busy.state.reports[0]!.success;
    expect(loaded.state.history).toEqual(success ? ['explorer1Before', 'explorer1After', 'vanguard1'] : []);
    expect(loaded.state.patches).toEqual(success ? [{ contract: 'explorer1', day: busy.state.reports[0]!.launchDay }] : []);
    expect(loaded.state.tutorial).toEqual({ skipped: false, testRun: false });
  });

  it('upgrades a version 10 save: no Labs or research yet, Juno I picked, Vanguard 1 card if Explorer 1 is done', () => {
    const storage = memoryStorage();
    const busy = structuredClone(game);
    for (const id of EXPLORER) choose(busy.state.design, id);
    for (const p of partsNeeded(busy.state.design)) busy.state.parts[p] += 1;
    acceptContract(busy.state, 'explorer1');
    shipMission(busy.state, busy.state.design);
    busy.state.day = busy.state.mission!.readyDay;
    launch(busy.state, busy.site.seed);
    expect(busy.state.completed).toEqual(['explorer1']);
    const { labs: _l, research: _r, vehicle: _v, ...v10State } = busy.state;
    v10State.history = v10State.history.filter((id) => id !== 'vanguard1');
    storage.data.set(SAVE_KEY, JSON.stringify({ ...busy, version: 10, state: v10State }));
    const loaded = loadGame(storage)!;
    expect(loaded.version).toBe(SAVE_VERSION);
    expect(loaded.state).toEqual(busy.state);
  });

  it('upgrades a version 10 save with a Mission on its way: built with no tech tree Upgrades', () => {
    const storage = memoryStorage();
    const busy = structuredClone(game);
    for (const id of EXPLORER) choose(busy.state.design, id);
    for (const p of partsNeeded(busy.state.design)) busy.state.parts[p] += 1;
    acceptContract(busy.state, 'explorer1');
    shipMission(busy.state, busy.state.design);
    const { labs: _l, research: _r, vehicle: _v, ...v10State } = busy.state;
    const { tech: _t, ...v10Mission } = busy.state.mission!;
    storage.data.set(SAVE_KEY, JSON.stringify({ ...busy, version: 10, state: { ...v10State, mission: v10Mission } }));
    const loaded = loadGame(storage)!;
    expect(loaded.state.mission).toEqual({ ...v10Mission, tech: [] });
    expect(loaded.state.history).not.toContain('vanguard1');
  });

  it('upgrades a version 11 save: every building level 1, every Part Mk 1, the Assembly Hall placed later', () => {
    const storage = memoryStorage();
    const old = structuredClone(game);
    old.state.labs.push({ x: 5, z: 6, level: 1, upgradeDay: null });
    old.state.parts.smallBus = 2;
    for (const id of EXPLORER) choose(old.state.design, id);
    for (const p of partsNeeded(old.state.design)) old.state.parts[p] += 1;
    acceptContract(old.state, 'explorer1');
    shipMission(old.state, old.state.design);
    const strip = <T extends object>(b: T) => {
      const { level: _l, upgradeDay: _u, ...rest } = b as T & { level: number; upgradeDay: unknown };
      return rest;
    };
    const { assemblyHall: _a, betterParts: _b, ...v11State } = old.state;
    const { marks: _m, ...v11Mission } = old.state.mission!;
    const v11 = { ...v11State, mines: v11State.mines.map(strip), labs: v11State.labs.map(strip), mission: v11Mission };
    storage.data.set(SAVE_KEY, JSON.stringify({ ...old, version: 11, state: v11 }));
    expect(loadGame(storage)?.state).toEqual(old.state);
  });

  it('keeps building levels, Upgrades under way, the Assembly Hall and Part Marks', () => {
    const storage = memoryStorage();
    const kept = structuredClone(game);
    kept.state.mines[0]!.level = 3;
    kept.state.mines[0]!.upgradeDay = null;
    kept.state.labs.push({ x: 5, z: 6, level: 2, upgradeDay: 40.5 });
    kept.state.assemblyHall = { x: 8, z: 8, level: 2, upgradeDay: null };
    kept.state.parts.largeBattery = 3;
    kept.state.betterParts.largeBattery = [1, 1];
    saveGame(storage, kept);
    expect(loadGame(storage)?.state).toEqual(kept.state);
    storage.data.set(SAVE_KEY, JSON.stringify({ ...kept, state: { ...kept.state, assemblyHall: { x: 8, z: 8 } } }));
    expect(loadGame(storage)).toBeNull();
  });

  it('keeps Research Labs, research and the picked Launch Vehicle', () => {
    const storage = memoryStorage();
    const kept = structuredClone(game);
    kept.state.labs.push({ x: 5, z: 6, level: 1, upgradeDay: null });
    kept.state.research = { processedKb: 640, tech: ['strongerRadio'] };
    kept.state.vehicle = 'thorAble';
    saveGame(storage, kept);
    expect(loadGame(storage)?.state).toEqual(kept.state);
    storage.data.set(SAVE_KEY, JSON.stringify({ ...kept, state: { ...kept.state, research: { processedKb: 0, tech: ['warpDrive'] } } }));
    expect(loadGame(storage)).toBeNull();
  });

  it('upgrades a version 9 save with an accepted Contract: its "before" card is in the Archive', () => {
    const storage = memoryStorage();
    const taken = structuredClone(game);
    acceptContract(taken.state, 'explorer1');
    const { history: _h, patches: _p, tutorial: _t, ...v9State } = taken.state;
    storage.data.set(SAVE_KEY, JSON.stringify({ ...taken, version: 9, state: v9State }));
    expect(loadGame(storage)?.state.history).toEqual(['explorer1Before']);
  });

  it('keeps the History Archive, patches and tutorial progress', () => {
    const storage = memoryStorage();
    const kept = structuredClone(game);
    kept.state.history.push('explorer1Before');
    kept.state.patches.push({ contract: 'explorer1', day: 40 });
    kept.state.tutorial = { skipped: true, testRun: true };
    saveGame(storage, kept);
    expect(loadGame(storage)?.state).toEqual(kept.state);
    storage.data.set(SAVE_KEY, JSON.stringify({ ...kept, state: { ...kept.state, history: ['sputnik'] } }));
    expect(loadGame(storage)).toBeNull();
  });

  it('keeps an Anomaly waiting to be settled and the best scores', () => {
    const storage = memoryStorage();
    const busy = structuredClone(game);
    for (const id of EXPLORER) choose(busy.state.design, id);
    for (const p of partsNeeded(busy.state.design)) busy.state.parts[p] += 1;
    acceptContract(busy.state, 'explorer1');
    shipMission(busy.state, busy.state.design);
    busy.state.day = busy.state.mission!.readyDay;
    launch(busy.state, busy.site.seed);
    busy.state.anomalyBest.antenna = 0.75;
    expect(busy.state.reports[0]!.anomaly?.score).toBeNull();
    saveGame(storage, busy);
    expect(loadGame(storage)?.state).toEqual(busy.state);
  });

  it('keeps a Mission on its way, finished Contracts and Mission Reports', () => {
    const storage = memoryStorage();
    const busy = structuredClone(game);
    for (const id of EXPLORER) choose(busy.state.design, id);
    for (const p of partsNeeded(busy.state.design)) busy.state.parts[p] += 1;
    acceptContract(busy.state, 'explorer1');
    expect(shipMission(busy.state, busy.state.design).ok).toBe(true);
    saveGame(storage, busy);
    expect(loadGame(storage)?.state.mission).toEqual(busy.state.mission);
    busy.state.day = busy.state.mission!.readyDay;
    launch(busy.state, busy.site.seed);
    saveGame(storage, busy);
    const loaded = loadGame(storage)!.state;
    expect(loaded.mission).toBeNull();
    expect(loaded.completed).toEqual(['explorer1']);
    expect(loaded.reports).toEqual(busy.state.reports);
  });

  it('ignores a save with a half-built Spacecraft on its way', () => {
    const storage = memoryStorage();
    const mission = { contract: 'explorer1', design: emptyDesign(), vehicle: 'juno1', site: 'capeCanaveral', tech: [], startDay: 0, shipDay: 30, readyDay: 37 };
    storage.data.set(SAVE_KEY, JSON.stringify({ ...game, state: { ...state, mission } }));
    expect(loadGame(storage)).toBeNull();
  });

  it('keeps the Spacecraft design', () => {
    const storage = memoryStorage();
    const designed = structuredClone(game);
    choose(designed.state.design, 'smallBus');
    choose(designed.state.design, 'radiationDetector');
    saveGame(storage, designed);
    expect(loadGame(storage)?.state.design).toEqual({ ...emptyDesign(), bus: 'smallBus', payload: 'radiationDetector' });
  });

  it('ignores a save with an option in the wrong slot', () => {
    const storage = memoryStorage();
    const odd = { ...game, state: { ...state, design: { ...emptyDesign(), bus: 'largeBattery' } } };
    storage.data.set(SAVE_KEY, JSON.stringify(odd));
    expect(loadGame(storage)).toBeNull();
  });

  it('keeps an accepted Contract and its deadline', () => {
    const storage = memoryStorage();
    const taken = structuredClone(game);
    acceptContract(taken.state, 'explorer1');
    saveGame(storage, taken);
    expect(loadGame(storage)?.state.contracts).toEqual([{ id: 'explorer1', acceptedDay: 12.5 }]);
  });

  it('ignores a save with an unknown Contract', () => {
    const storage = memoryStorage();
    const odd = { ...game, state: { ...state, contracts: [{ id: 'sputnik', acceptedDay: 0 }] } };
    storage.data.set(SAVE_KEY, JSON.stringify(odd));
    expect(loadGame(storage)).toBeNull();
  });

  it('restores Factories mid-Part and Parts in stock', () => {
    const storage = memoryStorage();
    const busy = { ...newSiteState(), warehouses: [{ x: 1, z: 1, level: 1, upgradeDay: null }] };
    busy.factories.push({ kind: 'batteryPlant', x: 2, z: 2, making: 'smallBattery', progress: 1.5, level: 1, upgradeDay: null });
    busy.parts.smallBattery = 3;
    saveGame(storage, { ...game, state: busy });
    expect(loadGame(storage)?.state).toEqual(busy);
  });

  it('upgrades a version 12 save: from before real places, it keeps its Site and ships from JPL to Cape Canaveral', () => {
    const storage = memoryStorage();
    const { place: _p, launchSite: _l, ...v12State } = game.state;
    storage.data.set(SAVE_KEY, JSON.stringify({ ...game, version: 12, state: v12State }));
    const loaded = loadGame(storage)!;
    expect(loaded.version).toBe(SAVE_VERSION);
    expect(loaded.state.place).toEqual({ ...JPL, start: 'legacy' });
    expect(loaded.state.launchSite).toBe('capeCanaveral');
  });

  it('upgrades a version 13 save: no Launch Insurance, nothing reopened, the startup grant still to come', () => {
    const storage = memoryStorage();
    const { reopened: _r, grantDay: _g, ...v13State } = game.state;
    const report = { contract: 'explorer1', vehicle: 'juno1', site: 'capeCanaveral', launchDay: 40, success: false, reward: 0, findings: [], design: null, anomaly: null };
    storage.data.set(SAVE_KEY, JSON.stringify({ ...game, version: 13, state: { ...v13State, reports: [report] } }));
    const loaded = loadGame(storage)!;
    expect(loaded.version).toBe(SAVE_VERSION);
    expect(loaded.state.reopened).toEqual([]);
    expect(loaded.state.grantDay).toBeNull();
    expect(loaded.state.reports[0]!.insurancePaid).toBe(0);
  });

  it('keeps a real start place', () => {
    const storage = memoryStorage();
    const far = { ...game, state: { ...state, place: { lat: -33.9, lon: 151.2, start: 'anywhere' as const }, launchSite: 'wallops' as const } };
    saveGame(storage, far);
    expect(loadGame(storage)?.state.place).toEqual(far.state.place);
    expect(loadGame(storage)?.state.launchSite).toBe('wallops');
  });

  it('reports when the browser refuses to save', () => {
    const full: SaveStorage = {
      getItem: () => null,
      setItem: () => {
        throw new DOMException('full', 'QuotaExceededError');
      },
    };
    expect(saveGame(full, game)).toBe(false);
  });
});
