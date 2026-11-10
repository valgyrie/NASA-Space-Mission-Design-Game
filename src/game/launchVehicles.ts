import { RIDESHARE_PER_KG, SHIPPING } from './balance';
import type { ContractId, Orbit } from './contracts';
import type { SiteState } from './siteState';

/**
 * Launch Vehicles the Company can book a Rideshare on, and the Launch Sites it ships to.
 * Era 1 has Juno I, then Thor-Able, from Cape Canaveral. Capacities: docs/research/launch-vehicles.md.
 */
export const LAUNCH_VEHICLE_IDS = ['juno1', 'thorAble'] as const;
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
  /** Most Spacecraft mass it can put into each orbit, in kilograms. */
  liftKg: Record<Orbit, number>;
  /** Rideshare price for each kilogram of Spacecraft. */
  perKg: number;
  /** The last stage stays on the Spacecraft in orbit, as Juno I's did with Explorer 1. */
  lastStageStays?: boolean;
  /** Bookable only once this Milestone is done; offered from the start when missing. */
  opensAfter?: ContractId;
}

export const LAUNCH_VEHICLES: Record<LaunchVehicleId, LaunchVehicle> = {
  // Enough for Explorer 1 (13.97 kg); no direct capacity figure found yet (verify).
  // Four stages, 21.2 m. A Redstone-based first stage, then a spinning tub of small solid motors (11, 3, then 1),
  // fired one after another at the top of the climb. docs/research/launch-vehicles.md.
  juno1: {
    id: 'juno1',
    liftKg: { lowEarthOrbit: 14 },
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
  },
  // Thor-Able: 120 kg to a 640 km orbit; 26.9–27.8 m tall. A Thor first stage (165 s), the Able second stage
  // (AJ10, 115 s) and an Altair solid third stage (38 s). It launched TIROS-1 on 1 April 1960. First flew
  // 24 April 1958, so it opens after Explorer 1. The short coast between the first two stages is a game estimate.
  thorAble: {
    id: 'thorAble',
    liftKg: { lowEarthOrbit: 120 },
    perKg: RIDESHARE_PER_KG.thorAble,
    heightM: 27,
    stages: [
      { motors: 1, burnS: 165 },
      { motors: 1, burnS: 115 },
      { motors: 1, burnS: 38 },
    ],
    coastS: 10,
    opensAfter: 'explorer1',
  },
};

/** The Company can book this Launch Vehicle: it is out of the factory by now in history. */
export function isVehicleOpen(state: Pick<SiteState, 'completed'>, id: LaunchVehicleId): boolean {
  const after = LAUNCH_VEHICLES[id].opensAfter;
  return !after || state.completed.includes(after);
}

/** What a Rideshare costs: the Launch Vehicle's price times the Spacecraft's mass. */
export function rideshareCost(vehicle: LaunchVehicleId, massKg: number): number {
  return Math.round(LAUNCH_VEHICLES[vehicle].perKg * massKg);
}

export const LAUNCH_SITE_IDS = ['capeCanaveral'] as const;
export type LaunchSiteId = (typeof LAUNCH_SITE_IDS)[number];

export interface LaunchSite {
  id: LaunchSiteId;
  /** Dollars to ship a finished Spacecraft there from the Site. */
  shippingCost: number;
  /** Game days on the road. */
  shippingDays: number;
}

/** Cape Canaveral, Florida: Explorer 1 launched from here on Juno I (docs/research/milestones.md). */
export const LAUNCH_SITES: Record<LaunchSiteId, LaunchSite> = {
  capeCanaveral: { id: 'capeCanaveral', shippingCost: SHIPPING.capeCanaveral.cost, shippingDays: SHIPPING.capeCanaveral.days },
};
