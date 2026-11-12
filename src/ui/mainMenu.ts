import { DEMO_ERAS, type DemoEra } from '../game/demo';
import { ERA_YEARS } from '../game/eras';
import { t } from '../strings';

/** A small main menu over the live Site. Starting play removes it before the game installs its controls. */
export function showMainMenu(root: HTMLElement, options: { companyName?: string; onPlay(): void; onDemo(era: DemoEra): void; onOnline(): void }): void {
  const panel = document.createElement('section');
  panel.className = 'panel dialog main-menu';
  panel.setAttribute('aria-labelledby', 'main-menu-heading');
  const heading = document.createElement('h1');
  heading.id = 'main-menu-heading';
  heading.textContent = t('game.title');
  const subtitle = document.createElement('p');
  subtitle.className = 'note';
  subtitle.textContent = t('mainMenu.subtitle');
  const acronym = document.createElement('p');
  acronym.className = 'note';
  acronym.textContent = t('mainMenu.acronym');
  const actions = document.createElement('div');
  actions.className = 'main-menu-actions';
  const play = document.createElement('button');
  play.type = 'button';
  play.textContent = options.companyName ? t('mainMenu.continue', { name: options.companyName }) : t('newCompany.heading');
  play.addEventListener('click', () => { leave(); options.onPlay(); });
  const demo = document.createElement('button');
  demo.type = 'button';
  demo.textContent = t('demo.heading');
  const online = document.createElement('button');
  online.type = 'button';
  online.textContent = t('online.heading');
  online.addEventListener('click', options.onOnline);
  actions.append(play, demo, online);

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
  const back = document.createElement('button');
  back.type = 'button';
  back.textContent = t('mainMenu.back');
  const goBack = () => {
    picker.hidden = true;
    actions.hidden = false;
    demo.focus();
  };
  back.addEventListener('click', goBack);
  picker.append(back);
  demo.addEventListener('click', () => {
    actions.hidden = true;
    picker.hidden = false;
    picker.querySelector('button')!.focus();
  });
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !picker.hidden) goBack(); };
  function leave() {
    window.removeEventListener('keydown', onKey);
    panel.remove();
  }
  window.addEventListener('keydown', onKey);
  panel.append(heading, subtitle, acronym, actions, picker);
  root.append(panel);
  play.focus();
}
