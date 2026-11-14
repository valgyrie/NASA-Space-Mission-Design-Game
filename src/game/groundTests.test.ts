import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { GROUND_TESTS, GROUND_TEST_CHANCE_LEFT, PANEL_CHANCE } from './balance';
import { antennaChance, rollAnomaly } from './anomalies';
import { acceptContract, type ContractId } from './contracts';
import { fly } from './flight';
import {
  GROUND_TEST_IDS,
  GROUND_TEST_PAGES,
  chosenGroundTests,
  groundTestChances,
  groundTestCost,
  groundTestDays,
  groundTestFor,
  groundTestsFor,
  testedKinds,
  toggleGroundTest,
} from './groundTests';
import { launch, missionTimeline, planLaunch, shipMission } from './mission';
import { type SiteState, newSiteState } from './siteState';
import { type OptionId, checkDesign, choose, dataOf, emptyDesign, partsNeeded } from './spacecraft';
import { t } from '../strings';

const EXPLORER: OptionId[] = ['smallBus', 'batteriesOnly', 'largeBattery', 'simpleAntenna', 'spin', 'radiationDetector'];
const TIROS: OptionId[] = ['mediumBus', 'solarCells', 'largeBattery', 'simpleAntenna', 'spin', 'tvCamera'];

/** A Company with money, the Contract accepted and the Parts in the Warehouse. */
function company(contract: ContractId, ids: OptionId[]): SiteState {
  const state = newSiteState();
  state.money = 5_000_000;
  state.assemblyHall = { x: 0, z: 0, level: 3, upgradeDay: null };
  if (contract === 'tiros1') {
    state.completed = ['explorer1'];
    state.history = ['vanguard1'];
    state.vehicle = 'thorAble';
  }
  acceptContract(state, contract);
  for (const id of ids) choose(state.design, id);
  for (const p of partsNeeded(state.design)) state.parts[p] += 1;
  return state;
}

const design = (ids: OptionId[]) => {
  const d = emptyDesign();
  for (const id of ids) choose(d, id);
  return d;
};

describe('Ground Tests: which ones show', () => {
  it('offers only the tests whose Anomaly can strike the design', () => {
    expect(groundTestsFor(design(EXPLORER))).toEqual(['dayInTheLife']);
    expect(groundTestsFor(design(TIROS))).toEqual(['dayInTheLife', 'vibration', 'thermalVacuum']);
    expect((['antenna', 'panel', 'eclipse'] as const).map(groundTestFor)).toEqual(['dayInTheLife', 'vibration', 'thermalVacuum']);
    expect(testedKinds(['dayInTheLife', 'vibration', 'thermalVacuum'])).toEqual(['antenna', 'panel', 'eclipse']);
    expect(testedKinds(undefined)).toEqual([]);
  });

  it('ignores a ticked test the design cannot use', () => {
    const state = company('explorer1', EXPLORER);
    toggleGroundTest(state, 'vibration', true);
    toggleGroundTest(state, 'dayInTheLife', true);
    expect(chosenGroundTests(state, state.design)).toEqual(['dayInTheLife']);
    toggleGroundTest(state, 'dayInTheLife', false);
    expect(chosenGroundTests(state, state.design)).toEqual([]);
    expect(chosenGroundTests({}, state.design)).toEqual([]);
  });
});

describe('Ground Tests: days and money', () => {
  it('adds the ticked tests to assembly, the Time bar and the Costs', () => {
    const state = company('tiros1', TIROS);
    const before = planLaunch(state, state.design);
    const timeBefore = checkDesign(state, state.design).gauges.time.value;
    toggleGroundTest(state, 'vibration', true);
    toggleGroundTest(state, 'thermalVacuum', true);
    const after = planLaunch(state, state.design);
    const days = GROUND_TESTS.vibration.days + GROUND_TESTS.thermalVacuum.days;
    const cost = GROUND_TESTS.vibration.cost + GROUND_TESTS.thermalVacuum.cost;
    expect(groundTestDays(after.groundTests)).toBe(days);
    expect(groundTestCost(after.groundTests)).toBe(cost);
    expect(after.testDays).toBe(days);
    expect(after.testCost).toBe(cost);
    expect(after.readyDay).toBe(before.readyDay + days);
    expect(after.total).toBe(before.total + cost);
    expect(after.assemblyDays).toBe(before.assemblyDays);
    expect(checkDesign(state, state.design).gauges.time.value).toBe(timeBefore + days);
  });

  it('ships with them: paid, assembled for longer, and kept on the Mission', () => {
    const state = company('tiros1', TIROS);
    toggleGroundTest(state, 'dayInTheLife', true);
    const plan = planLaunch(state, state.design);
    const money = state.money;
    expect(shipMission(state, state.design).ok).toBe(true);
    expect(state.money).toBe(money - plan.total);
    const m = state.mission!;
    expect(m.groundTests).toEqual(['dayInTheLife']);
    expect(m.shipDay - m.startDay).toBe(plan.assemblyDays + GROUND_TESTS.dayInTheLife.days);
    expect(missionTimeline(state)!.readyDay).toBe(plan.readyDay);
  });

  it('keeps the Launch Insurance payout on the Rideshare and Shipping alone', () => {
    const state = company('tiros1', TIROS);
    const plan = planLaunch(state, state.design);
    toggleGroundTest(state, 'thermalVacuum', true);
    expect(planLaunch(state, state.design).total - plan.total).toBe(GROUND_TESTS.thermalVacuum.cost);
  });
});

describe('Ground Tests: the chance', () => {
  const tirosPlan = { contract: 'tiros1' as const, design: design(TIROS), vehicle: 'thorAble' as const, tech: [], marks: { power: 1 } };
  const played = () => ({ ...newSiteState(), anomalyBest: { antenna: 0.7, panel: 0.7, eclipse: 0.7 } });

  it('shows each chance before and after in the planner', () => {
    const state = company('tiros1', TIROS);
    const chances = groundTestChances(state, state.design);
    expect(chances.map((c) => c.id)).toEqual(['dayInTheLife', 'vibration', 'thermalVacuum']);
    const panel = chances.find((c) => c.kind === 'panel')!;
    expect(panel.before).toBe(PANEL_CHANCE[1]);
    expect(panel.after).toBeCloseTo(PANEL_CHANCE[1] * GROUND_TEST_CHANCE_LEFT);
    const antenna = chances.find((c) => c.kind === 'antenna')!;
    const { sendPerDay, dataPerDay } = dataOf(state.design, [], 1);
    expect(antenna.before).toBeCloseTo(antennaChance(sendPerDay, dataPerDay));
    for (const c of chances) expect(c.after).toBeLessThan(c.before);
  });

  it('lowers the tested Anomaly in flight, and marks it tested', () => {
    const flight = fly(tirosPlan, 40, null);
    const days = 800;
    const share = (tested: Parameters<typeof rollAnomaly>[5], kind: string) =>
      Array.from({ length: days }, (_, d) => rollAnomaly(played(), 'K7QXM2', tirosPlan, flight, d, tested)).filter((a) => a?.kind === kind).length / days;
    expect(share(['panel'], 'panel')).toBeLessThan(share([], 'panel') * 0.75);
    expect(share(['eclipse'], 'eclipse')).toBeLessThan(share([], 'eclipse'));
    expect(share(['antenna'], 'antenna')).toBeLessThan(share([], 'antenna'));
    const met = Array.from({ length: 300 }, (_, d) => rollAnomaly(played(), 'K7QXM2', tirosPlan, flight, d, ['panel'])).find((a) => a?.kind === 'panel')!;
    expect(met.tested).toBe(true);
    expect(met.chance).toBeCloseTo(PANEL_CHANCE[1] * GROUND_TEST_CHANCE_LEFT);
  });

  it("can't stop the first flight's Point the antenna", () => {
    const flight = fly(tirosPlan, 40, null);
    for (let d = 0; d < 20; d++) {
      expect(rollAnomaly(newSiteState(), 'K7QXM2', tirosPlan, flight, d, ['antenna'])).toMatchObject({ kind: 'antenna', first: true, tested: true });
    }
  });

  it('records the tests on the Mission Report Anomaly after a real Launch', () => {
    const state = company('explorer1', EXPLORER);
    toggleGroundTest(state, 'dayInTheLife', true);
    shipMission(state, state.design);
    state.day = state.mission!.readyDay;
    const { report } = launch(state, 'K7QXM2')!;
    expect(report.anomaly).toMatchObject({ kind: 'antenna', first: true, tested: true });
  });
});

describe('Ground Tests: Learn more', () => {
  it('links each test to its CubeSat 101 page and uses the glossary term', () => {
    const pages = readFileSync('docs/research/sources/cubesat-101.txt', 'utf8').split('\f');
    const passages = {
      dayInTheLife: 'This test shows that your CubeSat’s electronics and flight software work as expected.',
      vibration: 'your CubeSat will survive the vibrations and shocks',
      thermalVacuum: 'thermal cycling on orbit',
    } as const;
    for (const id of GROUND_TEST_IDS) {
      expect(pages[GROUND_TEST_PAGES[id] + 8 - 1]!.replace(/\s+/g, ' ')).toContain(passages[id]);
      expect(t(`groundTest.${id}`)).toMatch(/test$/);
    }
    expect(t('planner.groundTests')).toBe('Ground Tests');
  });
});
