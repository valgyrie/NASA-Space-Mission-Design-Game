import { describe, expect, it } from 'vitest';
import { DEFAULT_LOGO } from '../company/logo';
import { newSiteState } from '../game/siteState';
import { COMPANIES_KEY, activeCompany, activeStorage, companyLogo, companyStorage, deleteCompany, listCompanies, loadCompany } from './companies';
import { SAVE_KEY, SAVE_VERSION, type SaveData, loadGame, saveGame } from './save';

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  };
}

const company = (name: string, day = 0): SaveData => ({
  version: SAVE_VERSION,
  company: { name, logo: { ...DEFAULT_LOGO } },
  site: { seed: 'K7QXM2' },
  state: { ...newSiteState(), day },
});
const PNG = 'data:image/png;base64,iVBORw0KGgo=';

describe('several Companies', () => {
  it('keeps each Company under its own key and lists the last played first', () => {
    const storage = memoryStorage();
    let clock = 1;
    const a = companyStorage(storage, null, () => clock++);
    saveGame(a, company('Comet Works', 3));
    const b = companyStorage(storage, null, () => clock++);
    saveGame(b, company('Orbit Farm'));
    expect(listCompanies(storage).map((e) => e.name)).toEqual(['Orbit Farm', 'Comet Works']);
    expect(listCompanies(storage)[1]).toMatchObject({ day: 3, playMode: 'campaign', seed: 'K7QXM2' });
    expect(loadCompany(storage, a.id!)?.company.name).toBe('Comet Works');
    // Playing the older one again moves it to the top and makes it active.
    saveGame(a, company('Comet Works', 9));
    expect(listCompanies(storage).map((e) => e.name)).toEqual(['Comet Works', 'Orbit Farm']);
    expect(activeCompany(storage)?.id).toBe(a.id);
  });

  it('turns the single save from before into the first Company', () => {
    const storage = memoryStorage();
    saveGame(storage, company('Old Save', 40));
    const [entry] = listCompanies(storage);
    expect(entry).toMatchObject({ name: 'Old Save', day: 40 });
    expect(storage.data.has(SAVE_KEY)).toBe(false);
    expect(loadCompany(storage, entry!.id)?.state.day).toBe(40);
    expect(activeCompany(storage)?.id).toBe(entry!.id);
  });

  it('keeps an uploaded logo out of the list itself', () => {
    const storage = memoryStorage();
    const game = company('Picture Co');
    game.company.logo = { kind: 'upload', png: PNG };
    const s = companyStorage(storage);
    saveGame(s, game);
    expect(storage.data.get(COMPANIES_KEY)).not.toContain('base64');
    expect(companyLogo(storage, listCompanies(storage)[0]!)).toEqual({ kind: 'upload', png: PNG });
  });

  it('deletes a Company and its save', () => {
    const storage = memoryStorage();
    const a = companyStorage(storage);
    saveGame(a, company('Gone'));
    const b = companyStorage(storage);
    saveGame(b, company('Kept'));
    deleteCompany(storage, b.id!);
    expect(listCompanies(storage).map((e) => e.name)).toEqual(['Gone']);
    expect(activeCompany(storage)?.id).toBe(a.id);
    expect([...storage.data.keys()].some((k) => k.endsWith(b.id!))).toBe(false);
  });

  it('lets Online read and replace the active Company', () => {
    const storage = memoryStorage();
    expect(loadGame(activeStorage(storage))).toBeNull();
    saveGame(activeStorage(storage), company('From the cloud'));
    expect(listCompanies(storage)).toHaveLength(1);
    saveGame(activeStorage(storage), company('From the cloud', 7));
    expect(listCompanies(storage)).toHaveLength(1);
    expect(loadGame(activeStorage(storage))?.state.day).toBe(7);
  });

  it('ignores a broken list', () => {
    const storage = memoryStorage();
    storage.setItem(COMPANIES_KEY, '{oops');
    expect(listCompanies(storage)).toEqual([]);
  });
});
