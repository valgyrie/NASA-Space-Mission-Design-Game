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

export const HISTORY_CARD_IDS = [
  'explorer1Before',
  'explorer1After',
  'vanguard1',
  'tiros1Before',
  'tiros1After',
  'vanguardTV3',
  'telstar1Before',
  'telstar1After',
  'syncom3Before',
  'syncom3After',
] as const;
export type HistoryCardId = (typeof HISTORY_CARD_IDS)[number];

export interface HistoryCard {
  id: HistoryCardId;
  contract: ContractId;
  /**
   * Before the Milestone, after it, a side story unlocked after it (and after its "after" card), or a failure
   * story, shown after the Company's first failed Mission.
   */
  when: 'before' | 'after' | 'side' | 'failure';
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
  // Failure story, after the Company's first failed Mission: Vanguard TV3 exploded on its pad on 6 December 1957.
  // No NASA photo of the explosion was found; this is a Vanguard rocket on its Cape Canaveral pad in March 1958,
  // waiting to launch Vanguard 1. Photo: NASA Image and Video Library KSC-58PD-06149A (NASA).
  vanguardTV3: {
    id: 'vanguardTV3',
    contract: 'explorer1',
    when: 'failure',
    year: 1957,
    image: 'history/vanguard-rocket.jpg',
    learnMore: 'https://www.nasa.gov/history/60-years-ago-explorer-1-becomes-americas-first-satellite/',
  },
  // Photo: NASA, "Telstar Opened Era of Global Satellite Television" (Thor/Delta 316 launching Telstar 1, LC-17B).
  telstar1Before: {
    id: 'telstar1Before',
    contract: 'telstar1',
    when: 'before',
    year: 1962,
    image: 'history/telstar-launch.jpg',
    learnMore: 'https://www.nasa.gov/history/telstar-opened-era-of-global-satellite-television/',
  },
  // Photo: NASA (via Wikimedia Commons, PD-USGov-NASA), the horn antenna of AT&T's Andover Earth Station.
  telstar1After: {
    id: 'telstar1After',
    contract: 'telstar1',
    when: 'after',
    year: 1962,
    image: 'history/andover-horn.jpg',
    learnMore: 'https://www.nasa.gov/history/telstar-opened-era-of-global-satellite-television/',
  },
  // Photo: NASA image article "The First Geosynchronous Satellite": a Syncom firing its apogee motor.
  syncom3Before: {
    id: 'syncom3Before',
    contract: 'syncom3',
    when: 'before',
    year: 1964,
    image: 'history/syncom.jpg',
    learnMore: 'https://www.nasa.gov/image-article/first-geosynchronous-satellite/',
  },
  // Photo: NASA Image and Video Library 9139573 (NASA/MSFC), a Thor-Delta launching Intelsat III on 21 May 1969.
  syncom3After: {
    id: 'syncom3After',
    contract: 'syncom3',
    when: 'after',
    year: 1964,
    image: 'history/delta-intelsat3.jpg',
    learnMore: 'https://www.nasa.gov/history/communications-satellites/',
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

/** The failure story shown after the Company's first failed Mission. */
export const FAILURE_STORY: HistoryCardId = 'vanguardTV3';

/**
 * A successful Mission earns its Mission Patch and unlocks its "after" card and side stories. The first failed
 * one unlocks the failure story: failure is part of history.
 */
export function awardMission(state: SiteState, report: MissionReport): HistoryAward {
  if (!report.success) return { patch: null, cards: unlockCard(state, FAILURE_STORY) ? [FAILURE_STORY] : [] };
  const patch: Patch = { contract: report.contract, day: report.launchDay };
  state.patches.push(patch);
  return { patch, cards: cardsAfter(report.contract).filter((id) => unlockCard(state, id)) };
}

/** The patch a Mission Report earned, if any. */
export function patchFor(state: SiteState, report: MissionReport): Patch | null {
  if (!report.success) return null;
  return state.patches.find((p) => p.contract === report.contract && p.day === report.launchDay) ?? null;
}
