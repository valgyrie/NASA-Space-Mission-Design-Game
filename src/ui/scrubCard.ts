import type { LaunchSiteId } from '../game/launchVehicles';
import type { LaunchAdvice, Weather } from '../game/places';
import { t } from '../strings';
import { adviceText, scrubText } from './weatherText';

export interface ScrubCard {
  show(site: LaunchSiteId, weather: Weather, advice: LaunchAdvice | null): void;
}

/** The card shown when the weather Scrubs a Launch: why, and the Launch Window advisor's next good day. */
export function showScrubCard(root: HTMLElement): ScrubCard {
  const backdrop = document.createElement('div');
  backdrop.className = 'backdrop';
  backdrop.hidden = true;
  const panel = document.createElement('section');
  panel.className = 'panel dialog scrub-card';
  panel.setAttribute('role', 'alertdialog');
  panel.setAttribute('aria-labelledby', 'scrub-title');
  const title = document.createElement('h2');
  title.id = 'scrub-title';
  title.textContent = t('scrub.heading');
  const why = document.createElement('p');
  const advice = document.createElement('p');
  advice.className = 'scrub-advice';
  const ok = document.createElement('button');
  ok.type = 'button';
  ok.textContent = t('scrub.ok');
  panel.append(title, why, advice, ok);
  backdrop.append(panel);
  root.append(backdrop);
  const close = () => (backdrop.hidden = true);
  ok.addEventListener('click', close);
  backdrop.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });
  return {
    show(site, weather, next) {
      why.textContent = scrubText(site, weather);
      advice.textContent = adviceText(next);
      backdrop.hidden = false;
      ok.focus();
    },
  };
}
