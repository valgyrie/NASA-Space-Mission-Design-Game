import { describe, expect, it } from 'vitest';
import { SAVE_KEY, type SaveData, type SaveStorage, loadGame, saveGame } from './save';

function memoryStorage(): SaveStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
  };
}

const game: SaveData = { version: 2, company: { name: 'Comet Works' }, site: { seed: 'K7QXM2' } };

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
    storage.data.set(SAVE_KEY, JSON.stringify({ version: 2, company: { name: 'X' } }));
    expect(loadGame(storage)).toBeNull();
  });

  it('upgrades a version 1 save by giving it a Seed', () => {
    const storage = memoryStorage();
    storage.data.set(SAVE_KEY, JSON.stringify({ version: 1, company: { name: 'Comet Works' } }));
    expect(loadGame(storage, () => 'BCD234')).toEqual({
      version: 2,
      company: { name: 'Comet Works' },
      site: { seed: 'BCD234' },
    });
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
