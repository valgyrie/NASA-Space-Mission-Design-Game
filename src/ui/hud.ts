import { RAW_MATERIALS } from '../economy/rawMaterial';
import { t } from '../strings';
import { DEPOSIT_COLOUR } from '../world/siteMesh';

/** The panel at the top left of the Site view: Company name, menu button, and what the Deposit colours mean. */
export function showHud(root: HTMLElement, companyName: string, onMenu: () => void): void {
  const bar = document.createElement('div');
  bar.className = 'panel hud';

  const name = document.createElement('span');
  name.className = 'hud-company';
  name.textContent = t('hud.company', { name: companyName });

  const menu = document.createElement('button');
  menu.type = 'button';
  menu.className = 'small icon-button';
  menu.textContent = t('hud.menuIcon');
  menu.title = t('hud.menu');
  menu.setAttribute('aria-label', t('hud.menu'));
  menu.addEventListener('click', onMenu);

  const legend = document.createElement('ul');
  legend.className = 'legend';
  for (const material of RAW_MATERIALS) {
    const item = document.createElement('li');
    const dot = document.createElement('span');
    dot.className = 'dot';
    dot.style.background = `#${DEPOSIT_COLOUR[material].toString(16).padStart(6, '0')}`;
    item.append(dot, t(`material.${material}`));
    legend.append(item);
  }

  const top = document.createElement('div');
  top.className = 'row hud-top';
  top.append(menu, name);
  bar.append(top, legend);
  root.append(bar);
}
