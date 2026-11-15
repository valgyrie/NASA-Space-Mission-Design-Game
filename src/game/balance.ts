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
  groundStation: 400_000,
};

/**
 * What a Plot of land next door costs (ticket 30): a base price for its dry land (all of it if there is no water),
 * more for each Deposit on it, and dearer with each Plot already bought. Never less than `min`. Game estimates.
 */
export const PLOT_PRICE = { base: 600_000, perDeposit: 100_000, perBought: 0.5, min: 100_000 } as const;

/** Every few Free Play Contracts gives a Plot of land as well as money. */
export const LAND_CONTRACT_EVERY = 4;

// ---- Building levels and Upgrades ----

/** The Assembly Hall every Site starts with. Not built by the player; its Upgrades are priced from this. */
export const ASSEMBLY_HALL_COST = 300_000;

/**
 * Highest level each building reaches. The Assembly Hall's level 3 takes the Large Bus, which opens in Era 2;
 * the HQ's level is the Company's Era (Era 2 is the last one built so far).
 */
export const MAX_LEVEL = { assemblyHall: 3, hq: 2, other: 3 } as const;

/** The Assembly Hall's top level in each Era: its level 3 waits for the Large Bus (Era 2). */
export const HALL_LEVEL_BY_ERA = { 1: 2, 2: 3, 3: 3, 5: 3 } as const;

/**
 * The HQ every Site starts with. Its Upgrades are priced from this, like every building's: moving to Era 2
 * costs this much and takes UPGRADE[2].days. Game estimate.
 */
export const HQ_COST = 1_500_000;

/**
 * What an Upgrade to each level costs, as a share of the building's price, and the game days it takes.
 * The building keeps working while it is upgraded. Game estimates.
 */
export const UPGRADE = {
  2: { costShare: 1, days: 15 },
  3: { costShare: 2, days: 30 },
  // The HQ's jump from Era 3 to the Artemis Era (Era 4 is not built yet, so level 4 is skipped).
  5: { costShare: 3, days: 45 },
} as const;

/** How much each level above the first adds to a Mine's output, a Warehouse's storage and a Research Lab's pace. */
export const LEVEL_OUTPUT_STEP = 0.5;

/** The Assembly Hall level each Bus needs: a bigger Bus needs a bigger hall. */
export const BUS_HALL_LEVEL = { cubeSatBus: 1, smallBus: 1, mediumBus: 2, largeBus: 3 } as const;

/**
 * A Factory makes Parts of its own level, their Mark: each Mark above Mk 1 makes a Part this much lighter,
 * its electronics use this much less power and its solar cells make this much more. Game estimates.
 */
export const MARK_STEP = { lighter: 0.15, lessPower: 0.1, moreSolar: 0.1 } as const;

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

/** How each Part is made. Game estimates, not real figures. The Large Bus, Radio Transponder and Main Engine are Era 2's. */
export const RECIPES: Record<Part, Recipe> = {
  smallBus: { factory: 'metalWorks', inputs: { aluminium: 40 }, days: 4, massKg: 3, work: 4_000 },
  mediumBus: { factory: 'metalWorks', inputs: { aluminium: 100 }, days: 8, massKg: 8, work: 10_000 },
  basicComputer: { factory: 'electronicsLab', inputs: { silicon: 6, copper: 4 }, days: 3, massKg: 1, work: 8_000 },
  simpleAntenna: { factory: 'electronicsLab', inputs: { copper: 5, silicon: 1 }, days: 2, massKg: 1, work: 3_000 },
  solarCells: { factory: 'solarFab', inputs: { silicon: 12 }, days: 3, massKg: 2, work: 5_000 },
  smallBattery: { factory: 'batteryPlant', inputs: { copper: 15 }, days: 3, massKg: 3, work: 2_500 },
  largeBattery: { factory: 'batteryPlant', inputs: { copper: 35 }, days: 5, massKg: 6, work: 5_000 },
  // Advanced's middle choice: 100 Wh/kg, within early mercury batteries' ~66–110 Wh/kg range.
  // Chemistry isn't simulated; this is a game estimate, not an Explorer 1 measurement (docs/research/spacecraft-parts.md).
  mediumBattery: { factory: 'batteryPlant', inputs: { copper: 22 }, days: 4, massKg: 4.2, work: 3_500 },
  // A low-power radio trades Data capacity for lower electrical draw. All three numbers are game estimates.
  lowPowerAntenna: { factory: 'electronicsLab', inputs: { copper: 4, silicon: 2 }, days: 3, massKg: 0.8, work: 4_500 },
  radiationDetector: { factory: 'electronicsLab', inputs: { silicon: 4, copper: 3 }, days: 3, massKg: 1.5, work: 6_000 },
  tvCamera: { factory: 'electronicsLab', inputs: { silicon: 10, copper: 6 }, days: 5, massKg: 4, work: 15_000 },
  largeBus: { factory: 'metalWorks', inputs: { aluminium: 180 }, days: 12, massKg: 15, work: 18_000 },
  transponder: { factory: 'electronicsLab', inputs: { silicon: 8, copper: 8 }, days: 5, massKg: 3, work: 20_000 },
  // A solid apogee motor with its propellant. Syncom's fuelled 68 kg became 39 kg once its motor had burned
  // (docs/research/milestones.md): the motor is the heaviest Part, as it is here.
  mainEngine: { factory: 'metalWorks', inputs: { aluminium: 60, copper: 20 }, days: 8, massKg: 24, work: 20_000 },
  // Era 3 (ticket 50, docs/research/eras-3-5.md): an EASEP-like science package (the real one: 77 kg, a seismometer
  // with its own panels and a laser reflector), a dish antenna that must point at Earth, and fold-out solar panels.
  sciencePackage: { factory: 'electronicsLab', inputs: { silicon: 14, copper: 8 }, days: 6, massKg: 12, work: 30_000 },
  dishAntenna: { factory: 'electronicsLab', inputs: { aluminium: 15, copper: 5 }, days: 4, massKg: 3, work: 15_000 },
  foldOutPanels: { factory: 'solarFab', inputs: { silicon: 25, aluminium: 10 }, days: 5, massKg: 5, work: 12_000 },
  // The Artemis Era (ticket 52): a 12U CubeSat frame (Artemis II's real slots took 12U CubeSats up to 26 kg), a relay
  // radio that passes signals between the Moon and Earth, and a small lander with legs and a landing engine. The
  // lander is lighter than the ticket's 40 kg so it fits a Large Bus (no Heavy Bus in the demo).
  cubeSatBus: { factory: 'metalWorks', inputs: { aluminium: 50 }, days: 5, massKg: 4, work: 6_000 },
  relayRadio: { factory: 'electronicsLab', inputs: { silicon: 8, copper: 8 }, days: 5, massKg: 3, work: 20_000 },
  lander: { factory: 'metalWorks', inputs: { aluminium: 120, copper: 30 }, days: 12, massKg: 18, work: 40_000 },
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
  // Telstar 1 pays for its whole Launch (about $2.7M), so it pays more.
  telstar1: 8_000_000,
  syncom3: 10_000_000,
  apollo11: 12_000_000,
  // The ride is free (NASA picked the real CubeSats) and the Mission lasts a day, so it pays less.
  artemis2: 6_000_000,
  artemis3: 12_000_000,
  // The finale.
  artemis4: 30_000_000,
} as const;

/** What each extra choice of a Choice Milestone pays, once one of its choices is done. Game estimates. */
export const CONTRACT_EXTRA_REWARD = {
  artemis3: 6_000_000,
  artemis4: 15_000_000,
} as const;

/** Game days from accepting a Contract to its deadline. A year keeps the tutorial relaxed (about 12 minutes at 1×). */
export const CONTRACT_DEADLINE_DAYS = {
  explorer1: 365,
  tiros1: 365,
  telstar1: 365,
  syncom3: 365,
  apollo11: 365,
  artemis2: 365,
  artemis3: 365,
  artemis4: 365,
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
  largeBus: { carriesKg: 45, assemblyDays: 60 },
  batteriesOnly: {},
  solarCells: { solarW: 3 },
  smallBattery: { batteryWh: 360 },
  largeBattery: { batteryWh: 720 },
  mediumBattery: { batteryWh: 420 },
  simpleAntenna: { powerUseW: 0.6, sendPerDay: 50 },
  // Electrical draw, not RF output: Explorer 1's 10 mW transmitter inspired the lower-power choice.
  lowPowerAntenna: { powerUseW: 0.14, sendPerDay: 24 },
  spin: {},
  radiationDetector: { powerUseW: 0.3, dataPerDay: 20 },
  // TIROS-1-like: with the Simple Antenna it uses 2 W, a little more than Solar Cells give on average (1.8 W),
  // so a Large Battery covers the gap for 78 days and a Small Battery lasts only about 75.
  tvCamera: { powerUseW: 1.4, dataPerDay: 40 },
  // Telstar- and Syncom-like: a relay for TV and phone calls. It makes far more Data than the Simple Antenna can
  // send alone (50 kB a day), so it needs a Ground Station. With Solar Cells it runs on sunlight alone.
  transponder: { powerUseW: 1, dataPerDay: 90 },
  noEngine: {},
  mainEngine: {},
  // Apollo-like: Science Package and Dish Antenna use 4 W. Over the 7 dark days that is 672 Wh: a Large Battery
  // (720 Wh) just covers it, a Medium one (420 Wh) does not. From the Moon the Dish sends 400 / 5 = 80 kB a day.
  sciencePackage: { powerUseW: 2, dataPerDay: 30 },
  dishAntenna: { powerUseW: 2, sendPerDay: 400 },
  foldOutPanels: { solarW: 20 },
  cubeSatBus: { carriesKg: 22, assemblyDays: 25 },
  relayRadio: { powerUseW: 4, dataPerDay: 30 },
  lander: {},
} as const satisfies Record<string, OptionStats>;

/**
 * Share of each orbit a Spacecraft spends in sunlight (the rest is in Earth's shadow). Low Earth Orbit: game
 * estimate. Geostationary: NASA says Syncom 3 was in sunlight 99% of the time (docs/research/milestones.md).
 */
export const SUNLIT_SHARE = {
  lowEarthOrbit: 0.6,
  geostationary: 0.99,
  // Game estimate: a high, stretched orbit is rarely in Earth's shadow.
  highEarthOrbit: 0.99,
  // Game estimate between LRO's worst case (about 58%) and its two-month seasons of full Sun (eras-3-5.md, Era 4).
  lunarOrbit: 0.75,
  // Apollo 11 landed in the lunar morning: about 14 of the 21 days are sunlit (see LUNAR_NIGHT).
  moonSurface: 0.67,
  // A sunlit south-pole ridge: NASA's LOLA studies give 70% on average along Connecting Ridge, 88% at best.
  lunarSouthPole: 0.8,
} as const;

/**
 * The lunar night at Tranquility Base: a day on the Moon lasts about two Earth weeks, then about two weeks of night
 * (NASA: a 340-hour night). Apollo 11 landed in the lunar morning, with about 14 days of sunlight left. A Spacecraft on
 * the Moon's surface has full sunlight for the first `sunDays` of its Mission, then none: its battery must carry it
 * through the dark (7 days of a 21-day Mission). Game rule built on docs/research/eras-3-5.md.
 */
export const LUNAR_NIGHT = { sunDays: 14 } as const;

/**
 * Radio from the Moon: about 10 times farther than geostationary orbit, so a signal arrives about 100 times weaker.
 * Game rule: from the Moon every antenna sends this share of what it sends near Earth (ticket 50, open question 3).
 */
export const MOON_SEND_SHARE = 0.2;

/**
 * The south pole often can't see Earth. NASA's LCRNS paper (2025): straight to Earth a south-pole site has 17–43%
 * coverage; one relay satellite makes it 80–86%. Game estimates built on those: a Spacecraft there sends Data this
 * share of the time on its own, or with the Company's relay in lunar orbit.
 */
export const SOUTH_POLE_LINK = { alone: 0.3, relay: 0.85 } as const;

/**
 * Ground Stations (Era 2): the Company's own antennas on its Site. Each one adds this much to what every
 * Spacecraft's antenna can send home, times its level's boost (`levelBoost`): one level 1 station doubles it.
 * Without one, Spacecraft use the stations they borrow (×1). Game estimate.
 */
export const GROUND_STATION_STEP = 1;

/**
 * Rideshare price per kilogram of Spacecraft, by Launch Vehicle. Game estimate: no per-kg price was ever
 * published for Juno I. Set so Explorer 1 (11.5 kg) costs about $460K to launch, well inside the $3M reward.
 * For scale, 2026 rideshare costs about $7,000/kg (docs/research/launch-vehicles.md).
 */
export const RIDESHARE_PER_KG = {
  juno1: 40_000,
  // A bigger rocket: cheaper per kilogram. Game estimate.
  thorAble: 25_000,
  thorDelta: 20_000,
  // Delta D mostly flew to geostationary orbit, which costs more per kilogram. Game estimate.
  deltaD: 30_000,
} as const;

/**
 * What the whole rocket costs, for a Contract whose client pays for its own Launch (Telstar 1). AT&T paid NASA
 * $2,680,982 in advance for Telstar 1's Thor-Delta (docs/research/milestones.md). Delta D's is a game estimate.
 */
export const LAUNCH_PRICE = {
  thorDelta: 2_700_000,
  deltaD: 3_500_000,
} as const;

/**
 * Shipping a finished Spacecraft from the Site to a Launch Site, by the straight-line distance (ticket 16).
 * Game estimates, chosen so the Historic start (JPL to Cape Canaveral, about 3,600 km) costs $25,000 and
 * takes 7 days, as before real places: a fixed $5,000 plus $5.60 a km, rounded to $1,000; one day on the road
 * per 650 km (rounded up), plus a day to load.
 */
export const SHIPPING = {
  baseCost: 5_000,
  perKm: 5.6,
  kmPerDay: 650,
  loadDays: 1,
} as const;

/**
 * Earth's spin helps a rocket launched east: the ground moves at 465 m/s at the equator, less nearer the
 * poles (docs/research/launch-sites-and-physics.md). Each 10 m/s more than at Cape Canaveral, where the
 * Launch Vehicles' lift figures were measured, lets a rocket carry 1% more. Game estimate.
 */
export const SPIN_LIFT_PER_MS = 0.001;

/**
 * Launch weather rules (ticket 16), loosely after real ones (docs/research/places-and-weather.md).
 * Game estimates: NASA POWER gives each day's strongest hourly wind at 10 m, and no lightning, so a day with
 * heavy rain and heat stands in for thunderstorms.
 */
export const LAUNCH_WEATHER = {
  /** Strongest wind at 10 m, m/s, over which the Launch is Scrubbed. */
  windLimitMs: 12,
  /** Rain (mm in the day) and top temperature (°C) that together mean thunderstorms: Scrub for lightning. */
  stormRainMm: 10,
  stormHotC: 24,
  /** Days the Launch Window advisor looks ahead. */
  adviseDays: 14,
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

/**
 * Stuck solar panel: how likely, by the Mark of the Solar Cells. Cheap Mk 1 panels have the roughest hinges
 * and latches; better Factories make ones that open more surely. Only a Spacecraft with Solar Cells can meet it.
 * Game estimates.
 */
export const PANEL_CHANCE = { 1: 0.35, 2: 0.2, 3: 0.1 } as const;

/** Fold-out Solar Panels have more hinges and latches to stick than body-mounted Solar Cells: their chance times this. Game estimate. */
export const FOLD_OUT_PANEL_CHANCE = 1.3;

/**
 * Survive the eclipse: how likely, from the Power margin (the days the battery would last against the Mission's
 * days) and the battery's size. With no spare at all the chance is HIGH; with SAFE_SPARE (200% extra) or more,
 * or when sunlight alone covers the Spacecraft's use, it is LOW. A Small Battery adds SMALL_BATTERY on top: it
 * has less to fall back on in each pass through Earth's shadow. Only a Spacecraft with Solar Cells can meet it
 * (one on batteries alone works the same in sunlight and shadow). Game estimates.
 */
export const ECLIPSE_CHANCE = {
  low: 0.08,
  high: 0.6,
  safeSpare: 2,
  smallBattery: 0.12,
} as const;

/**
 * Ground Tests (ticket 40): optional tests of the Spacecraft on Earth before Shipping, after CubeSat 101 §6.9.
 * Each adds `days` to assembly, costs `cost`, and makes one Anomaly less likely: its chance is multiplied by
 * GROUND_TEST_CHANCE_LEFT. Game estimates, not real test durations or prices: a few days against 30–60 days of
 * assembly, and a small share of a Rideshare (about $460,000 for Explorer 1).
 */
export const GROUND_TESTS = {
  dayInTheLife: { days: 3, cost: 15_000 },
  vibration: { days: 5, cost: 25_000 },
  thermalVacuum: { days: 7, cost: 35_000 },
} as const;

/** Share of an Anomaly's chance left after its Ground Test: about half. Game estimate. */
export const GROUND_TEST_CHANCE_LEFT = 0.5;

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

// ---- Risk and failure (ticket 17) ----

/**
 * How often each Launch Vehicle gets the Spacecraft to orbit, when the Spacecraft is light enough.
 * Real records (docs/research/launch-vehicles.md): Juno I reached orbit 3 times in 6 (1958); Thor-Able worked
 * 10 times in 16 (1958–1960). The game fails rockets less often than history did, so the design matters most:
 * each real failure share is cut to 40% of itself. Game estimates.
 */
export const ROCKET_RELIABILITY = {
  juno1: 0.8,
  thorAble: 0.85,
  // Thor-Delta: 11 of 12 worked (1960–1962). Delta D: 2 of 2 (1964–1965); the game gives it Thor-Delta's odds,
  // since two flights can't show a rocket never fails.
  thorDelta: 0.97,
  deltaD: 0.97,
  // Saturn V: every one of its 13 launches reached orbit (verify); SLS: 2 of 2. Game estimates kept below perfect.
  saturnV: 0.98,
  sls: 0.97,
} as const;

/**
 * Launch Insurance (game estimates). It pays back `payoutShare` of the Rideshare and Shipping if the Mission
 * fails. The price is the payout times the chance of failure (from the Test Run) times `margin`, never less
 * than `minShare` of the payout, rounded to $1,000. Below `minSuccess` estimated success nobody will insure it.
 */
export const INSURANCE = {
  payoutShare: 0.8,
  margin: 1.3,
  minShare: 0.03,
  minSuccess: 0.5,
} as const;

/**
 * The one-time startup grant (game estimates): when the Company's money falls below `belowMoney` with no
 * Mission on its way, it gets `amount`, once per game.
 */
export const STARTUP_GRANT = {
  belowMoney: 300_000,
  amount: 1_000_000,
} as const;
