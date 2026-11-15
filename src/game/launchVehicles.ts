import { LAUNCH_PRICE, RIDESHARE_PER_KG, ROCKET_RELIABILITY, SPIN_LIFT_PER_MS } from './balance';
import { type ContractId, type Orbit, contractById } from './contracts';
import { type Era, eraOf } from './eras';
import type { SiteState } from './siteState';

/**
 * Launch Vehicles the Company can book a Rideshare on, and the Launch Sites it ships to.
 * Era 1 has Juno I, then Thor-Able; Era 2 has Thor-Delta and Delta D, all from Cape Canaveral. Era 3 has NASA's
 * Saturn V (Kennedy LC-39A) and the Artemis Era NASA's SLS (LC-39B): NASA's own rockets, which carry only what NASA
 * puts on them (`nasaOnly`). Capacities: docs/research/launch-vehicles.md and docs/research/eras-3-5.md.
 */
export const LAUNCH_VEHICLE_IDS = ['juno1', 'thorAble', 'thorDelta', 'deltaD', 'falcon9', 'saturnV', 'sls'] as const;
export type LaunchVehicleId = (typeof LAUNCH_VEHICLE_IDS)[number];

/** One stage of a Launch Vehicle, from the bottom up. */
export interface Stage {
  /** Rocket motors firing together in this stage. */
  motors: number;
  /** Seconds it burns. */
  burnS: number;
}

export interface LaunchVehicle {
  id: LaunchVehicleId;
  /** Height on the pad, in metres. */
  heightM: number;
  /** Stages from the bottom up. The first lifts off the pad; the rest fire one after another after the coast. */
  stages: Stage[];
  /** Seconds from the first stage running out to the next stage firing (an unpowered climb). */
  coastS: number;
  /**
   * Most Spacecraft mass it can put into each orbit, in kilograms; 0 where it can't go. For a geostationary
   * orbit, what it can put into the transfer orbit: the Spacecraft's own main engine does the rest.
   */
  liftKg: Record<Orbit, number>;
  /** Rideshare price for each kilogram of Spacecraft. */
  perKg: number;
  /** What the whole rocket costs, when the client pays for its own Launch (Telstar 1). */
  launchPrice?: number;
  /** Solid boosters strapped round the first stage, burning with it. */
  strapOns?: number;
  /** The Era it opens in, and the last Era it flies in (it retired after that). */
  era: Era;
  lastEra?: Era;
  /** The year of its last real flight, shown once it has retired. */
  lastFlight: number;
  /** The last stage stays on the Spacecraft in orbit, as Juno I's did with Explorer 1. */
  lastStageStays?: boolean;
  /** Bookable only once this Milestone is done; offered from the start when missing. */
  opensAfter?: ContractId;
  /** Share of Launches it gets a light enough Spacecraft to orbit, in the game. */
  reliability: number;
  /** Its real record: flights that worked out of all it made. */
  record?: { worked: number; flights: number };
  /** NASA's own rocket: it flies only a Contract that rides it (`Contract.ride`), never a Rideshare. */
  nasaOnly?: boolean;
}

/** No lift past low Earth orbit: the Era 1–2 rockets never flew far from Earth. */
const NEAR_EARTH = { highEarthOrbit: 0, lunarOrbit: 0, moonSurface: 0, lunarSouthPole: 0 } as const;

export const LAUNCH_VEHICLES: Record<LaunchVehicleId, LaunchVehicle> = {
  // Enough for Explorer 1 (13.97 kg); no direct capacity figure found yet (verify).
  // Four stages, 21.2 m. A Redstone-based first stage, then a spinning tub of small solid motors (11, 3, then 1),
  // fired one after another at the top of the climb. docs/research/launch-vehicles.md.
  juno1: {
    id: 'juno1',
    liftKg: { lowEarthOrbit: 14, geostationary: 0, ...NEAR_EARTH },
    perKg: RIDESHARE_PER_KG.juno1,
    heightM: 21.2,
    stages: [
      { motors: 1, burnS: 155 },
      { motors: 11, burnS: 6 },
      { motors: 3, burnS: 6 },
      { motors: 1, burnS: 6 },
    ],
    coastS: 247,
    lastStageStays: true,
    // 6 flights in 1958: Explorer 1, 3 and 4 reached orbit; Explorer 2, Explorer 5 and Beacon 1 didn't.
    reliability: ROCKET_RELIABILITY.juno1,
    record: { worked: 3, flights: 6 },
    era: 1,
    lastEra: 1,
    lastFlight: 1958,
  },
  // Thor-Able: 120 kg to a 640 km orbit; 26.9–27.8 m tall. A Thor first stage (165 s), the Able second stage
  // (AJ10, 115 s) and an Altair solid third stage (38 s). It launched TIROS-1 on 1 April 1960. First flew
  // 24 April 1958, so it opens after Explorer 1. The short coast between the first two stages is a game estimate.
  thorAble: {
    id: 'thorAble',
    liftKg: { lowEarthOrbit: 120, geostationary: 0, ...NEAR_EARTH },
    perKg: RIDESHARE_PER_KG.thorAble,
    heightM: 27,
    stages: [
      { motors: 1, burnS: 165 },
      { motors: 1, burnS: 115 },
      { motors: 1, burnS: 38 },
    ],
    coastS: 10,
    opensAfter: 'explorer1',
    // 16 flights, 1958–1960, 6 of them failures (three when the Altair third stage didn't fire).
    reliability: ROCKET_RELIABILITY.thorAble,
    record: { worked: 10, flights: 16 },
    era: 1,
    lastEra: 1,
    lastFlight: 1960,
  },
  // Thor-Delta (Delta DM-19): 31 m, a Thor first stage (165 s), the Delta second stage (AJ10-118, 115 s) and an
  // Altair solid third stage (38 s). 226 kg to Low Earth Orbit (Astronautix; Wikipedia says 270 kg), 45 kg to a
  // geostationary transfer orbit. 12 flights 1960–1962, 11 worked; it launched Telstar 1 from LC-17B.
  thorDelta: {
    id: 'thorDelta',
    liftKg: { lowEarthOrbit: 226, geostationary: 45, ...NEAR_EARTH },
    perKg: RIDESHARE_PER_KG.thorDelta,
    launchPrice: LAUNCH_PRICE.thorDelta,
    heightM: 31,
    stages: [
      { motors: 1, burnS: 165 },
      { motors: 1, burnS: 115 },
      { motors: 1, burnS: 38 },
    ],
    coastS: 10,
    reliability: ROCKET_RELIABILITY.thorDelta,
    record: { worked: 11, flights: 12 },
    era: 2,
    lastEra: 2,
    lastFlight: 1962,
  },
  // Delta D (Thrust Augmented Delta): 32 m, a Thor (150 s) with three Castor solid boosters strapped on (27 s),
  // the Delta D second stage (170 s) and an Altair 2 third stage (28 s). 450 kg to Low Earth Orbit, 104 kg to a
  // geostationary transfer orbit (Astronautix). 2 flights, both worked: Syncom 3 (1964) and Intelsat I (1965).
  deltaD: {
    id: 'deltaD',
    liftKg: { lowEarthOrbit: 450, geostationary: 104, ...NEAR_EARTH },
    perKg: RIDESHARE_PER_KG.deltaD,
    launchPrice: LAUNCH_PRICE.deltaD,
    strapOns: 3,
    heightM: 32,
    stages: [
      { motors: 1, burnS: 150 },
      { motors: 1, burnS: 170 },
      { motors: 1, burnS: 28 },
    ],
    coastS: 10,
    reliability: ROCKET_RELIABILITY.deltaD,
    record: { worked: 2, flights: 2 },
    era: 2,
    lastEra: 2,
    lastFlight: 1965,
  },
  // Full Thrust, expendable capacity. No landing sequence in this ticket. Sources and game estimates:
  // docs/research/launch-vehicles.md. Its real flight record changes, so no fixed record is claimed.
  // To the Moon: SpaceX publishes no figure. Intuitive Machines' IM-1 and IM-2 landers flew to the Moon on Falcon 9;
  // IM-1's Nova-C weighed 1,908 kg at launch (NSSDCA, docs/research/eras-3-5.md), rounded down as a cited lower bound.
  // High Earth orbit uses its geostationary transfer figure (game estimate: a similar climb).
  falcon9: {
    id: 'falcon9',
    liftKg: { lowEarthOrbit: 22_800, geostationary: 8_300, highEarthOrbit: 8_300, lunarOrbit: 1_900, moonSurface: 1_900, lunarSouthPole: 1_900 },
    perKg: 7_000,
    heightM: 70,
    stages: [{ motors: 9, burnS: 162 }, { motors: 1, burnS: 397 }],
    coastS: 3,
    reliability: 0.98,
    era: 5,
    lastFlight: 2026,
  },
  // Saturn V (Apollo 11, AS-506): 363 ft (110.6 m) with Apollo and its escape tower. S-IC, five F-1 engines, outboard
  // cutoff 161.6 s; S-II, five J-2, about 384 s; S-IVB, one J-2, about 147 s to Earth orbit. Its second burn
  // ("Off to the Moon", 346.8 s) plays in the Moon sequence. Lift: an Apollo-era NASA paper gives 270,000 lb
  // (122,000 kg) to Earth orbit and 100,000 lb (45,000 kg) to the Moon. NASA's own: the Apollo Contract's Launch costs
  // the Company nothing, and what fits in the Lunar Module is the Contract's limit (`ride.maxKg`).
  // 13 flights, 1967–1973, all successful; the last launched Skylab on 14 May 1973 (NASA). docs/research/eras-3-5.md.
  saturnV: {
    id: 'saturnV',
    liftKg: { lowEarthOrbit: 122_000, geostationary: 0, highEarthOrbit: 45_000, lunarOrbit: 45_000, moonSurface: 45_000, lunarSouthPole: 45_000 },
    perKg: 0,
    heightM: 110.6,
    stages: [
      { motors: 5, burnS: 162 },
      { motors: 5, burnS: 384 },
      { motors: 1, burnS: 147 },
    ],
    coastS: 2,
    reliability: ROCKET_RELIABILITY.saturnV,
    nasaOnly: true,
    era: 3,
    lastEra: 3,
    lastFlight: 1973,
  },
  // SLS Block 1 with Orion: 98.27 m (322.4 ft). Stage 1: the two five-segment solid boosters (about 126 s) with the
  // core stage's four RS-25 engines; stage 2: the core stage alone, to about 486 s after liftoff (its 480 s burn);
  // stage 3: the ICPS (one RL10), here its 30-second perigee raise into orbit. More than 27 t (59,525 lb) to the
  // Moon (NASA's SLS Reference Guide for Artemis II). Low Earth orbit: more than 95 t for Block 1 (NASA SLS fact sheet).
  // NASA's own, from Kennedy LC-39B on Mobile Launcher 1: CubeSats NASA picks ride free. 2 flights, both worked.
  sls: {
    id: 'sls',
    liftKg: { lowEarthOrbit: 95_000, geostationary: 0, highEarthOrbit: 27_000, lunarOrbit: 27_000, moonSurface: 27_000, lunarSouthPole: 27_000 },
    perKg: 0,
    strapOns: 2,
    heightM: 98.3,
    stages: [
      { motors: 4, burnS: 126 },
      { motors: 4, burnS: 360 },
      { motors: 1, burnS: 30 },
    ],
    coastS: 0,
    reliability: ROCKET_RELIABILITY.sls,
    record: { worked: 2, flights: 2 },
    nasaOnly: true,
    era: 5,
    lastFlight: 2026,
  },
};

/** Whether the Company can book a Launch Vehicle now, and if not, why: too early in history, or retired. */
export type VehicleStatus =
  | { open: true }
  | { open: false; why: 'after'; contract: ContractId }
  | { open: false; why: 'era'; era: Era }
  | { open: false; why: 'retired'; year: number }
  /** NASA's own rocket: it flies only a Contract that rides it. */
  | { open: false; why: 'nasa' }
  /** The Contract rides NASA's rocket, so no other one flies it. */
  | { open: false; why: 'ride'; vehicle: LaunchVehicleId };

type VehicleState = Pick<SiteState, 'completed' | 'hq'> & Partial<Pick<SiteState, 'contracts' | 'playMode'>>;

/** The NASA ride the Company's first accepted Contract has (the one the Mission Designer works on), if any. */
export function rideNow(state: Partial<Pick<SiteState, 'contracts'>>): { vehicle: LaunchVehicleId; site: LaunchSiteId } | null {
  const first = state.contracts?.[0];
  return first ? (contractById(first.id).ride ?? null) : null;
}

export function vehicleStatus(state: VehicleState, id: LaunchVehicleId): VehicleStatus {
  const v = LAUNCH_VEHICLES[id];
  const ride = rideNow(state);
  if (ride?.vehicle === id) return { open: true };
  const era = eraOf(state);
  if (era < v.era) return { open: false, why: 'era', era: v.era };
  if (v.lastEra !== undefined && era > v.lastEra) return { open: false, why: 'retired', year: v.lastFlight };
  if (ride) return { open: false, why: 'ride', vehicle: ride.vehicle };
  if (v.nasaOnly) return { open: false, why: 'nasa' };
  if (v.opensAfter && !state.completed.includes(v.opensAfter)) return { open: false, why: 'after', contract: v.opensAfter };
  return { open: true };
}

/** The Company can book this Launch Vehicle: it is out of the factory by now in history, and not retired yet. */
export function isVehicleOpen(state: VehicleState, id: LaunchVehicleId): boolean {
  return vehicleStatus(state, id).open;
}

/** The first Launch Vehicle the Company can book, for when its pick has retired. */
export function firstOpenVehicle(state: VehicleState): LaunchVehicleId {
  return LAUNCH_VEHICLE_IDS.find((id) => isVehicleOpen(state, id)) ?? LAUNCH_VEHICLE_IDS[0];
}

/** Metres a second the ground moves east at a latitude, from Earth's spin: 465 m/s at the equator. */
export function spinSpeed(lat: number): number {
  return 465.1 * Math.cos((lat * Math.PI) / 180);
}

/** How much more (above 1) or less a rocket lifts from this Launch Site than from Cape Canaveral. */
export function liftFactor(site: LaunchSiteId): number {
  const ref = spinSpeed(LAUNCH_SITES.capeCanaveral.lat);
  return 1 + (spinSpeed(LAUNCH_SITES[site].lat) - ref) * SPIN_LIFT_PER_MS;
}

/** Kilograms a Launch Vehicle can put into an orbit from a Launch Site, to the nearest 0.1 kg. */
export function liftFrom(vehicle: LaunchVehicleId, orbit: Orbit, site: LaunchSiteId): number {
  return Math.round(LAUNCH_VEHICLES[vehicle].liftKg[orbit] * liftFactor(site) * 10) / 10;
}

/** What a Rideshare costs: the Launch Vehicle's price times the Spacecraft's mass. */
export function rideshareCost(vehicle: LaunchVehicleId, massKg: number): number {
  return Math.round(LAUNCH_VEHICLES[vehicle].perKg * massKg);
}

/**
 * What the Launch costs: a Rideshare by the kilogram, or the whole rocket when the Contract's client pays for its
 * own Launch (Telstar 1). A rocket with no whole-rocket price falls back to the Rideshare.
 */
export function launchCost(vehicle: LaunchVehicleId, massKg: number, wholeLaunch = false): number {
  const price = LAUNCH_VEHICLES[vehicle].launchPrice;
  return wholeLaunch && price !== undefined ? price : rideshareCost(vehicle, massKg);
}

export const LAUNCH_SITE_IDS = ['capeCanaveral', 'wallops', 'kennedy39A', 'kennedy39B'] as const;
export type LaunchSiteId = (typeof LAUNCH_SITE_IDS)[number];

export interface LaunchSite {
  id: LaunchSiteId;
  /** Where the launch pad is, in degrees (north and east positive). */
  lat: number;
  lon: number;
  /** Not where these rockets really flew from: an alternate-history choice, labelled as such. */
  alternate?: boolean;
  /** NASA's own pad: only this rocket flies from it. */
  only?: LaunchVehicleId;
  /** The nearby Launch Site whose daily weather it shares. */
  weatherFrom?: 'capeCanaveral' | 'wallops';
}

/**
 * Cape Canaveral, Florida: Explorer 1 (LC-26) and TIROS-1 launched from here (docs/research/milestones.md).
 * Wallops Island, Virginia: a real NASA launch site further north; Juno I and Thor-Able never flew from it, so it
 * is alternate history (docs/research/places-and-weather.md).
 * Kennedy Space Center, Launch Complex 39: Pad 39A launched Apollo 11's Saturn V on 16 July 1969, Pad 39B launched
 * Artemis I and II on SLS. Coordinates rounded from NASA SP-4029's launch complex table. About 20 km from the
 * Cape's weather point, so they share its weather. docs/research/eras-3-5.md.
 */
export const LAUNCH_SITES: Record<LaunchSiteId, LaunchSite> = {
  capeCanaveral: { id: 'capeCanaveral', lat: 28.44, lon: -80.57 },
  wallops: { id: 'wallops', lat: 37.84, lon: -75.48, alternate: true },
  kennedy39A: { id: 'kennedy39A', lat: 28.608, lon: -80.604, only: 'saturnV', weatherFrom: 'capeCanaveral' },
  kennedy39B: { id: 'kennedy39B', lat: 28.627, lon: -80.621, only: 'sls', weatherFrom: 'capeCanaveral' },
};

/** Can this rocket fly from this Launch Site? NASA's pads take only their own rocket, and NASA's rockets only their pad. */
export function siteTakes(site: LaunchSiteId, vehicle: LaunchVehicleId): boolean {
  const only = LAUNCH_SITES[site].only;
  return only ? only === vehicle : !LAUNCH_VEHICLES[vehicle].nasaOnly;
}
