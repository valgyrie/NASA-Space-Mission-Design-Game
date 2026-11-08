import { randomSeed } from '../site/seed';

/** Local save in the browser. One save slot for now; cloud saves come with online play. */

export const SAVE_KEY = 'leap.save';
export const SAVE_VERSION = 2;
export const AUTOSAVE_MS = 30_000;

export interface Company {
  name: string;
}

export interface SaveData {
  version: typeof SAVE_VERSION;
  company: Company;
  /** The Site map is rebuilt from its Seed, so only the Seed is stored. */
  site: { seed: string };
}

/** The part of the Web Storage API we use, so tests can pass a fake. */
export type SaveStorage = Pick<Storage, 'getItem' | 'setItem'>;

function isSaveData(value: unknown): value is SaveData {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Partial<SaveData>;
  return v.version === SAVE_VERSION && typeof v.company?.name === 'string' && typeof v.site?.seed === 'string';
}

/** Bring an older save up to date. Version 1 had no Site yet, so it gets a fresh Seed. */
function upgrade(data: unknown, newSeed: () => string): unknown {
  const v = data as { version?: unknown; company?: unknown };
  if (v?.version === 1) return { version: 2, company: v.company, site: { seed: newSeed() } };
  return data;
}

/** The saved game, or null if there is none or it can't be read. */
export function loadGame(storage: SaveStorage, newSeed: () => string = randomSeed): SaveData | null {
  try {
    const raw = storage.getItem(SAVE_KEY);
    if (raw === null) return null;
    const data = upgrade(JSON.parse(raw), newSeed);
    return isSaveData(data) ? data : null;
  } catch {
    return null;
  }
}

/** Write the game. Returns false if the browser refused (private mode, storage full). */
export function saveGame(storage: SaveStorage, data: SaveData): boolean {
  try {
    storage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

/**
 * Save now, then every AUTOSAVE_MS and whenever the page is hidden or closed.
 * Returns a function that stops autosaving.
 */
export function startAutosave(storage: SaveStorage, current: () => SaveData): () => void {
  const save = () => saveGame(storage, current());
  const onHidden = () => {
    if (document.visibilityState === 'hidden') save();
  };
  save();
  const timer = window.setInterval(save, AUTOSAVE_MS);
  document.addEventListener('visibilitychange', onHidden);
  window.addEventListener('pagehide', save);
  return () => {
    window.clearInterval(timer);
    document.removeEventListener('visibilitychange', onHidden);
    window.removeEventListener('pagehide', save);
  };
}
