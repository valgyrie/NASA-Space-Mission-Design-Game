import { RAW_MATERIALS, type RawMaterial } from '../economy/rawMaterial';
import { type Land, SITE_SIZE, type Site, type Terrain, addPlot, landOf, ownsPlot, plotKey, plotTiles } from '../site/site';
import { PLOT_PRICE } from './balance';
import type { SiteState } from './siteState';

/**
 * Plots (ticket 30): the land around the Site comes in Site-sized Plots. A Plot touching land the Company owns
 * can be bought, and then it is part of the Site. The Home Site is Plot (0, 0).
 */

/** What a Plot holds, for the Plot card. */
export interface PlotSummary {
  /** Deposits (patches of Raw Material) of each kind. */
  deposits: Record<RawMaterial, number>;
  /** Share of the Plot under water, 0–1. */
  water: number;
  /** Kinds of dry land, the most common first; only those covering a tenth of the Plot or more. */
  land: Exclude<Terrain, 'water'>[];
}

/** What each Plot of a Site holds never changes, so it is worked out once. */
const summaries = new WeakMap<Site, Map<string, PlotSummary>>();

/** Count Deposits and land on a Plot. A Deposit is a patch of touching tiles of one Raw Material. */
export function plotSummary(site: Site, px: number, pz: number, land?: Land): PlotSummary {
  let cache = summaries.get(site);
  if (!cache) summaries.set(site, (cache = new Map()));
  const key = plotKey(px, pz);
  const found = cache.get(key);
  if (found) return found;
  const summary = countPlot(site, px, pz, land);
  cache.set(key, summary);
  return summary;
}

function countPlot(site: Site, px: number, pz: number, land?: Land): PlotSummary {
  const tiles = plotTiles(site, px, pz, land);
  const deposits = Object.fromEntries(RAW_MATERIALS.map((m) => [m, 0])) as Record<RawMaterial, number>;
  const seen = new Set<number>();
  tiles.forEach((tile, i) => {
    if (!tile.deposit || seen.has(i)) return;
    deposits[tile.deposit] += 1;
    const queue = [i];
    seen.add(i);
    while (queue.length > 0) {
      const j = queue.pop()!;
      const x = j % SITE_SIZE;
      const z = Math.floor(j / SITE_SIZE);
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const nx = x + dx;
        const nz = z + dz;
        const k = nz * SITE_SIZE + nx;
        if (nx < 0 || nz < 0 || nx >= SITE_SIZE || nz >= SITE_SIZE || seen.has(k) || tiles[k]!.deposit !== tile.deposit) continue;
        seen.add(k);
        queue.push(k);
      }
    }
  });
  const counts = new Map<Terrain, number>();
  for (const t of tiles) counts.set(t.terrain, (counts.get(t.terrain) ?? 0) + 1);
  const landKinds = [...counts.entries()]
    .filter(([t, n]) => t !== 'water' && n >= tiles.length / 10)
    .sort((a, b) => b[1] - a[1])
    .map(([t]) => t as Exclude<Terrain, 'water'>);
  return { deposits, water: (counts.get('water') ?? 0) / tiles.length, land: landKinds };
}

/** The price of a Plot: more for its dry land and Deposits, and for each Plot already bought. */
export function plotPrice(summary: PlotSummary, bought: number): number {
  const deposits = RAW_MATERIALS.reduce((n, m) => n + summary.deposits[m], 0);
  const worth = PLOT_PRICE.base * (1 - summary.water) + PLOT_PRICE.perDeposit * deposits;
  const price = Math.max(PLOT_PRICE.min, worth) * (1 + PLOT_PRICE.perBought * bought);
  return Math.round(price / 10_000) * 10_000;
}

/** Does the Plot touch land the Company owns (sides and corners count)? */
export function touchesSite(site: Site, px: number, pz: number): boolean {
  for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) if ((dx || dz) && ownsPlot(site, px + dx, pz + dz)) return true;
  return false;
}

export type PlotProblem = 'owned' | 'notTouching' | 'money';

export type PlotCheck = { ok: true; price: number; free: boolean } | { ok: false; problem: PlotProblem; price: number };

/** Can the Company buy the Plot now? A Plot won from a Contract is free. */
export function checkPlot(site: Site, state: SiteState, px: number, pz: number, land?: Land): PlotCheck {
  const price = plotPrice(plotSummary(site, px, pz, land), state.plots.length);
  if (ownsPlot(site, px, pz)) return { ok: false, problem: 'owned', price };
  if (!touchesSite(site, px, pz)) return { ok: false, problem: 'notTouching', price };
  if (state.freePlots > 0) return { ok: true, price, free: true };
  if (state.money < price) return { ok: false, problem: 'money', price };
  return { ok: true, price, free: false };
}

/** Buy the Plot if allowed: it joins the Site. */
export function buyPlot(site: Site, state: SiteState, px: number, pz: number, land: Land = landOf(site)): PlotCheck {
  const check = checkPlot(site, state, px, pz, land);
  if (!check.ok) return check;
  if (check.free) state.freePlots -= 1;
  else state.money -= check.price;
  state.plots.push([px, pz]);
  addPlot(site, px, pz, land);
  return check;
}

/** Add the Company's bought Plots to a freshly generated Site. */
export function addOwnedPlots(site: Site, state: SiteState): void {
  if (state.plots.length === 0) return;
  const land = landOf(site);
  for (const [px, pz] of state.plots) addPlot(site, px, pz, land);
}

