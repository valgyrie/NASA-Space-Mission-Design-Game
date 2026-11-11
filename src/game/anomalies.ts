import { hashText, makeRng, randInt } from '../site/random';
import { ANOMALY_MAX_DATA_LOSS, ANOMALY_UNANSWERED_SCORE, ANTENNA_CHANCE, ECLIPSE_CHANCE, PANEL_CHANCE } from './balance';
import type { Flight, FlightPlan } from './flight';
import type { MissionReport } from './mission';
import type { SiteState } from './siteState';
import { dataOf } from './spacecraft';

/**
 * Anomalies: problems during a Mission, played as short mini-games. Whether one happens is settled at
 * Launch, mostly from the design's weak spots. How well the player handles it settles how much Data is
 * lost, and the reward shrinks by the same share. An Anomaly never turns a working Mission into a failed one.
 * The first of each kind must be played; after that the player may skip it and take their best past score.
 */

export const ANOMALY_KINDS = ['antenna', 'panel', 'eclipse'] as const;
export type AnomalyKind = (typeof ANOMALY_KINDS)[number];

/** How it was answered: played, skipped (best past score), or left when the game closed mid-flight. */
export type AnomalyAnswer = 'played' | 'skipped' | 'unanswered';

export interface Anomaly {
  kind: AnomalyKind;
  /** Mission day it happens. */
  day: number;
  /** The chance it had, 0–1. */
  chance: number;
  /** The Company's first of this kind: it had to be played, whatever the chance. */
  first: boolean;
  /** The design numbers behind the chance: what the antenna sends and what the Payload makes, kB a day. */
  sendPerDay: number;
  dataPerDay: number;
  /** Stuck solar panel: the Solar Cells' Mark (1–3). Missing for the other kinds. */
  solarMark?: number;
  /**
   * Survive the eclipse: the battery it flew with, and the days it would last (null when sunlight alone covers
   * what the Spacecraft uses). Missing for the other kinds.
   */
  battery?: 'smallBattery' | 'largeBattery';
  lastsDays?: number | null;
  /** Days of the Mission and the last day the Spacecraft had Power, so lost days never run past either. */
  missionDays: number;
  untilDay: number;
  /** 0–1, or null until it is settled. */
  score: number | null;
  answer: AnomalyAnswer | null;
  /** Mission days whose Data never reached home. */
  lostDays: number;
  /** Money taken off the reward for the lost Data. */
  cut: number;
}

/** Point the antenna's chance: high when the antenna has nothing to spare, low when it has plenty. */
export function antennaChance(sendPerDay: number, dataPerDay: number): number {
  if (dataPerDay <= 0) return ANTENNA_CHANCE.low;
  const spare = Math.max(0, sendPerDay / dataPerDay - 1);
  const thin = Math.max(0, 1 - spare / ANTENNA_CHANCE.safeSpare);
  return ANTENNA_CHANCE.low + (ANTENNA_CHANCE.high - ANTENNA_CHANCE.low) * thin;
}

/** Stuck solar panel's chance: cheap Mk 1 Solar Cells stick most often. */
export function panelChance(mark: number): number {
  const m = Math.min(3, Math.max(1, Math.round(mark))) as 1 | 2 | 3;
  return PANEL_CHANCE[m];
}

/**
 * Survive the eclipse's chance: high when the battery would last no longer than the Mission, low with plenty
 * to spare or when sunlight alone covers the Spacecraft's use. A Small Battery makes it more likely.
 */
export function eclipseChance(lastsDays: number | null, missionDays: number, battery: Anomaly['battery']): number {
  const spare = lastsDays === null || missionDays <= 0 ? Infinity : Math.max(0, lastsDays / missionDays - 1);
  const thin = Math.max(0, 1 - spare / ECLIPSE_CHANCE.safeSpare);
  const small = battery === 'smallBattery' ? ECLIPSE_CHANCE.smallBattery : 0;
  return ECLIPSE_CHANCE.low + (ECLIPSE_CHANCE.high - ECLIPSE_CHANCE.low) * thin + small;
}

/** The Company has never played this kind, so it can't be skipped. */
export function isMandatory(state: SiteState, kind: AnomalyKind): boolean {
  return state.anomalyBest[kind] === undefined;
}

/** One kind's roll: its chance, whether it struck, and the day it would strike. */
interface Roll {
  kind: AnomalyKind;
  chance: number;
  struck: boolean;
  day: number;
  extra: Partial<Pick<Anomaly, 'solarMark' | 'battery' | 'lastsDays'>>;
}

/**
 * Does an Anomaly strike this flight, and on which day? Only a Spacecraft in orbit with Power can have one, and
 * at most one strikes a flight. The Company's first flight always meets Point the antenna. After that each kind
 * the design can meet rolls its own chance: Point the antenna always, Stuck solar panel and Survive the eclipse
 * only with Solar Cells. If more than one strikes, a kind the Company has never played comes first (so each new
 * one gets met), then the likeliest: the design's weakest spot.
 * Same Seed, Contract and Launch day give the same answer.
 */
export function rollAnomaly(state: SiteState, seed: string, plan: FlightPlan, flight: Flight, launchDay: number): Anomaly | null {
  const inOrbit = flight.findings.find((f) => f.kind === 'orbit')?.ok ?? false;
  const untilDay = Math.floor(Math.min(flight.missionDays, flight.powerOutDay ?? Infinity));
  if (!inOrbit || untilDay < 2) return null;
  const rng = makeRng(hashText(`${seed}|anomaly|${plan.contract}|${launchDay}`));
  // The link as it flew (Parts are a little off their labels), the same numbers the Mission Report shows.
  const comms = flight.findings.find((f) => f.kind === 'comms');
  const { sendPerDay, dataPerDay } = comms ?? dataOf(plan.design, plan.tech);

  // Point the antenna keeps its own draws, so flights without Solar Cells meet what they always did.
  const antenna = antennaChance(sendPerDay, dataPerDay);
  const forced = isMandatory(state, 'antenna');
  const rolls: Roll[] = [{ kind: 'antenna', chance: antenna, struck: rng() < antenna || forced, day: randInt(rng, 1, untilDay - 1), extra: {} }];

  if (plan.design.power === 'solarCells') {
    const roll = (kind: AnomalyKind, chance: number, extra: Roll['extra']) => {
      const own = makeRng(hashText(`${seed}|anomaly|${kind}|${plan.contract}|${launchDay}`));
      rolls.push({ kind, chance, struck: own() < chance, day: randInt(own, 1, untilDay - 1), extra });
    };
    const solarMark = plan.marks?.power ?? 1;
    roll('panel', panelChance(solarMark), { solarMark });
    const power = flight.findings.find((f) => f.kind === 'power');
    const battery = plan.design.battery === 'smallBattery' ? 'smallBattery' : 'largeBattery';
    const lastsDays = power?.kind === 'power' ? power.lastsDays : null;
    roll('eclipse', eclipseChance(lastsDays, flight.missionDays, battery), { battery, lastsDays });
  }

  const struck = rolls.filter((r) => r.struck);
  if (struck.length === 0) return null;
  const pick = forced
    ? rolls[0]!
    : struck.reduce((best, r) => {
        const fresh = (x: Roll) => (isMandatory(state, x.kind) ? 1 : 0);
        if (fresh(r) !== fresh(best)) return fresh(r) > fresh(best) ? r : best;
        return r.chance > best.chance ? r : best;
      });
  return {
    kind: pick.kind,
    day: pick.day,
    chance: pick.chance,
    first: isMandatory(state, pick.kind),
    sendPerDay,
    dataPerDay,
    ...pick.extra,
    missionDays: flight.missionDays,
    untilDay,
    score: null,
    answer: null,
    lostDays: 0,
    cut: 0,
  };
}

/** Days of Data lost for a score: none at 100%, the most at 0%, never past the day the Spacecraft fell silent. */
export function lostDaysFor(anomaly: Anomaly, score: number): number {
  const most = Math.round(ANOMALY_MAX_DATA_LOSS * anomaly.missionDays);
  return Math.min(anomaly.untilDay - anomaly.day, Math.round((1 - clamp01(score)) * most));
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/**
 * Settle the report's Anomaly: record the score, count the lost Data, cut the reward by the same share and
 * pay what is left (the reward was held back at Launch). A played score may become the new best.
 */
export function settleAnomaly(state: SiteState, report: MissionReport, score: number, answer: AnomalyAnswer): void {
  const a = report.anomaly;
  if (!a || a.score !== null) return;
  a.score = clamp01(score);
  a.answer = answer;
  a.lostDays = lostDaysFor(a, a.score);
  a.cut = Math.round((report.reward * a.lostDays) / a.missionDays);
  report.reward -= a.cut;
  state.money += report.reward;
  if (answer === 'played') state.anomalyBest[a.kind] = Math.max(state.anomalyBest[a.kind] ?? 0, a.score);
}

/** Skip it: settled from the best past score. Refused while the Company has never played this kind. */
export function skipAnomaly(state: SiteState, report: MissionReport): boolean {
  const a = report.anomaly;
  if (!a || a.score !== null || isMandatory(state, a.kind)) return false;
  settleAnomaly(state, report, state.anomalyBest[a.kind]!, 'skipped');
  return true;
}

/**
 * A game closed mid-flight leaves its Anomaly open. Settle each one from the best past score, or a middle
 * score if there is none. That doesn't count as playing it, so a first one comes back on the next flight.
 */
export function settleUnanswered(state: SiteState): void {
  for (const report of state.reports) {
    const a = report.anomaly;
    if (!a || a.score !== null) continue;
    const best = state.anomalyBest[a.kind];
    if (best === undefined) settleAnomaly(state, report, ANOMALY_UNANSWERED_SCORE, 'unanswered');
    else settleAnomaly(state, report, best, 'skipped');
  }
}

/** The flight's Data with the lost days taken out: nothing reaches home from the Anomaly's day for `lostDays`. */
export function withContactLost(flight: Flight, anomaly: Pick<Anomaly, 'day' | 'lostDays'>): Flight {
  const { day, lostDays } = anomaly;
  if (lostDays <= 0) return flight;
  const sent = flight.dataSentKb;
  const at = (d: number) => sent[Math.min(sent.length - 1, Math.max(0, d))]!;
  return {
    ...flight,
    dataSentKb: sent.map((kb, d) => (d <= day ? kb : kb - (at(Math.min(d, day + lostDays)) - at(day)))),
  };
}
