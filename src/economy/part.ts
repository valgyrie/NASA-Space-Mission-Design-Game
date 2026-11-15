/** Factories turn Raw Materials into Parts. More arrive in later Eras (see docs/GDD.md §5). */
export const FACTORY_KINDS = ['metalWorks', 'electronicsLab', 'solarFab', 'batteryPlant'] as const;
export type FactoryKind = (typeof FACTORY_KINDS)[number];

/** Every building the player can place on a Site. */
export const BUILDING_KINDS = ['mine', ...FACTORY_KINDS, 'warehouse', 'researchLab', 'groundStation'] as const;
export type BuildingKind = (typeof BUILDING_KINDS)[number];

/** Every building on a Site: the ones the player places, and the Assembly Hall and HQ every Site starts with. */
export type SiteBuildingKind = BuildingKind | 'assemblyHall' | 'hq';

export function isFactory(kind: SiteBuildingKind): kind is FactoryKind {
  return (FACTORY_KINDS as readonly string[]).includes(kind);
}

/** Parts a Factory can make (Payloads too). Their recipes are in `src/game/balance.ts`; `PART_ERA` (eras.ts) opens the later ones. */
export const PARTS = [
  'smallBus',
  'mediumBus',
  'basicComputer',
  'simpleAntenna',
  'lowPowerAntenna',
  'solarCells',
  'smallBattery',
  'mediumBattery',
  'largeBattery',
  'radiationDetector',
  'tvCamera',
  'largeBus',
  'transponder',
  'mainEngine',
  // Era 3: Apollo 11's science package (ticket 50).
  'sciencePackage',
  'dishAntenna',
  'foldOutPanels',
  // The Artemis Era (ticket 52).
  'cubeSatBus',
  'relayRadio',
  'lander',
] as const;
export type Part = (typeof PARTS)[number];
