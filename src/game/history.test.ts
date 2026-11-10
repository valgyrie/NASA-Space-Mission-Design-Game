import { describe, expect, it } from 'vitest';
import { acceptContract } from './contracts';
import { HISTORY_CARD_IDS, HISTORY_CARDS, awardMission, historyCardFor, patchFor, unlockCard } from './history';
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
  });

  it('has text, a credited photo and an official NASA Learn more link for every card', () => {
    for (const id of HISTORY_CARD_IDS) {
      for (const part of ['title', 'text', 'caption', 'credit'] as const) expect(STRINGS[`history.${id}.${part}`]).toBeTruthy();
      expect(HISTORY_CARDS[id].image).toMatch(/^history\/.+\.jpg$/);
      expect(HISTORY_CARDS[id].learnMore).toMatch(/^https:\/\/(www|science)\.nasa\.gov\//);
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
    expect(state.history).toContain('explorer1After');
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
    expect(again.card).toBeNull();
    expect(again.patch).not.toBeNull();
  });
});
