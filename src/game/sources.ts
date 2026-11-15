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
  saturnV: 'https://www.nasa.gov/history/55-years-ago-apollo-4-the-first-flight-of-the-saturn-v/',
  sls: 'https://www.nasa.gov/wp-content/uploads/2025/12/sls-5558-artemis-ii-sls-reference-guide.pdf',
};

export const SITE_SOURCES: Record<LaunchSiteId, string> = {
  capeCanaveral: 'https://en.wikipedia.org/wiki/Cape_Canaveral_Launch_Complex_26',
  wallops: 'https://en.wikipedia.org/wiki/Wallops_Flight_Facility',
  kennedy39A: 'https://en.wikipedia.org/wiki/Kennedy_Space_Center_Launch_Complex_39A',
  kennedy39B: 'https://en.wikipedia.org/wiki/Kennedy_Space_Center_Launch_Complex_39B',
};

export const SOURCES = {
  climate: 'https://power.larc.nasa.gov/docs/',
  orbits: 'https://science.nasa.gov/learn/basics-of-space-flight/chapter3-1/',
  earth: 'https://science.nasa.gov/earth/facts/',
  map: 'https://www.naturalearthdata.com/about/',
  jpl: 'https://en.wikipedia.org/wiki/Jet_Propulsion_Laboratory',
  /** NASA's slides on the four Segments of a science mission (official challenge Resource, ticket 32). */
  segments: 'https://www.nasa.gov/wp-content/uploads/2025/04/250323-design-and-develop-science-mission.pdf',
  /** The same slides, slide 10: NASA's six steps to design and develop a mission (ticket 39). */
  sixSteps: 'https://www.nasa.gov/wp-content/uploads/2025/04/250323-design-and-develop-science-mission.pdf#page=10',
  /** Wessen, Borden, Ziemer, Kwok (JPL), AIAA SPACE 2013: the maturity strip and the Design Review (ticket 33). */
  cml: 'https://dataverse.jpl.nasa.gov/dataset.xhtml?persistentId=hdl:2014/44299',
  /** NASA Mission Viz: GMAT-computed Reference Trajectories (official challenge Resource, ticket 34). */
  missionViz: 'https://nasa.github.io/mission-viz/',
  /** NASA Goddard's Mission Design Lab: the disciplines behind Team Mode's roles (ticket 41). A reading source. */
  missionDesignLab: 'https://etd.gsfc.nasa.gov/capabilities/integrated-design-center/mission-design-lab/',
  /** NASA CubeSat Launch Initiative, October 2017: practical advice (ticket 38). */
  cubesat101: 'https://www3.nasa.gov/sites/default/files/atoms/files/nasa_csli_cubesat_101_508.pdf',
  /** Europe's spaceport, 5° north of the equator, chosen for Earth's spin (launch-sites-and-physics.md). */
  equator: 'https://en.wikipedia.org/wiki/Guiana_Space_Centre',
  /** Eras 3 and 5 (docs/research/eras-3-5.md). The lunar night (340 hours) and Apollo 11's seismometer. */
  lunarNight: 'https://science.nasa.gov/resource/apollo-11-seismic-experiment/',
  /** The Apollo laser reflectors: the Moon recedes about 3.8 cm a year. */
  laserRanging: 'https://eclipse.gsfc.nasa.gov/help/ApolloLaser.html',
  /** Apollo 4 (9 Nov 1967), the first Saturn V, flown "all-up". */
  saturnV: 'https://www.nasa.gov/history/55-years-ago-apollo-4-the-first-flight-of-the-saturn-v/',
  /** Apollo 8 (21 Dec 1968): the first crewed Saturn V, the first people to orbit the Moon. */
  apollo8: 'https://www.nasa.gov/mission/apollo-8/',
  /** SLS Block 1, its stages and lift, and Artemis II's four CubeSats. */
  slsGuide: 'https://www.nasa.gov/wp-content/uploads/2025/12/sls-5558-artemis-ii-sls-reference-guide.pdf',
  /** NASA's Lunar Communications Relay and Navigation Systems paper (2025): south-pole coverage with and without a relay. */
  lcrns: 'https://www.nasa.gov/wp-content/uploads/2026/02/lcrns-esper-257-1.pdf',
  artemis: 'https://www.nasa.gov/humans-in-space/artemis/',
  // The Moon sequences' captions (moonShow.* in strings.ts): every fact and its page are in docs/art/assets-moon.md.
  /** Apollo 11: the orbit round the Moon, undocking, the descent burn, the time on the surface. */
  apollo11Overview: 'https://www.nasa.gov/history/apollo-11-mission-overview/',
  /** Apollo 11's times: the burn to the Moon, undocking, the descent burn, the landing, the stay. NASA SP-4029. */
  apollo11Numbers: 'https://www.nasa.gov/wp-content/uploads/static/history/SP-4029/Apollo_11a_Summary.htm',
  /** Apollo Lunar Surface Journal: the landing, "Contact light" and Armstrong's debrief on the dust. */
  apollo11Landing: 'https://www.nasa.gov/wp-content/uploads/static/history/alsj/a11/a11.landing.html',
  /** Apollo Lunar Surface Journal: Aldrin set up the seismometer, Armstrong the laser reflector. */
  apollo11Easep: 'https://www.nasa.gov/wp-content/uploads/static/history/alsj/a11/a11.clsout.html',
  /** Apollo 9 (March 1969) tested the Lunar Module and docking in Earth orbit. */
  apollo9: 'https://www.nasa.gov/mission/apollo-9/',
  /** Apollo 17 (December 1972), the last crew on the Moon. */
  apollo17: 'https://www.nasa.gov/mission/apollo-17/',
  /** Artemis II: separation, the crew's piloting test, CubeSats one minute apart, the free-return path. */
  artemis2PressKit: 'https://www.nasa.gov/artemis-ii-press-kit/',
  /** Artemis II: 252,756 miles from Earth, splashdown off San Diego on 10 April 2026. */
  artemis2Return: 'https://www.nasa.gov/news-release/nasa-welcomes-record-setting-artemis-ii-moonfarers-back-to-earth/',
  /** NASA's plan of November 2026: Artemis III in Earth orbit in 2027, the Artemis IV landing in 2028. */
  artemisPlans: 'https://www.nasa.gov/missions/artemis/nasa-shares-plans-to-accelerate-artemis-return-to-moon/',
  /** STS-6 (April 1983) launched the first Tracking and Data Relay Satellite. */
  tdrs: 'https://www.nasa.gov/mission/sts-6/',
  /** Solar storms, warnings and Orion's shelter. */
  moonRadiation: 'https://science.nasa.gov/science-research/heliophysics/how-nasa-will-protect-astronauts-from-space-radiation-at-the-moon/',
  /** IM-2, a NASA CLPS delivery, landed near the south pole on 6 March 2025. */
  im2: 'https://www.nasa.gov/news-release/nasa-receives-some-data-before-intuitive-machines-ends-lunar-mission/',
  /** LRO's laser altimeter maps the south pole, shadowed craters included (Barker et al., NASA Goddard). */
  lolaSouthPole: 'https://ntrs.nasa.gov/api/citations/20230014419/downloads/BarkernewviewSTIupdated.pdf',
  /** The Sun stays low: at most 7° in the Artemis landing regions. */
  southPoleSun: 'https://www.nasa.gov/centers-and-facilities/nesc/characterizing-the-visual-experience-of-astronauts-at-the-lunar-south-pole/',
  /** Shackleton crater: rim points sunlit more than 90% of the year, the floor always dark. */
  shackleton: 'https://science.nasa.gov/resource/shackleton-craters-illuminated-rim-shadowed-interior/',
  /** Earth seen from the south pole bobs up and down near the horizon. */
  earthFromPole: 'https://science.nasa.gov/resource/earth-and-sun-from-the-moons-south-pole-2/',
};

/**
 * Every real dataset in the game, in the order the Real data list shows them. Each has a name, what it
 * does in LEAP and its credit in strings.ts (`data.<id>.*`). Add the official challenge Resources here.
 */
export const DATASET_IDS = ['power', 'blueMarble', 'blackMarble', 'viirsClouds', 'gibs', 'naturalEarth', 'nasaImages', 'missionSegments', 'cml', 'missionViz', 'webbGame', 'cubesat101'] as const;
export type DatasetId = (typeof DATASET_IDS)[number];
export const DATASETS: Record<DatasetId, string> = {
  power: 'https://power.larc.nasa.gov/',
  blueMarble: 'https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/',
  /** City lights on the photo globe (public/textures/earth/lights.jpg, docs/art/assets-space.md). */
  blackMarble: 'https://blackmarble.gsfc.nasa.gov/',
  /** One real day of clouds on the photo globe (public/textures/earth/clouds.jpg). */
  viirsClouds: 'https://www.earthdata.nasa.gov/data/instruments/viirs',
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
export const SOFTWARE_IDS = ['three', 'vite', 'blender', 'obscenity', 'supabase'] as const;
export type SoftwareId = (typeof SOFTWARE_IDS)[number];
export const SOFTWARE: Record<SoftwareId, string> = {
  three: 'https://threejs.org/',
  blender: 'https://www.blender.org/',
  vite: 'https://vite.dev/',
  obscenity: 'https://github.com/jo3-l/obscenity',
  supabase: 'https://supabase.com/',
};

/**
 * Third-party art and techniques in LEAP's look, grouped by source, in the order Credits shows them. Every file is
 * listed in docs/art/assets-*.md; each name, author and licence is in strings.ts (`credits.asset.<id>`,
 * `credits.models.<group>`). The Earth's photos and water map are Real data (DATASETS), not repeated here.
 */
export const ART_GROUPS = {
  /** Poly Haven, assets-terrain.md. */
  land: ['rockyTerrain02', 'aerialBeach01', 'aerialRocks02', 'aerialGroundRock', 'snowFieldAerial'],
  /** Poly Haven, assets-buildings.md. */
  buildings: [
    'boxProfileMetalSheet', 'corrugatedIron02', 'wornCorrugatedIron', 'concreteFloor02', 'factoryBrick', 'asphalt02',
    'paintedMetalShutter', 'paintedPlasterWall', 'gravelFloor', 'rockyGravel',
  ],
  /** Poly Haven, scripts/blender/build_launch.py (lib.PH_SETS) and assets-launch.md. */
  launchPads: ['rustyPaintedMetal', 'blueMetalPlate', 'concreteFloorWorn001', 'metalPlate02'],
  /** ambientCG, assets-nature.md. */
  trees: ['leafSet024', 'leafSet016', 'leafSet019', 'bark012'],
  /** NASA's Scientific Visualization Studio, assets-moon.md (public domain). */
  moon: ['cgiMoonKit'],
  code: ['threeAddons', 'draco', 'textureRepetition'],
} as const;
export type ArtGroup = keyof typeof ART_GROUPS;
export type ArtAssetId = (typeof ART_GROUPS)[ArtGroup][number];
export const ART_GROUP_IDS = Object.keys(ART_GROUPS) as ArtGroup[];
export const ART_ASSETS: Record<ArtAssetId, string> = {
  rockyTerrain02: 'https://polyhaven.com/a/rocky_terrain_02',
  aerialBeach01: 'https://polyhaven.com/a/aerial_beach_01',
  aerialRocks02: 'https://polyhaven.com/a/aerial_rocks_02',
  aerialGroundRock: 'https://polyhaven.com/a/aerial_ground_rock',
  snowFieldAerial: 'https://polyhaven.com/a/snow_field_aerial',
  boxProfileMetalSheet: 'https://polyhaven.com/a/box_profile_metal_sheet',
  corrugatedIron02: 'https://polyhaven.com/a/corrugated_iron_02',
  wornCorrugatedIron: 'https://polyhaven.com/a/worn_corrugated_iron',
  concreteFloor02: 'https://polyhaven.com/a/concrete_floor_02',
  factoryBrick: 'https://polyhaven.com/a/factory_brick',
  asphalt02: 'https://polyhaven.com/a/asphalt_02',
  paintedMetalShutter: 'https://polyhaven.com/a/painted_metal_shutter',
  paintedPlasterWall: 'https://polyhaven.com/a/painted_plaster_wall',
  gravelFloor: 'https://polyhaven.com/a/gravel_floor',
  rockyGravel: 'https://polyhaven.com/a/rocky_gravel',
  rustyPaintedMetal: 'https://polyhaven.com/a/rusty_painted_metal',
  blueMetalPlate: 'https://polyhaven.com/a/blue_metal_plate',
  concreteFloorWorn001: 'https://polyhaven.com/a/concrete_floor_worn_001',
  metalPlate02: 'https://polyhaven.com/a/metal_plate_02',
  leafSet024: 'https://ambientcg.com/a/LeafSet024',
  leafSet016: 'https://ambientcg.com/a/LeafSet016',
  leafSet019: 'https://ambientcg.com/a/LeafSet019',
  bark012: 'https://ambientcg.com/a/Bark012',
  /** LROC colour mosaic and LOLA elevation (public domain): public/textures/moon/. */
  cgiMoonKit: 'https://svs.gsfc.nasa.gov/4720',
  /** GLTFLoader, DRACOLoader, RoundedBoxGeometry and RoomEnvironment from three's examples/jsm (MIT). */
  threeAddons: 'https://github.com/mrdoob/three.js/tree/dev/examples/jsm',
  /** The decoder in public/models/draco/ (Apache License 2.0). */
  draco: 'https://github.com/google/draco',
  /** Ground photos without visible repeats (terrainMesh.ts). Credited as a courtesy. */
  textureRepetition: 'https://iquilezles.org/articles/texturerepetition/',
};

/** Generated Contracts describe the player's own Mission, so have no historical counterpart. */
export function missionSource(id: ContractId): string | null {
  const card = historyCardFor(id, 'before');
  return card ? HISTORY_CARDS[card].learnMore : null;
}

/** Minigames (src/minigames/): the page behind each game's fact (docs/research/minigames.md). */
export const MINIGAME_SOURCES = {
  pluto: 'https://science.nasa.gov/dwarf-planets/pluto/facts/',
  rover: 'https://science.nasa.gov/mission/mars-2020-perseverance/',
  planets: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/',
  thermal: 'https://www.nasa.gov/smallsat-institute/sst-soa/thermal-control/',
  co2: 'https://www.nasa.gov/missions/apollo/apollo-13-mission-details/',
  signal: 'https://www.nasa.gov/missions/voyager-program/voyager-2/nasa-mission-update-voyager-2-communications-pause/',
} as const;

/**
 * Explorer mode: NASA pages written for children (docs/research/kids-links.md, each opened and checked 15 Nov 2026).
 * A "Learn more" link whose page has a kids' page below points there instead; any other is hidden in Explorer.
 * Credits keep every original link in both modes.
 */
export const KIDS_LINK_IDS = ['rocket', 'sls', 'launching', 'orbit', 'satellite', 'hurricanes', 'antennas', 'spaceWeather', 'earth', 'apollo', 'moon', 'artemis', 'pluto', 'marsRovers', 'planets'] as const;
export type KidsLinkId = (typeof KIDS_LINK_IDS)[number];
const K4 = (page: string) => `https://www.nasa.gov/learning-resources/for-kids-and-students/${page}-grades-k-4/`;
export const KIDS_LINKS: Record<KidsLinkId, string> = {
  rocket: K4('what-is-a-rocket'),
  sls: K4('what-is-the-space-launch-system'),
  launching: 'https://spaceplace.nasa.gov/launching-into-space/en/',
  orbit: K4('what-is-an-orbit'),
  satellite: K4('what-is-a-satellite'),
  hurricanes: 'https://spaceplace.nasa.gov/hurricanes/en/',
  antennas: 'https://spaceplace.nasa.gov/dsn-antennas/en/',
  spaceWeather: 'https://spaceplace.nasa.gov/spaceweather/en/',
  earth: 'https://spaceplace.nasa.gov/all-about-earth/en/',
  apollo: K4('what-was-the-apollo-program'),
  moon: 'https://spaceplace.nasa.gov/all-about-the-moon/en/',
  artemis: K4('what-is-the-artemis-program'),
  pluto: 'https://spaceplace.nasa.gov/all-about-pluto/en/',
  marsRovers: 'https://spaceplace.nasa.gov/mars-rovers/en/',
  planets: 'https://spaceplace.nasa.gov/planets/en/',
};

/** Which kids' page stands in for each grown-up page (matched without its #fragment). */
const KIDS_FOR: Readonly<Record<string, KidsLinkId>> = (() => {
  const map: Record<string, KidsLinkId> = {};
  const add = (id: KidsLinkId, ...urls: string[]) => { for (const url of urls) map[url.split('#')[0]!] = id; };
  add('rocket', VEHICLE_SOURCES.juno1, VEHICLE_SOURCES.thorAble, VEHICLE_SOURCES.thorDelta, VEHICLE_SOURCES.deltaD, VEHICLE_SOURCES.falcon9, VEHICLE_SOURCES.saturnV);
  add('sls', VEHICLE_SOURCES.sls, SOURCES.slsGuide);
  add('launching', ...Object.values(SITE_SOURCES));
  add('orbit', SOURCES.orbits);
  add('earth', SOURCES.earth);
  add('satellite',
    'https://www.nasa.gov/history/60-years-ago-explorer-1-becomes-americas-first-satellite/',
    'https://science.nasa.gov/missions/explorer/10-things-to-know-about-explorer-1-americas-first-satellite/',
    'https://science.nasa.gov/mission/explorer-1/',
    'https://www.nasa.gov/image-article/vanguard-satellite-1958/');
  add('hurricanes', 'https://science.nasa.gov/mission/tiros/', 'https://en.wikipedia.org/wiki/NOAA-18');
  add('antennas',
    'https://www.nasa.gov/history/telstar-opened-era-of-global-satellite-television/',
    'https://www.asc-csa.gc.ca/eng/satellites/alouette.asp',
    'https://www.nasa.gov/image-article/first-geosynchronous-satellite/',
    'https://www.nasa.gov/history/communications-satellites/',
    'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1964-047A',
    'https://en.wikipedia.org/wiki/TDRS-1',
    SOURCES.tdrs);
  add('spaceWeather', 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1992-038A', SOURCES.moonRadiation);
  add('apollo', 'https://www.nasa.gov/mission/apollo-11/', SOURCES.saturnV, SOURCES.lunarNight, SOURCES.laserRanging, SOURCES.apollo8,
    SOURCES.apollo9, SOURCES.apollo17, SOURCES.apollo11Overview, SOURCES.apollo11Numbers, SOURCES.apollo11Landing, SOURCES.apollo11Easep);
  add('moon', 'https://science.nasa.gov/mission/lro/', SOURCES.im2, SOURCES.lolaSouthPole, SOURCES.southPoleSun, SOURCES.shackleton, SOURCES.earthFromPole);
  add('artemis', SOURCES.artemis, SOURCES.artemis2PressKit, SOURCES.artemis2Return, SOURCES.artemisPlans,
    'https://www.nasa.gov/mission/artemis-ii/',
    'https://www.nasa.gov/missions/artemis/nasas-artemis-iii-mission-to-test-future-moon-lander-operations/',
    'https://www.nasa.gov/missions/artemis/nasa-partners-accelerate-lander-development-for-2028-moon-missions/');
  add('pluto', MINIGAME_SOURCES.pluto);
  add('marsRovers', MINIGAME_SOURCES.rover, 'https://science.nasa.gov/mission/msl-curiosity/');
  add('planets', MINIGAME_SOURCES.planets);
  return map;
})();

/** The kids' page that stands in for a grown-up page in Explorer, or null to hide the link there. */
export function kidsLinkFor(href: string): KidsLinkId | null {
  return KIDS_FOR[href.split('#')[0]!] ?? null;
}
