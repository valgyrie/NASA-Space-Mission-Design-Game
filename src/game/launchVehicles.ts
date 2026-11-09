import type { Orbit } from './contracts';

/**
 * Launch Vehicles the Company can rent (Rideshare). Era 1 has only Juno I; ticket 08 adds choosing one,
 * prices and the spaceport. Capacities: docs/research/launch-vehicles.md.
 */
export const LAUNCH_VEHICLE_IDS = ['juno1'] as const;
export type LaunchVehicleId = (typeof LAUNCH_VEHICLE_IDS)[number];

export interface LaunchVehicle {
  id: LaunchVehicleId;
  /** Most Spacecraft mass it can put into each orbit, in kilograms. */
  liftKg: Record<Orbit, number>;
}

export const LAUNCH_VEHICLES: Record<LaunchVehicleId, LaunchVehicle> = {
  // Enough for Explorer 1 (13.97 kg); no direct capacity figure found yet (verify).
  juno1: { id: 'juno1', liftKg: { lowEarthOrbit: 14 } },
};
