import { audio } from '../audio/sound';
import { HISTORY_CARDS, type HistoryCardId } from '../game/history';
import { t } from '../strings';

export interface HistoryCardDialog {
  /** Show a card. `onDone` runs when it is closed. */
  show(id: HistoryCardId, onDone?: () => void): void;
  close(): void;
  readonly isOpen: boolean;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  e.className = className;
  if (text) e.textContent = text;
  return e;
}

/** Where a card's photo is served from (public/history/). */
export function imageUrl(id: HistoryCardId): string | null {
  const image = HISTORY_CARDS[id].image;
  return image ? `${import.meta.env.BASE_URL}${image}` : null;
}

/**
 * A Real History card: a short true story and Learn more →, with a credited photo when cleared.
 * `onOpen` and `onClose` let the Site pause while it is read.
 */
export function showHistoryCard(root: HTMLElement, hooks: { onOpen(): void; onClose(): void }): HistoryCardDialog {
  const backdrop = el('div', 'backdrop history-backdrop');
  backdrop.hidden = true;
  const panel = el('article', 'panel history-card');
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-labelledby', 'history-title');

  const figure = el('figure', 'history-photo');
  const img = el('img', '');
  img.decoding = 'async';
  const caption = el('figcaption', '');
  const captionText = el('span', '');
  const credit = el('span', 'history-credit');
  caption.append(captionText, credit);
  figure.append(img, caption);

  const body = el('div', 'history-body');
  const label = el('p', 'history-label');
  const title = el('h2', '');
  title.id = 'history-title';
  const text = el('p', 'history-text');
  const learn = el('a', 'history-learn', t('history.learnMore'));
  learn.target = '_blank';
  learn.rel = 'noopener noreferrer';
  learn.title = t('history.learnMoreName');
  const done = el('button', 'history-continue', t('history.continue'));
  done.type = 'button';
  const buttons = el('div', 'history-buttons');
  buttons.append(learn, done);
  body.append(label, title, text, buttons);
  panel.append(figure, body);
  backdrop.append(panel);
  root.append(backdrop);

  let after: (() => void) | undefined;
  const api: HistoryCardDialog = {
    show(id, onDone) {
      const card = HISTORY_CARDS[id];
      const image = imageUrl(id);
      figure.hidden = !image;
      panel.classList.toggle('history-text-only', !image);
      if (image) {
        img.src = image;
        img.alt = t(`history.${id}.caption`);
        captionText.textContent = t(`history.${id}.caption`);
        credit.textContent = t(`history.${id}.credit`);
      } else img.removeAttribute('src');
      label.textContent = t('history.label', { when: t(card.plan ? 'history.plan' : `history.${card.when}`, { year: card.year }) });
      title.textContent = t(`history.${id}.title`);
      text.textContent = t(`history.${id}.text`);
      learn.href = card.learnMore;
      after = onDone;
      if (backdrop.hidden) {
        backdrop.hidden = false;
        audio.setScene('history', 'history');
        hooks.onOpen();
      }
      done.focus();
    },
    close() {
      if (backdrop.hidden) return;
      backdrop.hidden = true;
      audio.setScene('history', null);
      hooks.onClose();
      const next = after;
      after = undefined;
      next?.();
    },
    get isOpen() {
      return !backdrop.hidden;
    },
  };
  done.addEventListener('click', () => api.close());
  return api;
}
