import { RIDESHARE_PER_KG, SHIPPING } from './balance';
import type { Orbit } from './contracts';

/**
 * Launch Vehicles the Company can book a Rideshare on, and the Launch Sites it ships to.
 * Era 1 has only Juno I from Cape Canaveral. Capacities: docs/research/launch-vehicles.md.
 */
export const LAUNCH_VEHICLE_IDS = ['juno1'] as const;
export type LaunchVehicleId = (typeof LAUNCH_VEHICLE_IDS)[number];

export interface LaunchVehicle {
  id: LaunchVehicleId;
  /** Most Spacecraft mass it can put into each orbit, in kilograms. */
  liftKg: Record<Orbit, number>;
  /** Rideshare price for each kilogram of Spacecraft. */
  perKg: number;
}

export const LAUNCH_VEHICLES: Record<LaunchVehicleId, LaunchVehicle> = {
  // Enough for Explorer 1 (13.97 kg); no direct capacity figure found yet (verify).
  juno1: { id: 'juno1', liftKg: { lowEarthOrbit: 14 }, perKg: RIDESHARE_PER_KG.juno1 },
};

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
