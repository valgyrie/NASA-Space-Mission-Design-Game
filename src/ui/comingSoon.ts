import { t } from '../strings';

/**
 * Greys a button out for a feature that isn't open yet: it says "Coming soon" on hover and ignores clicks.
 * Uses aria-disabled rather than `disabled`, so the hover note still shows.
 */
export function comingSoon(button: HTMLButtonElement): HTMLButtonElement {
  const note = t('online.comingSoon');
  button.classList.add('coming-soon');
  button.setAttribute('aria-disabled', 'true');
  button.dataset.tip = note;
  button.title = note;
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
  });
  return button;
}
