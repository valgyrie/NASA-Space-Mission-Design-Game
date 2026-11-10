import { KB_PER_RESEARCH_POINT, LAB_KB_PER_DAY, TECH_TREE } from './balance';
import { CONTRACTS } from './contracts';
import type { MissionReport } from './mission';
import { type SiteState, levelBoost } from './siteState';

/**
 * Research: Spacecraft in orbit send Data home while they work; Research Labs turn it into Research Points;
 * Research Points buy Upgrades from the tech tree, each making one number of the Parts better.
 * Data that arrives before there is a Lab waits for one. Numbers: TECH_TREE and LAB_KB_PER_DAY in balance.ts.
 */

export const TECH_IDS = ['betterSolarCells', 'strongerRadio', 'betterBatteries', 'lowPowerElectronics'] as const;
export type TechId = (typeof TECH_IDS)[number];

/** The Part numbers a tech tree Upgrade can multiply. */
export type Boosted = 'solarW' | 'sendPerDay' | 'batteryWh' | 'powerUseW';

/** What the Company's research has done so far. Saved. */
export interface Research {
  /** Kilobytes of Data the Research Labs have turned into Research Points, all time. */
  processedKb: number;
  /** Tech tree Upgrades bought, in the order they were. */
  tech: TechId[];
}

export function newResearch(): Research {
  return { processedKb: 0, tech: [] };
}

/** How much the owned Upgrades multiply a Part number: 1 with none. */
export function boost(tech: readonly TechId[], stat: Boosted): number {
  return tech.reduce((x, id) => x * ((TECH_TREE[id].boost as Partial<Record<Boosted, number>>)[stat] ?? 1), 1);
}

/** Kilobytes of Data a Mission sent home by Game day `day`: while it worked, minus the days an Anomaly lost. */
export function dataFromReport(report: MissionReport, day: number): number {
  const find = <K extends MissionReport['findings'][number]['kind']>(kind: K) =>
    report.findings.find((f) => f.kind === kind) as Extract<MissionReport['findings'][number], { kind: K }> | undefined;
  if (!find('orbit')?.ok) return 0;
  const comms = find('comms');
  if (!comms) return 0;
  const missionDays = CONTRACTS[report.contract].requirements.find((r) => r.kind === 'dataDays');
  const workDays = Math.min(missionDays?.kind === 'dataDays' ? missionDays.days : 0, find('power')?.lastsDays ?? Infinity);
  const elapsed = Math.min(Math.max(0, day - report.launchDay), workDays);
  const a = report.anomaly;
  const lost = a && elapsed > a.day ? Math.min(a.lostDays, elapsed - a.day) : 0;
  return Math.min(comms.dataPerDay, comms.sendPerDay) * Math.max(0, elapsed - lost);
}

/** Kilobytes of Data every Mission has sent home so far. */
export function dataReceived(state: SiteState): number {
  return state.reports.reduce((kb, r) => kb + dataFromReport(r, state.day), 0);
}

/** Kilobytes of Data waiting for a Research Lab. */
export function dataWaiting(state: SiteState): number {
  return Math.max(0, dataReceived(state) - state.research.processedKb);
}

/** Kilobytes a day the Research Labs can turn into Research Points: each Lab's pace grows with its level. */
export function labRate(state: SiteState): number {
  return state.labs.reduce((kb, lab) => kb + LAB_KB_PER_DAY * levelBoost(lab.level), 0);
}

/** Run the Research Labs for `days`. */
export function runLabs(state: SiteState, days: number): void {
  const kb = Math.min(dataWaiting(state), labRate(state) * days);
  if (kb > 0) state.research.processedKb += kb;
}

/** Research Points earned so far, spent or not. */
export function pointsEarned(state: SiteState): number {
  return Math.floor(state.research.processedKb / KB_PER_RESEARCH_POINT + 1e-9);
}

/** Research Points left to spend. */
export function researchPoints(state: SiteState): number {
  return pointsEarned(state) - state.research.tech.reduce((n, id) => n + TECH_TREE[id].cost, 0);
}

/** Share of the way to the next Research Point, 0–1. */
export function nextPointShare(state: SiteState): number {
  const points = state.research.processedKb / KB_PER_RESEARCH_POINT;
  return points - Math.floor(points + 1e-9);
}

export type TechResult = { ok: true } | { ok: false; problem: 'owned' | 'points' };

/** Buy a tech tree Upgrade with Research Points. */
export function buyTech(state: SiteState, id: TechId): TechResult {
  if (state.research.tech.includes(id)) return { ok: false, problem: 'owned' };
  if (researchPoints(state) < TECH_TREE[id].cost) return { ok: false, problem: 'points' };
  state.research.tech.push(id);
  return { ok: true };
}
