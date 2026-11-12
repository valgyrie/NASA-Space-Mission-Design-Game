import { t } from '../strings';

/** Original wordmark over the live Site. The first gesture also enables the menu music. */
export function showTitleScreen(root: HTMLElement, onContinue: () => void): void {
  const panel = document.createElement('section');
  panel.className = 'panel dialog title-screen';
  panel.setAttribute('aria-labelledby', 'title-heading');
  const logo = document.createElement('h1');
  logo.id = 'title-heading';
  logo.className = 'title-logo';
  logo.textContent = t('game.title');
  const subtitle = document.createElement('p');
  subtitle.textContent = t('mainMenu.subtitle');
  const acronym = document.createElement('p');
  acronym.className = 'note';
  acronym.textContent = t('mainMenu.acronym');
  const start = document.createElement('button');
  start.type = 'button';
  start.textContent = t('title.continue');
  start.addEventListener('click', () => { panel.remove(); onContinue(); });
  panel.append(logo, subtitle, acronym, start);
  root.append(panel);
  start.focus();
}
