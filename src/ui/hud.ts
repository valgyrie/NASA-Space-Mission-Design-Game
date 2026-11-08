import { t } from '../strings';

/** The always-on bar at the top of the Site view. For now it shows the Company name. */
export function showHud(root: HTMLElement, companyName: string): void {
  const bar = document.createElement('div');
  bar.className = 'panel hud';
  const name = document.createElement('span');
  name.className = 'hud-company';
  name.textContent = t('hud.company', { name: companyName });
  bar.append(name);
  root.append(bar);
}
