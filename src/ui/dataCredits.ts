import { DATASET_IDS, DATASETS, type DatasetId } from '../game/sources';
import { t, type StringKey } from '../strings';

/** A test in the repo checks LEAP against this dataset; the line says how close it is. */
const CHECKS: Partial<Record<DatasetId, StringKey>> = { missionViz: 'data.missionViz.check' };

/** Each real dataset with its link, what it does in LEAP and its credit. Shared by the menus and Credits. */
export function makeDatasetList(): HTMLUListElement {
  const list = document.createElement('ul');
  list.className = 'dataset-list';
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
    item.append(name, use);
    const check = CHECKS[id];
    if (check) {
      const line = document.createElement('p');
      line.className = 'dataset-check';
      line.textContent = t(check);
      item.append(line);
    }
    item.append(credit);
    list.append(item);
  }
  return list;
}

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
  details.append(summary, intro, makeDatasetList());
  section.append(legend, details);
  return section;
}
