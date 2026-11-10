import { t } from '../strings';
import { formatMoney } from './format';

export interface GrantCard {
  show(amount: number): void;
  close(): void;
  readonly isOpen: boolean;
}

/** The card shown when the one-time startup grant is paid. Pauses the Site while it is open. */
export function showGrantCard(root: HTMLElement, hooks: { onOpen(): void; onClose(): void }): GrantCard {
  const backdrop = document.createElement('div');
  backdrop.className = 'backdrop';
  backdrop.hidden = true;
  const panel = document.createElement('section');
  panel.className = 'panel dialog grant-card';
  panel.setAttribute('role', 'alertdialog');
  panel.setAttribute('aria-labelledby', 'grant-title');
  const title = document.createElement('h2');
  title.id = 'grant-title';
  title.textContent = t('grant.heading');
  const text = document.createElement('p');
  const ok = document.createElement('button');
  ok.type = 'button';
  ok.textContent = t('grant.ok');
  panel.append(title, text, ok);
  backdrop.append(panel);
  root.append(backdrop);
  const api: GrantCard = {
    show(amount) {
      text.textContent = t('grant.text', { money: formatMoney(amount) });
      backdrop.hidden = false;
      hooks.onOpen();
      ok.focus();
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
  ok.addEventListener('click', () => api.close());
  return api;
}
