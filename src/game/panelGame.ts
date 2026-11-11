/**
 * Stuck solar panel, the mini-game. One solar panel didn't swing fully open: its hinge caught, and it only
 * wobbles a little. The player fires a small thruster to rock the Spacecraft. A push while the panel swings
 * outwards adds to the swing; a push while it swings back takes some away. Pushes in time with the swing add
 * up (like pushing a swing in a playground) until the panel swings far enough to latch open.
 *
 * `open` is the share of the way open: 1 is fully open (it latches there). It rests at REST_OPEN and swings
 * both ways round it; below 0 it swings back towards the body.
 * Pure and step-by-step, so it is tested without a screen.
 */

/** Seconds before the battery is too low to keep trying: the panel stays stuck. */
export const PANEL_TIME_S = 15;
/** Latched by this many seconds scores 100%; the score falls to 0 at the time limit. */
export const PANEL_PAR_S = 7;
/** Seconds the panel takes to swing out and back on its stuck hinge. */
export const SWING_PERIOD_S = 1.2;
/** Seconds the thruster needs between pushes. */
export const PUSH_COOLDOWN_S = 0.3;
/** How much one push adds to the panel's speed (shares of the way open per second). */
const PUSH_SPEED = 1.2;
/** Where the stuck panel rests: caught part of the way open. */
export const REST_OPEN = 0.3;
/** How fast the swing dies away on its own, per second. */
const DAMPING = 0.2;
/** How hard it swings when the Anomaly starts. */
const START_SPEED = 0.6;
/** Small steps keep the swing the same at any frame rate. */
const STEP_S = 1 / 240;

const OMEGA = (2 * Math.PI) / SWING_PERIOD_S;

export interface PanelGame {
  /** Share of the way open: 1 latches; it can swing a little below 0, towards the body. */
  open: number;
  /** How fast it swings: positive is outwards. */
  speed: number;
  elapsedS: number;
  /** Seconds until the thruster can fire again. */
  cooldownS: number;
  pushes: number;
  /** Seconds after the start that the panel latched open, or null. */
  openedAtS: number | null;
  /** Latched, out of time, or still going. */
  state: 'playing' | 'won' | 'lost';
}

export function newPanelGame(): PanelGame {
  return { open: REST_OPEN, speed: START_SPEED, elapsedS: 0, cooldownS: 0, pushes: 0, openedAtS: null, state: 'playing' };
}

/** The panel swings outwards right now: a push adds to the swing. */
export const swingingOut = (g: PanelGame): boolean => g.speed > 0;

/** How far open the panel gets at the top of this swing, if nothing more is done (it slowly dies away). */
export function swingPeak(g: PanelGame): number {
  if (g.state === 'won') return 1;
  const off = g.open - REST_OPEN;
  return REST_OPEN + Math.sqrt(off * off + (g.speed / OMEGA) ** 2);
}

/** How far either side of the rest a push counts as "in the middle". */
const MIDDLE = 0.2;

/** The best moment to push: swinging outwards through the middle, where it moves fastest. */
export const goodMoment = (g: PanelGame): boolean => g.state === 'playing' && g.speed > 0 && Math.abs(g.open - REST_OPEN) <= MIDDLE;

/**
 * Fire the thruster. Returns 'out' when it pushed with the swing, 'back' when it pushed against it, or null
 * when the thruster wasn't ready (or the game is over).
 */
export function pushPanel(g: PanelGame): 'out' | 'back' | null {
  if (g.state !== 'playing' || g.cooldownS > 0) return null;
  const helped = swingingOut(g);
  g.speed += PUSH_SPEED;
  g.cooldownS = PUSH_COOLDOWN_S;
  g.pushes++;
  return helped ? 'out' : 'back';
}

/** Move the game on by `dt` seconds. */
export function stepPanel(g: PanelGame, dt: number): void {
  if (g.state !== 'playing' || dt <= 0) return;
  let left = Math.min(dt, PANEL_TIME_S - g.elapsedS);
  while (left > 1e-9 && g.state === 'playing') {
    const h = Math.min(STEP_S, left);
    left -= h;
    g.elapsedS += h;
    g.cooldownS = Math.max(0, g.cooldownS - h);
    // A spring towards the stuck rest, slowly dying away.
    g.speed += (-OMEGA * OMEGA * (g.open - REST_OPEN) - DAMPING * 2 * g.speed) * h;
    g.open += g.speed * h;
    if (g.open >= 1) {
      g.open = 1;
      g.speed = 0;
      g.state = 'won';
      g.openedAtS = g.elapsedS;
    }
  }
  if (g.state === 'playing' && g.elapsedS >= PANEL_TIME_S - 1e-9) g.state = 'lost';
}

/** The score, 0–1: 100% for a latch by the par time, less the longer it took, 0 if it stayed stuck. */
export function panelScore(g: PanelGame): number {
  if (g.state !== 'won' || g.openedAtS === null) return 0;
  return Math.max(0, Math.min(1, (PANEL_TIME_S - g.openedAtS) / (PANEL_TIME_S - PANEL_PAR_S)));
}
