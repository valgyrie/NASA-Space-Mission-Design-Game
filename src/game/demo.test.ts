import { describe, expect, it } from 'vitest';
import { SAVE_KEY, loadGame, saveGame } from '../save/save';
import { generateSite } from '../site/site';
import { settleAnomaly } from './anomalies';
import { DEMO_ERAS, DEMO_SAVE_KEY, createDemo, demoStorage } from './demo';
import { eraOf, eraStartDay } from './eras';
import { launch, planLaunch, shipMission, testRunFor } from './mission';
import { siteClimateFor } from './places';
import { advanceDays, fitBuildings, mineMaterial, storageCapacity, storageUsed } from './siteState';
import { checkDesign } from './spacecraft';

function storage() {
  const data = new Map<string, string>();
  return { data, getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); } };
}

describe('Demo Mode', () => {
  it.each(DEMO_ERAS)('prepares a playable Era %i on the fixed Site, with legal buildings and a ready Mission', (era) => {
    const game = createDemo(era);
    const { state } = game;
    const site = generateSite(game.site.seed, siteClimateFor(state.place));
    expect(game.site).toEqual(createDemo(1).site);
    expect(eraOf(state)).toBe(era);
    expect(state.day).toBe(eraStartDay(era));
    expect(state.contracts[0]?.id).toBe(({ 1: 'explorer1', 2: 'telstar1', 3: 'apollo11', 5: 'artemis2' } as const)[era]);
    expect(fitBuildings(site, state)).toBe(false);
    expect(state.mines.map((m) => mineMaterial(site, m)).sort()).toEqual(['aluminium', 'copper', 'silicon']);
    expect(storageUsed(state)).toBeLessThan(storageCapacity(state));
    expect(checkDesign(state, state.design).ready).toBe(true);
    expect(planLaunch(state, state.design).problems).toEqual([]);
    expect(testRunFor(state, game.site.seed, state.design).asLabelled.success).toBe(true);
    const store = storage();
    expect(saveGame(store, game)).toBe(true);
    expect(loadGame(store)).toEqual(game);
  });

  it.each(DEMO_ERAS)('can ship and finish Era %i through ordinary game rules', (era) => {
    const { site: { seed }, state } = createDemo(era);
    const site = generateSite(seed, siteClimateFor(state.place));
    const contract = state.contracts[0]!.id;
    expect(shipMission(state, state.design).ok).toBe(true);
    advanceDays(site, state, state.mission!.readyDay - state.day);
    let result = launch(state, seed);
    for (let i = 0; !result && i < 40; i++) {
      advanceDays(site, state, 1);
      result = launch(state, seed);
    }
    expect(result?.report.success).toBe(true);
    if (result?.report.anomaly) settleAnomaly(state, result.report, 1, 'played');
    expect(state.completed).toContain(contract);
    expect(state.patches.at(-1)?.contract).toBe(contract);
  });

  it('keeps demo saves separate from the player Company and starts every selected Era afresh', () => {
    const store = storage();
    const player = createDemo(1);
    player.company.name = 'Comet Works';
    saveGame(store, player);
    const original = store.getItem(SAVE_KEY);
    const demo = createDemo(2);
    const isolated = demoStorage(store);
    saveGame(isolated, demo);
    expect(store.getItem(SAVE_KEY)).toBe(original);
    expect(store.getItem(DEMO_SAVE_KEY)).not.toBeNull();
    expect(loadGame(isolated)).toEqual(demo);
    demo.state.money = 0;
    demo.state.contracts.length = 0;
    saveGame(isolated, demo);
    const reset = createDemo(2);
    expect(reset.state.money).toBeGreaterThan(0);
    expect(reset.state.contracts).toHaveLength(1);
    expect(createDemo(2)).toEqual(reset);
    expect(store.getItem(SAVE_KEY)).toBe(original);
  });
});
