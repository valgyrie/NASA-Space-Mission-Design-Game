import { RAW_MATERIALS } from '../economy/rawMaterial';
import { availableContracts, daysLeft } from '../game/contracts';
import type { SiteState } from '../game/siteState';
import { t } from '../strings';
import { DEPOSIT_COLOUR } from '../world/siteMesh';
import { cssColour, formatNumber } from './format';

export interface Hud {
  /** Refresh the active Contract line. Cheap enough to call every frame. */
  update(state: SiteState): void;
}

function setText(e: HTMLElement, text: string): void {
  if (e.textContent !== text) e.textContent = text;
}

/** The panel at the top left of the Site view: Company name, menu button, Deposit colours, Market, Contracts, Mission Designer and the active Contract. */
export function showHud(
  root: HTMLElement,
  companyName: string,
  onMenu: () => void,
  onHome: () => void,
  onMarket: () => void,
  onContracts: () => void,
  onDesigner: () => void,
): Hud {
  const bar = document.createElement('div');
  bar.className = 'panel hud';

  const name = document.createElement('span');
  name.className = 'hud-company';
  name.textContent = t('hud.company', { name: companyName });
  name.title = name.textContent; // the whole name on hover when it is cut short

  const menu = document.createElement('button');
  menu.type = 'button';
  menu.className = 'small icon-button';
  menu.textContent = t('hud.menuIcon');
  menu.title = t('hud.menu');
  menu.setAttribute('aria-label', t('hud.menu'));
  menu.addEventListener('click', onMenu);

  const home = document.createElement('button');
  home.type = 'button';
  home.className = 'small icon-button';
  home.textContent = t('hud.homeIcon');
  home.title = t('hud.home');
  home.setAttribute('aria-label', t('hud.home'));
  home.addEventListener('click', onHome);

  const legend = document.createElement('ul');
  legend.className = 'legend';
  for (const material of RAW_MATERIALS) {
    const item = document.createElement('li');
    const dot = document.createElement('span');
    dot.className = 'dot';
    dot.style.background = cssColour(DEPOSIT_COLOUR[material]);
    item.append(dot, t(`material.${material}`));
    legend.append(item);
  }

  const market = document.createElement('button');
  market.type = 'button';
  market.className = 'small market-button';
  market.textContent = t('market.open');
  market.title = t('market.openName');
  market.addEventListener('click', onMarket);

  const contracts = document.createElement('button');
  contracts.type = 'button';
  contracts.className = 'small market-button';
  contracts.textContent = t('contracts.open');
  contracts.title = t('contracts.openName');
  contracts.addEventListener('click', onContracts);

  const designer = document.createElement('button');
  designer.type = 'button';
  designer.className = 'small market-button designer-button';
  designer.textContent = t('designer.open');
  designer.title = t('designer.openName');
  designer.addEventListener('click', onDesigner);

  const buttons = document.createElement('div');
  buttons.className = 'row hud-buttons';
  buttons.append(market, contracts);

  const active = document.createElement('p');
  active.className = 'hud-contract';

  const top = document.createElement('div');
  top.className = 'row hud-top';
  top.append(menu, name, home);
  bar.append(top, legend, buttons, designer, active);
  root.append(bar);

  return {
    update(state) {
      // Nudge towards the board while there is work on offer and none taken.
      const nudge = state.contracts.length === 0 && availableContracts(state).length > 0;
      if (contracts.classList.contains('attention') !== nudge) contracts.classList.toggle('attention', nudge);
      const first = state.contracts[0];
      if (!first) return setText(active, '');
      const name = t(`contract.${first.id}.name`);
      const left = daysLeft(state, first);
      setText(active, left > 0 ? t('contracts.hudActive', { name, days: formatNumber(left) }) : t('contracts.hudOverdue', { name }));
      active.classList.toggle('warn', left === 0);
    },
  };
}
