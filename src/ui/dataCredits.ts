import { DATASET_IDS, DATASETS } from '../game/sources';
import { t } from '../strings';

/** Where LEAP uses real data, with each dataset's credit and link. Shown in the main and pause menus. */
export function makeDataCredits(): HTMLElement {
  const section = document.createElement('fieldset');
  section.className = 'data-credits';
  const legend = document.createElement('legend');
  legend.textContent = t('data.heading');
  const details = document.createElement('details');
  const summary = document.createElement('summary');
  summary.textContent = t('data.summary');
  const intro = document.createElement('p');
  intro.className = 'note';
  intro.textContent = t('data.intro');
  const list = document.createElement('ul');
  for (const id of DATASET_IDS) {
    const item = document.createElement('li');
    item.dataset.dataset = id;
    const name = document.createElement('a');
    name.href = DATASETS[id];
    name.target = '_blank';
    name.rel = 'noopener noreferrer';
    name.title = t('sources.newTab');
    name.textContent = t(`data.${id}.name`);
    const use = document.createElement('p');
    use.textContent = t('data.use', { use: t(`data.${id}.use`) });
    const credit = document.createElement('p');
    credit.className = 'note';
    credit.textContent = t(`data.${id}.credit`);
    item.append(name, use, credit);
    list.append(item);
  }
  details.append(summary, intro, list);
  section.append(legend, details);
  return section;
}
