import { type CompanyLogo, DEFAULT_LOGO, isCompanyLogo } from '../company/logo';
import { DIFFICULTIES, type Difficulty, PLAY_MODES, type PlayMode } from '../game/modes';
import { SAVE_KEY, type SaveData, type SaveStorage, loadGame } from './save';

/**
 * Several Companies on one computer, like worlds in a sandbox game. Each Company's save has its own key; a small
 * index holds what the list shows (name, mode, date), so the menu never reads every save. Only the Company being
 * played is ever loaded. An uploaded logo is kept under its own key, so the index stays small.
 */

export const COMPANIES_KEY = 'leap.companies';
const slotKey = (id: string) => `leap.company.${id}`;
const iconKey = (id: string) => `leap.companyLogo.${id}`;

export type CompanyStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export interface CompanyEntry {
  id: string;
  name: string;
  /** A made logo as is; an uploaded one is only marked, its picture is under its own key. */
  logo: CompanyLogo | { kind: 'upload' };
  playMode: PlayMode;
  difficulty: Difficulty;
  seed: string;
  day: number;
  /** Real time of the last save, in ms since 1970. */
  lastPlayed: number;
}

interface CompanyIndex {
  /** The Company played last: Online saves and loads this one. */
  active: string | null;
  list: CompanyEntry[];
}

function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function isEntry(v: unknown): v is CompanyEntry {
  const e = v as Partial<CompanyEntry> | null;
  return !!e && typeof e.id === 'string' && /^[a-z0-9]+$/.test(e.id) && typeof e.name === 'string' &&
    !!e.logo && (e.logo.kind === 'upload' || isCompanyLogo(e.logo)) &&
    PLAY_MODES.includes(e.playMode!) && DIFFICULTIES.includes(e.difficulty!) &&
    typeof e.seed === 'string' && Number.isFinite(e.day) && Number.isFinite(e.lastPlayed);
}

function entryFor(id: string, data: SaveData, lastPlayed: number): CompanyEntry {
  const { logo } = data.company;
  return {
    id,
    name: data.company.name,
    logo: logo.kind === 'upload' ? { kind: 'upload' } : logo,
    playMode: data.state.playMode,
    difficulty: data.state.difficulty,
    seed: data.site.seed,
    day: data.state.day,
    lastPlayed,
  };
}

function writeIndex(storage: CompanyStorage, index: CompanyIndex): void {
  try {
    storage.setItem(COMPANIES_KEY, JSON.stringify(index));
  } catch { /* the save itself is what matters; the list catches up on the next save */ }
}

/** The index, newest first. A save from before this list (one Company under SAVE_KEY) becomes its first entry. */
function readIndex(storage: CompanyStorage, now = Date.now()): CompanyIndex {
  let index: CompanyIndex = { active: null, list: [] };
  try {
    const raw = JSON.parse(storage.getItem(COMPANIES_KEY) ?? 'null') as Partial<CompanyIndex> | null;
    if (raw && Array.isArray(raw.list)) {
      const list = raw.list.filter(isEntry);
      index = { active: list.some((e) => e.id === raw.active) ? raw.active! : null, list };
    }
  } catch { /* a broken index is rebuilt below from what can be read */ }
  const legacy = storage.getItem(SAVE_KEY);
  if (legacy !== null) {
    const data = loadGame(storage);
    if (data) {
      const id = newId();
      try {
        storage.setItem(slotKey(id), legacy);
        if (data.company.logo.kind === 'upload') storage.setItem(iconKey(id), data.company.logo.png);
        index = { active: id, list: [entryFor(id, data, now), ...index.list] };
        writeIndex(storage, index);
        storage.removeItem(SAVE_KEY);
      } catch { /* storage full: keep the old save where it is and try again next time */ }
    }
  }
  index.list.sort((a, b) => b.lastPlayed - a.lastPlayed);
  return index;
}

export function listCompanies(storage: CompanyStorage): CompanyEntry[] {
  return readIndex(storage).list;
}

export function activeCompany(storage: CompanyStorage): CompanyEntry | null {
  const index = readIndex(storage);
  return index.list.find((e) => e.id === index.active) ?? index.list[0] ?? null;
}

/** The Company's logo for a picture: the made recipe, or the uploaded PNG read from its own key. */
export function companyLogo(storage: CompanyStorage, entry: CompanyEntry): CompanyLogo {
  if (entry.logo.kind !== 'upload') return entry.logo;
  const png = storage.getItem(iconKey(entry.id));
  const logo = { kind: 'upload' as const, png: png ?? '' };
  return isCompanyLogo(logo) ? logo : DEFAULT_LOGO;
}

/**
 * Where one Company saves: the game and Online read and write SAVE_KEY through it. Each write also refreshes the
 * Company's line in the list and makes it the active one. With no `id`, the first write creates a new Company.
 */
export function companyStorage(storage: CompanyStorage, id: string | null = null, now = () => Date.now()): SaveStorage & { readonly id: string | null } {
  let current = id;
  return {
    get id() { return current; },
    getItem: (key) => (key === SAVE_KEY && current ? storage.getItem(slotKey(current)) : null),
    setItem: (key, value) => {
      if (key !== SAVE_KEY) return;
      current ??= newId();
      storage.setItem(slotKey(current), value);
      const data = loadGame({ getItem: () => value, setItem: () => {} });
      if (!data) return;
      if (data.company.logo.kind === 'upload' && storage.getItem(iconKey(current)) !== data.company.logo.png) {
        storage.setItem(iconKey(current), data.company.logo.png);
      }
      const index = readIndex(storage);
      const entry = entryFor(current, data, now());
      index.list = [entry, ...index.list.filter((e) => e.id !== current)];
      index.active = current;
      writeIndex(storage, index);
    },
  };
}

/** The active Company's storage (Online's cloud save); creates a Company on its first write when there is none. */
export function activeStorage(storage: CompanyStorage): SaveStorage {
  return companyStorage(storage, activeCompany(storage)?.id ?? null);
}

export function loadCompany(storage: CompanyStorage, id: string): SaveData | null {
  return loadGame(companyStorage(storage, id));
}

export function deleteCompany(storage: CompanyStorage, id: string): void {
  const index = readIndex(storage);
  index.list = index.list.filter((e) => e.id !== id);
  if (index.active === id) index.active = index.list[0]?.id ?? null;
  writeIndex(storage, index);
  storage.removeItem(slotKey(id));
  storage.removeItem(iconKey(id));
}
