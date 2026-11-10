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
  researchLab: 250_000,
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
  smallBus: { factory: 'metalWorks', inputs: { aluminium: 40 }, days: 4, massKg: 3, work: 4_000 },
  mediumBus: { factory: 'metalWorks', inputs: { aluminium: 100 }, days: 8, massKg: 8, work: 10_000 },
  basicComputer: { factory: 'electronicsLab', inputs: { silicon: 6, copper: 4 }, days: 3, massKg: 1, work: 8_000 },
  simpleAntenna: { factory: 'electronicsLab', inputs: { copper: 5, silicon: 1 }, days: 2, massKg: 1, work: 3_000 },
  solarCells: { factory: 'solarFab', inputs: { silicon: 12 }, days: 3, massKg: 2, work: 5_000 },
  smallBattery: { factory: 'batteryPlant', inputs: { copper: 15 }, days: 3, massKg: 3, work: 2_500 },
  largeBattery: { factory: 'batteryPlant', inputs: { copper: 35 }, days: 5, massKg: 6, work: 5_000 },
  radiationDetector: { factory: 'electronicsLab', inputs: { silicon: 4, copper: 3 }, days: 3, massKg: 1.5, work: 6_000 },
  tvCamera: { factory: 'electronicsLab', inputs: { silicon: 10, copper: 6 }, days: 5, massKg: 4, work: 15_000 },
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
  tiros1: 5_000_000,
} as const;

/** Game days from accepting a Contract to its deadline. A year keeps the tutorial relaxed (about 12 minutes at 1×). */
export const CONTRACT_DEADLINE_DAYS = {
  explorer1: 365,
  tiros1: 365,
} as const;

/**
 * What each Mission Designer option does. Game estimates for Era 1, scaled so an Explorer 1-like
 * Spacecraft (Small Bus, Large Battery, Simple Antenna, spin, radiation detector) fits Juno I's
 * ~14 kg and runs about 30 days, as the real one did. Real ranges: docs/research/spacecraft-parts.md.
 */
export interface OptionStats {
  /** Bus: kilograms of Parts it can carry. */
  carriesKg?: number;
  /** Bus: game days to put the Spacecraft together. */
  assemblyDays?: number;
  /** Watts the Part uses all the time. */
  powerUseW?: number;
  /** Watts made while in sunlight. */
  solarW?: number;
  /** Watt-hours of energy stored. */
  batteryWh?: number;
  /** Payload: kilobytes of Data made per day. */
  dataPerDay?: number;
  /** Comms: kilobytes of Data it can send home per day. */
  sendPerDay?: number;
}

export const OPTION_STATS = {
  smallBus: { carriesKg: 9, assemblyDays: 30 },
  mediumBus: { carriesKg: 25, assemblyDays: 45 },
  batteriesOnly: {},
  solarCells: { solarW: 3 },
  smallBattery: { batteryWh: 360 },
  largeBattery: { batteryWh: 720 },
  simpleAntenna: { powerUseW: 0.6, sendPerDay: 50 },
  spin: {},
  radiationDetector: { powerUseW: 0.3, dataPerDay: 20 },
  // TIROS-1-like: with the Simple Antenna it uses 2 W, a little more than Solar Cells give on average (1.8 W),
  // so a Large Battery covers the gap for 78 days and a Small Battery lasts only about 75.
  tvCamera: { powerUseW: 1.4, dataPerDay: 40 },
} as const satisfies Record<string, OptionStats>;

/** Share of each orbit a Low Earth Orbit Spacecraft spends in sunlight (the rest is in Earth's shadow). Game estimate. */
export const SUNLIT_SHARE = 0.6;

/**
 * Rideshare price per kilogram of Spacecraft, by Launch Vehicle. Game estimate: no per-kg price was ever
 * published for Juno I. Set so Explorer 1 (11.5 kg) costs about $460K to launch, well inside the $3M reward.
 * For scale, 2026 rideshare costs about $7,000/kg (docs/research/launch-vehicles.md).
 */
export const RIDESHARE_PER_KG = {
  juno1: 40_000,
  // A bigger rocket: cheaper per kilogram. Game estimate.
  thorAble: 25_000,
} as const;

/** Shipping a finished Spacecraft from the Site to each Launch Site. Game estimates until real Site places (ticket 16). */
export const SHIPPING = {
  capeCanaveral: { cost: 25_000, days: 7 },
} as const;

/**
 * Real Parts never match their label exactly: a battery holds a little more or less, electronics draw a
 * little more or less, a radio link is better some days than others. Each flight (and each Test Run run)
 * varies them by up to this share, either way, most often by little. Game estimates, kept small so
 * results come from the design, not luck: a 10% margin always holds.
 */
export const PART_SPREAD = {
  batteryWh: 0.05,
  powerUseW: 0.05,
  sendPerDay: 0.1,
} as const;

/** Quick runs behind a Test Run's estimated success. */
export const TEST_RUNS = 200;

/**
 * Point the antenna: how likely it is, from how much the antenna can send beyond the Data the Payload makes.
 * A stronger link still gets through when the antenna points a little off, so it drifts off less often.
 * Game estimates. With no spare at all the chance is HIGH; with SAFE_SPARE (200% extra) or more it is LOW.
 */
export const ANTENNA_CHANCE = {
  low: 0.15,
  high: 0.9,
  safeSpare: 2,
} as const;

/** Share of the Mission's Data a fully failed Anomaly loses. The reward is cut by the same share. Game estimate. */
export const ANOMALY_MAX_DATA_LOSS = 0.3;

/** Score an Anomaly gets when the game closed before it was answered and there is no best past result. */
export const ANOMALY_UNANSWERED_SCORE = 0.5;

// ---- Research ----

/** Kilobytes of Data a Research Lab turns into Research Points each game day. Game estimate: one keeps up with Era 1. */
export const LAB_KB_PER_DAY = 50;

/** Kilobytes of Data for one Research Point. Explorer 1's 30 days (600 kB) give 6; TIROS-1's 78 days give 31. */
export const KB_PER_RESEARCH_POINT = 100;

/**
 * The tech tree's Era 1 Upgrades: what each costs in Research Points and how much it multiplies one number
 * of every Part it touches. Game estimates, not real figures.
 */
export const TECH_TREE = {
  betterSolarCells: { era: 1, cost: 5, boost: { solarW: 1.5 } },
  strongerRadio: { era: 1, cost: 5, boost: { sendPerDay: 1.5 } },
  betterBatteries: { era: 1, cost: 5, boost: { batteryWh: 1.25 } },
  lowPowerElectronics: { era: 1, cost: 8, boost: { powerUseW: 0.8 } },
} as const;
