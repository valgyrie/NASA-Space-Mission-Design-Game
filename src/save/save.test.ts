import { describe, expect, it } from 'vitest';
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
const game: SaveData = { version: 3, company: { name: 'Comet Works' }, site: { seed: 'K7QXM2' }, state };

describe('local save', () => {
  it('restores what was saved', () => {
    const storage = memoryStorage();
    expect(saveGame(storage, game)).toBe(true);
    expect(loadGame(storage)).toEqual(game);
  });

  it('has nothing to load on a new game', () => {
    expect(loadGame(memoryStorage())).toBeNull();
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
      version: 3,
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
