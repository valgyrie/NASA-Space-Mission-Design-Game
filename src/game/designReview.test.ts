import { describe, expect, it } from 'vitest';
import { acceptContract } from './contracts';
import { JPL_MARGIN, PASS_SHARE, designReview, marginColour, marginOf, passes } from './designReview';
import { eraStartDay } from './eras';
import { designKey, designsTested, maturity, recordTestRun } from './maturity';
import { planLaunch } from './mission';
import { type SiteState, newSiteState } from './siteState';
import type { ContractId } from './contracts';
import type { LaunchVehicleId } from './launchVehicles';
import { type OptionId, choose, partsNeeded } from './spacecraft';

const EXPLORER: OptionId[] = ['smallBus', 'batteriesOnly', 'largeBattery', 'simpleAntenna', 'spin', 'radiationDetector'];
const TIROS: OptionId[] = ['mediumBus', 'solarCells', 'largeBattery', 'simpleAntenna', 'spin', 'tvCamera'];
const SYNCOM: OptionId[] = ['largeBus', 'solarCells', 'smallBattery', 'simpleAntenna', 'spin', 'mainEngine', 'transponder'];

/** A Company with plenty of money and the Contract accepted, Milestones before it done. */
function company(contract: ContractId, vehicle: LaunchVehicleId, ids: OptionId[] = []): SiteState {
  const state = newSiteState();
  state.money = 50_000_000;
  state.assemblyHall = { x: 0, z: 0, level: 3, upgradeDay: null };
  const order: ContractId[] = ['explorer1', 'tiros1', 'telstar1', 'syncom3'];
  state.completed = order.slice(0, order.indexOf(contract));
  if (state.completed.length > 0) state.history = ['vanguard1'];
  if (contract === 'telstar1' || contract === 'syncom3') {
    state.hq = { x: 5, z: 5, level: 2, upgradeDay: null };
    state.day = eraStartDay(2);
    state.groundStations = [{ x: 9, z: 9, level: 1, upgradeDay: null }];
  }
  state.vehicle = vehicle;
  acceptContract(state, contract);
  for (const id of ids) choose(state.design, id);
  return state;
}

const line = (state: SiteState, id: string) => designReview(state, state.design).lines.find((l) => l.id === id)!;

describe('Design Review colours', () => {
  it('uses JPL\'s 35%: green at 35% spare or more, yellow below it, red when short', () => {
    expect(JPL_MARGIN).toBe(0.35);
    expect(marginColour(0.35)).toBe('green');
    expect(marginColour(2)).toBe('green');
    expect(marginColour(Infinity)).toBe('green');
    expect(marginColour(0.349)).toBe('yellow');
    expect(marginColour(0)).toBe('yellow');
    expect(marginColour(-0.01)).toBe('red');
    expect(marginOf(14, 11.5)).toBeCloseTo(0.217, 3);
    expect(marginOf(1, 0)).toBe(Infinity);
  });

  it('passes at 80% green or more (JPL\'s rule)', () => {
    expect(PASS_SHARE).toBe(0.8);
    expect(passes(8, 10)).toBe(true);
    expect(passes(10, 10)).toBe(true);
    expect(passes(7, 9)).toBe(false);
    expect(passes(7, 10)).toBe(false);
    expect(passes(0, 0)).toBe(false);
  });

  it('rates a requirement green when met and red when not', () => {
    const state = company('explorer1', 'juno1', EXPLORER);
    expect(line(state, 'payload').colour).toBe('green');
    choose(state.design, 'tvCamera');
    state.history = ['vanguard1'];
    expect(line(state, 'payload').colour).toBe('red');
    choose(state.design, 'radiationDetector');
    choose(state.design, 'smallBattery');
    expect(line(state, 'power').colour).toBe('red');
    expect(line(state, 'spareEnergy').colour).toBe('red');
  });

  it('marks orbit and mass red, and spare mass red, when the Spacecraft is too heavy', () => {
    const state = company('explorer1', 'juno1', [...EXPLORER, 'mediumBus']);
    expect(line(state, 'orbitMass').colour).toBe('red');
    expect(line(state, 'spareMass').colour).toBe('red');
  });
});

describe('Design Review of the Milestone designs', () => {
  it('Explorer 1 (tutorial design): thin mass and energy are yellow, no sunlight to measure, so 7 of 9 is not passed', () => {
    const state = company('explorer1', 'juno1', EXPLORER);
    const review = designReview(state, state.design);
    expect(review.lines.slice(0, 7).every((l) => l.colour === 'green')).toBe(true);
    expect(line(state, 'spareMass')).toMatchObject({ colour: 'yellow', have: 14, need: 11.5 });
    expect(line(state, 'sparePower').applies).toBe(false);
    expect(line(state, 'spareEnergy').colour).toBe('yellow');
    expect(review).toMatchObject({ counted: 9, green: 7, passed: false });
  });

  it('TIROS-1: sunlight falls short of what it uses (red), the battery covers the gap (yellow), and it passes at 80%', () => {
    const state = company('tiros1', 'thorAble', TIROS);
    expect(line(state, 'sparePower').colour).toBe('red');
    expect(line(state, 'spareEnergy').colour).toBe('yellow');
    expect(line(state, 'spareMass').colour).toBe('green');
    expect(designReview(state, state.design)).toMatchObject({ counted: 10, green: 8, passed: true });
  });

  it('Syncom 3: every line green', () => {
    const state = company('syncom3', 'deltaD', SYNCOM);
    expect(designReview(state, state.design)).toMatchObject({ counted: 10, green: 10, share: 1, passed: true });
  });

  it('never blocks Shipping: a design that fails it can still be booked', () => {
    const state = company('explorer1', 'juno1', EXPLORER);
    choose(state.design, 'smallBattery');
    for (const part of partsNeeded(state.design)) state.parts[part] += 1;
    expect(designReview(state, state.design).passed).toBe(false);
    expect(planLaunch(state, state.design).problems).toEqual([]);
  });
});

describe('Maturity strip', () => {
  it('lights nothing before a Contract is accepted', () => {
    const state = newSiteState();
    for (const id of EXPLORER) choose(state.design, id);
    expect(maturity(state)).toEqual({
      reached: { cocktailNapkin: false, initialFeasibility: false, tradeSpace: false, pointDesign: false },
      current: null,
    });
  });

  it('step 1, Cocktail Napkin: the Contract is accepted', () => {
    const state = company('explorer1', 'juno1');
    expect(maturity(state).current).toBe('cocktailNapkin');
    expect(maturity(state).reached.initialFeasibility).toBe(false);
  });

  it('step 2, Initial Feasibility: every bar is covered', () => {
    const state = company('explorer1', 'juno1', EXPLORER);
    expect(maturity(state).current).toBe('initialFeasibility');
    choose(state.design, 'smallBattery');
    expect(maturity(state).reached.initialFeasibility).toBe(false);
  });

  it('step 3, Trade Space: a second, different design has had a Test Run for this Contract', () => {
    const state = company('explorer1', 'juno1', EXPLORER);
    recordTestRun(state, state.design);
    recordTestRun(state, state.design);
    expect(designsTested(state)).toBe(1);
    expect(maturity(state).reached.tradeSpace).toBe(false);
    choose(state.design, 'smallBattery');
    recordTestRun(state, state.design);
    choose(state.design, 'largeBattery');
    expect(designsTested(state)).toBe(2);
    expect(maturity(state).reached.tradeSpace).toBe(true);
    expect(maturity(state).current).toBe('tradeSpace');
    expect(state.testedDesigns).toEqual({ contract: 'explorer1', designs: [designKey({ ...state.design }), expect.any(String)] });
  });

  it('forgets tested designs when the next Contract is on the table', () => {
    const state = company('explorer1', 'juno1', EXPLORER);
    recordTestRun(state, state.design);
    choose(state.design, 'smallBattery');
    recordTestRun(state, state.design);
    state.contracts = [];
    state.completed.push('explorer1');
    state.history = ['vanguard1'];
    acceptContract(state, 'tiros1');
    expect(designsTested(state)).toBe(0);
    recordTestRun(state, state.design);
    expect(state.testedDesigns?.contract).toBe('tiros1');
    expect(state.testedDesigns?.designs).toHaveLength(1);
  });

  it('step 4, Point Design: the Design Review is passed', () => {
    const state = company('tiros1', 'thorAble', TIROS);
    expect(maturity(state).reached.pointDesign).toBe(true);
    recordTestRun(state, state.design);
    choose(state.design, 'smallBattery');
    recordTestRun(state, state.design);
    choose(state.design, 'largeBattery');
    expect(maturity(state)).toEqual({
      reached: { cocktailNapkin: true, initialFeasibility: true, tradeSpace: true, pointDesign: true },
      current: 'pointDesign',
    });
  });
});
