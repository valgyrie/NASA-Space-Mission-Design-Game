import { NAME_MAX, NAME_MIN, checkCompanyName } from '../company/companyName';
import { t } from '../strings';

/** Show the "Start your Company" dialog. Calls `onDone` once with an accepted name. */
export function showNewCompany(root: HTMLElement, onDone: (name: string) => void): void {
  const form = document.createElement('form');
  form.className = 'panel dialog';
  form.noValidate = true;

  const heading = document.createElement('h1');
  heading.textContent = t('newCompany.heading');

  const label = document.createElement('label');
  label.htmlFor = 'company-name';
  label.textContent = t('newCompany.label');

  const input = document.createElement('input');
  input.id = 'company-name';
  input.type = 'text';
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.maxLength = NAME_MAX * 2; // room to type; the real limit is checked on Start
  input.placeholder = t('newCompany.placeholder');

  const note = document.createElement('p');
  note.className = 'note';
  note.textContent = t('newCompany.note');

  const error = document.createElement('p');
  error.className = 'error';
  error.setAttribute('role', 'alert');

  const start = document.createElement('button');
  start.type = 'submit';
  start.textContent = t('newCompany.start');

  input.setAttribute('aria-describedby', 'company-note');
  note.id = 'company-note';
  input.addEventListener('input', () => (error.textContent = ''));

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const check = checkCompanyName(input.value);
    if (check.ok) {
      form.remove();
      onDone(check.name);
      return;
    }
    error.textContent = t(`newCompany.error.${check.problem}`, { min: NAME_MIN, max: NAME_MAX });
    input.focus();
  });

  form.append(heading, label, input, note, error, start);
  root.append(form);
  input.focus();
}
