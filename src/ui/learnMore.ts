import type { ContractId } from '../game/contracts';
import type { LaunchVehicleId } from '../game/launchVehicles';
import { missionSource, SOURCES, VEHICLE_SOURCES } from '../game/sources';
import { t } from '../strings';
import { contractText } from './format';

/** Shared, optional reading links. Never put an anchor inside a vehicle's selection button. */
export function learnMore(href: string, name?: string): HTMLAnchorElement {
  const link = document.createElement('a');
  link.className = 'learn-more';
  link.href = href;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = name ? t('sources.learnMore', { name }) : t('history.learnMore');
  link.title = t('sources.newTab');
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
