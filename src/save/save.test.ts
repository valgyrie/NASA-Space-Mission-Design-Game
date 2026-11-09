import { describe, expect, it } from 'vitest';
import { MARKET_LOT_KG } from '../game/balance';
import { acceptContract } from '../game/contracts';
import { sell, sellPrice } from '../game/market';
import { newSiteState } from '../game/siteState';
import { SAVE_KEY, type SaveData, type SaveStorage, loadGame, saveGame } from './save';

function memoryStorage(): SaveStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
  };
}

const state = { ...newSiteState(), money: 1_850_000, day: 12.5, mines: [{ x: 3, z: 4 }] };
state.stock.copper = 125;
const game: SaveData = { version: 5, company: { name: 'Comet Works' }, site: { seed: 'K7QXM2' }, state };

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
      version: 5,
      company: { name: 'Comet Works' },
      site: { seed: 'BCD234' },
      state: newSiteState(),
    });
  });

  it('upgrades a version 2 save: keeps the Seed, fresh economy', () => {
    const storage = memoryStorage();
    storage.data.set(SAVE_KEY, JSON.stringify({ version: 2, company: { name: 'A B' }, site: { seed: 'K7QXM2' } }));
    expect(loadGame(storage)?.site.seed).toBe('K7QXM2');
    expect(loadGame(storage)?.state).toEqual(newSiteState());
  });

  it('upgrades a version 3 save: keeps Mines and stock, adds Factories, Warehouses and Parts', () => {
    const storage = memoryStorage();
    const v3State = { money: 1_000_000, day: 40, mines: [{ x: 3, z: 4 }], stock: { aluminium: 5, copper: 6, silicon: 7 } };
    storage.data.set(SAVE_KEY, JSON.stringify({ version: 3, company: { name: 'A B' }, site: { seed: 'K7QXM2' }, state: v3State }));
    const loaded = loadGame(storage);
    expect(loaded?.version).toBe(5);
    expect(loaded?.state).toEqual({ ...newSiteState(), ...v3State });
  });

  it('upgrades a version 4 save: keeps everything, no Contracts yet', () => {
    const storage = memoryStorage();
    const { contracts: _, ...v4State } = { ...newSiteState(), money: 900_000, day: 80, mines: [{ x: 3, z: 4 }] };
    v4State.parts.smallBus = 2;
    storage.data.set(SAVE_KEY, JSON.stringify({ version: 4, company: { name: 'A B' }, site: { seed: 'K7QXM2' }, state: v4State }));
    const loaded = loadGame(storage);
    expect(loaded?.version).toBe(5);
    expect(loaded?.state).toEqual({ ...v4State, contracts: [] });
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
    const busy = { ...newSiteState(), warehouses: [{ x: 1, z: 1 }] };
    busy.factories.push({ kind: 'batteryPlant', x: 2, z: 2, making: 'smallBattery', progress: 1.5 });
    busy.parts.smallBattery = 3;
    saveGame(storage, { ...game, state: busy });
    expect(loadGame(storage)?.state).toEqual(busy);
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
