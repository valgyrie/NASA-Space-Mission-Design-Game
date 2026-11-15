import type { Flight } from './flight';
import { type MoonShowSpec, moonShowLength } from '../world/moonShow';
import { LAUNCH_VEHICLES, type LaunchVehicleId } from './launchVehicles';

/**
 * The Launch as it plays on screen: countdown, each stage burning, the coast, orbit, then the Mission's
 * days. Real flight times are squeezed into about a minute and a half, so the player can watch it all;
 * the outcome is the Flight already worked out by flight.ts, never decided here.
 */

export type ShowPhase = 'countdown' | 'burn' | 'coast' | 'orbit' | 'moon' | 'mission' | 'lost' | 'end';

/** One stretch of the show. `from`–`to` are flight seconds (T+), or Mission days for 'mission'. */
export interface Segment {
  phase: ShowPhase;
  /** Which stage is burning (1 is the bottom one), for 'burn'. */
  stage?: number;
  /** For 'lost': the rocket worked, but with no main engine the Spacecraft stayed in its transfer orbit. */
  stuck?: boolean;
  /**
   * For 'moon': which Moon sequence plays (Apollo 11's landing, Artemis II's flyby, ...). `from`–`to` are seconds
   * of that sequence (0 to its length), so `ShowMoment.value` is the sequence's own clock. See src/world/moonShow.ts.
   */
  moon?: MoonShowSpec;
  from: number;
  to: number;
  /** Seconds it takes on screen at normal speed. */
  playS: number;
}

/** Seconds of countdown shown before liftoff. */
export const COUNTDOWN_S = 3;
/** Screen seconds for the first stage's whole burn. */
const FIRST_STAGE_PLAY_S = 22;
/** Screen seconds for the coast to the top of the climb. */
const COAST_PLAY_S = 9;
/** Screen seconds for each upper stage. */
const UPPER_STAGE_PLAY_S = 3.5;
/** Screen seconds to look at the new orbit before the Mission's days start. */
const ORBIT_PLAY_S = 4;
/** Screen seconds for each Mission day, and the most the days may take in all. */
const DAY_PLAY_S = 1.3;
const MISSION_PLAY_MAX_S = 45;
/** Screen seconds to hold the last moment before the Mission Report. */
const END_PLAY_S = 3;

/**
 * The show for one flight. With `moon` (the Contract's Moon sequence) a 'moon' segment plays after 'orbit', its
 * `value` the sequence's own seconds. A Spacecraft too heavy to reach orbit stops after the last stage; when a rocket
 * stage fails, the show stops half-way through that stage's burn ('lost' then carries the stage).
 */
export function flightShow(vehicle: LaunchVehicleId, flight: Pick<Flight, 'findings' | 'missionDays'>, moon?: MoonShowSpec): Segment[] {
  const lv = LAUNCH_VEHICLES[vehicle];
  const segments: Segment[] = [{ phase: 'countdown', from: -COUNTDOWN_S, to: 0, playS: COUNTDOWN_S }];
  const orbit = flight.findings.find((f) => f.kind === 'orbit');
  const failed = orbit?.kind === 'orbit' ? (orbit.failedStage ?? null) : null;
  let t = 0;
  lv.stages.forEach((s, i) => {
    if (failed !== null && i + 1 > failed) return;
    if (i === 1) {
      segments.push({ phase: 'coast', from: t, to: t + lv.coastS, playS: COAST_PLAY_S });
      t += lv.coastS;
    }
    const share = failed === i + 1 ? 0.5 : 1;
    const playS = (i === 0 ? FIRST_STAGE_PLAY_S : UPPER_STAGE_PLAY_S) * share;
    segments.push({ phase: 'burn', stage: i + 1, from: t, to: t + s.burnS * share, playS });
    t += s.burnS * share;
  });
  const reachedOrbit = orbit?.ok ?? true;
  if (!reachedOrbit) {
    const stuck = orbit?.kind === 'orbit' && !!orbit.noEngine;
    segments.push({ phase: 'lost', ...(failed !== null ? { stage: failed } : {}), ...(stuck ? { stuck } : {}), from: t, to: t, playS: ORBIT_PLAY_S });
    return segments;
  }
  segments.push({ phase: 'orbit', from: t, to: t, playS: ORBIT_PLAY_S });
  // A Mission to or near the Moon (and Artemis III's docking) plays its Moon sequence before the Mission's days.
  if (moon) {
    const length = moonShowLength(moon);
    segments.push({ phase: 'moon', moon, from: 0, to: length, playS: length });
  }
  const days = flight.missionDays;
  segments.push({ phase: 'mission', from: 0, to: days, playS: Math.min(MISSION_PLAY_MAX_S, days * DAY_PLAY_S) });
  segments.push({ phase: 'end', from: days, to: days, playS: END_PLAY_S });
  return segments;
}

/** Screen seconds the whole show takes at normal speed. */
export function showLength(segments: readonly Segment[]): number {
  return segments.reduce((sum, s) => sum + s.playS, 0);
}

/** Where the show is after `seconds` on screen at normal speed. */
export interface ShowMoment {
  segment: Segment;
  index: number;
  /** How far through this segment, 0–1. */
  fraction: number;
  /** Flight seconds (T+) or Mission day, depending on the segment. */
  value: number;
  /** The show is over: time for the Mission Report. */
  done: boolean;
}

export function showAt(segments: readonly Segment[], seconds: number): ShowMoment {
  let left = Math.max(0, seconds);
  for (let index = 0; index < segments.length; index++) {
    const segment = segments[index]!;
    if (left < segment.playS) {
      const fraction = segment.playS > 0 ? left / segment.playS : 1;
      return { segment, index, fraction, value: segment.from + (segment.to - segment.from) * fraction, done: false };
    }
    left -= segment.playS;
  }
  const index = segments.length - 1;
  const segment = segments[index]!;
  return { segment, index, fraction: 1, value: segment.to, done: true };
}

/** The flight seconds at which each stage starts and stops burning, from the bottom up. */
export function stageTimes(vehicle: LaunchVehicleId): { start: number; end: number }[] {
  const lv = LAUNCH_VEHICLES[vehicle];
  const times: { start: number; end: number }[] = [];
  let t = 0;
  lv.stages.forEach((s, i) => {
    if (i === 1) t += lv.coastS;
    times.push({ start: t, end: t + s.burnS });
    t += s.burnS;
  });
  return times;
}

/** Screen seconds (at normal speed) from the start of the show to a Mission day. */
export function secondsAtDay(segments: readonly Segment[], day: number): number {
  let seconds = 0;
  for (const s of segments) {
    if (s.phase === 'mission') return seconds + (s.to > s.from ? ((day - s.from) / (s.to - s.from)) * s.playS : 0);
    seconds += s.playS;
  }
  return seconds;
}
