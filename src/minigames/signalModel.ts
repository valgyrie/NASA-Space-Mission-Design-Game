/**
 * Lost Signal: the model. A Voyager-style probe 19.9 billion km away (18.5 light-hours) has its antenna pointed
 * 2° off Earth after a bad command, as Voyager 2 did in July 2023 (docs/research/minigames.md). The player works
 * the loss-of-signal checklist: rule out a ground fault, shed power loads, wait for Canberra's 70 m dish (the
 * only one that can command it), find the faint carrier, send the high-power "shout", wait out the 37-hour
 * round trip, then confirm telemetry and restore the loads.
 *
 * Real: the distance, light time, the 2° offset, Canberra commanding, the inverse-square law, the DSN sites.
 * GAME ESTIMATES: the power budget, loads, reserve, temperatures, dB levels, Doppler offset, the elevation the
 * dish needs, the probe's direction in the sky and every timing not listed above. Pure, tested without a screen.
 */

// ---- Physics: light time and the inverse-square law -------------------------------------------------------

export const C_KM_S = 299_792.458;
/** Voyager 2's distance in July 2023 (NASA mission update). */
export const DISTANCE_KM = 19.9e9;
/** X-band downlink frequency, MHz (game estimate: deep-space X-band is near 8.4 GHz). */
export const DOWNLINK_MHZ = 8420;

/** One-way light time, hours. */
export const lightHours = (km: number): number => km / C_KM_S / 3600;
/** Free-space ("space") loss, dB: grows 20 dB per tenfold distance, so doubling it costs about 6 dB. */
export const spaceLossDb = (km: number, mhz: number): number => 20 * Math.log10(km) + 20 * Math.log10(mhz) + 32.45;
/** Extra loss going from distance d1 to d2 (inverse square), dB. */
export const inverseSquareDb = (d1: number, d2: number): number => 20 * Math.log10(d2 / d1);

/** One-way and round-trip light time, hours: NASA's figures for Voyager 2 (lightHours(DISTANCE_KM) is 18.4). */
export const ONE_WAY_H = 18.5;
export const ROUND_TRIP_H = 2 * ONE_WAY_H;

/** Carrier power at the 70 m dish with the antenna on Earth, dBm (game estimate). */
export const CARRIER_DBM = -155;
/** Lost to the 2° off-pointing, dB (game estimate). */
export const OFFPOINT_DB = 15;
/** Receiver noise: kT at a system temperature of 20 K (game estimate), dBm per hertz. */
export const NOISE_TEMP_K = 20;
export const noiseDbmHz = (kelvin: number): number => 10 * Math.log10(1.380649e-23 * kelvin) + 30;
/** Carrier-to-noise density, dB-Hz. */
export const cn0 = (carrierDbm: number): number => carrierDbm - noiseDbmHz(NOISE_TEMP_K);

// ---- The Deep Space Network ------------------------------------------------------------------------------

export const STATIONS = ['goldstone', 'madrid', 'canberra'] as const;
export type Station = (typeof STATIONS)[number];
/** Latitude and east longitude, degrees. */
export const STATION_SITE: Record<Station, { lat: number; lon: number }> = {
  goldstone: { lat: 35.43, lon: -116.89 },
  madrid: { lat: 40.43, lon: -4.25 },
  canberra: { lat: -35.4, lon: 148.98 },
};
/** The probe's declination: far south of the celestial equator (game estimate of Voyager 2's direction). */
export const PROBE_DEC = -57;
/** Degrees of Earth rotation per hour (sidereal). */
export const EARTH_DEG_H = 360 / 23.934;
/** The dish needs the probe this high for a strong uplink, degrees (game estimate). */
export const MIN_ELEVATION = 20;
/** Canberra's hour angle of the probe at the start, degrees: high in the sky and setting (game estimate). */
export const START_HOUR_ANGLE = 63;

const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

/** Hour angle of the probe seen from a station at game time h (hours), degrees in −180…180. */
export function hourAngle(station: Station, h: number): number {
  const lonOffset = STATION_SITE[station].lon - STATION_SITE.canberra.lon;
  const a = START_HOUR_ANGLE + lonOffset + EARTH_DEG_H * h;
  return ((((a + 180) % 360) + 360) % 360) - 180;
}

/** Elevation of the probe above a station's horizon at game time h, degrees. */
export function elevation(station: Station, h: number): number {
  const lat = rad(STATION_SITE[station].lat);
  const dec = rad(PROBE_DEC);
  const s = Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(rad(hourAngle(station, h)));
  return deg(Math.asin(s));
}

export const inView = (station: Station, h: number): boolean => elevation(station, h) >= MIN_ELEVATION;

/** The next stretch, from h on, when Canberra sees the probe high enough: [start, end] in hours. */
export function nextWindow(h: number): [number, number] {
  let a = h;
  while (!inView('canberra', a)) a += 0.01;
  let b = a;
  while (inView('canberra', b)) b += 0.01;
  return [a, b];
}

// ---- Power -----------------------------------------------------------------------------------------------

export const LOADS = ['plasma', 'magnetometer', 'cosmicRay', 'particles', 'instHeaters', 'lineHeater', 'backupHeater'] as const;
export type Load = (typeof LOADS)[number];
export const INSTRUMENTS: readonly Load[] = ['plasma', 'magnetometer', 'cosmicRay', 'particles'];
/** Watts per switchable load (game estimates). The backup heater was switched on by fault protection. */
export const LOAD_W: Record<Load, number> = { plasma: 15, magnetometer: 5, cosmicRay: 10, particles: 8, instHeaters: 20, lineHeater: 25, backupHeater: 30 };
/** Always on: computers and attitude control, receiver and transmitter, W (game estimate). */
export const FIXED_W = 145;
/** Output of the radioisotope power source, W (game estimate). */
export const RTG_W = 235;
/** Power reserve, Wh (game estimate): what covers the gap while loads exceed the RTG. */
export const RESERVE_WH = 150;
/** Extra power while the probe turns its antenna back, W and hours (game estimates). */
export const MANEUVER_W = 30;
export const MANEUVER_H = 1;
/** Bus voltage, V (game estimate). */
export const BUS_V = 30;

/** Propellant line: starts at, freezes at, and warms or cools by, °C and °C per hour (game estimates). */
export const LINE_START_C = 12;
export const LINE_FREEZE_C = 2;
export const LINE_RATE_C_H = 3;
/** Hours instruments can sit off and unheated before they are damaged (game estimate). */
export const INST_COLD_H = 4;

// ---- Time ------------------------------------------------------------------------------------------------

/** Game hours per real second: normal, and fast-forward while waiting. Normal is slow enough to read the console
 * before the reserve runs flat (about 26 s with nothing shed). */
export const RATE_H_S = 0.25;
export const FAST_H_S = 4;
/** Time each checklist action takes, hours (game estimates). */
export const CROSS_CHECK_H = 1;
export const WRONG_ACTION_H = 2;
export const WRONG_STATION_H = 1;
/** The shout takes this long to send, hours (game estimate); Canberra must see the probe for all of it. */
export const UPLINK_H = 1;

// ---- Carrier search --------------------------------------------------------------------------------------

/** Receiver tuning range, kHz from the predicted frequency (game estimate). */
export const TUNE_RANGE_KHZ = 40;
/** Within this of the carrier, the phase-locked loop can pull in (game estimate). */
export const LOCK_WINDOW_KHZ = 0.6;
/** Real seconds the receiver must stay close to lock. */
export const LOCK_S = 1.5;

export const STEPS = ['ground', 'power', 'station', 'carrier', 'shout', 'wait'] as const;
export type Step = (typeof STEPS)[number];

export interface SignalGame {
  hours: number;
  /** Real seconds played (for the drifting carrier). */
  realS: number;
  /** Index into STEPS of the step being worked; STEPS.length when all done. */
  step: number;
  loads: Record<Load, boolean>;
  reserveWh: number;
  minReserveWh: number;
  lineC: number;
  instColdH: number;
  instDamaged: boolean;
  /** Receiver tuning, kHz; the carrier's offset (unknown to the player). */
  tuneKHz: number;
  carrierKHz: number;
  lockS: number;
  locked: boolean;
  /** Station chosen for the uplink. */
  station: Station | null;
  shoutAt: number | null;
  telemetry: boolean;
  /** Fast-forward wanted by the player (only while waiting). */
  fast: boolean;
  mistakes: number;
  /** Things that happened since the view last looked (it clears this). */
  events: SignalEvent[];
  state: 'playing' | 'won' | 'lost';
  lostTo: 'power' | 'freeze' | 'window' | null;
}

export type SignalEvent =
  | 'crossChecked' | 'wrongAction' | 'powerOk' | 'wrongStation' | 'notYet' | 'assigned' | 'locked'
  | 'notLocked' | 'tooLate' | 'shoutSent' | 'arrived' | 'telemetry' | 'restored' | 'instDamaged' | 'lineCold'
  | 'noData' | 'needInstruments' | 'needMargin';

/** `seed` 0–1 picks the carrier's Doppler offset. */
export function newSignalGame(seed = Math.random()): SignalGame {
  const sign = seed < 0.5 ? -1 : 1;
  return {
    hours: 0,
    realS: 0,
    step: 0,
    loads: { plasma: true, magnetometer: true, cosmicRay: true, particles: true, instHeaters: true, lineHeater: true, backupHeater: true },
    reserveWh: RESERVE_WH,
    minReserveWh: RESERVE_WH,
    lineC: LINE_START_C,
    instColdH: 0,
    instDamaged: false,
    tuneKHz: 0,
    carrierKHz: sign * (12 + ((seed * 2) % 1) * 22),
    lockS: 0,
    locked: false,
    station: null,
    shoutAt: null,
    telemetry: false,
    fast: false,
    mistakes: 0,
    events: [],
    state: 'playing',
    lostTo: null,
  };
}

export const stepName = (g: SignalGame): Step | null => STEPS[g.step] ?? null;
const at = (g: SignalGame, s: Step) => g.state === 'playing' && stepName(g) === s;

/** Power the probe uses now, W. */
export function loadW(g: SignalGame): number {
  let w = FIXED_W + LOADS.reduce((sum, l) => sum + (g.loads[l] ? LOAD_W[l] : 0), 0);
  if (maneuvering(g)) w += MANEUVER_W;
  return w;
}
export const marginW = (g: SignalGame): number => RTG_W - loadW(g);
/** The probe turning its antenna back: from when the shout arrives, for MANEUVER_H. */
export const maneuvering = (g: SignalGame): boolean => g.shoutAt !== null && g.hours >= g.shoutAt + UPLINK_H + ONE_WAY_H && g.hours < g.shoutAt + UPLINK_H + ONE_WAY_H + MANEUVER_H;
/** Antenna pointing error, degrees: 2 until the command arrives. */
export const pointingDeg = (g: SignalGame): number => (g.shoutAt !== null && g.hours >= g.shoutAt + UPLINK_H + ONE_WAY_H + MANEUVER_H ? 0 : 2);
/** Bus voltage (game model): steady while the RTG covers the loads, sagging as the reserve drains. */
export function busV(g: SignalGame): number {
  const m = marginW(g);
  if (m >= 0) return BUS_V;
  const sag = Math.min(1.5, -m * 0.03) + 2.5 * (1 - g.reserveWh / RESERVE_WH) ** 2;
  return BUS_V - sag;
}
/** Carrier power the ground hears, dBm: faint while the antenna is 2° off. */
export const carrierDbm = (g: SignalGame): number => CARRIER_DBM - (g.telemetry ? 0 : OFFPOINT_DB);
export const instrumentsOn = (g: SignalGame): number => INSTRUMENTS.filter((l) => g.loads[l]).length;
/** Hours left in the current Canberra window, or 0 if it can't see the probe. */
export function windowLeftH(g: SignalGame): number {
  if (!inView('canberra', g.hours)) return 0;
  return nextWindow(g.hours)[1] - g.hours;
}

/** Switch a load. The view refuses nothing: shedding the wrong one has consequences. */
export function toggleLoad(g: SignalGame, l: Load): boolean {
  if (g.state !== 'playing') return false;
  g.loads[l] = !g.loads[l];
  advance(g);
  return true;
}

/** Step 1: ask a second antenna to listen (right) or restart our own receiver (a wrong guess). */
export function checkGround(g: SignalGame, how: 'crossCheck' | 'restart'): boolean {
  if (!at(g, 'ground')) return false;
  if (how === 'restart') {
    g.mistakes++;
    pass(g, WRONG_ACTION_H);
    g.events.push('wrongAction');
    return false;
  }
  pass(g, CROSS_CHECK_H);
  g.events.push('crossChecked');
  g.step++;
  advance(g);
  return true;
}

/** Step 3: choose the station for the uplink. */
export function assignStation(g: SignalGame, s: Station): 'assigned' | 'wrong' | 'notYet' | null {
  if (!at(g, 'station')) return null;
  if (s !== 'canberra') {
    g.mistakes++;
    pass(g, WRONG_STATION_H);
    g.events.push('wrongStation');
    return 'wrong';
  }
  if (!inView('canberra', g.hours)) {
    g.events.push('notYet');
    return 'notYet';
  }
  g.station = 'canberra';
  g.events.push('assigned');
  g.step++;
  return 'assigned';
}

/** Step 4: tune the receiver, kHz. */
export function tune(g: SignalGame, by: number): void {
  if (g.state !== 'playing' || g.locked) return;
  g.tuneKHz = Math.max(-TUNE_RANGE_KHZ, Math.min(TUNE_RANGE_KHZ, g.tuneKHz + by));
}
export function tuneTo(g: SignalGame, khz: number): void {
  tune(g, khz - g.tuneKHz);
}

/** The carrier's frequency right now, kHz: it drifts a little (Doppler). */
export const carrierNow = (g: SignalGame): number => (g.locked ? g.tuneKHz : g.carrierKHz + 0.4 * Math.sin(g.realS * 0.3));

/** Step 5: send the shout. Needs carrier lock and enough of Canberra's window left. */
export function shout(g: SignalGame): 'sent' | 'notLocked' | 'tooLate' | null {
  if (!at(g, 'shout')) return null;
  if (!g.locked) {
    g.events.push('notLocked');
    return 'notLocked';
  }
  if (windowLeftH(g) < UPLINK_H) {
    g.mistakes++;
    g.events.push('tooLate');
    return 'tooLate';
  }
  g.shoutAt = g.hours;
  g.events.push('shoutSent');
  g.step++;
  return 'sent';
}

/** Hours until telemetry returns, once the shout is sent (round trip after the uplink). */
export const returnInH = (g: SignalGame): number | null => (g.shoutAt === null ? null : Math.max(0, g.shoutAt + UPLINK_H + ROUND_TRIP_H + MANEUVER_H - g.hours));

/** Fast-forward is allowed while Canberra can't see the probe, and runs on its own during the round trip. */
export const canFastForward = (g: SignalGame): boolean =>
  g.state === 'playing' && (((at(g, 'station') || at(g, 'carrier') || at(g, 'shout')) && !inView('canberra', g.hours)) || (at(g, 'wait') && !g.telemetry));
export const fastNow = (g: SignalGame): boolean => canFastForward(g) && (g.fast || at(g, 'wait'));

/** Move the game on by `dt` real seconds. */
export function stepSignal(g: SignalGame, dt: number): void {
  if (g.state !== 'playing' || dt <= 0) return;
  dt = Math.min(dt, 0.1);
  g.realS += dt;
  const wasInView = inView('canberra', g.hours);
  pass(g, dt * (fastNow(g) ? FAST_H_S : RATE_H_S));
  // Stop fast-forwarding the moment Canberra rises.
  if (!wasInView && inView('canberra', g.hours)) g.fast = false;

  // Carrier search: close enough for long enough, and Canberra listening.
  if (at(g, 'carrier')) {
    const near = Math.abs(g.tuneKHz - carrierNow(g)) <= LOCK_WINDOW_KHZ && inView('canberra', g.hours);
    g.lockS = near ? g.lockS + dt : Math.max(0, g.lockS - dt);
    if (g.lockS >= LOCK_S) {
      g.locked = true;
      g.tuneKHz = carrierNow(g);
      g.events.push('locked');
      g.step++;
    }
  }
  advance(g);
}

/** Let `h` game hours pass: power, temperatures, the light-time events, and the window. */
function pass(g: SignalGame, h: number): void {
  let left = h;
  while (left > 1e-9 && g.state === 'playing') {
    const d = Math.min(0.05, left);
    left -= d;
    const before = g.hours;
    g.hours += d;
    const m = marginW(g);
    g.reserveWh = Math.min(RESERVE_WH, g.reserveWh + m * d);
    g.minReserveWh = Math.min(g.minReserveWh, g.reserveWh);
    g.lineC = g.loads.lineHeater ? Math.min(LINE_START_C, g.lineC + LINE_RATE_C_H * d) : g.lineC - LINE_RATE_C_H * d;
    const unheated = instrumentsOn(g) < INSTRUMENTS.length && !g.loads.instHeaters;
    if (unheated && !g.instDamaged) {
      g.instColdH += d;
      if (g.instColdH >= INST_COLD_H) {
        g.instDamaged = true;
        g.events.push('instDamaged');
      }
    } else if (!unheated) g.instColdH = Math.max(0, g.instColdH - d);
    if (g.shoutAt !== null) {
      const arrive = g.shoutAt + UPLINK_H + ONE_WAY_H;
      if (before < arrive && g.hours >= arrive) g.events.push('arrived');
      const back = g.shoutAt + UPLINK_H + ROUND_TRIP_H + MANEUVER_H;
      if (!g.telemetry && g.hours >= back) {
        g.telemetry = true;
        g.events.push('telemetry');
      }
    }
    if (g.reserveWh <= 0) lose(g, 'power');
    else if (g.lineC <= LINE_FREEZE_C) lose(g, 'freeze');
    else if (g.shoutAt === null && missedWindow(g)) lose(g, 'window');
  }
}

/** The command wasn't sent in time: the first full Canberra window after the start has closed. */
export function missedWindow(g: SignalGame): boolean {
  return g.hours > FIRST_WINDOW[1];
}
/** The first full Canberra window (after the one closing at the start), hours. */
export const FIRST_WINDOW: [number, number] = (() => {
  const end0 = nextWindow(0)[1];
  return nextWindow(end0 + 0.01);
})();

function lose(g: SignalGame, why: 'power' | 'freeze' | 'window'): void {
  g.state = 'lost';
  g.lostTo = why;
}

/** Tick the checklist steps whose condition is met. */
function advance(g: SignalGame): void {
  if (g.state !== 'playing') return;
  if (at(g, 'power') && marginW(g) >= 0 && g.loads.lineHeater) {
    g.events.push('powerOk');
    g.step++;
  }
}

/** Step 6, the end: confirm telemetry is back, with every instrument on again and the margin positive. */
export function confirmContact(g: SignalGame): 'restored' | 'noData' | 'instruments' | 'margin' | null {
  if (!at(g, 'wait')) return null;
  const why = !g.telemetry ? 'noData' : instrumentsOn(g) < INSTRUMENTS.length ? 'instruments' : marginW(g) < 0 ? 'margin' : null;
  if (why) {
    g.events.push(why === 'noData' ? 'noData' : why === 'instruments' ? 'needInstruments' : 'needMargin');
    return why;
  }
  g.events.push('restored');
  g.step++;
  g.state = 'won';
  return 'restored';
}

/** Share of the reserve to keep for the second star. */
export const STAR_RESERVE = 0.5;

/** Stars: 0 if lost; then one each for keeping half the reserve and getting contact back quickly. */
export function signalStars(g: SignalGame): 0 | 1 | 2 | 3 {
  if (g.state !== 'won') return 0;
  let stars = 1;
  if (g.minReserveWh >= RESERVE_WH * STAR_RESERVE && !g.instDamaged) stars++;
  if (g.shoutAt !== null && g.shoutAt <= FIRST_WINDOW[0] + 4 && g.mistakes === 0) stars++;
  return stars as 1 | 2 | 3;
}
