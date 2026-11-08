import { PARTS } from '../economy/part';
import { RAW_MATERIALS } from '../economy/rawMaterial';
import { MARKET_LOT_KG, RECIPES } from '../game/balance';
import {
  type MarketItem,
  type TradeResult,
  buy,
  buyPrice,
  checkBuy,
  checkSell,
  isPart,
  sell,
  sellPrice,
} from '../game/market';
import { type SiteState, storageCapacity, storageUsed } from '../game/siteState';
import { t } from '../strings';
import { PRODUCT_COLOUR } from '../world/buildingParts';
import { DEPOSIT_COLOUR } from '../world/siteMesh';
import { cssColour, formatKg, formatMoney, formatNumber } from './format';

export interface MarketPanel {
  toggle(): void;
  close(): void;
  readonly isOpen: boolean;
  /** Refresh stock and which buttons work. Cheap enough to call every frame. */
  update(): void;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  e.className = className;
  if (text) e.textContent = text;
  return e;
}

function setText(e: HTMLElement, text: string): void {
  if (e.textContent !== text) e.textContent = text;
}

/** "Storage used: 320 of 500 kg" */
export function storageText(state: SiteState): string {
  return t('panel.storage', {
    used: formatNumber(Math.floor(storageUsed(state))),
    capacity: formatNumber(storageCapacity(state)),
  });
}

export function itemName(item: MarketItem): string {
  return isPart(item) ? t(`part.${item}`) : t(`material.${item}`);
}

export function itemColour(item: MarketItem): string {
  return cssColour(isPart(item) ? PRODUCT_COLOUR[RECIPES[item].factory] : DEPOSIT_COLOUR[item]);
}

/** The Market: buy and sell Raw Materials (by the lot) and Parts (one at a time). `onTrade` runs after each trade. */
export function showMarketPanel(root: HTMLElement, state: SiteState, onTrade: () => void): MarketPanel {
  const panel = el('div', 'panel side-panel market');
  panel.hidden = true;
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-labelledby', 'market-heading');

  const head = el('div', 'side-head');
  const heading = el('h2', '', t('market.heading'));
  heading.id = 'market-heading';
  const close = el('button', 'small icon-button', t('panel.close'));
  close.type = 'button';
  close.title = t('panel.closeName');
  close.setAttribute('aria-label', t('panel.closeName'));
  head.append(heading, close);

  const note = el('p', 'side-note', t('market.note'));
  const storage = el('p', 'side-note storage-line');
  const problem = el('p', 'side-problem');
  problem.setAttribute('aria-live', 'polite');

  const rows: { item: MarketItem; stock: HTMLElement; buy: HTMLButtonElement; sell: HTMLButtonElement }[] = [];
  const section = (title: string, items: readonly MarketItem[]) => {
    const list = el('div', 'market-list');
    list.append(el('h3', '', title));
    for (const item of items) {
      const row = el('div', 'market-row');
      const name = el('div', 'market-name');
      const dot = el('span', 'dot');
      dot.style.background = itemColour(item);
      const label = el('span', '', itemName(item));
      const sub = el(
        'span',
        'market-sub',
        isPart(item) ? t('market.mass', { kg: RECIPES[item].massKg }) : t('market.lot', { kg: MARKET_LOT_KG }),
      );
      name.append(dot, label, sub);
      const stock = el('span', 'market-stock');
      const b = el('button', 'small trade', t('market.buy', { price: formatMoney(buyPrice(item)) }));
      b.type = 'button';
      const s = el('button', 'small trade', t('market.sell', { price: formatMoney(sellPrice(item)) }));
      s.type = 'button';
      const trade = (fn: (state: SiteState, item: MarketItem) => TradeResult) => {
        const result = fn(state, item);
        setText(problem, result.ok ? '' : t(`market.problem.${result.problem}`));
        if (result.ok) onTrade();
        update();
      };
      b.addEventListener('click', () => trade(buy));
      s.addEventListener('click', () => trade(sell));
      row.append(name, stock, b, s);
      list.append(row);
      rows.push({ item, stock, buy: b, sell: s });
    }
    return list;
  };

  panel.append(
    head,
    note,
    storage,
    section(t('market.materials'), RAW_MATERIALS),
    section(t('market.parts'), PARTS),
    problem,
  );
  root.append(panel);

  const update = () => {
    if (panel.hidden) return;
    setText(storage, storageText(state));
    for (const r of rows) {
      setText(r.stock, isPart(r.item) ? String(state.parts[r.item]) : formatKg(state.stock[r.item]));
      // Buttons stay clickable when a trade can't happen, so a click can explain why.
      r.buy.classList.toggle('blocked', !checkBuy(state, r.item).ok);
      r.sell.classList.toggle('blocked', !checkSell(state, r.item).ok);
    }
  };

  const api: MarketPanel = {
    toggle() {
      if (panel.hidden) {
        panel.hidden = false;
        setText(problem, '');
        update();
      } else api.close();
    },
    close() {
      panel.hidden = true;
    },
    get isOpen() {
      return !panel.hidden;
    },
    update,
  };
  close.addEventListener('click', () => api.close());
  return api;
}
