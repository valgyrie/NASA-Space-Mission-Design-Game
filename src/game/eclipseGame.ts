/**
 * Survive the eclipse, the mini-game. The Spacecraft passes into Earth's shadow with its battery low: no
 * sunlight reaches its Solar Cells until it comes out on the other side. Everything that is switched on drains
 * the battery. The player switches systems off so the battery lasts until sunrise, but keeps the Payload on as
 * long as it can (that is the Data the client pays for) and keeps the heaters on enough that nothing freezes.
 *
 * Numbers are game units, not the design's real watts: the same puzzle for every Spacecraft, only the battery
 * it starts with depends on the design (a Small Battery starts lower). Pure and step-by-step, so it is tested
 * without a screen.
 */

export const SYSTEMS = ['computer', 'heaters', 'radio', 'payload'] as const;
export type System = (typeof SYSTEMS)[number];

/** Watts each system uses. The computer can't be switched off: it runs the Spacecraft. */
export const SYSTEM_W: Record<System, number> = { computer: 2, heaters: 3, radio: 3, payload: 4 };

/** Seconds in Earth's shadow, until sunrise. */
export const ECLIPSE_TIME_S = 12;
/** Battery charge (%) when the shadow begins, by the battery the Spacecraft carries. */
export const START_CHARGE = { smallBattery: 34, mediumBattery: 36, largeBattery: 46 } as const;
/** Battery charge (%) each watt uses a second. */
export const CHARGE_PER_W_S = 0.4;
/** Seconds with the heaters off before the battery gets too cold to work. Back on, it warms as fast. */
export const COLD_LIMIT_S = 4;
/** Surviving the shadow scores at least this; the rest comes from keeping the Payload on. */
export const SURVIVE_SCORE = 0.4;
/** Seconds of Payload on that score 100%. With the radio off and heaters on, a Large Battery keeps it on all the way. */
export const PAYLOAD_PAR_S = 8;

export interface EclipseGame {
  on: Record<System, boolean>;
  /** Battery charge, %. */
  charge: number;
  /** Seconds of cold built up while the heaters were off. */
  coldS: number;
  elapsedS: number;
  /** Seconds the Payload was on in the shadow. */
  payloadS: number;
  /** Reached sunrise, or the battery went flat or froze, or still going. */
  state: 'playing' | 'won' | 'lost';
  /** Why it was lost. */
  lostTo: 'flat' | 'cold' | null;
}

export function newEclipseGame(battery: keyof typeof START_CHARGE = 'largeBattery'): EclipseGame {
  return {
    on: { computer: true, heaters: true, radio: true, payload: true },
    charge: START_CHARGE[battery],
    coldS: 0,
    elapsedS: 0,
    payloadS: 0,
    state: 'playing',
    lostTo: null,
  };
}

/** Watts in use right now. */
export const drawW = (g: EclipseGame): number => SYSTEMS.reduce((w, s) => w + (g.on[s] ? SYSTEM_W[s] : 0), 0);

/** Seconds the battery lasts at this rate. */
export const lastsS = (g: EclipseGame): number => g.charge / (drawW(g) * CHARGE_PER_W_S);

/** Seconds until sunrise. */
export const sunriseInS = (g: EclipseGame): number => Math.max(0, ECLIPSE_TIME_S - g.elapsedS);

/** Switch a system on or off. The computer stays on. True if it changed. */
export function toggleSystem(g: EclipseGame, system: System): boolean {
  if (g.state !== 'playing' || system === 'computer') return false;
  g.on[system] = !g.on[system];
  return true;
}

/** Move the game on by `dt` seconds. */
export function stepEclipse(g: EclipseGame, dt: number): void {
  if (g.state !== 'playing' || dt <= 0) return;
  const h = Math.min(dt, sunriseInS(g));
  const use = drawW(g) * CHARGE_PER_W_S;
  // The battery goes flat part of the way through this step: stop the clock there.
  const flatIn = g.charge / use;
  const run = Math.min(h, flatIn);
  g.elapsedS += run;
  g.charge = Math.max(0, g.charge - use * run);
  if (g.on.payload) g.payloadS += run;
  g.coldS = g.on.heaters ? Math.max(0, g.coldS - run) : g.coldS + run;
  if (g.coldS >= COLD_LIMIT_S) {
    g.state = 'lost';
    g.lostTo = 'cold';
  } else if (g.charge <= 1e-9) {
    g.charge = 0;
    g.state = 'lost';
    g.lostTo = 'flat';
  } else if (sunriseInS(g) <= 1e-9) {
    g.state = 'won';
  }
}

/** The score, 0–1: 0 if the battery went flat or froze; reaching sunrise scores SURVIVE_SCORE and up. */
export function eclipseScore(g: EclipseGame): number {
  if (g.state !== 'won') return 0;
  return Math.min(1, SURVIVE_SCORE + (1 - SURVIVE_SCORE) * (g.payloadS / PAYLOAD_PAR_S));
}
