/**
 * Tuning numbers for the Site economy. First guesses: change them here, nowhere else.
 * Money is in US dollars; Raw Materials are in kilograms.
 */

import type { RawMaterial } from '../economy/rawMaterial';
import type { BuildingKind, FactoryKind, Part } from '../economy/part';

export const START_MONEY = 2_000_000;

export const MINE_COST = 150_000;

/** Kilograms of Raw Material one Mine digs up per game day. */
export const MINE_OUTPUT_PER_DAY = 10;

/** The Campaign's Game date starts on 1 January 1958, a month before Explorer 1. */
export const START_DATE_UTC = Date.UTC(1958, 0, 1);

/** Real seconds per game day at 1× speed. */
export const SECONDS_PER_DAY = 2;

export const SPEEDS = [0, 1, 2, 4] as const;
export type Speed = (typeof SPEEDS)[number];

/** Longest real-time step the Site simulates in one frame: slow computers keep pace, but a tab left hidden does not jump ahead. */
export const MAX_FRAME_SECONDS = 1;

/** What it costs to build each building. */
export const BUILD_COST: Record<BuildingKind, number> = {
  mine: MINE_COST,
  metalWorks: 200_000,
  electronicsLab: 250_000,
  solarFab: 200_000,
  batteryPlant: 150_000,
  warehouse: 80_000,
};

/** Kilograms the Site can store without a Warehouse (piles in the yard). */
export const BASE_STORAGE_KG = 500;
/** Kilograms each Warehouse adds. Raw Materials and Parts both count by mass. */
export const WAREHOUSE_STORAGE_KG = 2_000;

/** What one kilogram of each Raw Material costs to dig up yourself, in dollars. Sets Market prices. */
export const MATERIAL_VALUE: Record<RawMaterial, number> = {
  aluminium: 100,
  copper: 150,
  silicon: 120,
};

export interface Recipe {
  factory: FactoryKind;
  /** Kilograms of each Raw Material used up per Part. Always Raw Materials, never other Parts. */
  inputs: Partial<Record<RawMaterial, number>>;
  /** Game days to make one Part. */
  days: number;
  /** Mass of the finished Part. Game estimate; less than its inputs (offcuts and waste). */
  massKg: number;
  /** Dollars of work the Factory adds on top of the inputs. Counts towards Market prices. */
  work: number;
}

/** How each Part is made. Game estimates for Era 1, not real figures. */
export const RECIPES: Record<Part, Recipe> = {
  smallBus: { factory: 'metalWorks', inputs: { aluminium: 40 }, days: 4, massKg: 6, work: 4_000 },
  mediumBus: { factory: 'metalWorks', inputs: { aluminium: 100 }, days: 8, massKg: 15, work: 10_000 },
  basicComputer: { factory: 'electronicsLab', inputs: { silicon: 6, copper: 4 }, days: 3, massKg: 2, work: 8_000 },
  simpleAntenna: { factory: 'electronicsLab', inputs: { copper: 5, silicon: 1 }, days: 2, massKg: 1, work: 3_000 },
  solarCells: { factory: 'solarFab', inputs: { silicon: 12 }, days: 3, massKg: 2, work: 5_000 },
  smallBattery: { factory: 'batteryPlant', inputs: { copper: 15 }, days: 3, massKg: 4, work: 2_500 },
  largeBattery: { factory: 'batteryPlant', inputs: { copper: 35 }, days: 5, massKg: 9, work: 5_000 },
};

/** The Market sells to you at this many times the making cost... */
export const MARKET_BUY_FACTOR = 2;
/** ...and buys from you at this fraction of it. */
export const MARKET_SELL_FACTOR = 0.5;
/** Raw Materials are traded in lots of this many kilograms; Parts one at a time. */
export const MARKET_LOT_KG = 10;

/** Money each Contract pays on success. Game estimates, not real contract values. */
export const CONTRACT_REWARD = {
  explorer1: 3_000_000,
} as const;

/** Game days from accepting a Contract to its deadline. A year keeps the tutorial relaxed (about 12 minutes at 1×). */
export const CONTRACT_DEADLINE_DAYS = {
  explorer1: 365,
} as const;
