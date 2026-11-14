import { type Segment, flightShow } from './ascent';
import { LAUNCH_VEHICLE_IDS, type LaunchVehicleId } from './launchVehicles';

/** The Launch played behind the main menu: which rocket, and which part of the show. */

/** Seconds on the pad before liftoff, longer than in a real Launch show so the rocket can be seen. */
export const TITLE_COUNTDOWN_S = 6;

/** A rocket other than the last one, so two Launches in a row are never the same. */
export function pickRocket(previous: LaunchVehicleId | null, random = Math.random): LaunchVehicleId {
  const choices = LAUNCH_VEHICLE_IDS.filter((id) => id !== previous);
  return choices[Math.floor(random() * choices.length)] ?? LAUNCH_VEHICLE_IDS[0];
}

/** The Launch show from the pad to the last stage's burn, with a longer wait on the pad. Never reaches orbit. */
export function titleShow(vehicle: LaunchVehicleId): Segment[] {
  const show = flightShow(vehicle, { findings: [], missionDays: 1 });
  const end = show.findIndex((s) => s.phase === 'orbit');
  const climb = show.slice(1, end < 0 ? undefined : end);
  return [{ phase: 'countdown', from: -TITLE_COUNTDOWN_S, to: 0, playS: TITLE_COUNTDOWN_S }, ...climb];
}
