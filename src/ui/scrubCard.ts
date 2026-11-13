import type { LaunchSiteId } from '../game/launchVehicles';
import type { LaunchAdvice, Weather } from '../game/places';
import { t } from '../strings';
import { adviceText, scrubText } from './weatherText';
import { learnMore } from './learnMore';
import { SOURCES } from '../game/sources';

export interface ScrubCard {
  show(site: LaunchSiteId, weather: Weather, advice: LaunchAdvice | null): void;
  close(): void;
  readonly isOpen: boolean;
}

/**
 * The card shown when the weather Scrubs a Launch: why, and the Launch Window advisor's next good day.
 * `onOpen` and `onClose` pause the Site while it is read, so the advised day cannot pass behind it (ticket 16).
 */
export function showScrubCard(root: HTMLElement, hooks: { onOpen(): void; onClose(): void }): ScrubCard {
  const backdrop = document.createElement('div');
  backdrop.className = 'backdrop';
  backdrop.hidden = true;
  const panel = document.createElement('section');
  panel.className = 'panel dialog scrub-card';
  panel.setAttribute('role', 'alertdialog');
  panel.setAttribute('aria-modal', 'true');
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
  panel.append(title, why, advice, learnMore(SOURCES.climate, t('sources.climate')), ok);
  backdrop.append(panel);
  root.append(backdrop);
  const card: ScrubCard = {
    show(site, weather, next) {
      why.textContent = scrubText(site, weather);
      advice.textContent = adviceText(next);
      if (backdrop.hidden) {
        backdrop.hidden = false;
        hooks.onOpen();
      }
      ok.focus();
    },
    close() {
      if (backdrop.hidden) return;
      backdrop.hidden = true;
      hooks.onClose();
    },
    get isOpen() {
      return !backdrop.hidden;
    },
  };
  ok.addEventListener('click', () => card.close());
  return card;
}
