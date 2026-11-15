import { makeAudioControls } from './audioControls';
import { comingSoon } from './comingSoon';
import { makeCredits } from './credits';
import { makeDataCredits } from './dataCredits';
import { DEMO_ERAS, type DemoEra } from '../game/demo';
import type { LaunchVehicleId } from '../game/launchVehicles';
import type { MinigameLevel } from '../minigames/types';
import { audio } from '../audio/sound';
import { TITLE_TRACKS } from '../audio/tracks';
import type { CompanyEntry } from '../save/companies';
import { t, type StringKey } from '../strings';
import { eraHeading, formatGameDate } from './format';
import { icon } from './icons';

/** Short lines that tilt beside the wordmark, one picked each time the menu opens. Facts: docs/research/milestones.md. */
const SPLASHES: StringKey[] = [
  'mainMenu.splash.vanAllen',
  'mainMenu.splash.beforeNasa',
  'mainMenu.splash.telstar',
  'mainMenu.splash.equator',
  'mainMenu.splash.simple',
];

export interface MainMenuOptions {
  /** Saved Companies, last played first (only their list lines, never the saves). */
  companies: CompanyEntry[];
  logoUrl(entry: CompanyEntry): string;
  onPlay(id: string): void;
  onCreate(): void;
  onDelete(id: string): void;
  onDemo(era: DemoEra): void;
  /** Main menu → Minigames → Explorer or Mission Director. */
  onMinigames(level: MinigameLevel): void;
  onOnline(): void;
}

const lastPlayedFormat = new Intl.DateTimeFormat(t('format.locale'), { dateStyle: 'medium', timeStyle: 'short' });

export interface MainMenu {
  /** Name the rocket lifting off behind the menu; null when the Site is shown instead. */
  setRocket(vehicle: LaunchVehicleId | null): void;
}

/** Music & Sounds: which track plays on this title screen, ‹ name ›; changing it plays it at once. */
function titleMusic(): HTMLElement {
  const row = document.createElement('div');
  row.className = 'title-music';
  const label = document.createElement('span');
  label.textContent = t('sound.titleMusic');
  const name = document.createElement('output');
  const step = (by: number, text: string, aria: string) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'menu-button menu-icon';
    b.textContent = text;
    b.setAttribute('aria-label', aria);
    b.title = aria;
    b.addEventListener('click', () => {
      const i = TITLE_TRACKS.indexOf(audio.titleTrack);
      audio.setTitleTrack(TITLE_TRACKS[(i + by + TITLE_TRACKS.length) % TITLE_TRACKS.length]!);
      show();
    });
    return b;
  };
  const show = () => { name.textContent = t(`sound.track.${audio.titleTrack}`); };
  show();
  row.append(label, step(-1, '‹', t('sound.previous')), name, step(1, '›', t('sound.next')));
  return row;
}

/**
 * The title and main menu in one screen: the wordmark, a tilted line, a stack of wide buttons and two small
 * icon buttons, over a Launch. Starting play removes it before the game installs its controls.
 */
export function showMainMenu(
  root: HTMLElement,
  options: MainMenuOptions,
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
  const iconButton = (label: string, name: 'sound') => {
    const b = button('', 'menu-button menu-icon');
    b.setAttribute('aria-label', label);
    b.title = label;
    b.append(icon(name));
    return b;
  };

  const actions = document.createElement('div');
  actions.className = 'main-menu-actions';
  const play = button(t('mainMenu.play'), 'menu-button primary');
  const demo = button(t('demo.heading'));
  const minigames = button(t('minigames.heading'));
  // Online is switched off for now: greyed, says "Coming soon" on hover, and does nothing when clicked.
  const online = button(t('online.heading'));
  comingSoon(online);
  const dataButton = button(t('data.heading'));
  const creditsButton = button(t('credits.heading'));
  const soundButton = iconButton(t('sound.heading'), 'sound');
  const row = document.createElement('div');
  row.className = 'main-menu-row';
  row.append(soundButton, dataButton, creditsButton);
  actions.append(play, demo, minigames, online, row);

  // Demo picker, Companies, Credits, Music & Sounds and Real data open in one sheet in place of the buttons.
  const sheet = (heading: string, ...content: HTMLElement[]) => {
    const view = document.createElement('div');
    view.className = 'panel main-menu-sheet';
    view.hidden = true;
    const h = document.createElement('h2');
    h.textContent = heading;
    view.append(h, ...content);
    return view;
  };
  // Back sits in a footer pinned to the bottom of the sheet, so long sheets (Credits, Real data) never need a scroll to leave.
  const backButton = () => {
    const back = button(t('mainMenu.back'));
    back.addEventListener('click', () => goBack());
    const foot = document.createElement('div');
    foot.className = 'sticky-foot';
    foot.append(back);
    return foot;
  };

  const note = document.createElement('p');
  note.className = 'note';
  note.textContent = t('demo.note');
  const eras = DEMO_ERAS.map((era) => {
    const item = document.createElement('div');
    item.className = 'main-menu-era';
    const b = button(eraHeading(era));
    b.dataset.demoEra = String(era);
    b.addEventListener('click', () => { leave(); options.onDemo(era); });
    const goal = document.createElement('p');
    goal.className = 'note';
    goal.textContent = t(`demo.${era}.goal`);
    item.append(b, goal);
    return item;
  });
  const picker = sheet(t('demo.heading'), note, ...eras, backButton());
  // Minigames: two big choices, Explorer (young players) and Mission Director (real numbers).
  const levels = (['explorer', 'director'] as const).map((level) => {
    const b = button('', 'menu-button mg-choice');
    b.dataset.minigames = level;
    const name = document.createElement('strong');
    name.textContent = t(`minigames.${level}`);
    const line = document.createElement('span');
    line.textContent = t(`minigames.${level}.note`);
    b.append(name, line);
    b.addEventListener('click', () => { leave(); options.onMinigames(level); });
    return b;
  });
  const minigamesNote = document.createElement('p');
  minigamesNote.className = 'note';
  minigamesNote.textContent = t('minigames.note');
  const minigamesSheet = sheet(t('minigames.heading'), minigamesNote, ...levels, backButton());
  const credits = sheet(t('credits.heading'), makeCredits(), backButton());
  credits.classList.add('credits-view');
  const sound = sheet(t('sound.heading'), makeAudioControls(), titleMusic(), backButton());
  sound.classList.add('sound-view');
  const data = sheet(t('data.heading'), makeDataCredits(), backButton());
  // Opened here already: this sheet is only for the list.
  data.querySelector('details')?.setAttribute('open', '');

  // ---- Your Companies: pick one to play, make a new one, or delete one. ----
  const list = document.createElement('div');
  list.className = 'company-list';
  list.setAttribute('role', 'listbox');
  list.setAttribute('aria-label', t('companies.list'));
  let selected: CompanyEntry | null = options.companies[0] ?? null;
  const rows = options.companies.map((entry) => {
    const item = document.createElement('div');
    item.className = 'company-row';
    item.setAttribute('role', 'option');
    item.tabIndex = -1;
    item.dataset.company = entry.id;
    const img = document.createElement('img');
    img.alt = '';
    img.src = options.logoUrl(entry);
    const text = document.createElement('div');
    const name = document.createElement('strong');
    name.textContent = entry.name;
    const line = document.createElement('span');
    line.textContent = t('companies.line', { mode: t(`playMode.${entry.playMode}`), difficulty: t(`mode.${entry.difficulty}`), date: formatGameDate(entry.day) });
    const seed = document.createElement('span');
    seed.textContent = t('companies.seed', { seed: entry.seed, when: lastPlayedFormat.format(new Date(entry.lastPlayed)) });
    text.append(name, line, seed);
    item.append(img, text);
    item.addEventListener('click', () => select(entry));
    item.addEventListener('dblclick', () => playSelected());
    return { entry, item };
  });
  list.append(...rows.map((r) => r.item));
  const select = (entry: CompanyEntry | null, focus = true) => {
    selected = entry;
    for (const r of rows) {
      r.item.setAttribute('aria-selected', String(r.entry === entry));
      r.item.tabIndex = r.entry === entry ? 0 : -1;
      if (r.entry === entry && focus) r.item.focus();
    }
    playCompany.disabled = deleteButton.disabled = !entry;
  };
  list.addEventListener('keydown', (e) => {
    const i = rows.findIndex((r) => r.entry === selected);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const next = rows[Math.min(rows.length - 1, Math.max(0, i + (e.key === 'ArrowDown' ? 1 : -1)))];
      if (next) select(next.entry);
    } else if (e.key === 'Enter') playSelected();
  });
  const playCompany = button(t('companies.play'), 'menu-button primary');
  const playSelected = () => { if (selected) { const id = selected.id; leave(); options.onPlay(id); } };
  playCompany.addEventListener('click', playSelected);
  const create = button(t('companies.create'));
  create.addEventListener('click', () => { leave(); options.onCreate(); });
  const deleteButton = button(t('companies.delete'), 'menu-button danger');
  const confirm = document.createElement('div');
  confirm.className = 'company-confirm';
  confirm.hidden = true;
  const confirmText = document.createElement('p');
  const yes = button('', 'menu-button danger');
  const no = button(t('companies.cancel'));
  const confirmRow = document.createElement('div');
  confirmRow.className = 'company-buttons';
  confirmRow.append(yes, no);
  confirm.append(confirmText, confirmRow);
  deleteButton.addEventListener('click', () => {
    if (!selected) return;
    confirmText.textContent = t('companies.deleteConfirm', { name: selected.name });
    yes.textContent = t('companies.deleteYes', { name: selected.name });
    confirm.hidden = false;
    buttons.hidden = true;
    no.focus();
  });
  no.addEventListener('click', () => { confirm.hidden = true; buttons.hidden = false; deleteButton.focus(); });
  yes.addEventListener('click', () => {
    if (!selected) return;
    const gone = selected;
    options.onDelete(gone.id);
    const at = rows.findIndex((r) => r.entry === gone);
    rows[at]!.item.remove();
    rows.splice(at, 1);
    confirm.hidden = true;
    buttons.hidden = false;
    if (rows.length === 0) { leave(); options.onCreate(); return; }
    select(rows[Math.min(at, rows.length - 1)]!.entry);
  });
  const buttons = document.createElement('div');
  buttons.className = 'company-buttons sticky-foot';
  const companiesBack = button(t('mainMenu.back'));
  companiesBack.addEventListener('click', () => goBack());
  buttons.append(playCompany, create, deleteButton, companiesBack);
  const companies = sheet(t('companies.heading'), list, buttons, confirm);
  companies.classList.add('companies-view');
  select(selected, false);

  play.addEventListener('click', () => {
    if (rows.length === 0) { leave(); options.onCreate(); return; }
    open(companies, play);
    rows.find((r) => r.entry === selected)?.item.focus();
  });

  const sheets = [picker, minigamesSheet, companies, credits, sound, data];

  // A sheet replaces the buttons; Back or Esc returns to the button that opened it.
  let opener: HTMLButtonElement | null = null;
  const open = (view: HTMLElement, from: HTMLButtonElement) => {
    opener = from;
    actions.hidden = true;
    view.hidden = false;
    view.scrollTop = 0;
    (view.querySelector('button:not(:disabled), a, input, summary') as HTMLElement | null)?.focus();
  };
  function goBack() {
    for (const view of sheets) view.hidden = true;
    confirm.hidden = true;
    buttons.hidden = false;
    actions.hidden = false;
    opener?.focus();
  }
  demo.addEventListener('click', () => open(picker, demo));
  minigames.addEventListener('click', () => open(minigamesSheet, minigames));
  creditsButton.addEventListener('click', () => open(credits, creditsButton));
  soundButton.addEventListener('click', () => open(sound, soundButton));
  dataButton.addEventListener('click', () => open(data, dataButton));
  // Esc first closes the delete question, then the sheet.
  const cancelDelete = () => { if (confirm.hidden) return false; no.click(); return true; };

  const rocket = document.createElement('p');
  rocket.className = 'main-menu-corner main-menu-rocket';
  rocket.setAttribute('aria-hidden', 'true');
  const event = document.createElement('p');
  event.className = 'main-menu-corner main-menu-event';
  event.textContent = t('mainMenu.event');

  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && actions.hidden && !cancelDelete()) goBack(); };
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
