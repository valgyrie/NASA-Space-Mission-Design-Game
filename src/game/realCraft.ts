import { type ContractId, type MilestoneId, contractById } from './contracts';

/**
 * "Like the real one" (ticket 36): the real Spacecraft the Mission Report puts beside the player's. In the
 * Campaign it is the Milestone's own Spacecraft; in Free Play a real mission of the same kind. The pattern comes
 * from NASA's Webb game "Build It Yourself: Satellite!". Every figure carries its source; a figure without one
 * is left out and never shown. Names live in strings.ts (`real.<id>.name`). Notes: docs/research/like-the-real-one.md.
 */

export const REAL_CRAFT_IDS = ['explorer1', 'tiros1', 'telstar1', 'syncom3', 'sampex', 'noaa18', 'tdrs1', 'easep', 'kRadCube', 'lro'] as const;
export type RealCraftId = (typeof REAL_CRAFT_IDS)[number];

/** How a Spacecraft got its Power. `solar`: the source names only solar cells. */
export type RealPower = 'batteries' | 'solarAndBatteries' | 'solar';

/** How long it worked: a number of days, or the date it stopped (`YYYY-MM-DD`, or `YYYY-MM` when only the month is known). */
export type RealWorked = { days: number } | { until: string };

/** A real figure and the page it comes from. */
export interface Sourced<T> {
  value: T;
  source: string;
}

export interface RealCraft {
  id: RealCraftId;
  /** Mass at launch, in kilograms. */
  massKg?: Sourced<number>;
  power?: Sourced<RealPower>;
  worked?: Sourced<RealWorked>;
  /** The reading link shown as Learn more →. */
  learnMore: string;
}

const NSSDC = (id: string) => `https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=${id}`;
const WIKI = (page: string) => `https://en.wikipedia.org/wiki/${page}`;

export const REAL_CRAFT: Record<RealCraftId, RealCraft> = {
  // 13.97 kg; mercury batteries only, about 40% of its mass; NASA lists its last transmission as 23 May 1958.
  explorer1: {
    id: 'explorer1',
    massKg: { value: 13.97, source: WIKI('Explorer_1') },
    power: { value: 'batteries', source: 'https://science.nasa.gov/missions/explorer/10-things-to-know-about-explorer-1-americas-first-satellite/' },
    worked: { value: { until: '1958-05-23' }, source: 'https://science.nasa.gov/mission/explorer-1/' },
    learnMore: 'https://science.nasa.gov/mission/explorer-1/',
  },
  // NSSDCA: 122.5 kg; about 9,000 solar cells and 21 nickel-cadmium batteries. NASA: "operational for only 78 days".
  tiros1: {
    id: 'tiros1',
    massKg: { value: 122.5, source: NSSDC('1960-002B') },
    power: { value: 'solarAndBatteries', source: NSSDC('1960-002B') },
    worked: { value: { days: 78 }, source: 'https://science.nasa.gov/mission/tiros/' },
    learnMore: 'https://science.nasa.gov/mission/tiros/',
  },
  // NASA: "The 171-pound … sphere … covered with solar panels" (77 kg). It worked normally until its command
  // channel stopped on 23 November 1962: 136 days (docs/research/milestones.md).
  telstar1: {
    id: 'telstar1',
    massKg: { value: 77, source: 'https://www.nasa.gov/history/telstar-opened-era-of-global-satellite-television/' },
    power: { value: 'solar', source: 'https://www.nasa.gov/history/telstar-opened-era-of-global-satellite-television/' },
    worked: { value: { days: 136 }, source: WIKI('Telstar_1') },
    learnMore: 'https://www.nasa.gov/history/telstar-opened-era-of-global-satellite-television/',
  },
  // NSSDCA: 68 kg fully fuelled (39 kg once its apogee motor had burned); 3,840 solar cells, nickel-cadmium
  // batteries in Earth's shadow; "turned off in April 1969". LEAP's Mass bar counts the Main Engine, so the
  // fuelled mass is the fair one to compare.
  syncom3: {
    id: 'syncom3',
    massKg: { value: 68, source: NSSDC('1964-047A') },
    power: { value: 'solarAndBatteries', source: NSSDC('1964-047A') },
    worked: { value: { until: '1969-04' }, source: NSSDC('1964-047A') },
    learnMore: NSSDC('1964-047A'),
  },
  // Free Play radiation survey. NSSDCA: 158 kg; solar panels; science data until July 2004 (12 years, against a
  // planned three), in a 512 × 687 km orbit.
  sampex: {
    id: 'sampex',
    massKg: { value: 158, source: NSSDC('1992-038A') },
    power: { value: 'solar', source: NSSDC('1992-038A') },
    worked: { value: { until: '2004-07' }, source: NSSDC('1992-038A') },
    learnMore: NSSDC('1992-038A'),
  },
  // Free Play weather watch. Lockheed Martin (builder), 2005: 3,130 lb at liftoff (1,420 kg), a solar array of
  // 833 W. NOAA: decommissioned 6 June 2025 after 20 years. Its AVHRR/3 radiometer took the cloud pictures.
  noaa18: {
    id: 'noaa18',
    massKg: {
      value: 1_420,
      source: 'https://news.lockheedmartin.com/2005-05-09-Nations-Newest-Advanced-Polar-Operational-Environmental-Satellite-Built-by-Lockheed-Martin-Ready-for-Launch',
    },
    power: {
      value: 'solar',
      source: 'https://news.lockheedmartin.com/2005-05-09-Nations-Newest-Advanced-Polar-Operational-Environmental-Satellite-Built-by-Lockheed-Martin-Ready-for-Launch',
    },
    worked: { value: { until: '2025-06-06' }, source: 'https://www.ospo.noaa.gov/operations/poes/status.html' },
    learnMore: WIKI('NOAA-18'),
  },
  // Free Play orbital relay: NASA's first Tracking and Data Relay Satellite, a geostationary relay. NSSDCA:
  // 2,268 kg. NASA (Olney, NTRS 20110012816): solar arrays and nickel-cadmium batteries; "deactivated on June 27th
  // 2010 following more than 26 years of operation".
  tdrs1: {
    id: 'tdrs1',
    massKg: { value: 2_268, source: NSSDC('1983-026B') },
    power: { value: 'solarAndBatteries', source: 'https://ntrs.nasa.gov/citations/20110012816' },
    worked: { value: { until: '2010-06-27' }, source: 'https://ntrs.nasa.gov/citations/20110012816' },
    learnMore: WIKI('TDRS-1'),
  },
  // Apollo 11's science package. NASA SP-4205 (Chariots for Apollo, appendix D): seismometer and laser reflector 77 kg
  // together. NASA Science: solar powered; it stopped answering commands on 25 August 1969.
  easep: {
    id: 'easep',
    massKg: { value: 77, source: 'https://apolloexplorer.co.uk/books/SP-4205/app-d.html' },
    power: { value: 'solar', source: 'https://science.nasa.gov/resource/apollo-11-seismic-experiment/' },
    worked: { value: { until: '1969-08-25' }, source: 'https://science.nasa.gov/resource/apollo-11-seismic-experiment/' },
    learnMore: 'https://science.nasa.gov/resource/apollo-11-seismic-experiment/',
  },
  // Artemis II: Korea's K-Rad Cube, one of four 12U CubeSats (up to 26 kg each) released in high Earth orbit to
  // measure radiation across the Van Allen belts. Its own mass and results are not confirmed, so none are shown.
  kRadCube: {
    id: 'kRadCube',
    learnMore: 'https://www.nasa.gov/wp-content/uploads/2025/12/sls-5558-artemis-ii-sls-reference-guide.pdf',
  },
  // The Moon Mapper is like LRO, in a 50 km polar orbit since 2009. NASA Science: 1,850 kg with fuel; still working.
  lro: {
    id: 'lro',
    massKg: { value: 1_850, source: 'https://science.nasa.gov/mission/lro/about/' },
    learnMore: 'https://science.nasa.gov/mission/lro/',
  },
};

/**
 * The real Spacecraft each Milestone is compared with. Artemis III's choices and Artemis IV's relay and cargo lander
 * compare with plans, not flown Spacecraft, so they have none (the Mission Report leaves the section out).
 */
const MILESTONE_CRAFT: Partial<Record<MilestoneId, RealCraftId>> = {
  explorer1: 'explorer1',
  tiros1: 'tiros1',
  telstar1: 'telstar1',
  syncom3: 'syncom3',
  apollo11: 'easep',
  artemis2: 'kRadCube',
  artemis4Mapper: 'lro',
};

/** Which real Spacecraft each generated Contract kind is compared with. */
const FREE_PLAY: Record<'survey' | 'weather' | 'relay', RealCraftId> = { survey: 'sampex', weather: 'noaa18', relay: 'tdrs1' };

/** The real Spacecraft a Contract's Mission is compared with: the Milestone's own, or one of the same kind. */
export function realCraftFor(id: ContractId): RealCraft | null {
  const contract = contractById(id);
  if (contract.template) return REAL_CRAFT[FREE_PLAY[contract.template]];
  const craft = MILESTONE_CRAFT[id as MilestoneId];
  return craft ? REAL_CRAFT[craft] : null;
}
