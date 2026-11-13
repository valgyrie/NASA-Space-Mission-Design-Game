import { describe, expect, it, vi } from 'vitest';
import { checkCompanyName } from '../company/companyName';
import { createDemo } from '../game/demo';
import { newSiteState } from '../game/siteState';
import { SAVE_KEY, SAVE_VERSION } from '../save/save';
import { ACCOUNT_KEY, OnlineClient } from './client';
import { formatCode, generateNickname, leaderboardScores, normalizeCode, readFreePlaySave } from './model';

const code = '1234567890ABCDEF1234567890ABCDEF12345678';
const account = { nickname: 'LunarRover', revision: 0, updatedAt: null };
function storage() {
  const data = new Map<string, string>();
  return { data, getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); } };
}

describe('Online basics', () => {
  it('generates filtered nicknames for every word combination and formats recovery codes', () => {
    for (let a = 0; a < 6; a++) for (let b = 0; b < 6; b++) {
      const values = [a / 6, b / 6, 0.999];
      expect(checkCompanyName(generateNickname(() => values.shift()!)).ok).toBe(true);
    }
    expect(normalizeCode(formatCode(code).toLowerCase().replaceAll('-', ' '))).toBe(code);
    for (const bad of ['', 'LEAP-123', `${code}A`, 'Z'.repeat(40)]) expect(normalizeCode(bad)).toBeNull();
  });

  it('uses the existing save validator and accepts only Free Play Companies', () => {
    const game = createDemo(1);
    expect(readFreePlaySave(game)).toBeNull();
    game.state.playMode = 'freePlay';
    expect(readFreePlaySave(game)).toEqual(game);
    expect(readFreePlaySave({ ...game, state: { ...game.state, design: {} } })).toBeNull();
    expect(readFreePlaySave(null)).toBeNull();
  });

  it('accepts a current Free Play save with bought Plots, as the cloud receives it (ticket 22)', () => {
    const game = createDemo(2);
    game.state.playMode = 'freePlay';
    game.state.plots = [[1, 0], [2, 0]];
    const sent = JSON.parse(JSON.stringify(game));
    expect(sent.version).toBe(SAVE_VERSION);
    expect(readFreePlaySave(sent)).toEqual(game);
  });

  it('counts owned stock and paid building levels, completed Missions, Reputation and earned Research', () => {
    const state = newSiteState();
    state.money = 1000;
    state.stock.aluminium = 10;
    state.parts.smallBus = 1; // $4,000 aluminium + $4,000 Factory work.
    state.mines.push({ x: 1, z: 1, level: 3, upgradeDay: null }); // $150k × (1 + 1 + 2).
    state.completed = ['explorer1', 'tiros1'];
    state.reports = [{ success: true }, { success: true }, { success: false }] as typeof state.reports;
    state.research = { processedKb: 1200, tech: ['betterSolarCells'] };
    expect(leaderboardScores(state)).toEqual({ value: 610_000, missions: 2, reputation: 15, research: 12 });
    state.reports = [{ success: false }] as typeof state.reports;
    expect(leaderboardScores(state).reputation).toBe(0);
  });

  it('recovers on a second computer without touching either local Company or storing identity details', async () => {
    const first = storage();
    first.setItem(SAVE_KEY, 'local Company');
    const send = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ ...account, code: formatCode(code) })));
    const client = new OnlineClient(first, send);
    await client.create('LunarRover');
    expect(JSON.parse(first.getItem(ACCOUNT_KEY)!)).toEqual({ code: formatCode(code) });
    const second = storage();
    const recovered = new OnlineClient(second, vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(account))));
    await recovered.recover(formatCode(code));
    expect(recovered.code).toBe(client.code);
    expect(recovered.account).toEqual(account);
    expect(first.getItem(SAVE_KEY)).toBe('local Company');
    expect(second.getItem(SAVE_KEY)).toBeNull();
    expect(new OnlineClient(second).code).toBe(code);
  });

  it('keeps the current account and local save after bad recovery, an offline request or a save conflict', async () => {
    const store = storage();
    store.setItem(ACCOUNT_KEY, JSON.stringify({ code }));
    store.setItem(SAVE_KEY, 'keep this Company');
    const send = vi.fn<typeof fetch>();
    const client = new OnlineClient(store, send);
    send.mockResolvedValueOnce(new Response(JSON.stringify({ error: 'code' }), { status: 401 }));
    await expect(client.recover('A'.repeat(40))).rejects.toMatchObject({ problem: 'code' });
    expect(client.code).toBe(code);
    send.mockRejectedValueOnce(new TypeError('offline'));
    await expect(client.refresh()).rejects.toMatchObject({ problem: 'network' });
    const game = createDemo(1);
    game.state.playMode = 'freePlay';
    send.mockResolvedValueOnce(new Response(JSON.stringify({ error: 'conflict' }), { status: 409 }));
    await expect(client.save(game)).rejects.toMatchObject({ problem: 'conflict' });
    expect(store.getItem(SAVE_KEY)).toBe('keep this Company');
  });

  it('rejects damaged downloads and Campaign uploads before replacing a local Company', async () => {
    const store = storage();
    store.setItem(SAVE_KEY, 'keep this Company');
    const send = vi.fn<typeof fetch>().mockResolvedValueOnce(new Response(JSON.stringify({ ...account, save: {} })));
    const client = new OnlineClient(store, send);
    await expect(client.load()).rejects.toMatchObject({ problem: 'invalidSave' });
    await expect(client.save(createDemo(1))).rejects.toMatchObject({ problem: 'invalidSave' });
    expect(send).toHaveBeenCalledTimes(1);
    expect(store.getItem(SAVE_KEY)).toBe('keep this Company');
  });
});
