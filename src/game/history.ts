import { CONTRACTS, type ContractId } from './contracts';
import type { MissionReport } from './mission';
import type { SiteState } from './siteState';

/**
 * Real History cards and Mission Patches.
 * Every Milestone has a card before (the real story, shown when its Contract is accepted) and one after
 * (what happened next, shown after a Mission that fulfils it). Unlocked cards stay in the History Archive.
 * A successful Mission earns a Mission Patch for the patch gallery.
 * Card text and photo credits live in strings.ts under `history.<id>.*`; facts in docs/research/milestones.md.
 */

export const HISTORY_CARD_IDS = ['explorer1Before', 'explorer1After'] as const;
export type HistoryCardId = (typeof HISTORY_CARD_IDS)[number];

export interface HistoryCard {
  id: HistoryCardId;
  contract: ContractId;
  when: 'before' | 'after';
  /** The real year it happened, shown on the card. */
  year: number;
  /** A real NASA photo in public/history/, credited on the card. */
  image: string;
  /** Learn more →: an official NASA page. */
  learnMore: string;
}

export const HISTORY_CARDS: Record<HistoryCardId, HistoryCard> = {
  // Photos: NASA Image and Video Library, 0100074 and 5663627 (NASA/MSFC).
  explorer1Before: {
    id: 'explorer1Before',
    contract: 'explorer1',
    when: 'before',
    year: 1958,
    image: 'history/explorer1-launch.jpg',
    learnMore: 'https://www.nasa.gov/history/60-years-ago-explorer-1-becomes-americas-first-satellite/',
  },
  explorer1After: {
    id: 'explorer1After',
    contract: 'explorer1',
    when: 'after',
    year: 1958,
    image: 'history/explorer1-model.jpg',
    learnMore: 'https://science.nasa.gov/missions/explorer/10-things-to-know-about-explorer-1-americas-first-satellite/',
  },
};

/** The Real History card a Contract shows before or after, if it has one (Milestones do). */
export function historyCardFor(contract: ContractId, when: 'before' | 'after'): HistoryCardId | null {
  if (CONTRACTS[contract].kind !== 'milestone') return null;
  return HISTORY_CARD_IDS.find((id) => HISTORY_CARDS[id].contract === contract && HISTORY_CARDS[id].when === when) ?? null;
}

/** Keep a card in the History Archive. True if it is new. */
export function unlockCard(state: SiteState, id: HistoryCardId): boolean {
  if (state.history.includes(id)) return false;
  state.history.push(id);
  return true;
}

/** A Mission Patch: one for each successful Mission, in the patch gallery. */
export interface Patch {
  contract: ContractId;
  /** Game day of the Launch. */
  day: number;
}

/** What a Mission earned for the History Archive. */
export interface HistoryAward {
  patch: Patch | null;
  /** The "after" card, when it is new. */
  card: HistoryCardId | null;
}

/** A successful Mission earns its Mission Patch and unlocks its "after" card. A failed one earns nothing. */
export function awardMission(state: SiteState, report: MissionReport): HistoryAward {
  if (!report.success) return { patch: null, card: null };
  const patch: Patch = { contract: report.contract, day: report.launchDay };
  state.patches.push(patch);
  const after = historyCardFor(report.contract, 'after');
  return { patch, card: after && unlockCard(state, after) ? after : null };
}

/** The patch a Mission Report earned, if any. */
export function patchFor(state: SiteState, report: MissionReport): Patch | null {
  if (!report.success) return null;
  return state.patches.find((p) => p.contract === report.contract && p.day === report.launchDay) ?? null;
}
