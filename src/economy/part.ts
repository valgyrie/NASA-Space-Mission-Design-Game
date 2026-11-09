/** Factories turn Raw Materials into Parts. More arrive in later Eras (see docs/GDD.md §5). */
export const FACTORY_KINDS = ['metalWorks', 'electronicsLab', 'solarFab', 'batteryPlant'] as const;
export type FactoryKind = (typeof FACTORY_KINDS)[number];

/** Every building the player can place on a Site. */
export const BUILDING_KINDS = ['mine', ...FACTORY_KINDS, 'warehouse'] as const;
export type BuildingKind = (typeof BUILDING_KINDS)[number];

export function isFactory(kind: BuildingKind): kind is FactoryKind {
  return (FACTORY_KINDS as readonly string[]).includes(kind);
}

/** Era 1 Parts a Factory can make (Payloads too). Their recipes are in `src/game/balance.ts`. */
export const PARTS = [
  'smallBus',
  'mediumBus',
  'basicComputer',
  'simpleAntenna',
  'solarCells',
  'smallBattery',
  'largeBattery',
  'radiationDetector',
] as const;
export type Part = (typeof PARTS)[number];
