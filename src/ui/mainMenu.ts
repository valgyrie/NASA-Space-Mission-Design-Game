import { makeAudioControls } from './audioControls';
import { makeCredits } from './credits';
import { makeDataCredits } from './dataCredits';
import { DEMO_ERAS, type DemoEra } from '../game/demo';
import { ERA_YEARS } from '../game/eras';
import { t } from '../strings';

/** A small main menu over the live Site. Starting play removes it before the game installs its controls. */
export function showMainMenu(root: HTMLElement, options: { companyName?: string; onPlay(): void; onDemo(era: DemoEra): void; onOnline(): void; onSharedSeed(): void }): void {
  const panel = document.createElement('section');
  panel.className = 'panel dialog main-menu';
  panel.setAttribute('aria-labelledby', 'main-menu-heading');
  const heading = document.createElement('h1');
  heading.id = 'main-menu-heading';
  heading.textContent = t('mainMenu.heading');
  const actions = document.createElement('div');
  actions.className = 'main-menu-actions';
  const play = document.createElement('button');
  play.type = 'button';
  play.className = 'primary';
  play.textContent = options.companyName ? t('mainMenu.continue', { name: options.companyName }) : t('newCompany.heading');
  play.addEventListener('click', () => { leave(); options.onPlay(); });
  const demo = document.createElement('button');
  demo.type = 'button';
  demo.textContent = t('demo.heading');
  const online = document.createElement('button');
  online.type = 'button';
  online.textContent = t('online.heading');
  online.addEventListener('click', options.onOnline);
  const shared = document.createElement('button');
  shared.type = 'button';
  shared.textContent = t('seed.newCompany');
  shared.addEventListener('click', () => { leave(); options.onSharedSeed(); });
  const creditsButton = document.createElement('button');
  creditsButton.type = 'button';
  creditsButton.textContent = t('credits.heading');
  actions.append(play, demo, online, shared, creditsButton);

  const picker = document.createElement('div');
  picker.className = 'main-menu-actions';
  picker.hidden = true;
  const demoHeading = document.createElement('h2');
  demoHeading.textContent = t('demo.heading');
  const note = document.createElement('p');
  note.className = 'note';
  note.textContent = t('demo.note');
  picker.append(demoHeading, note);
  for (const era of DEMO_ERAS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.demoEra = String(era);
    const { from, to } = ERA_YEARS[era];
    button.textContent = t('era.heading', { era, from, to });
    const goal = document.createElement('p');
    goal.className = 'note';
    goal.textContent = t(era === 1 ? 'demo.1.goal' : 'demo.2.goal');
    button.addEventListener('click', () => { leave(); options.onDemo(era); });
    picker.append(button, goal);
  }
  picker.append(backButton());

  const credits = document.createElement('div');
  credits.className = 'main-menu-actions credits-view';
  credits.hidden = true;
  const creditsHeading = document.createElement('h2');
  creditsHeading.textContent = t('credits.heading');
  credits.append(creditsHeading, makeCredits(), backButton());

  // Credits already lists audio and data credits, so the settings boxes below hide while it is open.
  const extras = [makeAudioControls(), makeDataCredits()];

  // Demo picker and Credits replace the main actions; Back or Esc returns to the button that opened them.
  let opener: HTMLButtonElement | null = null;
  const open = (view: HTMLElement, from: HTMLButtonElement) => {
    opener = from;
    actions.hidden = true;
    view.hidden = false;
    for (const extra of extras) extra.hidden = view === credits;
    (view.querySelector('button, a') as HTMLElement).focus();
  };
  const goBack = () => {
    picker.hidden = true;
    credits.hidden = true;
    actions.hidden = false;
    for (const extra of extras) extra.hidden = false;
    opener?.focus();
  };
  function backButton(): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = t('mainMenu.back');
    button.addEventListener('click', () => goBack());
    return button;
  }
  demo.addEventListener('click', () => open(picker, demo));
  creditsButton.addEventListener('click', () => {
    open(credits, creditsButton);
    panel.scrollTop = 0;
  });
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && actions.hidden) goBack(); };
  function leave() {
    window.removeEventListener('keydown', onKey);
    panel.remove();
  }
  window.addEventListener('keydown', onKey);
  panel.append(heading, actions, picker, credits, ...extras);
  root.append(panel);
  play.focus();
}
