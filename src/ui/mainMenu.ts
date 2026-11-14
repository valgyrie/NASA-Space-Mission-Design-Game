import { makeAudioControls } from './audioControls';
import { makeCredits } from './credits';
import { makeDataCredits } from './dataCredits';
import { DEMO_ERAS, type DemoEra } from '../game/demo';
import { ERA_YEARS } from '../game/eras';
import type { LaunchVehicleId } from '../game/launchVehicles';
import { t, type StringKey } from '../strings';

/** Short lines that tilt beside the wordmark, one picked each time the menu opens. Facts: docs/research/milestones.md. */
const SPLASHES: StringKey[] = [
  'mainMenu.splash.vanAllen',
  'mainMenu.splash.beforeNasa',
  'mainMenu.splash.telstar',
  'mainMenu.splash.equator',
  'mainMenu.splash.simple',
];

const SVG = 'http://www.w3.org/2000/svg';
/** Simple line icons drawn here, so no outside icon set is needed. */
const ICONS = {
  sound: 'M4 9h4l5-4v14l-5-4H4z M16 9a4 4 0 0 1 0 6 M18.5 6.5a7.5 7.5 0 0 1 0 11',
  data: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18 M3 12h18 M12 3c3 3 3 15 0 18 M12 3c-3 3-3 15 0 18',
};

function icon(path: string): SVGSVGElement {
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  const line = document.createElementNS(SVG, 'path');
  line.setAttribute('d', path);
  svg.append(line);
  return svg;
}

export interface MainMenu {
  /** Name the rocket lifting off behind the menu; null when the Site is shown instead. */
  setRocket(vehicle: LaunchVehicleId | null): void;
}

/**
 * The title and main menu in one screen: the wordmark, a tilted line, a stack of wide buttons and two small
 * icon buttons, over a Launch. Starting play removes it before the game installs its controls.
 */
export function showMainMenu(
  root: HTMLElement,
  options: { companyName?: string; onPlay(): void; onDemo(era: DemoEra): void; onOnline(): void; onSharedSeed(): void },
  random = Math.random,
): MainMenu {
  const screen = document.createElement('section');
  screen.className = 'main-menu';
  screen.setAttribute('aria-labelledby', 'title-heading');

  const title = document.createElement('header');
  title.className = 'main-menu-title';
  const logo = document.createElement('h1');
  logo.id = 'title-heading';
  logo.className = 'title-logo';
  logo.textContent = t('game.title');
  const subtitle = document.createElement('p');
  subtitle.className = 'main-menu-subtitle';
  subtitle.textContent = t('mainMenu.subtitle');
  const acronym = document.createElement('p');
  acronym.className = 'main-menu-acronym';
  acronym.textContent = t('mainMenu.acronym');
  const splash = document.createElement('p');
  splash.className = 'main-menu-splash';
  splash.textContent = t(SPLASHES[Math.floor(random() * SPLASHES.length)] ?? SPLASHES[0]!);
  title.append(logo, splash, subtitle, acronym);

  const button = (text: string, className = 'menu-button') => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = className;
    b.textContent = text;
    return b;
  };
  const iconButton = (label: string, path: string) => {
    const b = button('', 'menu-button menu-icon');
    b.setAttribute('aria-label', label);
    b.title = label;
    b.append(icon(path));
    return b;
  };

  const actions = document.createElement('div');
  actions.className = 'main-menu-actions';
  const play = button(options.companyName ? t('mainMenu.continue', { name: options.companyName }) : t('newCompany.heading'), 'menu-button primary');
  play.addEventListener('click', () => { leave(); options.onPlay(); });
  const demo = button(t('demo.heading'));
  const online = button(t('online.heading'));
  online.addEventListener('click', options.onOnline);
  const shared = button(t('seed.newCompany'));
  shared.addEventListener('click', () => { leave(); options.onSharedSeed(); });
  const creditsButton = button(t('credits.heading'));
  const soundButton = iconButton(t('audio.heading'), ICONS.sound);
  const dataButton = iconButton(t('data.heading'), ICONS.data);
  const row = document.createElement('div');
  row.className = 'main-menu-row';
  row.append(soundButton, shared, creditsButton, dataButton);
  actions.append(play, demo, online, row);

  // Demo picker, Credits, Sound and Real data open in one sheet in place of the buttons.
  const sheet = (heading: string, ...content: HTMLElement[]) => {
    const view = document.createElement('div');
    view.className = 'panel main-menu-sheet';
    view.hidden = true;
    const h = document.createElement('h2');
    h.textContent = heading;
    const back = button(t('mainMenu.back'));
    back.addEventListener('click', () => goBack());
    view.append(h, ...content, back);
    return view;
  };

  const note = document.createElement('p');
  note.className = 'note';
  note.textContent = t('demo.note');
  const eras = DEMO_ERAS.map((era) => {
    const item = document.createElement('div');
    item.className = 'main-menu-era';
    const b = button(t('era.heading', { era, from: ERA_YEARS[era].from, to: ERA_YEARS[era].to }));
    b.dataset.demoEra = String(era);
    b.addEventListener('click', () => { leave(); options.onDemo(era); });
    const goal = document.createElement('p');
    goal.className = 'note';
    goal.textContent = t(era === 1 ? 'demo.1.goal' : 'demo.2.goal');
    item.append(b, goal);
    return item;
  });
  const picker = sheet(t('demo.heading'), note, ...eras);
  const credits = sheet(t('credits.heading'), makeCredits());
  credits.classList.add('credits-view');
  const sound = sheet(t('audio.heading'), makeAudioControls());
  const data = sheet(t('data.heading'), makeDataCredits());
  const sheets = [picker, credits, sound, data];

  // A sheet replaces the buttons; Back or Esc returns to the button that opened it.
  let opener: HTMLButtonElement | null = null;
  const open = (view: HTMLElement, from: HTMLButtonElement) => {
    opener = from;
    actions.hidden = true;
    view.hidden = false;
    view.scrollTop = 0;
    (view.querySelector('button, a, input, summary') as HTMLElement | null)?.focus();
  };
  function goBack() {
    for (const view of sheets) view.hidden = true;
    actions.hidden = false;
    opener?.focus();
  }
  demo.addEventListener('click', () => open(picker, demo));
  creditsButton.addEventListener('click', () => open(credits, creditsButton));
  soundButton.addEventListener('click', () => open(sound, soundButton));
  dataButton.addEventListener('click', () => open(data, dataButton));

  const rocket = document.createElement('p');
  rocket.className = 'main-menu-corner main-menu-rocket';
  rocket.setAttribute('aria-hidden', 'true');
  const event = document.createElement('p');
  event.className = 'main-menu-corner main-menu-event';
  event.textContent = t('mainMenu.event');

  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && actions.hidden) goBack(); };
  function leave() {
    window.removeEventListener('keydown', onKey);
    screen.remove();
  }
  window.addEventListener('keydown', onKey);
  const middle = document.createElement('div');
  middle.className = 'main-menu-middle';
  middle.append(actions, ...sheets);
  screen.append(title, middle, rocket, event);
  root.append(screen);
  play.focus();

  return {
    setRocket(vehicle) {
      rocket.hidden = vehicle === null;
      rocket.textContent = vehicle ? t('mainMenu.rocket', { rocket: t(`launchVehicle.${vehicle}`) }) : '';
    },
  };
}
