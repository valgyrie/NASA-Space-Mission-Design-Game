import { describe, expect, it } from 'vitest';
import { CONTRACT_IDS, CONTRACTS, acceptContract, availableContracts, daysLeft, deadlineDay, expireContracts } from './contracts';
import { type SiteState, advanceDays, newSiteState } from './siteState';
import { generateSite } from '../site/site';
import { STRINGS } from '../strings';

describe('Contracts board', () => {
  it('offers Explorer 1 as a Milestone at the start', () => {
    const state = newSiteState();
    expect(availableContracts(state).map((c) => c.id)).toEqual(['explorer1']);
    expect(CONTRACTS.explorer1.kind).toBe('milestone');
    expect(CONTRACTS.explorer1.reward).toBeGreaterThan(0);
    expect(CONTRACTS.explorer1.requirements.length).toBeGreaterThan(0);
  });

  it('accepting makes it active and starts the deadline that day', () => {
    const state = { ...newSiteState(), day: 20.5 };
    expect(acceptContract(state, 'explorer1')).toEqual({ ok: true });
    expect(availableContracts(state)).toEqual([]);
    const [taken] = state.contracts;
    expect(taken).toEqual({ id: 'explorer1', acceptedDay: 20.5 });
    expect(deadlineDay(taken!)).toBe(20 + CONTRACTS.explorer1.deadlineDays);
    expect(daysLeft(state, taken!)).toBe(CONTRACTS.explorer1.deadlineDays);
    // Later the same day, still the full count: days are counted by date.
    state.day = 20.9;
    expect(daysLeft(state, taken!)).toBe(CONTRACTS.explorer1.deadlineDays);
  });

  it("can't be accepted twice", () => {
    const state = newSiteState();
    acceptContract(state, 'explorer1');
    expect(acceptContract(state, 'explorer1')).toEqual({ ok: false, problem: 'taken' });
    expect(state.contracts).toHaveLength(1);
  });

  it('counts down as the Game date moves and stops at zero', () => {
    const site = generateSite('K7QXM2');
    const state = newSiteState();
    acceptContract(state, 'explorer1');
    advanceDays(site, state, 100);
    expect(daysLeft(state, state.contracts[0]!)).toBe(CONTRACTS.explorer1.deadlineDays - 100);
    advanceDays(site, state, CONTRACTS.explorer1.deadlineDays - 101);
    expect(daysLeft(state, state.contracts[0]!)).toBe(1);
  });

  it('puts a Milestone back on the board when its deadline passes, to try again with a new deadline', () => {
    const site = generateSite('K7QXM2');
    const state = newSiteState();
    acceptContract(state, 'explorer1');
    advanceDays(site, state, CONTRACTS.explorer1.deadlineDays);
    expect(state.contracts).toEqual([]);
    expect(state.reopened).toEqual(['explorer1']);
    expect(availableContracts(state).map((c) => c.id)).toEqual(['explorer1']);
    expect(acceptContract(state, 'explorer1')).toEqual({ ok: true });
    expect(state.reopened).toEqual([]);
    expect(daysLeft(state, state.contracts[0]!)).toBe(CONTRACTS.explorer1.deadlineDays);
  });

  it('waits for a Mission already on its way before reopening its Contract', () => {
    const state = newSiteState();
    acceptContract(state, 'explorer1');
    state.mission = { contract: 'explorer1' } as SiteState['mission'];
    state.day = CONTRACTS.explorer1.deadlineDays + 5;
    expect(expireContracts(state)).toEqual([]);
    state.mission = null;
    expect(expireContracts(state)).toEqual(['explorer1']);
  });

  it('has a name, client and objective for every Contract', () => {
    for (const id of CONTRACT_IDS) {
      for (const field of ['name', 'client', 'objective']) expect(STRINGS).toHaveProperty([`contract.${id}.${field}`]);
    }
  });
});
