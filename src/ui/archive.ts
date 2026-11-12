import type { Company } from '../save/save';
import { HISTORY_CARDS, type HistoryCardId } from '../game/history';
import type { SiteState } from '../game/siteState';
import { t } from '../strings';
import { contractText, formatGameDate } from './format';
import { imageUrl } from './historyCard';
import { makePatch } from './patch';

export interface ArchiveDialog {
  open(): void;
  close(): void;
  readonly isOpen: boolean;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  e.className = className;
  if (text) e.textContent = text;
  return e;
}

/**
 * The History Archive: the patch gallery with every Mission Patch earned, and every Real History card
 * unlocked so far. Clicking a card reads it again (`onCard`).
 */
export function showArchive(
  root: HTMLElement,
  state: SiteState,
  company: Company,
  hooks: { onOpen(): void; onClose(): void; onCard(id: HistoryCardId): void },
): ArchiveDialog {
  const backdrop = el('div', 'backdrop archive-backdrop');
  backdrop.hidden = true;
  const panel = el('div', 'panel archive');
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-labelledby', 'archive-heading');
  const head = el('div', 'side-head');
  const heading = el('h2', '', t('archive.heading'));
  heading.id = 'archive-heading';
  const close = el('button', 'small icon-button', t('archive.closeIcon'));
  close.type = 'button';
  close.title = t('archive.close');
  close.setAttribute('aria-label', t('archive.close'));
  head.append(heading, close);
  const patches = el('div', 'archive-patches');
  const cards = el('div', 'archive-cards');
  panel.append(head, el('h3', '', t('archive.patches')), patches, el('h3', '', t('archive.cards')), cards);
  backdrop.append(panel);
  root.append(backdrop);

  const render = () => {
    patches.replaceChildren(
      ...state.patches.map((p) => {
        const figure = el('figure', 'archive-patch');
        const contract = contractText(p.contract);
        figure.append(makePatch(p, company.name, company.logo), el('figcaption', '', t('archive.patchLine', { contract, date: formatGameDate(p.day) })));
        return figure;
      }),
    );
    if (state.patches.length === 0) patches.append(el('p', 'side-note', t('archive.noPatches')));
    cards.replaceChildren(
      ...state.history.map((id) => {
        const card = HISTORY_CARDS[id];
        const b = el('button', 'archive-card');
        b.type = 'button';
        const img = el('img', '');
        img.src = imageUrl(id);
        img.alt = '';
        img.loading = 'lazy';
        const words = el('span', 'archive-card-words');
        words.append(el('strong', '', t(`history.${id}.title`)), el('span', '', t(`history.${card.when}`, { year: card.year })));
        b.append(img, words);
        b.addEventListener('click', () => hooks.onCard(id));
        return b;
      }),
    );
  };

  const api: ArchiveDialog = {
    open() {
      render();
      if (!backdrop.hidden) return;
      backdrop.hidden = false;
      hooks.onOpen();
      close.focus();
    },
    close() {
      if (backdrop.hidden) return;
      backdrop.hidden = true;
      hooks.onClose();
    },
    get isOpen() {
      return !backdrop.hidden;
    },
  };
  close.addEventListener('click', () => api.close());
  return api;
}
