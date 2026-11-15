import type { ContractId } from '../game/contracts';
import type { LaunchVehicleId } from '../game/launchVehicles';
import { KIDS_LINKS, type KidsLinkId, kidsLinkFor, missionSource, SOURCES, VEHICLE_SOURCES } from '../game/sources';
import { t } from '../strings';
import { explorerShown } from './displayMode';
import { contractText } from './format';

/**
 * Point a reading link at its page for the mode on show. Mission Director: the original page. Explorer: a NASA page
 * for young readers when one fits (sources.ts, KIDS_LINKS), otherwise the link is hidden. `text` and `title` are the
 * link's own wording, used outside Explorer.
 */
export function setLinkTarget(link: HTMLAnchorElement, href: string, text = link.textContent ?? '', title = link.title): void {
  link.dataset.href = href;
  link.dataset.text = text;
  link.dataset.title = title;
  const kids = kidsLinkFor(href);
  if (kids) link.dataset.kids = kids;
  else delete link.dataset.kids;
  link.classList.add('mode-link');
  applyLinkMode(link, explorerShown());
  queueDedupe();
}

function applyLinkMode(link: HTMLAnchorElement, explorer: boolean): void {
  const kids = link.dataset.kids as KidsLinkId | undefined;
  if (explorer && kids) {
    link.href = KIDS_LINKS[kids];
    link.textContent = t('sources.learnMore', { name: t(`kids.${kids}`) });
    link.title = t('sources.kidsTab');
    link.hidden = false;
  } else if (explorer) {
    link.hidden = true;
  } else {
    link.href = link.dataset.href ?? link.href;
    link.textContent = link.dataset.text ?? link.textContent;
    link.title = link.dataset.title ?? link.title;
    link.hidden = false;
  }
}

/** Re-point every reading link on the page after the mode changes (a Company is loaded, or the main menu opens). */
export function refreshModeLinks(): void {
  const explorer = explorerShown();
  for (const link of document.querySelectorAll<HTMLAnchorElement>('a.mode-link')) applyLinkMode(link, explorer);
  dedupeKidsLinks();
}

/**
 * In Explorer several grown-up pages share one kids' page (every rocket points to "What is a rocket?"), so keep only
 * the first link to each kids' page among siblings. Runs once per frame after links are made.
 */
function dedupeKidsLinks(): void {
  if (!explorerShown()) return;
  const seen = new Map<Element, Set<string>>();
  for (const link of document.querySelectorAll<HTMLAnchorElement>('a.mode-link[data-kids]')) {
    const parent = link.parentElement;
    if (!parent) continue;
    let ids = seen.get(parent);
    if (!ids) seen.set(parent, (ids = new Set()));
    if (ids.has(link.dataset.kids!)) link.hidden = true;
    else ids.add(link.dataset.kids!);
  }
}

let dedupeQueued = false;
function queueDedupe(): void {
  if (dedupeQueued || typeof requestAnimationFrame === 'undefined') return;
  dedupeQueued = true;
  requestAnimationFrame(() => {
    dedupeQueued = false;
    dedupeKidsLinks();
  });
}

/** Shared, optional reading links. Never put an anchor inside a vehicle's selection button. */
export function learnMore(href: string, name?: string): HTMLAnchorElement {
  const link = document.createElement('a');
  link.className = 'learn-more';
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  setLinkTarget(link, href, name ? t('sources.learnMore', { name }) : t('history.learnMore'), t('sources.newTab'));
  return link;
}

export function missionLinks(contract: ContractId, vehicle?: LaunchVehicleId): HTMLElement {
  const links = document.createElement('div');
  links.className = 'source-links';
  const mission = missionSource(contract);
  if (mission) links.append(learnMore(mission, contractText(contract)));
  if (vehicle) links.append(learnMore(VEHICLE_SOURCES[vehicle], t(`launchVehicle.${vehicle}`)));
  links.append(learnMore(SOURCES.orbits, t('sources.orbits')));
  return links;
}
