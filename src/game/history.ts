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

export const HISTORY_CARD_IDS = ['explorer1Before', 'explorer1After', 'vanguard1', 'tiros1Before', 'tiros1After'] as const;
export type HistoryCardId = (typeof HISTORY_CARD_IDS)[number];

export interface HistoryCard {
  id: HistoryCardId;
  contract: ContractId;
  /** Before the Milestone, after it, or a side story unlocked after it (and after its "after" card). */
  when: 'before' | 'after' | 'side';
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
  // Side story after Explorer 1: Vanguard 1, the first solar-powered satellite. It unlocks Solar Cells.
  // Photo: NASA image article "Vanguard Satellite, 1958" (NASA).
  vanguard1: {
    id: 'vanguard1',
    contract: 'explorer1',
    when: 'side',
    year: 1958,
    image: 'history/vanguard1.jpg',
    learnMore: 'https://www.nasa.gov/image-article/vanguard-satellite-1958/',
  },
  // Photo: NASA Image and Video Library 9141922 (NASA/MSFC), a Thor-Able launching Explorer 6 in 1959.
  tiros1Before: {
    id: 'tiros1Before',
    contract: 'tiros1',
    when: 'before',
    year: 1960,
    image: 'history/thor-able-launch.jpg',
    learnMore: 'https://science.nasa.gov/mission/tiros/',
  },
  // Photo: NASA Image and Video Library GSFC_20171208_Archive_e000942 (NASA Goddard MODIS Rapid Response).
  tiros1After: {
    id: 'tiros1After',
    contract: 'tiros1',
    when: 'after',
    year: 1960,
    image: 'history/hurricane-gonzalo.jpg',
    learnMore: 'https://science.nasa.gov/mission/tiros/',
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

/** The cards a Milestone's success unlocks, in the order they show: its "after" card, then its side stories. */
export function cardsAfter(contract: ContractId): HistoryCardId[] {
  const after = historyCardFor(contract, 'after');
  const side = HISTORY_CARD_IDS.filter((id) => HISTORY_CARDS[id].contract === contract && HISTORY_CARDS[id].when === 'side');
  return [...(after ? [after] : []), ...side];
}

/** What a Mission earned for the History Archive. */
export interface HistoryAward {
  patch: Patch | null;
  /** The cards it unlocked that are new, in the order they show. */
  cards: HistoryCardId[];
}

/** A successful Mission earns its Mission Patch and unlocks its "after" card and side stories. A failed one earns nothing. */
export function awardMission(state: SiteState, report: MissionReport): HistoryAward {
  if (!report.success) return { patch: null, cards: [] };
  const patch: Patch = { contract: report.contract, day: report.launchDay };
  state.patches.push(patch);
  return { patch, cards: cardsAfter(report.contract).filter((id) => unlockCard(state, id)) };
}

/** The patch a Mission Report earned, if any. */
export function patchFor(state: SiteState, report: MissionReport): Patch | null {
  if (!report.success) return null;
  return state.patches.find((p) => p.contract === report.contract && p.day === report.launchDay) ?? null;
}
