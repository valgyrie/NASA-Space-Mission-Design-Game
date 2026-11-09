/**
 * Point the antenna, the mini-game. The Spacecraft hangs above Earth; its antenna's beam has turned away
 * from the Ground Station, which slides across below as Earth turns. The player turns the antenna back and
 * holds the beam on the station until the signal locks, before contact is lost.
 *
 * Angles are in degrees from straight down (0 points at the ground right below), positive to the right.
 * Pure and step-by-step, so it is tested without a screen.
 */

/** Seconds before contact is lost. */
export const ANTENNA_TIME_S = 15;
/** Seconds the beam must stay on the Ground Station to lock. */
export const ANTENNA_HOLD_S = 2;
/** Locked by this many seconds scores 100%; the score falls to 0 at the time limit. */
export const ANTENNA_PAR_S = 4;
/** Half the beam's width: the station is in the beam within this many degrees. */
export const BEAM_HALF_DEG = 9;
/** How fast the antenna turns towards where the player points, degrees a second. */
export const TURN_DEG_S = 100;
/** The Ground Station slides from this angle on one side to the other over the time limit. */
const STATION_FROM_DEG = 38;
/** The Spacecraft spins, so the antenna wobbles a little: the player must keep correcting. */
const WOBBLE_DEG_S = 30;
/** The signal drains this many times slower than it builds when the beam slips off. */
const DRAIN_SHARE = 0.5;
/** Where the beam points when the Anomaly starts: well away from the station. */
const START_AIM_DEG = -65;
/** The most the antenna can turn either way. */
export const AIM_MAX_DEG = 85;

export interface AntennaGame {
  /** Where the antenna points. */
  aimDeg: number;
  /** Where the player wants it to point. */
  wantDeg: number;
  elapsedS: number;
  /** Seconds of signal built up towards the lock. */
  lockS: number;
  /** Seconds after the start that the signal locked, or null. */
  lockedAtS: number | null;
  /** Locked, contact lost, or still going. */
  state: 'playing' | 'won' | 'lost';
  /** The direction the Ground Station drifts: 1 left to right, −1 right to left. */
  drift: 1 | -1;
}

export function newAntennaGame(drift: 1 | -1 = -1): AntennaGame {
  return { aimDeg: START_AIM_DEG * -drift, wantDeg: START_AIM_DEG * -drift, elapsedS: 0, lockS: 0, lockedAtS: null, state: 'playing', drift };
}

/** Where the Ground Station is, seen from the Spacecraft, at a moment of the game. */
export function stationDeg(g: Pick<AntennaGame, 'drift'>, elapsedS: number): number {
  const share = Math.min(1, elapsedS / ANTENNA_TIME_S);
  return -g.drift * STATION_FROM_DEG + g.drift * 2 * STATION_FROM_DEG * share;
}

export const onStation = (g: AntennaGame): boolean => Math.abs(g.aimDeg - stationDeg(g, g.elapsedS)) <= BEAM_HALF_DEG;

const clampAim = (deg: number) => Math.max(-AIM_MAX_DEG, Math.min(AIM_MAX_DEG, deg));

/** Point the antenna towards `deg` (from the mouse, or keys). */
export function aimAt(g: AntennaGame, deg: number): void {
  g.wantDeg = clampAim(deg);
}

/** Move the game on by `dt` seconds. */
export function stepAntenna(g: AntennaGame, dt: number): void {
  if (g.state !== 'playing' || dt <= 0) return;
  g.elapsedS = Math.min(ANTENNA_TIME_S, g.elapsedS + dt);
  const turn = TURN_DEG_S * dt;
  const gap = g.wantDeg - g.aimDeg;
  g.aimDeg += Math.max(-turn, Math.min(turn, gap));
  g.aimDeg = clampAim(g.aimDeg + Math.sin(g.elapsedS * 2.3) * WOBBLE_DEG_S * dt);
  if (onStation(g)) g.lockS = Math.min(ANTENNA_HOLD_S, g.lockS + dt);
  else g.lockS = Math.max(0, g.lockS - dt * DRAIN_SHARE);
  if (g.lockS >= ANTENNA_HOLD_S) {
    g.state = 'won';
    g.lockedAtS = g.elapsedS;
  } else if (g.elapsedS >= ANTENNA_TIME_S) {
    g.state = 'lost';
  }
}

/** The score, 0–1: 100% for a lock by the par time, less the longer it took, 0 if contact was lost. */
export function antennaScore(g: AntennaGame): number {
  if (g.state !== 'won' || g.lockedAtS === null) return 0;
  return Math.max(0, Math.min(1, (ANTENNA_TIME_S - g.lockedAtS) / (ANTENNA_TIME_S - ANTENNA_PAR_S)));
}
