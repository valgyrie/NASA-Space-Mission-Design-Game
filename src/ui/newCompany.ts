import { readSharedSeed } from '../site/shareSeed';
import { type CompanyLogo, DEFAULT_LOGO } from '../company/logo';
import { makeLogoEditor } from './logoEditor';
import { NAME_MAX, NAME_MIN, checkCompanyName } from '../company/companyName';
import { SEED_MAX, checkSeed, randomSeed } from '../site/seed';
import { JPL, type Place, START_KINDS, type StartKind, climateAt, isInUs, landAt, placeProblem, randomPlace } from '../game/places';
import { t } from '../strings';
import { DIFFICULTIES, PLAY_MODES, type Difficulty, type PlayMode } from '../game/modes';
import { GlobePicker } from '../world/globePicker';
import { formatDecimal } from './format';

export interface NewCompanyChoice {
  name: string;
  logo: CompanyLogo;
  seed: string;
  place: Place;
  difficulty: Difficulty;
  playMode: PlayMode;
}

interface Options {
  onBack?: () => void;
  /** Called whenever the Seed field holds a usable Seed or the place changes, so the Site can be previewed. */
  onPreview: (seed: string, place: Place) => void;
  /** Called once, with the Company's accepted setup choices. */
  onDone: (choice: NewCompanyChoice) => void;
}

/** "34.2° N, 118.2° W" */
function latLonText(lat: number, lon: number): string {
  return t('place.latLon', {
    lat: formatDecimal(Math.abs(lat)),
    ns: t(lat >= 0 ? 'place.north' : 'place.south'),
    lon: formatDecimal(Math.abs(lon)),
    ew: t(lon >= 0 ? 'place.east' : 'place.west'),
  });
}

/** One line on a place: where, the land, and its real 2025 climate. */
export function placeText(place: Place): string {
  const c = climateAt(place.lat, place.lon);
  const where = place.start === 'historic' ? t('place.jpl') : latLonText(place.lat, place.lon);
  if (!c) return where;
  const land = landAt(place.lat, place.lon);
  return t('place.climate', {
    where,
    land: t(`place.land.${land === '.' ? 'f' : land}`),
    temp: Math.round(c.tempC),
    rain: formatDecimal(c.rainMm),
    sun: formatDecimal(c.sunKwh),
    wind: formatDecimal(c.windMs),
  });
}

function field(id: string, label: string): { label: HTMLLabelElement; input: HTMLInputElement } {
  const l = document.createElement('label');
  l.htmlFor = id;
  l.textContent = label;
  const input = document.createElement('input');
  input.id = id;
  input.type = 'text';
  input.autocomplete = 'off';
  input.spellcheck = false;
  return { label: l, input };
}

function note(id: string, text: string): HTMLParagraphElement {
  const p = document.createElement('p');
  p.className = 'note';
  p.id = id;
  p.textContent = text;
  return p;
}

/** Show the "Start your Company" dialog. */
export function showNewCompany(root: HTMLElement, { onPreview, onDone, onBack }: Options): void {
  const form = document.createElement('form');
  form.className = 'panel dialog new-company';
  form.noValidate = true;

  const heading = document.createElement('h1');
  heading.textContent = t('newCompany.heading');

  const name = field('company-name', t('newCompany.label'));
  name.input.maxLength = NAME_MAX * 2; // room to type; the real limit is checked on Start
  name.input.placeholder = t('newCompany.placeholder');
  name.input.setAttribute('aria-describedby', 'company-note');

  const seed = field('site-seed', t('newCompany.seedLabel'));
  seed.input.maxLength = 120;
  seed.input.className = 'seed';
  seed.input.value = randomSeed();
  seed.input.setAttribute('aria-describedby', 'seed-note');

  const reroll = document.createElement('button');
  reroll.type = 'button';
  reroll.className = 'icon';
  reroll.textContent = t('newCompany.rerollIcon');
  reroll.title = t('newCompany.reroll');
  reroll.setAttribute('aria-label', t('newCompany.reroll'));

  const seedRow = document.createElement('div');
  seedRow.className = 'row';
  seedRow.append(seed.input, reroll);

  const logo = makeLogoEditor(DEFAULT_LOGO);

  let playMode: PlayMode = 'campaign';
  const play = document.createElement('fieldset');
  play.className = 'mode-picker';
  const playLegend = document.createElement('legend');
  playLegend.textContent = t('playMode.heading');
  const playButtons = document.createElement('div');
  playButtons.className = 'row start-kinds';
  const playNote = note('play-mode-note', t('playMode.campaign.note'));
  playNote.setAttribute('aria-live', 'polite');
  for (const value of PLAY_MODES) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.playMode = value;
    b.textContent = t(`playMode.${value}`);
    b.setAttribute('aria-pressed', String(value === playMode));
    b.addEventListener('click', () => {
      playMode = value;
      for (const button of playButtons.querySelectorAll('button')) button.setAttribute('aria-pressed', String(button === b));
      playNote.textContent = t(`playMode.${value}.note`);
      for (const [kind, button] of kindButtons) button.hidden = value === 'freePlay' && kind !== 'anywhere';
      kindButtons.get('anywhere')!.title = t(value === 'freePlay' ? 'freePlay.anywhere' : 'newCompany.start.anywhere.name');
      setPlace(value === 'freePlay' && place.start !== 'legacy' ? { ...place, start: 'anywhere' } : place, false);
    });
    playButtons.append(b);
  }
  play.append(playLegend, playButtons, playNote);

  let difficulty: Difficulty = 'easy';
  const mode = document.createElement('fieldset');
  mode.className = 'mode-picker';
  const modeLegend = document.createElement('legend');
  modeLegend.textContent = t('mode.heading');
  const modes = document.createElement('div');
  modes.className = 'row start-kinds';
  const modeNote = note('mode-note', t('mode.easy.note'));
  modeNote.setAttribute('aria-live', 'polite');
  for (const value of DIFFICULTIES) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.difficulty = value;
    b.textContent = t(`mode.${value}`);
    b.setAttribute('aria-pressed', String(value === difficulty));
    b.addEventListener('click', () => {
      difficulty = value;
      for (const button of modes.querySelectorAll('button')) {
        button.setAttribute('aria-pressed', String(button === b));
      }
      modeNote.textContent = t(`mode.${value}.note`);
    });
    modes.append(b);
  }
  mode.append(modeLegend, modes, modeNote);

  const error = document.createElement('p');
  error.className = 'error';
  error.setAttribute('role', 'alert');

  const start = document.createElement('button');
  start.type = 'submit';
  start.textContent = t('newCompany.start');

  // Where on Earth: the Historic start, anywhere in the US or anywhere on Earth, on a globe.
  let place: Place = { ...JPL };
  const where = document.createElement('fieldset');
  where.className = 'start-picker';
  const legend = document.createElement('legend');
  legend.textContent = t('newCompany.where');
  const kinds = document.createElement('div');
  kinds.className = 'row start-kinds';
  const kindButtons = new Map<StartKind, HTMLButtonElement>();
  for (const kind of START_KINDS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'start-kind';
    b.dataset.start = kind;
    b.textContent = t(`newCompany.start.${kind}`);
    b.title = t(`newCompany.start.${kind}.name`);
    b.addEventListener('click', () => {
      if (kind === 'historic') setPlace({ ...JPL }, true);
      else if (place.start === 'historic' || (kind === 'us' && !isInUs(place.lat, place.lon))) setPlace(randomPlace(kind), true);
      else setPlace({ ...place, start: kind }, false);
    });
    kinds.append(b);
    kindButtons.set(kind, b);
  }
  const random = document.createElement('button');
  random.type = 'button';
  random.className = 'icon start-random';
  random.textContent = t('newCompany.random');
  random.title = t('newCompany.randomName');
  kinds.append(random);
  const canvas = document.createElement('canvas');
  canvas.className = 'start-globe';
  canvas.setAttribute('aria-label', t('newCompany.globeName'));
  const placeNote = note('place-note', '');
  placeNote.setAttribute('aria-live', 'polite');
  const placeKind = note('place-kind', '');
  where.append(legend, kinds, canvas, placeKind, placeNote);

  let globe: GlobePicker | null = null;
  try {
    globe = new GlobePicker(canvas);
  } catch {
    canvas.hidden = true; // no WebGL: the buttons still work
  }

  const previewSeed = () => {
    const shared = readSharedSeed(seed.input.value);
    if (!shared) return;
    if (shared.place) {
      seed.input.value = shared.seed;
      setPlace(shared.place, true);
    } else onPreview(shared.seed, place);
  };
  function setPlace(next: Place, turn: boolean) {
    place = next;
    for (const [kind, b] of kindButtons) b.setAttribute('aria-pressed', String(kind === place.start));
    globe?.setPin(place.lat, place.lon, turn);
    placeKind.textContent = playMode === 'freePlay' || place.start === 'legacy' ? t('freePlay.anywhere') : t(`newCompany.start.${place.start as 'historic'}.note`);
    placeNote.textContent = placeText(place);
    error.textContent = '';
    previewSeed();
  }
  if (globe) {
    globe.onPick = (lat, lon) => {
      // A spot in the US is a US start; anywhere else is alternate history.
      const start: StartKind = playMode === 'freePlay' ? 'anywhere' : isInUs(lat, lon) ? 'us' : 'anywhere';
      const problem = placeProblem(lat, lon, start);
      if (problem) {
        placeNote.textContent = t(`newCompany.error.${problem}`);
        return;
      }
      setPlace({ lat: Math.round(lat * 100) / 100, lon: Math.round(lon * 100) / 100, start }, false);
    };
  }
  random.addEventListener('click', () => {
    // Random: a new spot of the same kind (anywhere in the US from the Historic start), and a new Seed.
    seed.input.value = randomSeed();
    setPlace(randomPlace(place.start === 'historic' ? 'us' : place.start), true);
  });
  let timer = 0;
  seed.input.addEventListener('input', () => {
    error.textContent = '';
    window.clearTimeout(timer);
    timer = window.setTimeout(previewSeed, 200);
  });
  name.input.addEventListener('input', () => (error.textContent = ''));
  reroll.addEventListener('click', () => {
    seed.input.value = randomSeed();
    error.textContent = '';
    previewSeed();
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!logo.ready()) return;
    const nameCheck = checkCompanyName(name.input.value);
    if (!nameCheck.ok) {
      error.textContent = t(`newCompany.error.${nameCheck.problem}`, { min: NAME_MIN, max: NAME_MAX });
      name.input.focus();
      return;
    }
    previewSeed();
    const seedCheck = checkSeed(seed.input.value);
    if (!seedCheck.ok) {
      const key = seedCheck.problem === 'badWord' ? 'newCompany.error.seedBadWord' : 'newCompany.error.seedInvalid';
      error.textContent = t(key, { max: SEED_MAX });
      seed.input.focus();
      return;
    }
    // A preview still waiting would redraw the Site after the game has put its buildings on it.
    window.clearTimeout(timer);
    globe?.dispose();
    logo.cancelUpload();
    form.remove();
    onDone({ name: nameCheck.name, logo: logo.value(), seed: seedCheck.seed, place, difficulty, playMode });
  });

  const left = document.createElement('div');
  left.className = 'new-company-side';
  left.append(
    name.label,
    name.input,
    note('company-note', t('newCompany.note')),
    play,
    mode,
    logo.root,
    seed.label,
    seedRow,
    note('seed-note', t('newCompany.seedNote')),
    error,
    start,
  );
  const columns = document.createElement('div');
  columns.className = 'new-company-columns';
  columns.append(left, where);
  form.append(heading, columns);
  if (onBack) {
    const back = document.createElement('button');
    back.type = 'button';
    back.textContent = t('mainMenu.back');
    back.addEventListener('click', () => {
      window.clearTimeout(timer);
      globe?.dispose();
      logo.cancelUpload();
      form.remove();
      onBack();
    });
    form.append(back);
  }
  root.append(form);
  setPlace(place, true);
  globe?.start();
  name.input.focus();
}
