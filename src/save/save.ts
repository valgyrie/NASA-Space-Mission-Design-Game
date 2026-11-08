import { RAW_MATERIALS } from '../economy/rawMaterial';
import { type SiteState, newSiteState } from '../game/siteState';
import { randomSeed } from '../site/seed';

/** Local save in the browser. One save slot for now; cloud saves come with online play. */

export const SAVE_KEY = 'leap.save';
export const SAVE_VERSION = 3;
export const AUTOSAVE_MS = 30_000;

export interface Company {
  name: string;
}

export interface SaveData {
  version: typeof SAVE_VERSION;
  company: Company;
  /** The Site map is rebuilt from its Seed, so only the Seed is stored. */
  site: { seed: string };
  /** Money, Game date, Mines and stock. */
  state: SiteState;
}

/** The part of the Web Storage API we use, so tests can pass a fake. */
export type SaveStorage = Pick<Storage, 'getItem' | 'setItem'>;

const isNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

function isSiteState(value: unknown): value is SiteState {
  const v = value as Partial<SiteState> | null;
  return (
    !!v &&
    isNumber(v.money) &&
    isNumber(v.day) &&
    Array.isArray(v.mines) &&
    v.mines.every((m) => isNumber(m?.x) && isNumber(m?.z)) &&
    typeof v.stock === 'object' &&
    v.stock !== null &&
    RAW_MATERIALS.every((m) => isNumber(v.stock![m]))
  );
}

function isSaveData(value: unknown): value is SaveData {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Partial<SaveData>;
  return (
    v.version === SAVE_VERSION &&
    typeof v.company?.name === 'string' &&
    typeof v.site?.seed === 'string' &&
    isSiteState(v.state)
  );
}

/**
 * Bring an older save up to date, one version at a time.
 * Version 1 had no Site, so it gets a fresh Seed. Version 2 had no economy, so it starts fresh.
 */
function upgrade(data: unknown, newSeed: () => string): unknown {
  let v = data as { version?: unknown; company?: unknown; site?: unknown };
  if (v?.version === 1) v = { version: 2, company: v.company, site: { seed: newSeed() } };
  if (v?.version === 2) v = { ...v, version: 3, state: newSiteState() } as typeof v;
  return v;
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
