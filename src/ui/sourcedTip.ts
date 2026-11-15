import { TIP_PAGES, type TipId, tipSource } from '../game/tips';
import { t } from '../strings';
import { tm } from './displayMode';
import { learnMore } from './learnMore';

/** A short piece of real advice, with its printed page and a link to that PDF page. */
export function sourcedTip(id: TipId): HTMLParagraphElement {
  const tip = document.createElement('p');
  tip.className = 'sourced-tip';
  tip.textContent = tm(`tip.${id}`);
  tip.append(' ', learnMore(tipSource(id), t('tip.source', { page: TIP_PAGES[id] })));
  return tip;
}
