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
