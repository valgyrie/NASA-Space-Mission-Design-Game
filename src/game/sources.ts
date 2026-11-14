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
  /** NASA's slides on the four Segments of a science mission (official challenge Resource, ticket 32). */
  segments: 'https://www.nasa.gov/wp-content/uploads/2025/04/250323-design-and-develop-science-mission.pdf',
  /** Wessen, Borden, Ziemer, Kwok (JPL), AIAA SPACE 2013: the maturity strip and the Design Review (ticket 33). */
  cml: 'https://dataverse.jpl.nasa.gov/dataset.xhtml?persistentId=hdl:2014/44299',
  /** NASA Mission Viz: GMAT-computed Reference Trajectories (official challenge Resource, ticket 34). */
  missionViz: 'https://nasa.github.io/mission-viz/',
  /** NASA CubeSat Launch Initiative, October 2017: practical advice (ticket 38). */
  cubesat101: 'https://www3.nasa.gov/sites/default/files/atoms/files/nasa_csli_cubesat_101_508.pdf',
};

/**
 * Every real dataset in the game, in the order the Real data list shows them. Each has a name, what it
 * does in LEAP and its credit in strings.ts (`data.<id>.*`). Add the official challenge Resources here.
 */
export const DATASET_IDS = ['power', 'blueMarble', 'gibs', 'naturalEarth', 'nasaImages', 'missionSegments', 'cml', 'missionViz', 'webbGame', 'cubesat101'] as const;
export type DatasetId = (typeof DATASET_IDS)[number];
export const DATASETS: Record<DatasetId, string> = {
  power: 'https://power.larc.nasa.gov/',
  blueMarble: 'https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/',
  gibs: 'https://nasa-gibs.github.io/gibs-api-docs/',
  naturalEarth: 'https://www.naturalearthdata.com/',
  nasaImages: 'https://images.nasa.gov/',
  missionSegments: SOURCES.segments,
  cml: SOURCES.cml,
  missionViz: 'https://github.com/nasa/mission-viz',
  /** NASA Goddard's Webb game: its ending shows the real satellite most like yours (ticket 36). */
  webbGame: 'https://science.nasa.gov/mission/webb/game-build-it-yourself/',
  cubesat101: SOURCES.cubesat101,
};

/** The challenge LEAP was made for. */
export const CHALLENGE = 'https://www.spaceappschallenge.org/2026/challenges/space-mission-design-game/';

/** Open-source code the game ships with or is built with; each name and licence is in strings.ts (`credits.software.<id>`). */
export const SOFTWARE_IDS = ['three', 'vite', 'obscenity', 'supabase'] as const;
export type SoftwareId = (typeof SOFTWARE_IDS)[number];
export const SOFTWARE: Record<SoftwareId, string> = {
  three: 'https://threejs.org/',
  vite: 'https://vite.dev/',
  obscenity: 'https://github.com/jo3-l/obscenity',
  supabase: 'https://supabase.com/',
};

/** Generated Contracts describe the player's own Mission, so have no historical counterpart. */
export function missionSource(id: ContractId): string | null {
  const card = historyCardFor(id, 'before');
  return card ? HISTORY_CARDS[card].learnMore : null;
}
