import { RAW_MATERIALS, type RawMaterial } from '../economy/rawMaterial';
import { SPEEDS, type Speed } from '../game/balance';
import { type SiteState, outputPerDay, storageCapacity, storageFree, storageUsed } from '../game/siteState';
import type { Site } from '../site/site';
import { t } from '../strings';
import { DEPOSIT_COLOUR } from '../world/siteMesh';
import { cssColour, formatGameDate, formatKg, formatMoney, formatPerDay, formatStorage } from './format';

export interface TopBar {
  /** Refresh the numbers. Cheap enough to call every frame. */
  update(site: Site, state: SiteState, speed: Speed): void;
}

function setText(el: HTMLElement, text: string): void {
  if (el.textContent !== text) el.textContent = text;
}

function stat(label: string): { box: HTMLElement; value: HTMLElement; sub: HTMLElement } {
  const box = document.createElement('div');
  box.className = 'stat';
  const l = document.createElement('span');
  l.className = 'stat-label';
  l.textContent = label;
  const value = document.createElement('span');
  value.className = 'stat-value';
  const sub = document.createElement('span');
  sub.className = 'stat-sub';
  box.append(l, value, sub);
  return { box, value, sub };
}

/** The bar along the top of the Site view: money, Game date, Raw Materials, storage and speed. */
export function showTopBar(root: HTMLElement, onSpeed: (speed: Speed) => void): TopBar {
  const bar = document.createElement('div');
  bar.className = 'panel top-bar';

  const money = stat(t('topBar.money'));
  const date = stat(t('topBar.date'));
  const stocks = new Map<RawMaterial, ReturnType<typeof stat>>();
  bar.append(money.box, date.box);
  for (const m of RAW_MATERIALS) {
    const s = stat(t(`material.${m}`));
    s.box.style.setProperty('--material', cssColour(DEPOSIT_COLOUR[m]));
    s.box.classList.add('material');
    stocks.set(m, s);
    bar.append(s.box);
  }
  const storage = stat(t('topBar.storage'));
  storage.sub.classList.add('warn');
  bar.append(storage.box);

  const speeds = document.createElement('div');
  speeds.className = 'speeds';
  speeds.setAttribute('role', 'group');
  speeds.setAttribute('aria-label', t('speed.label'));
  const buttons = new Map<Speed, HTMLButtonElement>();
  for (const speed of SPEEDS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = t(`speed.${speed}`);
    b.title = t(`speed.${speed}.name`);
    b.setAttribute('aria-label', t(`speed.${speed}.name`));
    b.addEventListener('click', () => onSpeed(speed));
    buttons.set(speed, b);
    speeds.append(b);
  }
  bar.append(speeds);
  root.append(bar);

  return {
    update(site, state, speed) {
      setText(money.value, formatMoney(state.money));
      setText(date.value, formatGameDate(state.day));
      const rates = outputPerDay(site, state);
      const full = storageFree(state) <= 0;
      for (const [m, s] of stocks) {
        setText(s.value, formatKg(state.stock[m]));
        setText(s.sub, rates[m] > 0 && !full ? formatPerDay(rates[m]) : '');
      }
      setText(storage.value, formatStorage(storageUsed(state), storageCapacity(state)));
      setText(storage.sub, full ? t('topBar.storageFull') : '');
      for (const [sp, b] of buttons) {
        const on = String(sp === speed);
        if (b.getAttribute('aria-pressed') !== on) b.setAttribute('aria-pressed', on);
      }
    },
  };
}
