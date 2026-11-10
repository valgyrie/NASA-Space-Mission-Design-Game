import { describe, expect, it } from 'vitest';
import { acceptContract } from './contracts';
import { launch, shipMission } from './mission';
import { newSiteState } from './siteState';
import { type OptionId, choose, partsNeeded } from './spacecraft';
import { tutorialStep } from './tutorial';

const EXPLORER: OptionId[] = ['smallBus', 'batteriesOnly', 'largeBattery', 'simpleAntenna', 'spin', 'radiationDetector'];

describe('Explorer 1 tutorial', () => {
  it('walks from the first Contract to the first Launch, one step at a time', () => {
    const state = newSiteState();
    expect(tutorialStep(state)).toBe('contract');
    acceptContract(state, 'explorer1');
    expect(tutorialStep(state)).toBe('mine');
    state.mines.push({ x: 1, z: 1 });
    expect(tutorialStep(state)).toBe('factory');
    state.factories.push({ kind: 'metalWorks', x: 2, z: 2, making: 'smallBus', progress: null });
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
});
