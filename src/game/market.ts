import { PARTS, type Part } from '../economy/part';
import { RAW_MATERIALS, type RawMaterial } from '../economy/rawMaterial';
import { MARKET_BUY_FACTOR, MARKET_LOT_KG, MARKET_SELL_FACTOR, MATERIAL_VALUE, RECIPES } from './balance';
import { type SiteState, addPart, storageFree, takePart } from './siteState';

/** Anything the Market trades: a Raw Material (by the lot) or a Part (one at a time). */
export type MarketItem = RawMaterial | Part;

export const MARKET_ITEMS: readonly MarketItem[] = [...RAW_MATERIALS, ...PARTS];

export function isPart(item: MarketItem): item is Part {
  return (PARTS as readonly string[]).includes(item);
}

/** How much one trade moves: a lot of Raw Material in kilograms, or one Part. */
export function lotSize(item: MarketItem): number {
  return isPart(item) ? 1 : MARKET_LOT_KG;
}

/** Kilograms one trade takes up in storage. */
function lotMass(item: MarketItem): number {
  return isPart(item) ? RECIPES[item].massKg : MARKET_LOT_KG;
}

/** What one lot costs to make yourself: the Raw Materials' value, plus the Factory's work for a Part. */
export function makingCost(item: MarketItem): number {
  if (!isPart(item)) return MATERIAL_VALUE[item] * MARKET_LOT_KG;
  const recipe = RECIPES[item];
  let cost = recipe.work;
  for (const [m, kg] of Object.entries(recipe.inputs) as [RawMaterial, number][]) cost += MATERIAL_VALUE[m] * kg;
  return cost;
}

/** What the Market charges for one lot: more than making it. */
export function buyPrice(item: MarketItem): number {
  return Math.round(makingCost(item) * MARKET_BUY_FACTOR);
}

/** What the Market pays for one lot: less than making it. */
export function sellPrice(item: MarketItem): number {
  return Math.round(makingCost(item) * MARKET_SELL_FACTOR);
}

/** How many lots of `item` are in stock. */
export function lotsInStock(state: SiteState, item: MarketItem): number {
  return isPart(item) ? state.parts[item] : Math.floor(state.stock[item] / MARKET_LOT_KG);
}

export type TradeProblem = 'money' | 'space' | 'none';
export type TradeResult = { ok: true } | { ok: false; problem: TradeProblem };

export function checkBuy(state: SiteState, item: MarketItem): TradeResult {
  if (state.money < buyPrice(item)) return { ok: false, problem: 'money' };
  if (storageFree(state) < lotMass(item)) return { ok: false, problem: 'space' };
  return { ok: true };
}

/** Buy one lot. It arrives in storage at once (Shipping between Sites comes later). */
export function buy(state: SiteState, item: MarketItem): TradeResult {
  const check = checkBuy(state, item);
  if (!check.ok) return check;
  state.money -= buyPrice(item);
  if (isPart(item)) addPart(state, item, 1);
  else state.stock[item] += MARKET_LOT_KG;
  return check;
}

export function checkSell(state: SiteState, item: MarketItem): TradeResult {
  return lotsInStock(state, item) >= 1 ? { ok: true } : { ok: false, problem: 'none' };
}

/** Sell one lot from storage. Parts go lowest Mark first, so the best stay for Spacecraft. */
export function sell(state: SiteState, item: MarketItem): TradeResult {
  const check = checkSell(state, item);
  if (!check.ok) return check;
  state.money += sellPrice(item);
  if (isPart(item)) takePart(state, item, 'worst');
  else state.stock[item] -= MARKET_LOT_KG;
  return check;
}
