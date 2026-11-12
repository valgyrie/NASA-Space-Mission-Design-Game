import { audio } from '../audio/sound';
import { ERA_YEARS, type Era } from '../game/eras';
import { t } from '../strings';

export interface EraCard {
  show(era: Era): void;
  close(): void;
  readonly isOpen: boolean;
}

/** Text for each Era's card. Era 1's card opens a new Campaign; the others follow an HQ Upgrade. */
const ERA_TEXT = { 1: 'era.1.text', 2: 'era.2.text', 5: 'freePlay.welcome' } as const;
const ERA_ALT = { 1: 'era.1.alt', 2: 'era.2.alt', 5: 'era.5.alt' } as const;

/** One AI illustration per Era (docs/art/). Loaded only when its card opens; hidden until the team adds the file. */
export function eraImage(era: Era): string {
  return `${import.meta.env.BASE_URL}eras/era-${era}.webp`;
}

/** The card shown when the Company enters an Era. Pauses the Site while it is open. */
export function showEraCard(root: HTMLElement, hooks: { onOpen(): void; onClose(): void }): EraCard {
  const backdrop = document.createElement('div');
  backdrop.className = 'backdrop';
  backdrop.hidden = true;
  const panel = document.createElement('section');
  panel.className = 'panel dialog era-card';
  panel.setAttribute('role', 'alertdialog');
  panel.setAttribute('aria-labelledby', 'era-title');
  const figure = document.createElement('figure');
  figure.className = 'era-art';
  figure.hidden = true;
  const image = document.createElement('img');
  image.decoding = 'async';
  image.addEventListener('load', () => { figure.hidden = false; });
  image.addEventListener('error', () => { figure.hidden = true; });
  const caption = document.createElement('figcaption');
  caption.textContent = t('era.illustration');
  figure.append(image, caption);
  const title = document.createElement('h2');
  title.id = 'era-title';
  const text = document.createElement('p');
  const ok = document.createElement('button');
  ok.type = 'button';
  ok.textContent = t('era.ok');
  panel.append(figure, title, text, ok);
  backdrop.append(panel);
  root.append(backdrop);
  const api: EraCard = {
    show(era) {
      title.textContent = era === 5 ? t('freePlay.heading') : t('era.heading', { era, from: ERA_YEARS[era].from, to: ERA_YEARS[era].to });
      text.textContent = t(ERA_TEXT[era]);
      image.alt = t(ERA_ALT[era]);
      const src = new URL(eraImage(era), location.href).href;
      if (image.src !== src) image.src = src;
      figure.hidden = !(image.complete && image.naturalWidth > 0);
      backdrop.hidden = false;
      audio.setScene('era', 'history');
      hooks.onOpen();
      ok.focus();
    },
    close() {
      if (backdrop.hidden) return;
      backdrop.hidden = true;
      audio.setScene('era', null);
      hooks.onClose();
    },
    get isOpen() {
      return !backdrop.hidden;
    },
  };
  ok.addEventListener('click', () => api.close());
  return api;
}
