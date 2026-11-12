import { ASSEMBLY_HALL_COST, BUILD_COST, HQ_COST, MATERIAL_VALUE, UPGRADE } from '../game/balance';
import { allBuildings, type SiteState } from '../game/siteState';
import { PARTS } from '../economy/part';
import { RAW_MATERIALS } from '../economy/rawMaterial';
import { makingCost } from '../game/market';
import { pointsEarned } from '../game/research';
import { loadGame, type SaveData } from '../save/save';
import { t } from '../strings';

export const METRICS = ['value', 'missions', 'reputation', 'research'] as const;
export type Metric = typeof METRICS[number];
export type Scores = Record<Metric, number>;
export interface Account { nickname: string; revision: number; updatedAt: string | null; }
export interface Leader extends Scores { nickname: string; }

/** Fictional space nicknames; every word comes from the game's strings. */
export function generateNickname(random = Math.random): string {
  const first = ['lunar', 'solar', 'cosmic', 'orbital', 'stellar', 'comet'] as const;
  const last = ['pioneer', 'rover', 'scout', 'pilot', 'voyager', 'engineer'] as const;
  const pick = <T>(list: readonly T[]): T => list[Math.floor(random() * list.length) % list.length]!;
  return t('online.generatedName', { first: t(`nickname.${pick(first)}`), last: t(`nickname.${pick(last)}`), n: Math.floor(random() * 1000) });
}

/** The code is a 160-bit bearer secret, shown in groups for copying to another computer. */
export function normalizeCode(raw: string): string | null {
  const code = raw.trim().toUpperCase().replace(/[\s-]/g, '').replace(/^LEAP/, '');
  return /^[A-F0-9]{40}$/.test(code) ? code : null;
}

export function formatCode(code: string): string {
  return `LEAP-${code.match(/.{8}/g)!.join('-')}`;
}

/** Cloud data goes through the same migration and validation as local saves. */
export function readFreePlaySave(value: unknown): SaveData | null {
  const game = loadGame({ getItem: () => JSON.stringify(value), setItem: () => {} });
  return game?.state.playMode === 'freePlay' ? game : null;
}

/** Game estimates, derived from the save on the server rather than accepting submitted scores. */
export function leaderboardScores(state: SiteState): Scores {
  let value = state.money;
  for (const m of RAW_MATERIALS) value += state.stock[m] * MATERIAL_VALUE[m];
  for (const p of PARTS) value += state.parts[p] * makingCost(p);
  for (const { kind, building } of allBuildings(state)) {
    const base = kind === 'hq' ? HQ_COST : kind === 'assemblyHall' ? ASSEMBLY_HALL_COST : BUILD_COST[kind];
    // HQ levels mark Eras, so only its base value counts. Other buildings use their paid Upgrade costs.
    let share = 1;
    if (kind !== 'hq') for (const [level, step] of Object.entries(UPGRADE)) if (building.level >= Number(level)) share += step.costShare;
    value += base * share;
  }
  return {
    value: Math.max(0, Math.round(value)),
    missions: state.completed.length,
    reputation: Math.max(0, state.reports.reduce((n, r) => n + (r.success ? 10 : -5), 0)),
    research: pointsEarned(state),
  };
}
