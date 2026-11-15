import type { DesignReview } from './designReview';
import type { PlanProblem } from './mission';
import { type SiteState, partMass } from './siteState';
import {
  type Design,
  type DesignCheck,
  type Gauge,
  type OptionId,
  type Resource,
  type SpacecraftOption,
  OPTIONS,
  RESOURCES,
  checkDesign,
  statsOf,
} from './spacecraft';
import type { TechId } from './research';

/**
 * Explorer mode's way of showing a design: the same rules and the same checks as Mission Director, turned into
 * "what if" bars, levels and plain checklist lines. Nothing here changes the rules.
 */

// ---- Ghost preview: how each bar would change with one option swapped in ----

export interface GaugeChange {
  before: Gauge;
  after: Gauge;
  /** Which way the bar's value moves. */
  change: 'up' | 'down' | 'same';
  /** Whether the move helps (null when nothing changes, or the bar is still waiting). */
  better: boolean | null;
}

/** The design with `id` in its slot. */
export function designWith(design: Design, id: OptionId): Design {
  return { ...design, [OPTIONS[id].slot]: id };
}

/** Compare a bar now with the same bar after a change. */
export function gaugeChange(before: Gauge, after: Gauge): GaugeChange {
  if (after.status === 'waiting') return { before, after, change: 'same', better: null };
  const was = before.status === 'waiting' ? 0 : before.value;
  const delta = after.value - was;
  const change = Math.abs(delta) < 1e-9 ? 'same' : delta > 0 ? 'up' : 'down';
  if (before.status !== after.status) {
    // Waiting → a value: say whether the new value is fine; ok ↔ short: the status says it.
    return { before, after, change, better: after.status === 'ok' };
  }
  if (change === 'same') return { before, after, change, better: null };
  // 'max' bars (Mass, Budget, Time) are better lower; 'min' bars (Power, Data, Communications) higher.
  return { before, after, change, better: after.sense === 'max' ? delta < 0 : delta > 0 };
}

/**
 * Every bar now and with option `id` picked instead, from the same `checkDesign` the bars use. `adjust` applies
 * any change the screen makes to a check before showing it (the Weekly Challenge adds the Launch to the Budget).
 */
export function whatIf(
  state: SiteState,
  design: Design,
  id: OptionId,
  adjust: (check: DesignCheck, design: Design) => void = () => {},
): Record<Resource, GaugeChange> {
  const now = checkDesign(state, design);
  adjust(now, design);
  const nextDesign = designWith(design, id);
  const next = checkDesign(state, nextDesign);
  adjust(next, nextDesign);
  const out = {} as Record<Resource, GaugeChange>;
  for (const r of RESOURCES) out[r] = gaugeChange(now.gauges[r], next.gauges[r]);
  return out;
}

/** Where the fill, the ghost and the target line sit on a bar showing a change, on one shared scale (0–1). */
export function ghostLayout(before: Gauge, after: Gauge): { fill: number; ghost: number; target: number } {
  const capped = (g: Gauge) => (g.status === 'waiting' ? 0 : Math.min(g.value, Math.max(g.target, 1e-9) * 3));
  const now = capped(before);
  const next = capped(after);
  const scale = Math.max(now, next, before.target, after.target) * 1.25 || 1;
  return { fill: now / scale, ghost: next / scale, target: after.target / scale };
}

// ---- Option tiles: a few levels instead of numbers ----

export const LEVEL_STATS = ['mass', 'carries', 'battery', 'solar', 'makes', 'sends', 'uses'] as const;
export type LevelStat = (typeof LEVEL_STATS)[number];

/** One of an option's numbers as a level, 1 (least) to 3 (most), against the other options for its slot. */
export interface OptionLevel {
  stat: LevelStat;
  level: 1 | 2 | 3;
}

function statValue(o: SpacecraftOption, stat: LevelStat, tech: readonly TechId[], mark: number): number | undefined {
  const s = statsOf(o, tech, mark);
  switch (stat) {
    case 'mass':
      return o.part ? partMass(o.part, mark) : undefined;
    case 'carries':
      return s.carriesKg;
    case 'battery':
      return s.batteryWh;
    case 'solar':
      return s.solarW;
    case 'makes':
      return s.dataPerDay;
    case 'sends':
      return s.sendPerDay;
    case 'uses':
      return s.powerUseW;
  }
}

/**
 * The option's numbers as levels from 1 to 3, ranked against `others` (the options for the same slot). An option
 * alone, or all options equal, sits in the middle.
 */
export function optionLevels(
  o: SpacecraftOption,
  others: readonly SpacecraftOption[],
  tech: readonly TechId[] = [],
  markOf: (o: SpacecraftOption) => number = () => 1,
): OptionLevel[] {
  const out: OptionLevel[] = [];
  for (const stat of LEVEL_STATS) {
    const value = statValue(o, stat, tech, markOf(o));
    if (value === undefined || value <= 0) continue;
    const values = others.map((x) => statValue(x, stat, tech, markOf(x)) ?? 0).filter((v) => v > 0);
    const low = Math.min(value, ...values);
    const high = Math.max(value, ...values);
    const level = high - low < 1e-9 ? 2 : 1 + Math.round((2 * (value - low)) / (high - low));
    out.push({ stat, level: level as 1 | 2 | 3 });
  }
  return out;
}

// ---- Time in words ----

export type DayPhase = 'early' | 'halfway' | 'late';

/** Day `day` of a `days`-day Mission in words: early, about halfway, or near the end. */
export function dayPhase(day: number, days: number): DayPhase {
  const share = days > 0 ? day / days : 0;
  return share < 0.34 ? 'early' : share < 0.67 ? 'halfway' : 'late';
}

/** A success estimate (0–100) in words. */
export function chanceWord(percent: number): 'great' | 'good' | 'fair' | 'poor' {
  return percent >= 90 ? 'great' : percent >= 70 ? 'good' : percent >= 40 ? 'fair' : 'poor';
}

// ---- The Launch checklist: the Design Review in plain words ----

export type ChecklistMark = 'ok' | 'no' | 'warn';
export type ChecklistKey =
  | 'orbitMass.ok' | 'orbitMass.no' | 'orbitMass.cant' | 'orbitMass.engine' | 'orbitMass.bus'
  | 'payload.ok' | 'payload.no'
  | 'battery.ok' | 'battery.no' | 'power.ok' | 'power.no'
  | 'data.ok' | 'data.no'
  | 'communications.ok' | 'communications.no' | 'communications.stations'
  | 'time.ok' | 'time.no'
  | 'budget.ok' | 'budget.no'
  | 'spare.ok' | 'spare.warn';

export interface ChecklistLine {
  mark: ChecklistMark;
  /** Its words in strings.ts: `explorer.check.<key>`. */
  key: ChecklistKey;
}

/** Plan problems the checklist already says in its own lines; the others are listed under it as they are. */
export const CHECKLIST_COVERS: readonly PlanProblem['kind'][] = ['tooHeavy', 'cantReach', 'busFull', 'money'];

/**
 * The Design Review as a short checklist with ticks and crosses: one line per requirement, and one line for all
 * the spare margins together (a "careful" mark, not a cross: a design without margin can still fly).
 */
export function explorerChecklist(review: DesignReview, check: DesignCheck, design: Design): ChecklistLine[] {
  const out: ChecklistLine[] = [];
  const has = (kind: DesignCheck['problems'][number]['kind']) => check.problems.some((p) => p.kind === kind);
  for (const line of review.lines) {
    const ok = line.colour === 'green';
    const mark: ChecklistMark = ok ? 'ok' : 'no';
    switch (line.id) {
      case 'orbitMass':
        out.push({
          mark,
          key: ok ? 'orbitMass.ok' : has('busFull') ? 'orbitMass.bus' : line.need <= 0 ? 'orbitMass.cant' : has('needsEngine') ? 'orbitMass.engine' : 'orbitMass.no',
        });
        break;
      case 'power': {
        const battery = design.power === 'batteriesOnly' ? 'battery' : 'power';
        out.push({ mark, key: `${battery}.${ok ? 'ok' : 'no'}` });
        break;
      }
      case 'communications': {
        const stations = check.problems.some((p) => p.kind === 'commsShort' && p.stations);
        out.push({ mark, key: ok ? 'communications.ok' : stations ? 'communications.stations' : 'communications.no' });
        break;
      }
      case 'payload':
      case 'data':
      case 'time':
      case 'budget':
        out.push({ mark, key: `${line.id}.${ok ? 'ok' : 'no'}` });
        break;
      default:
        break;
    }
  }
  const spare = review.lines.filter((l) => l.applies && (l.id === 'spareMass' || l.id === 'sparePower' || l.id === 'spareEnergy'));
  if (spare.length > 0) {
    const roomy = spare.every((l) => l.colour === 'green');
    out.push({ mark: roomy ? 'ok' : 'warn', key: roomy ? 'spare.ok' : 'spare.warn' });
  }
  return out;
}
