import { ERA_YEARS, type Era } from '../game/eras';
import { t } from '../strings';

export interface EraCard {
  show(era: Era): void;
  close(): void;
  readonly isOpen: boolean;
}

/** Text for each new Era's card. Era 1 has none: the Company starts there. */
const ERA_TEXT = { 2: 'era.2.text', 5: 'freePlay.welcome' } as const;

/** The card shown when the HQ Upgrade moves the Company into a new Era. Pauses the Site while it is open. */
export function showEraCard(root: HTMLElement, hooks: { onOpen(): void; onClose(): void }): EraCard {
  const backdrop = document.createElement('div');
  backdrop.className = 'backdrop';
  backdrop.hidden = true;
  const panel = document.createElement('section');
  panel.className = 'panel dialog era-card';
  panel.setAttribute('role', 'alertdialog');
  panel.setAttribute('aria-labelledby', 'era-title');
  const title = document.createElement('h2');
  title.id = 'era-title';
  const text = document.createElement('p');
  const ok = document.createElement('button');
  ok.type = 'button';
  ok.textContent = t('era.ok');
  panel.append(title, text, ok);
  backdrop.append(panel);
  root.append(backdrop);
  const api: EraCard = {
    show(era) {
      if (era === 1) return;
      title.textContent = era === 5 ? t('freePlay.heading') : t('era.heading', { era, from: ERA_YEARS[era].from, to: ERA_YEARS[era].to });
      text.textContent = t(ERA_TEXT[era]);
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
