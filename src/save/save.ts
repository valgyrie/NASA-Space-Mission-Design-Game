import { type CompanyLogo, DEFAULT_LOGO, isCompanyLogo } from '../company/logo';
import { FACTORY_KINDS, PARTS } from '../economy/part';
import { RAW_MATERIALS } from '../economy/rawMaterial';
import { ANOMALY_KINDS } from '../game/anomalies';
import { CONTRACT_IDS, type ContractId, isContractId } from '../game/contracts';
import { HISTORY_CARD_IDS, type HistoryCardId, type Patch, cardsAfter, historyCardFor } from '../game/history';
import { TECH_IDS, newResearch } from '../game/research';
import { type SiteState, newSiteState, noBetterParts } from '../game/siteState';
import { LAUNCH_SITE_IDS, LAUNCH_VEHICLE_IDS } from '../game/launchVehicles';
import { JPL, START_KINDS } from '../game/places';
import { DIFFICULTIES, PLAY_MODES } from '../game/modes';
import { SLOTS, emptyDesign, isComplete, isValidChoice } from '../game/spacecraft';
import { randomSeed } from '../site/seed';

/** Local save in the browser. Demo Mode uses a separate storage adapter; Online reuses this format and validator. */

export const SAVE_KEY = 'leap.save';
export const SAVE_VERSION = 19;
export const AUTOSAVE_MS = 30_000;

export interface Company {
  name: string;
  logo: CompanyLogo;
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

/** A building: its tile, level and the Upgrade under way. */
const isBuilding = (b: unknown): boolean => {
  const l = b as { level?: unknown; upgradeDay?: unknown } | null;
  return isTile(b) && isNumber(l!.level) && l!.level >= 1 && (l!.upgradeDay === null || isNumber(l!.upgradeDay));
};

const isBetterParts = (v: unknown): boolean =>
  typeof v === 'object' &&
  v !== null &&
  PARTS.every((p) => {
    const counts = (v as Record<string, unknown>)[p];
    return Array.isArray(counts) && counts.every(isNumber);
  });

const isMarks = (v: unknown): boolean =>
  typeof v === 'object' && v !== null && Object.entries(v).every(([slot, m]) => isOneOf(slot, SLOTS) && isNumber(m));

const isCounts = (v: unknown, keys: readonly string[]): boolean =>
  typeof v === 'object' && v !== null && keys.every((k) => isNumber((v as Record<string, unknown>)[k]));

function isFactory(value: unknown): boolean {
  const f = value as Partial<SiteState['factories'][number]> | null;
  return (
    isBuilding(f) &&
    (FACTORY_KINDS as readonly unknown[]).includes(f!.kind) &&
    (PARTS as readonly unknown[]).includes(f!.making) &&
    (f!.progress === null || isNumber(f!.progress))
  );
}

function isAcceptedContract(value: unknown): boolean {
  const c = value as Partial<SiteState['contracts'][number]> | null;
  return !!c && isContractId(c.id) && isNumber(c.acceptedDay);
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
    isContractId(m.contract) &&
    isDesign(m.design) &&
    isComplete(m.design!) &&
    isOneOf(m.vehicle, LAUNCH_VEHICLE_IDS) &&
    isOneOf(m.site, LAUNCH_SITE_IDS) &&
    Array.isArray(m.tech) &&
    m.tech.every((id) => isOneOf(id, TECH_IDS)) &&
    isMarks(m.marks) &&
    isNumber(m.ground) &&
    isNumber(m.startDay) &&
    isNumber(m.shipDay) &&
    isNumber(m.readyDay) &&
    (m.insurance === null || (isNumber(m.insurance?.price) && isNumber(m.insurance?.payout)))
  );
}

function isAnomaly(value: unknown): boolean {
  if (value === null) return true;
  const a = value as Record<string, unknown> | null;
  return (
    !!a &&
    isOneOf(a.kind, ANOMALY_KINDS) &&
    ['day', 'chance', 'sendPerDay', 'dataPerDay', 'missionDays', 'untilDay', 'lostDays', 'cut'].every((k) => isNumber(a[k])) &&
    typeof a.first === 'boolean' &&
    (a.solarMark === undefined || isNumber(a.solarMark)) &&
    (a.battery === undefined || isOneOf(a.battery, ['smallBattery', 'mediumBattery', 'largeBattery'])) &&
    (a.lastsDays === undefined || a.lastsDays === null || isNumber(a.lastsDays)) &&
    (a.score === null || isNumber(a.score)) &&
    (a.answer === null || isOneOf(a.answer, ['played', 'skipped', 'unanswered']))
  );
}

const isBest = (v: unknown): boolean =>
  typeof v === 'object' && v !== null && Object.entries(v).every(([k, n]) => isOneOf(k, ANOMALY_KINDS) && isNumber(n));

/** Reports are only read back for display, so a light check is enough. */
function isReport(value: unknown): boolean {
  const r = value as Partial<SiteState['reports'][number]> | null;
  return (
    !!r &&
    isContractId(r.contract) &&
    isOneOf(r.vehicle, LAUNCH_VEHICLE_IDS) &&
    isOneOf(r.site, LAUNCH_SITE_IDS) &&
    isNumber(r.launchDay) &&
    typeof r.success === 'boolean' &&
    isNumber(r.reward) &&
    Array.isArray(r.findings) &&
    r.findings.every((f) => typeof f?.kind === 'string' && typeof f.ok === 'boolean') &&
    (r.design === null || (isDesign(r.design) && isComplete(r.design!))) &&
    isAnomaly(r.anomaly) &&
    isNumber(r.insurancePaid)
  );
}

const isPatch = (v: unknown): boolean => {
  const p = v as Partial<Patch> | null;
  return !!p && isContractId(p.contract) && isNumber(p.day);
};

const isResearch = (v: unknown): boolean => {
  const r = v as Partial<SiteState['research']> | null;
  return !!r && isNumber(r.processedKb) && Array.isArray(r.tech) && r.tech.every((id) => isOneOf(id, TECH_IDS));
};

const isTutorial = (v: unknown): boolean => {
  const t = v as Partial<SiteState['tutorial']> | null;
  return !!t && typeof t.skipped === 'boolean' && typeof t.testRun === 'boolean';
};

const isTestedDesigns = (v: unknown): boolean => {
  const t = v as Partial<NonNullable<SiteState['testedDesigns']>> | null;
  return !!t && isContractId(t.contract) && Array.isArray(t.designs) && t.designs.every((d) => typeof d === 'string' && d.length < 200);
};

function isSiteState(value: unknown): value is SiteState {
  const v = value as Partial<SiteState> | null;
  return (
    !!v &&
    isOneOf(v.difficulty, DIFFICULTIES) &&
    isOneOf(v.playMode, PLAY_MODES) &&
    isNumber(v.money) &&
    isNumber(v.day) &&
    Array.isArray(v.mines) &&
    v.mines.every(isBuilding) &&
    Array.isArray(v.factories) &&
    v.factories.every(isFactory) &&
    Array.isArray(v.warehouses) &&
    v.warehouses.every(isBuilding) &&
    Array.isArray(v.labs) &&
    v.labs.every(isBuilding) &&
    (v.assemblyHall === null || isBuilding(v.assemblyHall)) &&
    (v.hq === null || isBuilding(v.hq)) &&
    Array.isArray(v.groundStations) &&
    v.groundStations.every(isBuilding) &&
    isNumber(v.eraSeen) &&
    isCounts(v.stock, RAW_MATERIALS) &&
    isCounts(v.parts, PARTS) &&
    isBetterParts(v.betterParts) &&
    Array.isArray(v.contracts) &&
    v.contracts.every(isAcceptedContract) &&
    Array.isArray(v.completed) &&
    v.completed.every(isContractId) &&
    Array.isArray(v.reopened) &&
    v.reopened.every(isContractId) &&
    (v.grantDay === null || isNumber(v.grantDay)) &&
    isDesign(v.design) &&
    isMission(v.mission) &&
    Array.isArray(v.reports) &&
    v.reports.every(isReport) &&
    isBest(v.anomalyBest) &&
    Array.isArray(v.history) &&
    v.history.every((id) => isOneOf(id, HISTORY_CARD_IDS)) &&
    Array.isArray(v.patches) &&
    v.patches.every(isPatch) &&
    isTutorial(v.tutorial) &&
    isResearch(v.research) &&
    isOneOf(v.vehicle, LAUNCH_VEHICLE_IDS) &&
    isPlace(v.place) &&
    isOneOf(v.launchSite, LAUNCH_SITE_IDS) &&
    Array.isArray(v.plots) &&
    v.plots.every((p) => Array.isArray(p) && p.length === 2 && p.every(Number.isInteger) && !(p[0] === 0 && p[1] === 0)) &&
    isNumber(v.freePlots) &&
    v.freePlots >= 0 &&
    (v.testedDesigns === undefined || isTestedDesigns(v.testedDesigns))
  );
}

const isPlace = (v: unknown): boolean => {
  const p = v as { lat?: unknown; lon?: unknown; start?: unknown } | null;
  return isNumber(p?.lat) && isNumber(p?.lon) && (p!.start === 'legacy' || isOneOf(p!.start, START_KINDS));
};

function isSaveData(value: unknown): value is SaveData {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Partial<SaveData>;
  return (
    v.version === SAVE_VERSION &&
    typeof v.company?.name === 'string' &&
    isCompanyLogo(v.company.logo) &&
    typeof v.site?.seed === 'string' &&
    isSiteState(v.state)
  );
}

/** Cards and patches a version 9 save had already earned: its accepted and done Contracts, and its successful Missions. */
function historyFrom(old: Record<string, unknown>): { history: HistoryCardId[]; patches: Patch[] } {
  const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
  const history: HistoryCardId[] = [];
  const add = (id: HistoryCardId | null) => {
    if (id && !history.includes(id)) history.push(id);
  };
  const ids = (c: unknown): ContractId | null => (isOneOf(c, CONTRACT_IDS) ? (c as ContractId) : null);
  for (const c of list(old.contracts)) {
    const id = ids((c as { id?: unknown } | null)?.id);
    if (id) add(historyCardFor(id, 'before'));
  }
  const patches: Patch[] = [];
  for (const r of list(old.reports)) {
    const report = r as { contract?: unknown; success?: unknown; launchDay?: unknown } | null;
    const id = ids(report?.contract);
    if (!id || report?.success !== true || !isNumber(report.launchDay)) continue;
    add(historyCardFor(id, 'before'));
    for (const card of cardsAfter(id)) add(card);
    patches.push({ contract: id, day: report.launchDay });
  }
  return { history, patches };
}

/**
 * Bring an older save up to date, one version at a time.
 * Version 1 had no Site, so it gets a fresh Seed. Version 2 had no economy, so it starts fresh.
 * Version 3 had no Factories, Warehouses or Parts. Version 4 had no Contracts.
 * Version 5 had no Spacecraft design and no Radiation Detector Part.
 * Version 6 had no Missions: nothing shipped, no Contracts done, no Mission Reports.
 * Version 7 didn't keep the design in Mission Reports: the Space view shows those Spacecraft as a plain model.
 * Version 8 had no Anomalies: its reports had none, and the Company has played none yet.
 * Version 9 had no History Archive, Mission Patches or tutorial: they are worked out from its Contracts and reports.
 * Version 10 had no Research Labs, Research Points or Launch Vehicle choice, and no Vanguard 1 card: a Company that
 * had done Explorer 1 gets the card (and so Solar Cells).
 * Version 11 had no building levels, Assembly Hall or Part Marks: every building is level 1, every Part Mk 1,
 * and the Assembly Hall is placed when the Site is shown.
 * Version 12 had no real place: see below.
 * Version 13 had no Launch Insurance, reopened Contracts or startup grant: none bought, none reopened, grant still to come.
 * Version 14 had no Eras, HQ, Ground Stations, Propulsion slot or Era 2 Parts: Era 1 (the HQ is placed when the
 * Site is shown), no stations, every design without an engine, and none of the new Parts in stock.
 * Version 15 had no Company logo: use the original maker preset.
 * Version 16 had one Part set: keep it as Easy, with no Advanced Parts in stock.
 * Version 17 had no play mode: its Companies stay in Campaign.
 * Version 18 had no Plots: the Site is the Home Site alone.
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
  if (v?.version === 7) {
    const old = (v as { state?: { reports?: unknown } }).state;
    const reports = Array.isArray(old?.reports) ? old.reports.map((r: object) => ({ ...r, design: null })) : old?.reports;
    v = { ...v, version: 8, state: { ...old, reports } } as typeof v;
  }
  if (v?.version === 8) {
    const old = (v as { state?: { reports?: unknown } }).state;
    const reports = Array.isArray(old?.reports) ? old.reports.map((r: object) => ({ ...r, anomaly: null })) : old?.reports;
    v = { ...v, version: 9, state: { ...old, reports, anomalyBest: {} } } as typeof v;
  }
  if (v?.version === 9) {
    const old = (v as { state?: Record<string, unknown> }).state;
    v = { ...v, version: 10, state: { ...old, ...historyFrom(old ?? {}), tutorial: { skipped: false, testRun: false } } } as typeof v;
  }
  if (v?.version === 10) {
    const old = (v as { state?: Record<string, unknown> }).state ?? {};
    const history = Array.isArray(old.history) ? [...old.history] : old.history;
    const done = Array.isArray(old.completed) && old.completed.includes('explorer1');
    if (done && Array.isArray(history) && !history.includes('vanguard1')) history.push('vanguard1');
    const mission = old.mission && typeof old.mission === 'object' ? { ...old.mission, tech: [] } : old.mission;
    v = { ...v, version: 11, state: { ...old, history, mission, labs: [], research: newResearch(), vehicle: 'juno1' } } as typeof v;
  }
  if (v?.version === 11) {
    const old = (v as { state?: Record<string, unknown> }).state ?? {};
    const levelled = (list: unknown) =>
      Array.isArray(list) ? list.map((b: object) => ({ ...b, level: 1, upgradeDay: null })) : list;
    const mission = old.mission && typeof old.mission === 'object' ? { ...old.mission, marks: {} } : old.mission;
    v = {
      ...v,
      version: 12,
      state: {
        ...old,
        mines: levelled(old.mines),
        factories: levelled(old.factories),
        warehouses: levelled(old.warehouses),
        labs: levelled(old.labs),
        assemblyHall: null,
        betterParts: noBetterParts(),
        mission,
      },
    } as typeof v;
  }
  if (v?.version === 12) {
    // Before real places: the Site keeps its made-up climate, and ships from JPL (the Historic start) as before.
    const old = (v as { state?: Record<string, unknown> }).state ?? {};
    v = { ...v, version: 13, state: { ...old, place: { ...JPL, start: 'legacy' }, launchSite: 'capeCanaveral' } } as typeof v;
  }
  if (v?.version === 13) {
    const old = (v as { state?: Record<string, unknown> }).state ?? {};
    const mission = old.mission && typeof old.mission === 'object' ? { ...old.mission, insurance: null } : old.mission;
    const reports = Array.isArray(old.reports) ? old.reports.map((r: object) => ({ ...r, insurancePaid: 0 })) : old.reports;
    v = { ...v, version: 14, state: { ...old, mission, reports, reopened: [], grantDay: null } } as typeof v;
  }
  if (v?.version === 14) {
    const old = (v as { state?: Record<string, unknown> }).state ?? {};
    const noEngine = (d: unknown) => (d && typeof d === 'object' ? { ...d, propulsion: 'noEngine' } : d);
    const mission =
      old.mission && typeof old.mission === 'object'
        ? { ...old.mission, design: noEngine((old.mission as { design?: unknown }).design), ground: 1 }
        : old.mission;
    const reports = Array.isArray(old.reports) ? old.reports.map((r: { design?: unknown }) => ({ ...r, design: noEngine(r.design) })) : old.reports;
    const newParts = { largeBus: 0, transponder: 0, mainEngine: 0 };
    const parts = old.parts && typeof old.parts === 'object' ? { ...old.parts, ...newParts } : old.parts;
    const betterParts =
      old.betterParts && typeof old.betterParts === 'object' ? { ...old.betterParts, largeBus: [], transponder: [], mainEngine: [] } : old.betterParts;
    v = {
      ...v,
      version: 15,
      state: { ...old, design: noEngine(old.design), mission, reports, parts, betterParts, hq: null, groundStations: [], eraSeen: 1 },
    } as typeof v;
  }
  if (v?.version === 15) {
    v = { ...v, version: 16, company: { ...(v.company as object), logo: { ...DEFAULT_LOGO } } };
  }
  if (v?.version === 16) {
    const old = (v as { state?: Record<string, unknown> }).state ?? {};
    const parts = old.parts && typeof old.parts === 'object' ? { ...old.parts, mediumBattery: 0, lowPowerAntenna: 0 } : old.parts;
    const betterParts = old.betterParts && typeof old.betterParts === 'object'
      ? { ...old.betterParts, mediumBattery: [], lowPowerAntenna: [] } : old.betterParts;
    v = { ...v, version: 17, state: { ...old, difficulty: 'easy', parts, betterParts } } as typeof v;
  }
  if (v?.version === 17) {
    v = { ...v, version: 18, state: { ...(v as { state?: object }).state, playMode: 'campaign' } } as typeof v;
  }
  if (v?.version === 18) {
    v = { ...v, version: 19, state: { ...(v as { state?: object }).state, plots: [], freePlots: 0 } } as typeof v;
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
 * Save now, then every AUTOSAVE_MS and whenever the page is hidden or closed. `onResult` hears whether each
 * save worked. Returns a function that stops autosaving.
 */
export function startAutosave(storage: SaveStorage, current: () => SaveData, onResult?: (saved: boolean) => void): () => void {
  const save = () => {
    const saved = saveGame(storage, current());
    onResult?.(saved);
  };
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
