import { TIP_PAGES, type TipId, tipSource } from '../game/tips';
import { t } from '../strings';
import { learnMore } from './learnMore';

/** A short piece of real advice, with its printed page and a link to that PDF page. */
export function sourcedTip(id: TipId): HTMLParagraphElement {
  const tip = document.createElement('p');
  tip.className = 'sourced-tip';
  tip.textContent = t(`tip.${id}`);
  tip.append(' ', learnMore(tipSource(id), t('tip.source', { page: TIP_PAGES[id] })));
  return tip;
}
