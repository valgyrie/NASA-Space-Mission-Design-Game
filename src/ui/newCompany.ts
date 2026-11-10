import { NAME_MAX, NAME_MIN, checkCompanyName } from '../company/companyName';
import { SEED_MAX, checkSeed, randomSeed } from '../site/seed';
import { t } from '../strings';

export interface NewCompanyChoice {
  name: string;
  seed: string;
}

interface Options {
  /** Called whenever the Seed field holds a usable Seed, so the Site can be previewed. */
  onSeed: (seed: string) => void;
  /** Called once, with an accepted name and Seed. */
  onDone: (choice: NewCompanyChoice) => void;
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
export function showNewCompany(root: HTMLElement, { onSeed, onDone }: Options): void {
  const form = document.createElement('form');
  form.className = 'panel dialog';
  form.noValidate = true;

  const heading = document.createElement('h1');
  heading.textContent = t('newCompany.heading');

  const name = field('company-name', t('newCompany.label'));
  name.input.maxLength = NAME_MAX * 2; // room to type; the real limit is checked on Start
  name.input.placeholder = t('newCompany.placeholder');
  name.input.setAttribute('aria-describedby', 'company-note');

  const seed = field('site-seed', t('newCompany.seedLabel'));
  seed.input.maxLength = SEED_MAX + 4;
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

  const error = document.createElement('p');
  error.className = 'error';
  error.setAttribute('role', 'alert');

  const start = document.createElement('button');
  start.type = 'submit';
  start.textContent = t('newCompany.start');

  const previewSeed = () => {
    const check = checkSeed(seed.input.value);
    if (check.ok) onSeed(check.seed);
  };
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
    const nameCheck = checkCompanyName(name.input.value);
    if (!nameCheck.ok) {
      error.textContent = t(`newCompany.error.${nameCheck.problem}`, { min: NAME_MIN, max: NAME_MAX });
      name.input.focus();
      return;
    }
    const seedCheck = checkSeed(seed.input.value);
    if (!seedCheck.ok) {
      const key = seedCheck.problem === 'badWord' ? 'newCompany.error.seedBadWord' : 'newCompany.error.seedInvalid';
      error.textContent = t(key, { max: SEED_MAX });
      seed.input.focus();
      return;
    }
    // A preview still waiting would redraw the Site after the game has put its buildings on it.
    window.clearTimeout(timer);
    form.remove();
    onDone({ name: nameCheck.name, seed: seedCheck.seed });
  });

  form.append(
    heading,
    name.label,
    name.input,
    note('company-note', t('newCompany.note')),
    seed.label,
    seedRow,
    note('seed-note', t('newCompany.seedNote')),
    error,
    start,
  );
  root.append(form);
  previewSeed();
  name.input.focus();
}
