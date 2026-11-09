import { FACTORY_KINDS, PARTS } from '../economy/part';
import { RAW_MATERIALS } from '../economy/rawMaterial';
import { CONTRACT_IDS } from '../game/contracts';
import { type SiteState, newSiteState } from '../game/siteState';
import { LAUNCH_SITE_IDS, LAUNCH_VEHICLE_IDS } from '../game/launchVehicles';
import { SLOTS, emptyDesign, isComplete, isValidChoice } from '../game/spacecraft';
import { randomSeed } from '../site/seed';

/** Local save in the browser. One save slot for now; cloud saves come with online play. */

export const SAVE_KEY = 'leap.save';
export const SAVE_VERSION = 7;
export const AUTOSAVE_MS = 30_000;

export interface Company {
  name: string;
}

export interface SaveData {
  version: typeof SAVE_VERSION;
  company: Company;
  /** The Site map is rebuilt from its Seed, so only the Seed is stored. */
  site: { seed: string };
  /** Money, Game date, buildings and stock. */
  state: SiteState;
}

/** The part of the Web Storage API we use, so tests can pass a fake. */
export type SaveStorage = Pick<Storage, 'getItem' | 'setItem'>;

const isNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

const isTile = (b: unknown): boolean => {
  const t = b as { x?: unknown; z?: unknown } | null;
  return isNumber(t?.x) && isNumber(t?.z);
};

const isCounts = (v: unknown, keys: readonly string[]): boolean =>
  typeof v === 'object' && v !== null && keys.every((k) => isNumber((v as Record<string, unknown>)[k]));

function isFactory(value: unknown): boolean {
  const f = value as Partial<SiteState['factories'][number]> | null;
  return (
    isTile(f) &&
    (FACTORY_KINDS as readonly unknown[]).includes(f!.kind) &&
    (PARTS as readonly unknown[]).includes(f!.making) &&
    (f!.progress === null || isNumber(f!.progress))
  );
}

function isAcceptedContract(value: unknown): boolean {
  const c = value as Partial<SiteState['contracts'][number]> | null;
  return !!c && (CONTRACT_IDS as readonly unknown[]).includes(c.id) && isNumber(c.acceptedDay);
}

function isDesign(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false;
  const d = value as Record<string, unknown>;
  return Object.keys(d).length === SLOTS.length && SLOTS.every((slot) => isValidChoice(slot, d[slot]));
}

const isOneOf = (v: unknown, ids: readonly string[]) => (ids as readonly unknown[]).includes(v);

function isMission(value: unknown): boolean {
  if (value === null) return true;
  const m = value as Partial<NonNullable<SiteState['mission']>>;
  return (
    typeof m === 'object' &&
    isOneOf(m.contract, CONTRACT_IDS) &&
    isDesign(m.design) &&
    isComplete(m.design!) &&
    isOneOf(m.vehicle, LAUNCH_VEHICLE_IDS) &&
    isOneOf(m.site, LAUNCH_SITE_IDS) &&
    isNumber(m.startDay) &&
    isNumber(m.shipDay) &&
    isNumber(m.readyDay)
  );
}

/** Reports are only read back for display, so a light check is enough. */
function isReport(value: unknown): boolean {
  const r = value as Partial<SiteState['reports'][number]> | null;
  return (
    !!r &&
    isOneOf(r.contract, CONTRACT_IDS) &&
    isOneOf(r.vehicle, LAUNCH_VEHICLE_IDS) &&
    isOneOf(r.site, LAUNCH_SITE_IDS) &&
    isNumber(r.launchDay) &&
    typeof r.success === 'boolean' &&
    isNumber(r.reward) &&
    Array.isArray(r.findings) &&
    r.findings.every((f) => typeof f?.kind === 'string' && typeof f.ok === 'boolean')
  );
}

function isSiteState(value: unknown): value is SiteState {
  const v = value as Partial<SiteState> | null;
  return (
    !!v &&
    isNumber(v.money) &&
    isNumber(v.day) &&
    Array.isArray(v.mines) &&
    v.mines.every(isTile) &&
    Array.isArray(v.factories) &&
    v.factories.every(isFactory) &&
    Array.isArray(v.warehouses) &&
    v.warehouses.every(isTile) &&
    isCounts(v.stock, RAW_MATERIALS) &&
    isCounts(v.parts, PARTS) &&
    Array.isArray(v.contracts) &&
    v.contracts.every(isAcceptedContract) &&
    Array.isArray(v.completed) &&
    v.completed.every((id) => isOneOf(id, CONTRACT_IDS)) &&
    isDesign(v.design) &&
    isMission(v.mission) &&
    Array.isArray(v.reports) &&
    v.reports.every(isReport)
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
 * Version 3 had no Factories, Warehouses or Parts. Version 4 had no Contracts.
 * Version 5 had no Spacecraft design and no Radiation Detector Part.
 * Version 6 had no Missions: nothing shipped, no Contracts done, no Mission Reports.
 */
function upgrade(data: unknown, newSeed: () => string): unknown {
  let v = data as { version?: unknown; company?: unknown; site?: unknown };
  if (v?.version === 1) v = { version: 2, company: v.company, site: { seed: newSeed() } };
  if (v?.version === 2) v = { ...v, version: 3, state: newSiteState() } as typeof v;
  if (v?.version === 3) {
    // Version 3 had only Mines: keep them and the stock, add empty Factories, Warehouses and Parts.
    const fresh = newSiteState();
    v = { ...v, version: 4, state: { ...fresh, ...(v as { state?: object }).state, factories: [], warehouses: [], parts: fresh.parts } } as typeof v;
  }
  if (v?.version === 4) {
    v = { ...v, version: 5, state: { ...(v as { state?: object }).state, contracts: [] } } as typeof v;
  }
  if (v?.version === 5) {
    const old = (v as { state?: { parts?: object } }).state;
    const parts = { ...old?.parts, radiationDetector: 0 };
    v = { ...v, version: 6, state: { ...old, parts, design: emptyDesign() } } as typeof v;
  }
  if (v?.version === 6) {
    v = { ...v, version: 7, state: { ...(v as { state?: object }).state, completed: [], mission: null, reports: [] } } as typeof v;
  }
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
