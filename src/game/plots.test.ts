import { describe, expect, it } from 'vitest';
import { SITE_SIZE, generateSite, ownsPlot, plotTiles, tileAt } from '../site/site';
import { DEFAULT_LOGO } from '../company/logo';
import { SAVE_VERSION, type SaveData, type SaveStorage, loadGame, saveGame } from '../save/save';
import { PLOT_PRICE } from './balance';
import { completeContract, contractById } from './contracts';
import { addOwnedPlots, buyPlot, checkPlot, plotPrice, plotSummary, touchesSite } from './plots';
import { build, newSiteState } from './siteState';

const SEED = 'K7QXM2';
const rich = () => ({ ...newSiteState(), money: 100_000_000 });

describe('Plots of land next door', () => {
  it('gives each Plot its own Deposits from the Seed, and never changes the Home Site', () => {
    const site = generateSite(SEED);
    const before = JSON.stringify(site.tiles);
    const east = plotTiles(site, 1, 0);
    expect(east).toHaveLength(SITE_SIZE * SITE_SIZE);
    expect(JSON.stringify(plotTiles(generateSite(SEED), 1, 0))).toBe(JSON.stringify(east));
    expect(JSON.stringify(plotTiles(site, -1, 0))).not.toBe(JSON.stringify(east));
    buyPlot(site, rich(), 1, 0);
    expect(JSON.stringify(site.tiles)).toBe(before);
    expect(JSON.stringify(generateSite(SEED).tiles)).toBe(before);
  });

  it('sums up Deposits per Raw Material, water and land', () => {
    const site = generateSite(SEED);
    // This Seed's Home Site has the sea to the west: those Plots are all water.
    for (const [px, pz] of [[1, 0], [0, -1], [1, 1]] as const) {
      const s = plotSummary(site, px, pz);
      // A Plot with land, like every Site, gets at least two Deposits of each.
      expect(Object.values(s.deposits).every((n) => n >= 2)).toBe(true);
      expect(s.water).toBeLessThan(0.5);
      expect(s.land.length).toBeGreaterThan(0);
    }
    expect(plotSummary(site, -1, 0)).toEqual({ deposits: { aluminium: 0, copper: 0, silicon: 0 }, water: 1, land: [] });
  });

  it('prices a Plot by what it holds and by the Plots already bought', () => {
    const few = { deposits: { aluminium: 2, copper: 2, silicon: 2 }, water: 0, land: ['grass' as const] };
    const many = { ...few, deposits: { aluminium: 4, copper: 4, silicon: 4 } };
    expect(plotPrice(few, 0)).toBe(PLOT_PRICE.base + 6 * PLOT_PRICE.perDeposit);
    expect(plotPrice(many, 0)).toBeGreaterThan(plotPrice(few, 0));
    expect(plotPrice(few, 1)).toBeGreaterThan(plotPrice(few, 0));
    expect(plotPrice(few, 2)).toBeGreaterThan(plotPrice(few, 1));
    // Water is worth less than land; open sea costs the least.
    expect(plotPrice({ ...few, water: 0.5 }, 0)).toBeLessThan(plotPrice(few, 0));
    expect(plotPrice({ deposits: { aluminium: 0, copper: 0, silicon: 0 }, water: 1, land: [] }, 0)).toBe(PLOT_PRICE.min);
  });

  it('sells only Plots touching land the Company owns', () => {
    const site = generateSite(SEED);
    const state = rich();
    for (let pz = -1; pz <= 1; pz++) for (let px = -1; px <= 1; px++) if (px || pz) expect(touchesSite(site, px, pz)).toBe(true);
    expect(checkPlot(site, state, 0, 0)).toMatchObject({ ok: false, problem: 'owned' });
    expect(checkPlot(site, state, 2, 0)).toMatchObject({ ok: false, problem: 'notTouching' });
    expect(buyPlot(site, state, 1, 0).ok).toBe(true);
    expect(checkPlot(site, state, 2, 0).ok).toBe(true);
    expect(checkPlot(site, { ...state, money: 0 }, 2, 1)).toMatchObject({ ok: false, problem: 'money' });
  });

  it('adds a bought Plot to the Site: pays, saves it, and lets buildings go on it and across the old edge', () => {
    const site = generateSite(SEED);
    const state = rich();
    const price = checkPlot(site, state, 1, 0).price;
    expect(tileAt(site, SITE_SIZE, 10)).toBeUndefined();
    buyPlot(site, state, 1, 0);
    expect(state.money).toBe(100_000_000 - price);
    expect(state.plots).toEqual([[1, 0]]);
    expect(ownsPlot(site, 1, 0)).toBe(true);
    expect(tileAt(site, SITE_SIZE, 10)).toEqual(plotTiles(generateSite(SEED), 1, 0)[10 * SITE_SIZE]);
    // A spot straddling the old edge, on dry land without a Deposit, can now be built on.
    let spot: { x: number; z: number } | null = null;
    for (let z = 1; z < SITE_SIZE - 1 && !spot; z++) {
      if (build(site, state, 'warehouse', SITE_SIZE, z).ok) spot = { x: SITE_SIZE, z };
    }
    expect(spot).not.toBeNull();
    // The next Plot costs more.
    expect(plotPrice(plotSummary(site, 1, 1), state.plots.length)).toBeGreaterThan(plotPrice(plotSummary(site, 1, 1), 0));
  });

  it('can be won from a Free Play Contract and then taken for free', () => {
    const contract = contractById('free-3');
    expect(contract.plot).toBe(true);
    expect(contractById('free-0').plot).toBeUndefined();
    const site = generateSite(SEED);
    const state = { ...newSiteState(undefined, 'easy', 'freePlay'), money: 0 };
    state.contracts.push({ id: 'free-3', acceptedDay: state.day });
    completeContract(state, 'free-3', false);
    expect(state.freePlots).toBe(1);
    expect(checkPlot(site, state, 0, 1)).toMatchObject({ ok: true, free: true });
    expect(buyPlot(site, state, 0, 1).ok).toBe(true);
    expect(state.money).toBe(0);
    expect(state.freePlots).toBe(0);
    expect(checkPlot(site, state, 1, 1)).toMatchObject({ ok: false, problem: 'money' });
  });

  it('keeps bought Plots through save and reload', () => {
    const data = new Map<string, string>();
    const storage: SaveStorage = { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
    const site = generateSite(SEED);
    const state = rich();
    buyPlot(site, state, -1, 0);
    buyPlot(site, state, -1, -1);
    const game: SaveData = { version: SAVE_VERSION, company: { name: 'Comet Works', logo: { ...DEFAULT_LOGO } }, site: { seed: SEED }, state };
    saveGame(storage, game);
    const loaded = loadGame(storage)!;
    expect(loaded.state.plots).toEqual([[-1, 0], [-1, -1]]);
    const again = generateSite(SEED);
    addOwnedPlots(again, loaded.state);
    expect(ownsPlot(again, -1, -1)).toBe(true);
    expect(tileAt(again, -5, -5)).toEqual(tileAt(site, -5, -5));
  });
});
