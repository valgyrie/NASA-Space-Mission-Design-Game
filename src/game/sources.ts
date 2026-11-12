import type { ContractId } from './contracts';
import { HISTORY_CARDS, historyCardFor } from './history';
import type { LaunchSiteId, LaunchVehicleId } from './launchVehicles';

/** Reading links for the facts already researched in docs/research/. Game estimates are labelled in the UI. */
export const VEHICLE_SOURCES: Record<LaunchVehicleId, string> = {
  juno1: 'https://en.wikipedia.org/wiki/Juno_I',
  thorAble: 'https://en.wikipedia.org/wiki/Thor-Able',
  thorDelta: 'https://en.wikipedia.org/wiki/Thor-Delta',
  deltaD: 'https://en.wikipedia.org/wiki/Delta_D',
  falcon9: 'https://en.wikipedia.org/wiki/Falcon_9',
};

export const SITE_SOURCES: Record<LaunchSiteId, string> = {
  capeCanaveral: 'https://en.wikipedia.org/wiki/Cape_Canaveral_Launch_Complex_26',
  wallops: 'https://en.wikipedia.org/wiki/Wallops_Flight_Facility',
};

export const SOURCES = {
  climate: 'https://power.larc.nasa.gov/docs/',
  orbits: 'https://science.nasa.gov/learn/basics-of-space-flight/chapter3-1/',
  earth: 'https://science.nasa.gov/earth/facts/',
  map: 'https://www.naturalearthdata.com/about/',
  jpl: 'https://en.wikipedia.org/wiki/Jet_Propulsion_Laboratory',
};

/** Generated Contracts describe the player's own Mission, so have no historical counterpart. */
export function missionSource(id: ContractId): string | null {
  const card = historyCardFor(id, 'before');
  return card ? HISTORY_CARDS[card].learnMore : null;
}
