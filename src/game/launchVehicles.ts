import { LAUNCH_PRICE, RIDESHARE_PER_KG, ROCKET_RELIABILITY, SPIN_LIFT_PER_MS } from './balance';
import type { ContractId, Orbit } from './contracts';
import { type Era, eraOf } from './eras';
import type { SiteState } from './siteState';

/**
 * Launch Vehicles the Company can book a Rideshare on, and the Launch Sites it ships to.
 * Era 1 has Juno I, then Thor-Able; Era 2 has Thor-Delta and Delta D, all from Cape Canaveral.
 * Capacities: docs/research/launch-vehicles.md.
 */
export const LAUNCH_VEHICLE_IDS = ['juno1', 'thorAble', 'thorDelta', 'deltaD'] as const;
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
  record: { worked: number; flights: number };
}

export const LAUNCH_VEHICLES: Record<LaunchVehicleId, LaunchVehicle> = {
  // Enough for Explorer 1 (13.97 kg); no direct capacity figure found yet (verify).
  // Four stages, 21.2 m. A Redstone-based first stage, then a spinning tub of small solid motors (11, 3, then 1),
  // fired one after another at the top of the climb. docs/research/launch-vehicles.md.
  juno1: {
    id: 'juno1',
    liftKg: { lowEarthOrbit: 14, geostationary: 0 },
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
    liftKg: { lowEarthOrbit: 120, geostationary: 0 },
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
    liftKg: { lowEarthOrbit: 226, geostationary: 45 },
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
    lastFlight: 1962,
  },
  // Delta D (Thrust Augmented Delta): 32 m, a Thor (150 s) with three Castor solid boosters strapped on (27 s),
  // the Delta D second stage (170 s) and an Altair 2 third stage (28 s). 450 kg to Low Earth Orbit, 104 kg to a
  // geostationary transfer orbit (Astronautix). 2 flights, both worked: Syncom 3 (1964) and Intelsat I (1965).
  deltaD: {
    id: 'deltaD',
    liftKg: { lowEarthOrbit: 450, geostationary: 104 },
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
    lastFlight: 1965,
  },
};

/** Whether the Company can book a Launch Vehicle now, and if not, why: too early in history, or retired. */
export type VehicleStatus =
  | { open: true }
  | { open: false; why: 'after'; contract: ContractId }
  | { open: false; why: 'era'; era: Era }
  | { open: false; why: 'retired'; year: number };

export function vehicleStatus(state: Pick<SiteState, 'completed' | 'hq'>, id: LaunchVehicleId): VehicleStatus {
  const v = LAUNCH_VEHICLES[id];
  const era = eraOf(state);
  if (era < v.era) return { open: false, why: 'era', era: v.era };
  if (v.lastEra !== undefined && era > v.lastEra) return { open: false, why: 'retired', year: v.lastFlight };
  if (v.opensAfter && !state.completed.includes(v.opensAfter)) return { open: false, why: 'after', contract: v.opensAfter };
  return { open: true };
}

/** The Company can book this Launch Vehicle: it is out of the factory by now in history, and not retired yet. */
export function isVehicleOpen(state: Pick<SiteState, 'completed' | 'hq'>, id: LaunchVehicleId): boolean {
  return vehicleStatus(state, id).open;
}

/** The first Launch Vehicle the Company can book, for when its pick has retired. */
export function firstOpenVehicle(state: Pick<SiteState, 'completed' | 'hq'>): LaunchVehicleId {
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

export const LAUNCH_SITE_IDS = ['capeCanaveral', 'wallops'] as const;
export type LaunchSiteId = (typeof LAUNCH_SITE_IDS)[number];

export interface LaunchSite {
  id: LaunchSiteId;
  /** Where the launch pad is, in degrees (north and east positive). */
  lat: number;
  lon: number;
  /** Not where these rockets really flew from: an alternate-history choice, labelled as such. */
  alternate?: boolean;
}

/**
 * Cape Canaveral, Florida: Explorer 1 (LC-26) and TIROS-1 launched from here (docs/research/milestones.md).
 * Wallops Island, Virginia: a real NASA launch site further north; Juno I and Thor-Able never flew from it, so it
 * is alternate history (docs/research/places-and-weather.md).
 */
export const LAUNCH_SITES: Record<LaunchSiteId, LaunchSite> = {
  capeCanaveral: { id: 'capeCanaveral', lat: 28.44, lon: -80.57 },
  wallops: { id: 'wallops', lat: 37.84, lon: -75.48, alternate: true },
};
