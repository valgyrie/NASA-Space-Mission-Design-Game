import { describe, expect, it } from 'vitest';
import { acceptContract } from './contracts';
import { launch, shipMission } from './mission';
import { type SiteState, newSiteState } from './siteState';
import { type OptionId, choose, partsNeeded } from './spacecraft';
import { NASA_STEPS, NASA_STEP_OF, TUTORIAL_STEPS, tutorialEnded, tutorialStep } from './tutorial';
import { SOURCES } from './sources';
import { t } from '../strings';

const EXPLORER: OptionId[] = ['smallBus', 'batteriesOnly', 'largeBattery', 'simpleAntenna', 'spin', 'radiationDetector'];

describe('Explorer 1 tutorial', () => {
  it('walks from the first Contract to the first Launch, one step at a time', () => {
    const state = newSiteState();
    expect(tutorialStep(state)).toBe('contract');
    acceptContract(state, 'explorer1');
    expect(tutorialStep(state)).toBe('mine');
    state.mines.push({ x: 1, z: 1, level: 1, upgradeDay: null });
    expect(tutorialStep(state)).toBe('factory');
    state.factories.push({ kind: 'metalWorks', x: 2, z: 2, making: 'smallBus', progress: null, level: 1, upgradeDay: null });
    expect(tutorialStep(state)).toBe('design');
    for (const id of EXPLORER) choose(state.design, id);
    expect(tutorialStep(state)).toBe('testRun');
    state.tutorial.testRun = true;
    expect(tutorialStep(state)).toBe('ship');
    for (const p of partsNeeded(state.design)) state.parts[p] += 1;
    shipMission(state, state.design);
    expect(tutorialStep(state)).toBe('travel');
    state.day = state.mission!.readyDay;
    expect(tutorialStep(state)).toBe('launch');
    launch(state, 'K7QXM2');
    expect(tutorialStep(state)).toBeNull();
  });

  it('never blocks: skipping the Mines and Factories by buying Parts moves the guide on', () => {
    const state = newSiteState();
    acceptContract(state, 'explorer1');
    for (const id of EXPLORER) choose(state.design, id);
    for (const p of partsNeeded(state.design)) state.parts[p] += 1;
    shipMission(state, state.design);
    expect(tutorialStep(state)).toBe('travel');
  });

  it('stays closed once skipped', () => {
    const state = newSiteState();
    state.tutorial.skipped = true;
    expect(tutorialStep(state)).toBeNull();
  });

  it("sits under NASA's six steps, in order, never going back (ticket 39)", () => {
    const order = TUTORIAL_STEPS.map((s) => NASA_STEPS.indexOf(NASA_STEP_OF[s]));
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(new Set(order)).toEqual(new Set(NASA_STEPS.map((_, i) => i)));
    expect(NASA_STEP_OF.contract).toBe('needGoals');
    expect(NASA_STEP_OF.design).toBe('requirements');
    expect(NASA_STEP_OF.ship).toBe('buildVerify');
    expect(NASA_STEP_OF.launch).toBe('implement');
  });

  it("ends with one line naming all six of NASA's steps, linked to slide 10", () => {
    const names = NASA_STEPS.map((id) => t(`tutorial.nasa.${id}`));
    const end = t('tutorial.end');
    const at = names.map((name) => end.indexOf(name));
    expect(at.every((i) => i >= 0)).toBe(true);
    expect(at).toEqual([...at].sort((a, b) => a - b));
    expect(SOURCES.sixSteps).toBe(`${SOURCES.segments}#page=10`);
  });

  it('shows the last card after the first Mission Report until closed or the next Mission ships', () => {
    const state = newSiteState();
    acceptContract(state, 'explorer1');
    for (const id of EXPLORER) choose(state.design, id);
    for (const p of partsNeeded(state.design)) state.parts[p] += 1;
    shipMission(state, state.design);
    expect(tutorialEnded(state)).toBe(false);
    state.day = state.mission!.readyDay;
    launch(state, 'K7QXM2');
    expect(tutorialStep(state)).toBeNull();
    expect(tutorialEnded(state)).toBe(true);
    // Shipping the next Mission puts it away.
    state.mission = {} as SiteState['mission'];
    expect(tutorialEnded(state)).toBe(false);
    state.mission = null;
    state.tutorial.skipped = true;
    expect(tutorialEnded(state)).toBe(false);
  });

  it('never shows the last card in Free Play or before the first Launch', () => {
    expect(tutorialEnded(newSiteState())).toBe(false);
    expect(tutorialEnded(newSiteState(undefined, undefined, 'freePlay'))).toBe(false);
  });
});
