import { type AnomalyKind, antennaChance, eclipseChance, panelChance } from './anomalies';
import { GROUND_TESTS, GROUND_TEST_CHANCE_LEFT } from './balance';
import type { SiteState } from './siteState';
import { type Design, type Marks, dataOf, missionGoal, marksFor, powerOf } from './spacecraft';

/**
 * Ground Tests (ticket 40): optional tests of the Spacecraft on Earth before Shipping, after CubeSat 101 §6.9.
 * Each costs days and money and makes one Anomaly less likely. Not the Test Run, which is the free simulation.
 *
 * - Day in the Life (§6.9.1): electronics, timers and first transmission work after release → Point the antenna.
 * - Vibration (§6.9.2): it survives the shaking of launch → Stuck solar panel.
 * - Thermal vacuum (§6.9.3): it works hot, cold and in vacuum → Survive the eclipse. CubeSat 101's bakeout is
 *   mainly for outgassing; the game's test stands for thermal vacuum *cycling*, which "can help screen for
 *   problems caused by the thermal cycling on orbit" (p. 62).
 */

export const GROUND_TEST_IDS = ['dayInTheLife', 'vibration', 'thermalVacuum'] as const;
export type GroundTestId = (typeof GROUND_TEST_IDS)[number];

/** The Anomaly each Ground Test makes less likely. */
export const GROUND_TEST_ANOMALY: Record<GroundTestId, AnomalyKind> = {
  dayInTheLife: 'antenna',
  vibration: 'panel',
  thermalVacuum: 'eclipse',
};

/** The Ground Test that makes this Anomaly less likely. */
export function groundTestFor(kind: AnomalyKind): GroundTestId {
  return GROUND_TEST_IDS.find((id) => GROUND_TEST_ANOMALY[id] === kind)!;
}

/** Printed CubeSat 101 page for each test (§6.9.1, §6.9.2, §6.9.3). */
export const GROUND_TEST_PAGES: Record<GroundTestId, number> = {
  dayInTheLife: 59,
  vibration: 60,
  thermalVacuum: 62,
};

export const isGroundTestId = (v: unknown): v is GroundTestId => (GROUND_TEST_IDS as readonly unknown[]).includes(v);

/**
 * The tests that make sense for this design: only those whose Anomaly can strike it. Point the antenna can
 * strike any Spacecraft; Stuck solar panel and Survive the eclipse only one with Solar Cells.
 */
export function groundTestsFor(design: Design): GroundTestId[] {
  const solar = design.power === 'solarCells';
  return GROUND_TEST_IDS.filter((id) => id === 'dayInTheLife' || solar);
}

/** The ticked tests that count for this design, in a fixed order. Missing in older saves: none. */
export function chosenGroundTests(state: Pick<SiteState, 'groundTests'>, design: Design): GroundTestId[] {
  const ticked = state.groundTests ?? [];
  return groundTestsFor(design).filter((id) => ticked.includes(id));
}

/** Tick or untick a test in the Launch planner. */
export function toggleGroundTest(state: Pick<SiteState, 'groundTests'>, id: GroundTestId, on: boolean): void {
  const rest = (state.groundTests ?? []).filter((t) => t !== id);
  state.groundTests = on ? [...rest, id] : rest;
}

export function groundTestDays(tests: readonly GroundTestId[]): number {
  return tests.reduce((sum, id) => sum + GROUND_TESTS[id].days, 0);
}

export function groundTestCost(tests: readonly GroundTestId[]): number {
  return tests.reduce((sum, id) => sum + GROUND_TESTS[id].cost, 0);
}

/** The Anomalies these tests make less likely. */
export function testedKinds(tests: readonly GroundTestId[] | undefined): AnomalyKind[] {
  return (tests ?? []).map((id) => GROUND_TEST_ANOMALY[id]);
}

/** An Anomaly's chance after its Ground Test. */
export function testedChance(chance: number): number {
  return chance * GROUND_TEST_CHANCE_LEFT;
}

/** The chance it would have had without its Ground Test. */
export function untestedChance(chance: number): number {
  return chance / GROUND_TEST_CHANCE_LEFT;
}

/** One test's chance before and after, for the planner. */
export interface GroundTestChance {
  id: GroundTestId;
  kind: AnomalyKind;
  before: number;
  after: number;
}

/**
 * The chance of each applicable test's Anomaly for this design, untested and tested, from the design's labels
 * (the flight's Parts are a little off them, so the real chance can differ slightly).
 */
export function groundTestChances(state: SiteState, design: Design, marks: Marks = marksFor(state, design)): GroundTestChance[] {
  const goal = missionGoal(state);
  const tech = state.research.tech;
  return groundTestsFor(design).map((id) => {
    const kind = GROUND_TEST_ANOMALY[id];
    let before: number;
    if (kind === 'antenna') {
      const { sendPerDay, dataPerDay } = dataOf(design, tech, goal.ground);
      before = antennaChance(sendPerDay, dataPerDay);
    } else if (kind === 'panel') {
      before = panelChance(marks.power ?? 1);
    } else {
      const { lastsDays } = powerOf(design, tech, marks, goal.orbit);
      const battery = (design.battery ?? undefined) as Parameters<typeof eclipseChance>[2];
      before = eclipseChance(Number.isFinite(lastsDays) ? lastsDays : null, goal.missionDays, battery);
    }
    return { id, kind, before, after: testedChance(before) };
  });
}
