/**
 * Too Hot, Too Cold: the model. A small Spacecraft circles Earth, in sunlight, then in Earth's shadow, a few
 * times. Four parts each have an operating band and wider survival limits (docs/research/minigames.md). Heat
 * comes from the Sun (through the structure each part sits on), from each part's own power (the instrument
 * during science passes, the radio during downlinks) and from heaters; it leaks to the structure and, through
 * the radiator louvers, to deep space. The player switches heaters (they cost power, tight on battery in the
 * shadow) and shares a few louver steps between the parts.
 *
 * Every number here is a GAME ESTIMATE in the style of small-satellite ranges, tuned so the game plays in about
 * 90 s; only the rules are real (allowable temperature ranges, heaters for narrow-limit parts like batteries,
 * radiators to deep space). Pure and step-by-step, so it is tested without a screen.
 */

export const PARTS = ['battery', 'computer', 'instrument', 'radio'] as const;
export type Part = (typeof PARTS)[number];

export interface PartSpec {
  /** Operating band, °C (game estimate). */
  op: readonly [number, number];
  /** Survival limits, °C (game estimate). Outside them the part is being damaged. */
  survival: readonly [number, number];
  /** Electric power of its heater, W (game estimate). */
  heaterW: number;
  /** Heat path to the structure it sits on, W/K (game estimate). */
  conductance: number;
  /** Heat capacity, J/K in game seconds (game estimate): how fast it warms or cools. */
  capacity: number;
  /** Temperature of the structure under it in sunlight and in Earth's shadow, °C (game estimate). */
  envSun: number;
  envShadow: number;
  /** Power it uses when idle and when its job is on (science pass, downlink), W (game estimate). */
  idleW: number;
  busyW: number;
  /** Of that power, the part that leaves as radio waves, not heat, W (game estimate). */
  radiatedW: number;
  /** Temperature at the start, °C. */
  start: number;
}

/** The battery has the narrowest band, like real ones. */
export const PART_SPECS: Record<Part, PartSpec> = {
  battery: { op: [5, 30], survival: [-10, 45], heaterW: 5, conductance: 0.12, capacity: 0.8, envSun: 22, envShadow: -35, idleW: 0.5, busyW: 0.5, radiatedW: 0, start: 20 },
  computer: { op: [-20, 50], survival: [-40, 70], heaterW: 3, conductance: 0.2, capacity: 1.6, envSun: 15, envShadow: -30, idleW: 6, busyW: 11, radiatedW: 0, start: 30 },
  instrument: { op: [-10, 35], survival: [-30, 50], heaterW: 5, conductance: 0.15, capacity: 0.8, envSun: 20, envShadow: -40, idleW: 0, busyW: 8, radiatedW: 0, start: 18 },
  radio: { op: [-20, 45], survival: [-40, 60], heaterW: 3, conductance: 0.15, capacity: 0.7, envSun: 15, envShadow: -35, idleW: 0.5, busyW: 12, radiatedW: 2, start: 12 },
};

/** Deep space, where the radiators send heat, °C (about 3 K). */
export const DEEP_SPACE_C = -270;
/** Heat path to deep space for each open louver step, W/K (game estimate). */
export const LOUVER_G = 0.02;
/** Louver steps one part can open, and the radiator's total to share (game estimates). */
export const LOUVER_MAX = 2;
export const LOUVER_TOTAL = 3;

/** One orbit, in game seconds; share of it in Earth's shadow (about 35 of 92 minutes in low orbit). */
export const ORBIT_S = 22;
export const SHADOW_SHARE = 0.37;
/** Where in the orbit the game starts (0 = leaving the shadow). */
export const START_PHASE = 0.3;
/** Game length: four orbits. */
export const GAME_S = 88;
/** Real minutes per game second: a 92-minute orbit in 22 s. */
export const MINUTES_PER_S = 92 / ORBIT_S;

/** Solar array power in sunlight, battery size and the most the battery can give at once (game estimates). */
export const SOLAR_W = 28;
export const BATTERY_WH = 25;
export const BATTERY_MAX_W = 24;
export const START_CHARGE = 0.75;

/** Seconds outside survival limits before a part is lost; how fast that stress fades back inside (game estimates). */
export const DAMAGE_S = 1.5;
export const DAMAGE_RECOVERY = 0.25;

/** Jobs that switch parts on: science passes (instrument, and the computer working harder) and downlinks (radio). */
export const SCIENCE: readonly (readonly [number, number])[] = [[1, 6], [20, 27], [41, 49], [62, 70]];
export const DOWNLINKS: readonly (readonly [number, number])[] = [[16, 21], [32, 36], [46, 54], [75, 81]];

/** Heaters trip in this order when the power budget is exceeded: the battery's goes last. */
export const TRIP_ORDER: readonly Part[] = ['instrument', 'radio', 'computer', 'battery'];

export interface ThermalGame {
  timeS: number;
  temp: Record<Part, number>;
  heater: Record<Part, boolean>;
  louver: Record<Part, number>;
  /** Seconds of damage built up outside survival limits. */
  damage: Record<Part, number>;
  /** Battery charge, 0–1. */
  charge: number;
  /** Seconds-weighted share of parts inside their operating bands, summed over time. */
  inBandS: number;
  /** Heaters the power budget tripped since the view last looked (it clears this). */
  tripped: Part[];
  state: 'playing' | 'won' | 'lost';
  lostTo: Part | 'flat' | null;
}

export function newThermalGame(): ThermalGame {
  const each = <T>(f: (p: Part) => T) => Object.fromEntries(PARTS.map((p) => [p, f(p)])) as Record<Part, T>;
  return {
    timeS: 0,
    temp: each((p) => PART_SPECS[p].start),
    heater: each(() => false),
    louver: each(() => 0),
    damage: each(() => 0),
    charge: START_CHARGE,
    inBandS: 0,
    tripped: [],
    state: 'playing',
    lostTo: null,
  };
}

/** Orbit phase at game time `s`, 0–1 (0 = leaving the shadow). */
export const phaseAt = (s: number): number => (((START_PHASE + s / ORBIT_S) % 1) + 1) % 1;
/** In sunlight at game time `s`? */
export const sunlitAt = (s: number): boolean => phaseAt(s) < 1 - SHADOW_SHARE;
/** Sunlit and shadow stretches over the whole game, for the timeline. */
export function shadowSpans(): [number, number][] {
  const spans: [number, number][] = [];
  const first = (1 - SHADOW_SHARE - START_PHASE) * ORBIT_S;
  for (let s = first; s < GAME_S; s += ORBIT_S) spans.push([s, Math.min(GAME_S, s + SHADOW_SHARE * ORBIT_S)]);
  return spans;
}

const within = (s: number, spans: readonly (readonly [number, number])[]) => spans.some(([a, b]) => s >= a && s < b);
export const scienceAt = (s: number): boolean => within(s, SCIENCE);
export const downlinkAt = (s: number): boolean => within(s, DOWNLINKS);
/** Is this part's job on at game time `s`? */
export function busyAt(part: Part, s: number): boolean {
  if (part === 'instrument' || part === 'computer') return scienceAt(s);
  if (part === 'radio') return downlinkAt(s);
  return false;
}

/** Electric power a part uses now, without its heater, W. */
export const partW = (g: ThermalGame, p: Part): number => (busyAt(p, g.timeS) ? PART_SPECS[p].busyW : PART_SPECS[p].idleW);
/** Heaters switched on, W. */
export const heatersW = (g: ThermalGame): number => PARTS.reduce((w, p) => w + (g.heater[p] ? PART_SPECS[p].heaterW : 0), 0);
/** Everything switched on, W. */
export const loadW = (g: ThermalGame): number => PARTS.reduce((w, p) => w + partW(g, p), 0) + heatersW(g);
/** Power coming in from the solar array, W. */
export const solarW = (g: ThermalGame): number => (sunlitAt(g.timeS) ? SOLAR_W : 0);
/** The most the Spacecraft can use at once, W: the solar array plus what the battery can give. */
export const budgetW = (g: ThermalGame): number => solarW(g) + BATTERY_MAX_W;
/** Louver steps open in total. */
export const louversOpen = (g: ThermalGame): number => PARTS.reduce((n, p) => n + g.louver[p], 0);
export const inBand = (g: ThermalGame, p: Part): boolean => g.temp[p] >= PART_SPECS[p].op[0] && g.temp[p] <= PART_SPECS[p].op[1];
export const inSurvival = (g: ThermalGame, p: Part): boolean => g.temp[p] >= PART_SPECS[p].survival[0] && g.temp[p] <= PART_SPECS[p].survival[1];
export const timeLeftS = (g: ThermalGame): number => Math.max(0, GAME_S - g.timeS);

/** Switch a heater. Switching one on fails ('power') if it would go over the power budget. */
export function toggleHeater(g: ThermalGame, p: Part): 'on' | 'off' | 'power' | null {
  if (g.state !== 'playing') return null;
  if (g.heater[p]) {
    g.heater[p] = false;
    return 'off';
  }
  if (loadW(g) + PART_SPECS[p].heaterW > budgetW(g)) return 'power';
  g.heater[p] = true;
  return 'on';
}

/** Open (+1) or close (-1) one louver step on a part. Fails ('full') if the radiator has no step left. */
export function moveLouver(g: ThermalGame, p: Part, by: 1 | -1): 'moved' | 'full' | null {
  if (g.state !== 'playing') return null;
  const next = g.louver[p] + by;
  if (next < 0 || next > LOUVER_MAX) return null;
  if (by > 0 && louversOpen(g) >= LOUVER_TOTAL) return 'full';
  g.louver[p] = next;
  return 'moved';
}

/** Rate of temperature change of one part right now, K/s. */
export function heatRate(g: ThermalGame, p: Part): number {
  const s = PART_SPECS[p];
  const env = sunlitAt(g.timeS) ? s.envSun : s.envShadow;
  const own = partW(g, p) - (busyAt(p, g.timeS) ? s.radiatedW : 0);
  const heater = g.heater[p] ? s.heaterW : 0;
  const t = g.temp[p];
  const q = s.conductance * (env - t) + LOUVER_G * g.louver[p] * (DEEP_SPACE_C - t) + own + heater;
  return q / s.capacity;
}

const SUBSTEP = 0.05;

/** Move the game on by `dt` seconds. */
export function stepThermal(g: ThermalGame, dt: number): void {
  let left = Math.min(dt, 0.25);
  while (left > 1e-9 && g.state === 'playing') {
    const h = Math.min(SUBSTEP, left, timeLeftS(g));
    left -= SUBSTEP;
    tick(g, h);
  }
}

function tick(g: ThermalGame, h: number): void {
  // Over the budget (a downlink started in the shadow): heaters trip, the battery's last.
  for (const p of TRIP_ORDER) {
    if (loadW(g) <= budgetW(g)) break;
    if (g.heater[p]) {
      g.heater[p] = false;
      g.tripped.push(p);
    }
  }
  const rates = PARTS.map((p) => heatRate(g, p));
  PARTS.forEach((p, i) => (g.temp[p] += rates[i]! * h));
  g.charge = Math.min(1, g.charge + ((solarW(g) - loadW(g)) * h * MINUTES_PER_S) / 60 / BATTERY_WH);
  g.inBandS += (PARTS.filter((p) => inBand(g, p)).length / PARTS.length) * h;
  for (const p of PARTS) {
    g.damage[p] = inSurvival(g, p) ? Math.max(0, g.damage[p] - DAMAGE_RECOVERY * h) : g.damage[p] + h;
  }
  g.timeS += h;
  const broken = PARTS.find((p) => g.damage[p] >= DAMAGE_S);
  if (broken) {
    g.state = 'lost';
    g.lostTo = broken;
  } else if (g.charge <= 0) {
    g.charge = 0;
    g.state = 'lost';
    g.lostTo = 'flat';
  } else if (timeLeftS(g) <= 1e-9) {
    g.state = 'won';
  }
}

/** Share of the game the parts spent inside their operating bands, 0–1. */
export const bandShare = (g: ThermalGame): number => (g.timeS > 0 ? g.inBandS / g.timeS : 1);

/** Stars: 0 if a part was lost or the battery went flat; then by time inside the operating bands. */
export function thermalStars(g: ThermalGame): 0 | 1 | 2 | 3 {
  if (g.state !== 'won') return 0;
  const share = bandShare(g);
  return share >= 0.85 ? 3 : share >= 0.65 ? 2 : 1;
}
