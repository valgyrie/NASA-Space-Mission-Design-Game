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

/**
 * Every real dataset in the game, in the order the Real data list shows them. Each has a name, what it
 * does in LEAP and its credit in strings.ts (`data.<id>.*`). Add the official challenge Resources here.
 */
export const DATASET_IDS = ['power', 'blueMarble', 'gibs', 'naturalEarth', 'nasaImages'] as const;
export type DatasetId = (typeof DATASET_IDS)[number];
export const DATASETS: Record<DatasetId, string> = {
  power: 'https://power.larc.nasa.gov/',
  blueMarble: 'https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/',
  gibs: 'https://nasa-gibs.github.io/gibs-api-docs/',
  naturalEarth: 'https://www.naturalearthdata.com/',
  nasaImages: 'https://images.nasa.gov/',
};

/** Generated Contracts describe the player's own Mission, so have no historical counterpart. */
export function missionSource(id: ContractId): string | null {
  const card = historyCardFor(id, 'before');
  return card ? HISTORY_CARDS[card].learnMore : null;
}
