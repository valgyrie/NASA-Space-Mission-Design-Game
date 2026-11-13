import { planLaunch } from './mission';
import type { SiteState } from './siteState';
import { type Design, type Gauge, checkDesign, costToBuy, hasRightPayload, powerOf } from './spacecraft';

/**
 * The Design Review (ticket 33), in the style of JPL's Concept Maturity Level 4 checklist: one line per
 * requirement and one per margin, each green, yellow or red. JPL's colours mean complete / in progress /
 * not started; LEAP uses them for margins instead (game rule):
 * - green: met with at least JPL's margin (requirements have no JPL margin, so met is green),
 * - yellow: met, with less margin,
 * - red: not met.
 * It passes when at least 80% of the lines that apply are green (JPL's rule). A design that fails can still ship.
 * Source: Wessen, Borden, Ziemer, Kwok (JPL), AIAA SPACE 2013; notes in docs/research/official-resources.md.
 */

/** JPL's CML 4 margins for spacecraft dry mass, power and energy: at least 35%. */
export const JPL_MARGIN = 0.35;
/** A concept is at a Concept Maturity Level when 80% of that column's lines are green. */
export const PASS_SHARE = 0.8;

export const REVIEW_LINES = [
  'orbitMass',
  'payload',
  'power',
  'data',
  'communications',
  'time',
  'budget',
  'spareMass',
  'sparePower',
  'spareEnergy',
] as const;
export type ReviewLineId = (typeof REVIEW_LINES)[number];
export type ReviewColour = 'green' | 'yellow' | 'red';

export interface ReviewLine {
  id: ReviewLineId;
  colour: ReviewColour;
  /** False when the line does not apply (spare power on batteries alone): left out of the 80%. */
  applies: boolean;
  /** What the design has, and what it needs (or may not go over): the number behind the colour. */
  have: number;
  need: number;
  /** Margin lines: spare as a share of what is needed (0.35 = 35%). */
  margin?: number;
}

export interface DesignReview {
  lines: ReviewLine[];
  /** Lines that apply, and how many of them are green. */
  counted: number;
  green: number;
  /** Green share of the lines that apply, 0–1. */
  share: number;
  passed: boolean;
}

/** Green with at least JPL's 35%, yellow with less, red below none. */
export function marginColour(margin: number): ReviewColour {
  if (margin >= JPL_MARGIN - 1e-9) return 'green';
  return margin >= -1e-9 ? 'yellow' : 'red';
}

/** Spare as a share of what is needed. Nothing needed counts as plenty. */
export function marginOf(have: number, need: number): number {
  if (need <= 0) return have >= 0 ? Infinity : -Infinity;
  return (have - need) / need;
}

/** Passed at 80% green or more (JPL's rule). */
export function passes(green: number, counted: number): boolean {
  return counted > 0 && green / counted >= PASS_SHARE - 1e-9;
}

const met = (ok: boolean): ReviewColour => (ok ? 'green' : 'red');
const fromGauge = (id: ReviewLineId, g: Gauge, ok = g.status === 'ok'): ReviewLine => ({
  id,
  colour: met(ok),
  applies: true,
  have: g.value,
  need: g.target,
});

/** Review the design for the Contract on the table, with the Launch Vehicle and Launch Site picked in the Launch planner. */
export function designReview(state: SiteState, design: Design): DesignReview {
  const check = checkDesign(state, design);
  const { goal, gauges } = check;
  const needsEngine = check.problems.some((p) => p.kind === 'needsEngine');
  const { sunW, powerUseW } = powerOf(design, state.research.tech, check.marks, goal.orbit);
  const cost = costToBuy(state, design) + planLaunch(state, design).total;
  const massKg = gauges.mass.value;
  const powerWaiting = gauges.power.status === 'waiting';

  const margin = (id: ReviewLineId, have: number, need: number, applies = true, waiting = false): ReviewLine => {
    const m = waiting ? -Infinity : marginOf(have, need);
    return { id, colour: marginColour(m), applies, have, need, margin: m };
  };

  const lines: ReviewLine[] = [
    fromGauge('orbitMass', gauges.mass, gauges.mass.status === 'ok' && !needsEngine),
    { id: 'payload', colour: met(hasRightPayload(design, goal.payload)), applies: true, have: design.payload ? 1 : 0, need: 1 },
    fromGauge('power', gauges.power),
    fromGauge('data', gauges.data),
    fromGauge('communications', gauges.communications),
    fromGauge('time', gauges.time),
    { id: 'budget', colour: met(cost <= state.money + 1e-9), applies: true, have: cost, need: state.money },
    // Spare mass: what the Launch Vehicle can lift beyond the Spacecraft, against the Spacecraft's mass.
    margin('spareMass', goal.liftKg, massKg, true, massKg <= 0),
    // Spare power: sunlight watts (averaged over the orbit) against watts used. On batteries alone it does not apply.
    margin('sparePower', sunW, powerUseW, sunW > 0, powerWaiting),
    // Spare energy: the Power bar's watt-hours against the watt-hours used over the Mission.
    margin('spareEnergy', gauges.power.value, gauges.power.target, true, powerWaiting),
  ];
  const countedLines = lines.filter((l) => l.applies);
  const green = countedLines.filter((l) => l.colour === 'green').length;
  const counted = countedLines.length;
  return { lines, counted, green, share: counted ? green / counted : 0, passed: passes(green, counted) };
}
