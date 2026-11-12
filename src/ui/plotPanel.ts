import { RAW_MATERIALS } from '../economy/rawMaterial';
import { buyPlot, checkPlot, plotSummary } from '../game/plots';
import type { SiteState } from '../game/siteState';
import { type PlotRef, type Site } from '../site/site';
import { t } from '../strings';
import { formatMoney } from './format';

export interface PlotPanel {
  /** Show the card for a Plot next door. */
  show(plot: PlotRef): void;
  close(): void;
  readonly isOpen: boolean;
  /** Refresh the price and the Buy button (money changes as time runs). */
  update(): void;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  e.className = className;
  if (text) e.textContent = text;
  return e;
}

/**
 * The card for a Plot of land next door (ticket 30): its Deposits, water and land, its price, and a button to buy
 * it. `onBuy` runs after a Plot joins the Site, to redraw the land and save.
 */
export function showPlotPanel(root: HTMLElement, site: Site, state: SiteState, onBuy: (plot: PlotRef) => void): PlotPanel {
  const panel = el('div', 'panel side-panel building-panel plot-panel');
  panel.hidden = true;
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-labelledby', 'plot-heading');
  const head = el('div', 'side-head');
  const heading = el('h2', '', t('plot.heading'));
  heading.id = 'plot-heading';
  const close = el('button', 'small icon-button', t('panel.close'));
  close.type = 'button';
  close.title = t('panel.closeName');
  close.setAttribute('aria-label', t('panel.closeName'));
  head.append(heading, close);
  const intro = el('p', 'side-note', t('plot.intro'));
  const deposits = el('ul', 'plot-deposits');
  const water = el('p', '');
  const land = el('p', '');
  const price = el('p', 'plot-price');
  const buy = el('button', 'plot-buy');
  buy.type = 'button';
  const problem = el('p', 'side-problem');
  panel.append(
    head,
    intro,
    el('h3', '', t('plot.deposits')),
    deposits,
    el('h3', '', t('plot.water')),
    water,
    el('h3', '', t('plot.land')),
    land,
    el('h3', '', t('plot.price')),
    price,
    buy,
    problem,
  );
  root.append(panel);

  let plot: PlotRef | null = null;

  const api: PlotPanel = {
    show(p) {
      plot = p;
      const summary = plotSummary(site, p.px, p.pz);
      deposits.replaceChildren(
        ...RAW_MATERIALS.map((m) => el('li', '', t('plot.deposit', { material: t(`material.${m}`), count: summary.deposits[m] }))),
      );
      const percent = Math.round(summary.water * 100);
      water.textContent = percent === 0 ? t('plot.water.none') : t('plot.water.some', { percent });
      const kinds = summary.land.map((k) => t(`terrain.${k}`));
      // "grass, sand and hills"
      land.textContent =
        kinds.length === 0 ? t('plot.water.none') : kinds.length === 1 ? kinds[0]! : `${kinds.slice(0, -1).join(', ')}${t('panel.and')}${kinds.at(-1)}`;
      panel.hidden = false;
      api.update();
    },
    close() {
      plot = null;
      panel.hidden = true;
    },
    get isOpen() {
      return !panel.hidden;
    },
    update() {
      if (!plot || panel.hidden) return;
      const check = checkPlot(site, state, plot.px, plot.pz);
      const text = check.ok && check.free ? t('plot.free') : formatMoney(check.price);
      if (price.textContent !== text) price.textContent = text;
      const label = check.ok && check.free ? t('plot.take') : t('plot.buy');
      if (buy.textContent !== label) buy.textContent = label;
      buy.disabled = !check.ok;
      const why = check.ok ? '' : t(`plot.problem.${check.problem}`);
      if (problem.textContent !== why) problem.textContent = why;
    },
  };
  close.addEventListener('click', () => api.close());
  buy.addEventListener('click', () => {
    if (!plot) return;
    const bought = plot;
    if (!buyPlot(site, state, bought.px, bought.pz).ok) return api.update();
    api.close();
    onBuy(bought);
  });
  return api;
}
