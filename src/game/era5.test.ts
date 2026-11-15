import { describe, expect, it } from 'vitest';
import { generateSite } from '../site/site';
import { flightShow } from './ascent';
import { CONTRACT_EXTRA_REWARD, CONTRACT_REWARD, SOUTH_POLE_LINK, UPGRADE } from './balance';
import { CHOICE_MILESTONES, acceptContract, availableContracts, completeContract, contractById, milestoneDone, rewardFor } from './contracts';
import { ERA_START_UTC, eraOf, eraStartDay, isPartOpen, milestonesDone } from './eras';
import { fly } from './flight';
import { cardsAfter, cardsBefore } from './history';
import { vehicleStatus } from './launchVehicles';
import { launch, planLaunch, shipMission } from './mission';
import { type SiteState, advanceDays, campaignDone, canContinueFreePlay, continueFreePlay, newSiteState, placeAssemblyHall, placeHQ } from './siteState';
import { type OptionId, checkDesign, choose, linkShare, partsNeeded, spacecraftMass } from './spacecraft';
import { nextUpgrade, startUpgrade } from './upgrades';

const SEED = 'K7QXM2';
const site = generateSite(SEED);

const CUBESAT: OptionId[] = ['cubeSatBus', 'solarCells', 'smallBattery', 'simpleAntenna', 'spin', 'noEngine', 'radiationDetector'];
const CAMERA: OptionId[] = ['mediumBus', 'foldOutPanels', 'largeBattery', 'simpleAntenna', 'spin', 'noEngine', 'tvCamera'];
const RELAY: OptionId[] = ['largeBus', 'foldOutPanels', 'largeBattery', 'dishAntenna', 'spin', 'mainEngine', 'relayRadio'];
const LANDER: OptionId[] = ['largeBus', 'foldOutPanels', 'largeBattery', 'dishAntenna', 'spin', 'lander', 'sciencePackage'];

const ERA_3_DONE = ['explorer1', 'tiros1', 'telstar1', 'syncom3', 'apollo11'] as const;

/** A Company that has done Apollo 11, its HQ still at level 3. */
function eraThreeDone(): SiteState {
  const state = newSiteState();
  placeAssemblyHall(site, state).level = 3;
  placeHQ(site, state).level = 3;
  state.money = 200_000_000;
  state.completed = [...ERA_3_DONE];
  // Vanguard 1's card unlocks Solar Cells.
  state.history = ['vanguard1'];
  state.vehicle = 'saturnV';
  state.launchSite = 'kennedy39A';
  state.day = eraStartDay(3) + 400;
  return state;
}

function inArtemisEra(): SiteState {
  const state = eraThreeDone();
  state.hq!.level = 5;
  state.day = eraStartDay(5);
  state.vehicle = 'falcon9';
  state.launchSite = 'capeCanaveral';
  return state;
}

function design(state: SiteState, ids: OptionId[]): void {
  state.design = { bus: null, power: null, battery: null, comms: null, pointing: null, propulsion: 'noEngine', payload: null };
  for (const id of ids) expect(choose(state.design, id, state), id).toBe(true);
  for (const p of partsNeeded(state.design)) state.parts[p] += 1;
}

function flyAll(state: SiteState) {
  expect(shipMission(state, state.design).ok).toBe(true);
  advanceDays(site, state, state.mission!.readyDay - state.day);
  let result = launch(state, SEED);
  for (let i = 0; !result && i < 40; i++) {
    advanceDays(site, state, 1);
    result = launch(state, SEED);
  }
  return result;
}

describe('The Artemis Era in the Campaign', () => {
  it('opens after Era 3, skipping Era 4, on 1 January 2026', () => {
    const state = eraThreeDone();
    expect(milestonesDone(state, 3)).toBe(true);
    expect(nextUpgrade('hq', state.hq!, 3)?.level).toBe(5);
    expect(startUpgrade(state, 'hq', state.hq!).ok).toBe(true);
    advanceDays(site, state, UPGRADE[5].days);
    expect(state.hq!.level).toBe(5);
    expect(eraOf(state)).toBe(5);
    expect(state.playMode).toBe('campaign');
    expect(new Date(ERA_START_UTC[5]).toISOString().slice(0, 10)).toBe('2026-01-01');
    expect(Math.floor(state.day)).toBe(eraStartDay(5));
    // Saturn V retired; Falcon 9 open; SLS is NASA's own.
    expect(state.vehicle).toBe('falcon9');
    expect(vehicleStatus(state, 'saturnV')).toEqual({ open: false, why: 'retired', year: 1973 });
    expect(vehicleStatus(state, 'sls')).toEqual({ open: false, why: 'nasa' });
    for (const part of ['cubeSatBus', 'relayRadio', 'lander'] as const) expect(isPartOpen(state, part)).toBe(true);
    expect(availableContracts(state).map((c) => c.id)).toEqual(['artemis2']);
  });

  it('flies Artemis II as a 12U CubeSat on SLS from Pad 39B, free, at most 26 kg', () => {
    const state = inArtemisEra();
    acceptContract(state, 'artemis2');
    expect([state.vehicle, state.launchSite]).toEqual(['sls', 'kennedy39B']);
    expect(vehicleStatus(state, 'falcon9')).toEqual({ open: false, why: 'ride', vehicle: 'sls' });
    design(state, CUBESAT);
    expect(spacecraftMass(state.design)).toBe(11.5);
    const plan = planLaunch(state, state.design);
    expect(plan.liftKg).toBe(26);
    expect(plan.rideshare).toBe(0);
    expect(plan.problems).toEqual([]);
    // Not a CubeSat: refused.
    design(state, CUBESAT.map((id) => (id === 'cubeSatBus' ? 'mediumBus' : id)));
    expect(checkDesign(state, state.design).problems).toContainEqual({ kind: 'needsCubeSat' });
    expect(planLaunch(state, state.design).problems).toContainEqual({ kind: 'needsCubeSat' });
    design(state, CUBESAT);
    const result = flyAll(state);
    expect(result?.report.success).toBe(true);
    expect(state.completed).toContain('artemis2');
    expect(flightShow('sls', result!.flight, contractById('artemis2').moonShow).some((s) => s.phase === 'moon')).toBe(true);
  });
});

describe('Choice Milestones', () => {
  it('offers Artemis III three ways side by side, and any one completes it', () => {
    const state = inArtemisEra();
    state.completed.push('artemis2');
    expect(availableContracts(state).map((c) => c.id)).toEqual([...CHOICE_MILESTONES.artemis3]);
    expect(cardsBefore('artemis3Relay')).toEqual(['artemis3Before']);
    acceptContract(state, 'artemis3Camera');
    expect([state.vehicle, state.launchSite]).toEqual(['falcon9', 'capeCanaveral']);
    design(state, CAMERA);
    expect(checkDesign(state, state.design).ready).toBe(true);
    const result = flyAll(state);
    expect(result?.report.success).toBe(true);
    expect(milestoneDone(state, 'artemis3')).toBe(true);
    expect(milestonesDone(state, 5)).toBe(false);
    // Artemis IV opens; the other Artemis III choices stay, for their extra reward.
    const open = availableContracts(state).map((c) => c.id);
    expect(open).toContain('artemis3Relay');
    expect(open).toContain('artemis4Mapper');
    expect(rewardFor(state, 'artemis3Relay')).toBe(CONTRACT_EXTRA_REWARD.artemis3);
    expect(rewardFor(state, 'artemis4Relay')).toBe(CONTRACT_REWARD.artemis4);
    expect(state.history).toContain('artemis3After');
    const camera = flightShow('falcon9', result!.flight, contractById('artemis3Camera').moonShow).find((s) => s.phase === 'moon');
    expect(camera?.moon).toEqual({ kind: 'artemis3', choice: 'camera' });
  });

  it('pays the extra reward for a second choice', () => {
    const state = inArtemisEra();
    state.completed.push('artemis2', 'artemis3Camera');
    acceptContract(state, 'artemis3Relay');
    const before = state.money;
    expect(completeContract(state, 'artemis3Relay')).toBe(CONTRACT_EXTRA_REWARD.artemis3);
    expect(state.money - before).toBe(CONTRACT_EXTRA_REWARD.artemis3);
  });
});

describe('The south pole and the relay rule', () => {
  it('sends Data 30% of the time from the south pole alone, 85% with the Company\'s lunar relay', () => {
    expect(linkShare('lowEarthOrbit')).toBe(1);
    expect(linkShare('lunarOrbit')).toBeCloseTo(0.2, 9);
    expect(linkShare('lunarSouthPole')).toBeCloseTo(0.2 * SOUTH_POLE_LINK.alone, 9);
    expect(linkShare('lunarSouthPole', true)).toBeCloseTo(0.2 * SOUTH_POLE_LINK.relay, 9);
    const state = inArtemisEra();
    state.completed.push('artemis2', 'artemis3Camera');
    acceptContract(state, 'artemis4CargoLander');
    design(state, LANDER);
    // 400 kB a day × a fifth × 30% = 24 kB, short of the Science Package's 30.
    expect(checkDesign(state, state.design).gauges.communications.status).toBe('short');
    state.completed.push('artemis4Relay');
    expect(checkDesign(state, state.design).gauges.communications.status).toBe('ok');
  });

  it('needs a Lander to land without the Lunar Module, and a Main Engine to stay in lunar orbit', () => {
    const state = inArtemisEra();
    state.completed.push('artemis2', 'artemis3Camera');
    acceptContract(state, 'artemis4CargoLander');
    design(state, LANDER.map((id) => (id === 'lander' ? 'noEngine' : id)));
    expect(checkDesign(state, state.design).problems).toContainEqual({ kind: 'needsLander' });
    const plan = { contract: 'artemis4CargoLander' as const, design: state.design, vehicle: 'falcon9' as const, site: 'capeCanaveral' as const, tech: [], relay: true };
    expect(fly(plan, state.day, null).findings[0]).toMatchObject({ kind: 'orbit', ok: false, noEngine: true });
    state.contracts = [];
    acceptContract(state, 'artemis4Relay');
    design(state, RELAY.map((id) => (id === 'mainEngine' ? 'noEngine' : id)));
    expect(checkDesign(state, state.design).problems).toContainEqual({ kind: 'needsEngine', moon: true });
    design(state, RELAY);
    expect(checkDesign(state, state.design).ready).toBe(true);
  });
});

describe('The finale', () => {
  it('finishes the Campaign with any Artemis IV choice, then Continue in Free Play', () => {
    const state = inArtemisEra();
    state.completed.push('artemis2', 'artemis3SpaceWeather');
    expect(campaignDone(state)).toBe(false);
    expect(contractById('artemis4Mapper').finale).toBe(true);
    acceptContract(state, 'artemis4Relay');
    design(state, RELAY);
    const result = flyAll(state);
    expect(result?.report.success).toBe(true);
    expect(cardsAfter('artemis4Mapper')).toEqual(['artemis4After']);
    expect(state.history).toContain('artemis4After');
    expect(campaignDone(state)).toBe(true);
    expect(milestonesDone(state, 5)).toBe(true);
    expect(canContinueFreePlay(state)).toBe(true);
    const flight = flightShow('falcon9', result!.flight, contractById('artemis4Relay').moonShow);
    expect(flight.find((s) => s.phase === 'moon')?.moon).toEqual({ kind: 'artemis4', choice: 'relay' });
    expect(continueFreePlay(state)).toBe(true);
    expect(state.playMode).toBe('freePlay');
    expect(eraOf(state)).toBe(5);
  });
});
