import { describe, expect, it } from 'vitest';
import { KB_PER_RESEARCH_POINT, LAB_KB_PER_DAY, TECH_TREE } from './balance';
import { acceptContract, availableContracts } from './contracts';
import { isVehicleOpen } from './launchVehicles';
import { launch, planLaunch, shipMission, testRunFor } from './mission';
import { TECH_IDS, boost, buyTech, dataReceived, dataWaiting, pointsEarned, researchPoints, runLabs } from './research';
import { type SiteState, newSiteState } from './siteState';
import { type OptionId, checkDesign, choose, partsNeeded, powerOf } from './spacecraft';
import { STRINGS } from '../strings';

const SEED = 'K7QXM2';
const EXPLORER: OptionId[] = ['smallBus', 'batteriesOnly', 'largeBattery', 'simpleAntenna', 'spin', 'radiationDetector'];
const TIROS: OptionId[] = ['mediumBus', 'solarCells', 'largeBattery', 'simpleAntenna', 'spin', 'tvCamera'];

/** A Company that has flown Explorer 1 with every Part in stock, and upgraded its Assembly Hall for a Medium Bus. */
function afterExplorer(): SiteState {
  const state = newSiteState();
  state.assemblyHall = { x: 0, z: 0, level: 2, upgradeDay: null };
  acceptContract(state, 'explorer1');
  for (const id of EXPLORER) choose(state.design, id);
  for (const p of partsNeeded(state.design)) state.parts[p] += 1;
  shipMission(state, state.design);
  state.day = state.mission!.readyDay;
  launch(state, SEED);
  return state;
}

function tirosDesign(state: SiteState, ids: OptionId[] = TIROS): void {
  for (const id of ids) expect(choose(state.design, id, state), id).toBe(true);
}

describe('TIROS-1 Milestone', () => {
  it('is offered only after Explorer 1, with Solar Cells and Thor-Able', () => {
    const fresh = newSiteState();
    expect(availableContracts(fresh).map((c) => c.id)).toEqual(['explorer1']);
    expect(acceptContract(fresh, 'tiros1')).toEqual({ ok: false, problem: 'notYet' });
    expect(isVehicleOpen(fresh, 'thorAble')).toBe(false);
    expect(planLaunch(fresh, fresh.design, 'thorAble').problems).toContainEqual({ kind: 'vehicleClosed' });

    const state = afterExplorer();
    expect(state.completed).toEqual(['explorer1']);
    expect(state.history).toContain('vanguard1');
    expect(availableContracts(state).map((c) => c.id)).toEqual(['tiros1']);
    expect(isVehicleOpen(state, 'thorAble')).toBe(true);
    expect(acceptContract(state, 'tiros1')).toEqual({ ok: true });
  });

  it('needs Thor-Able: a TIROS-1 design is too heavy for Juno I', () => {
    const state = afterExplorer();
    acceptContract(state, 'tiros1');
    tirosDesign(state);
    const juno = checkDesign(state, state.design);
    expect(juno.problems).toContainEqual(expect.objectContaining({ kind: 'tooHeavy', bigger: 'thorAble' }));
    state.vehicle = 'thorAble';
    const thor = checkDesign(state, state.design);
    expect(thor.gauges.mass).toMatchObject({ status: 'ok', target: 120 });
    expect(thor.ready).toBe(true);
  });

  it('runs out of Power on batteries alone, and a Small Battery with Solar Cells lasts about 75 of 78 days', () => {
    const state = afterExplorer();
    acceptContract(state, 'tiros1');
    state.vehicle = 'thorAble';
    tirosDesign(state, ['mediumBus', 'batteriesOnly', 'largeBattery', 'simpleAntenna', 'spin', 'tvCamera']);
    expect(checkDesign(state, state.design).problems.map((p) => p.kind)).toContain('powerShort');
    tirosDesign(state, ['solarCells', 'smallBattery']);
    expect(powerOf(state.design).lastsDays).toBeCloseTo(75, 6);
    // Some runs last, some don't: an estimated success in between.
    const run = testRunFor(state, SEED, state.design);
    expect(run.successPercent).toBeGreaterThan(0);
    expect(run.successPercent).toBeLessThan(100);
    // Better solar cells make up the difference.
    state.research.processedKb = 1_000;
    expect(buyTech(state, 'betterSolarCells')).toEqual({ ok: true });
    expect(powerOf(state.design, state.research.tech).lastsDays).toBe(Infinity);
    // The design always gets through now; the Thor-Able can still fail (not on the first Launch, but this is the second).
    const better = testRunFor(state, SEED, state.design);
    expect(better.designPercent).toBe(100);
    expect(better.successPercent).toBe(85);
  });

  it('flies to success with the Large Battery on Thor-Able', () => {
    const state = afterExplorer();
    acceptContract(state, 'tiros1');
    state.vehicle = 'thorAble';
    tirosDesign(state);
    for (const p of partsNeeded(state.design)) state.parts[p] += 1;
    expect(shipMission(state, state.design).ok).toBe(true);
    expect(state.mission!.vehicle).toBe('thorAble');
    state.day = state.mission!.readyDay;
    const { report } = launch(state, SEED)!;
    expect(report.success).toBe(true);
    expect(state.history).toContain('tiros1After');
    expect(state.patches.map((p) => p.contract)).toEqual(['explorer1', 'tiros1']);
  });
});

describe('Research', () => {
  it('collects Data from Spacecraft while they work, and waits for a Research Lab', () => {
    const state = afterExplorer();
    const launchDay = state.reports[0]!.launchDay;
    expect(dataReceived(state)).toBe(0);
    state.day = launchDay + 10;
    expect(dataReceived(state)).toBeCloseTo(200, 6);
    runLabs(state, 10);
    expect(dataWaiting(state)).toBeCloseTo(200, 6);
    expect(pointsEarned(state)).toBe(0);
    // Explorer 1 works for 30 days at 20 kB a day, less any days the Anomaly cost.
    state.day = launchDay + 100;
    const lost = state.reports[0]!.anomaly?.lostDays ?? 0;
    expect(dataReceived(state)).toBeCloseTo(20 * (30 - lost), 6);
  });

  it('turns Data into Research Points at the Labs\' pace', () => {
    const state = afterExplorer();
    state.reports[0]!.anomaly = null;
    state.day = state.reports[0]!.launchDay + 30;
    state.labs.push({ x: 1, z: 1, level: 1, upgradeDay: null });
    runLabs(state, 4);
    expect(state.research.processedKb).toBeCloseTo(4 * LAB_KB_PER_DAY, 6);
    expect(pointsEarned(state)).toBe(Math.floor((4 * LAB_KB_PER_DAY) / KB_PER_RESEARCH_POINT));
    state.labs.push({ x: 2, z: 1, level: 1, upgradeDay: null });
    runLabs(state, 100);
    expect(state.research.processedKb).toBeCloseTo(600, 6);
    expect(researchPoints(state)).toBe(6);
  });

  it('buys tech tree Upgrades with Research Points, once each', () => {
    const state = newSiteState();
    state.research.processedKb = 6 * KB_PER_RESEARCH_POINT;
    expect(buyTech(state, 'lowPowerElectronics')).toEqual({ ok: false, problem: 'points' });
    expect(buyTech(state, 'strongerRadio')).toEqual({ ok: true });
    expect(researchPoints(state)).toBe(6 - TECH_TREE.strongerRadio.cost);
    expect(buyTech(state, 'strongerRadio')).toEqual({ ok: false, problem: 'owned' });
    expect(boost(state.research.tech, 'sendPerDay')).toBe(1.5);
    expect(boost(state.research.tech, 'solarW')).toBe(1);
  });

  it('has at least 3 Era 1 Upgrades, each with a name and a line about it', () => {
    expect(TECH_IDS.filter((id) => TECH_TREE[id].era === 1).length).toBeGreaterThanOrEqual(3);
    for (const id of TECH_IDS) {
      expect(STRINGS[`tech.${id}`]).toBeTruthy();
      expect(STRINGS[`tech.${id}.about`]).toBeTruthy();
    }
  });

  it('builds a shipped Spacecraft with the Upgrades the Company had when it shipped', () => {
    const state = afterExplorer();
    acceptContract(state, 'tiros1');
    state.vehicle = 'thorAble';
    tirosDesign(state);
    for (const p of partsNeeded(state.design)) state.parts[p] += 1;
    state.research.processedKb = 1_000;
    buyTech(state, 'strongerRadio');
    shipMission(state, state.design);
    buyTech(state, 'betterSolarCells');
    expect(state.mission!.tech).toEqual(['strongerRadio']);
  });
});
