import { describe, expect, it } from 'vitest';
import { acceptContract } from './contracts';
import { HISTORY_CARD_IDS, HISTORY_CARDS, awardMission, cardsAfter, historyCardFor, patchFor, unlockCard } from './history';
import { launch, shipMission } from './mission';
import { type SiteState, newSiteState } from './siteState';
import { type OptionId, choose, partsNeeded } from './spacecraft';
import { STRINGS } from '../strings';

const EXPLORER: OptionId[] = ['smallBus', 'batteriesOnly', 'largeBattery', 'simpleAntenna', 'spin', 'radiationDetector'];

function flown(ids: OptionId[] = EXPLORER): SiteState {
  const state = newSiteState();
  acceptContract(state, 'explorer1');
  for (const id of ids) choose(state.design, id);
  for (const p of partsNeeded(state.design)) state.parts[p] += 1;
  shipMission(state, state.design);
  state.day = state.mission!.readyDay;
  launch(state, 'K7QXM2');
  return state;
}

describe('Real History cards', () => {
  it('gives the Explorer 1 Milestone a card before and after', () => {
    expect(historyCardFor('explorer1', 'before')).toBe('explorer1Before');
    expect(historyCardFor('explorer1', 'after')).toBe('explorer1After');
    expect(historyCardFor('tiros1', 'before')).toBe('tiros1Before');
    expect(historyCardFor('tiros1', 'after')).toBe('tiros1After');
  });

  it('follows Explorer 1 with the Vanguard 1 side story, which unlocks Solar Cells', () => {
    expect(cardsAfter('explorer1')).toEqual(['explorer1After', 'vanguard1']);
    expect(cardsAfter('tiros1')).toEqual(['tiros1After']);
  });

  it('follows a successful Telstar 1 with Alouette 1 once, keeping it in the Archive', () => {
    expect(cardsAfter('telstar1')).toEqual(['telstar1After', 'alouette1']);
    expect(cardsAfter('syncom3')).toEqual(['syncom3After']);
    const state = flown();
    const report = { ...state.reports[0]!, contract: 'telstar1' as const };
    expect(awardMission(state, { ...report, success: false }).cards).not.toContain('alouette1');
    expect(awardMission(state, report).cards).toEqual(['telstar1After', 'alouette1']);
    expect(state.history.slice(-2)).toEqual(['telstar1After', 'alouette1']);
    expect(awardMission(state, report).cards).toEqual([]);
    expect(HISTORY_CARDS.alouette1.image).toBeUndefined();
    expect(HISTORY_CARDS.alouette1.learnMore).toBe('https://www.asc-csa.gc.ca/eng/satellites/alouette.asp');
  });

  it('has text, credits each photo and links every card to an official space agency', () => {
    for (const id of HISTORY_CARD_IDS) {
      for (const part of ['title', 'text'] as const) expect(STRINGS[`history.${id}.${part}`]).toBeTruthy();
      if (HISTORY_CARDS[id].image) {
        for (const part of ['caption', 'credit'] as const) expect(STRINGS[`history.${id}.${part}`]).toBeTruthy();
        expect(HISTORY_CARDS[id].image).toMatch(/^history\/.+\.jpg$/);
      }
      expect(HISTORY_CARDS[id].learnMore).toMatch(/^https:\/\/(www\.asc-csa\.gc\.ca|(?:www|science)\.nasa\.gov)\//);
    }
  });

  it('keeps each card once in the History Archive', () => {
    const state = newSiteState();
    expect(unlockCard(state, 'explorer1Before')).toBe(true);
    expect(unlockCard(state, 'explorer1Before')).toBe(false);
    expect(state.history).toEqual(['explorer1Before']);
  });
});

describe('Mission Patches', () => {
  it('awards the first Mission Patch and the "after" card for a successful Mission', () => {
    const state = flown();
    const report = state.reports[0]!;
    expect(report.success).toBe(true);
    expect(state.patches).toEqual([{ contract: 'explorer1', day: report.launchDay }]);
    expect(state.history.slice(-2)).toEqual(['explorer1After', 'vanguard1']);
    expect(patchFor(state, report)).toEqual(state.patches[0]);
  });

  it('gives nothing for a failed Mission', () => {
    const state = flown(['smallBus', 'batteriesOnly', 'smallBattery', 'simpleAntenna', 'spin', 'radiationDetector']);
    const report = state.reports[0]!;
    expect(report.success).toBe(false);
    expect(state.patches).toEqual([]);
    expect(state.history).not.toContain('explorer1After');
    expect(patchFor(state, report)).toBeNull();
  });

  it('only reports the "after" card as new the first time', () => {
    const state = flown();
    const again = awardMission(state, state.reports[0]!);
    expect(again.cards).toEqual([]);
    expect(again.patch).not.toBeNull();
  });
});
