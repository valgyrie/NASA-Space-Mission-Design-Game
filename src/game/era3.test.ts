import { describe, expect, it } from 'vitest';
import { generateSite } from '../site/site';
import { flightShow } from './ascent';
import { LUNAR_NIGHT, MOON_SEND_SHARE, UPGRADE } from './balance';
import { acceptContract, availableContracts, contractById } from './contracts';
import { ERA_START_UTC, eraOf, eraStartDay, isPartOpen, milestonesDone } from './eras';
import { fly } from './flight';
import { cardsBefore } from './history';
import { LAUNCH_VEHICLES, isVehicleOpen, siteTakes, vehicleStatus } from './launchVehicles';
import { launch, planLaunch, shipMission } from './mission';
import { type SiteState, advanceDays, newSiteState, placeAssemblyHall, placeHQ } from './siteState';
import { type OptionId, checkDesign, choose, dataOf, lastsDaysOn, partsNeeded, powerOf, spacecraftMass } from './spacecraft';
import { nextUpgrade, startUpgrade } from './upgrades';
import { SAVE_VERSION, loadGame } from '../save/save';
import { DEFAULT_LOGO } from '../company/logo';
import { moonShowLength } from '../world/moonShow';

const SEED = 'K7QXM2';
const site = generateSite(SEED);

const APOLLO: OptionId[] = ['largeBus', 'foldOutPanels', 'largeBattery', 'dishAntenna', 'spin', 'noEngine', 'sciencePackage'];

/** A Company that has done every Era 2 Milestone, its HQ still at level 2. */
function eraTwoDone(): SiteState {
  const state = newSiteState();
  placeAssemblyHall(site, state).level = 3;
  placeHQ(site, state).level = 2;
  state.money = 50_000_000;
  state.completed = ['explorer1', 'tiros1', 'telstar1', 'syncom3'];
  state.history = ['explorer1Before', 'explorer1After', 'vanguard1', 'tiros1Before', 'tiros1After', 'telstar1Before', 'telstar1After', 'syncom3Before', 'syncom3After'];
  state.vehicle = 'deltaD';
  state.day = eraStartDay(2) + 900;
  return state;
}

function inEra3(): SiteState {
  const state = eraTwoDone();
  state.hq!.level = 3;
  state.day = eraStartDay(3);
  return state;
}

function design(state: SiteState, ids: OptionId[]): void {
  for (const id of ids) expect(choose(state.design, id, state), id).toBe(true);
  for (const p of partsNeeded(state.design)) state.parts[p] += 1;
}

describe('Era 3: the Moon (1969–1972)', () => {
  it('opens with the HQ Upgrade after Syncom 3 and jumps the date to 1969', () => {
    const state = eraTwoDone();
    expect(milestonesDone(state, 2)).toBe(true);
    expect(nextUpgrade('hq', state.hq!, 2)?.level).toBe(3);
    expect(startUpgrade(state, 'hq', state.hq!).ok).toBe(true);
    advanceDays(site, state, UPGRADE[3].days);
    expect(eraOf(state)).toBe(3);
    expect(new Date(ERA_START_UTC[3]).toISOString().slice(0, 10)).toBe('1969-01-01');
    expect(Math.floor(state.day)).toBe(eraStartDay(3));
    // The Deltas retired; Saturn V is NASA's own, so nothing is bookable until NASA's Contract is taken.
    expect(vehicleStatus(state, 'deltaD')).toEqual({ open: false, why: 'retired', year: 1965 });
    expect(vehicleStatus(state, 'saturnV')).toEqual({ open: false, why: 'nasa' });
    for (const part of ['sciencePackage', 'dishAntenna', 'foldOutPanels'] as const) expect(isPartOpen(state, part)).toBe(true);
    expect(isPartOpen(state, 'lander')).toBe(false);
    expect(availableContracts(state).map((c) => c.id)).toEqual(['apollo11']);
  });

  it('puts the Science Package on NASA\'s Saturn V from Pad 39A, free, in the Lunar Module\'s 45 kg', () => {
    const state = inEra3();
    expect(acceptContract(state, 'apollo11').ok).toBe(true);
    expect(state.vehicle).toBe('saturnV');
    expect(state.launchSite).toBe('kennedy39A');
    expect(isVehicleOpen(state, 'saturnV')).toBe(true);
    expect(vehicleStatus(state, 'falcon9')).toEqual({ open: false, why: 'era', era: 5 });
    expect(siteTakes('kennedy39A', 'saturnV')).toBe(true);
    expect(siteTakes('capeCanaveral', 'saturnV')).toBe(false);
    design(state, APOLLO);
    expect(spacecraftMass(state.design)).toBe(41);
    const plan = planLaunch(state, state.design);
    expect(plan.liftKg).toBe(45);
    expect(plan.rideshare).toBe(0);
    expect(plan.problems).toEqual([]);
    // Even asked for another rocket and pad, NASA's ride decides.
    expect(planLaunch(state, state.design, 'falcon9', 'wallops').vehicle).toBe('saturnV');
    // Too heavy for the Lunar Module: a Main Engine adds 24 kg.
    choose(state.design, 'mainEngine', state);
    state.parts.mainEngine += 1;
    expect(checkDesign(state, state.design).problems).toContainEqual(expect.objectContaining({ kind: 'tooHeavy', ride: 45 }));
  });

  it('shows the Saturn V development card before Apollo 11 own card', () => {
    expect(cardsBefore('apollo11')).toEqual(['saturnVBefore', 'apollo11Before']);
  });

  it('has the real Saturn V stages: five F-1, five J-2, one J-2', () => {
    const v = LAUNCH_VEHICLES.saturnV;
    expect(v.stages.map((s) => s.motors)).toEqual([5, 5, 1]);
    expect(v.stages.map((s) => s.burnS)).toEqual([162, 384, 147]);
    expect(v.liftKg.lunarOrbit).toBe(45_000);
  });
});

describe('The lunar night', () => {
  it('lights the surface for the first 14 days, then the battery must carry the night', () => {
    expect(LUNAR_NIGHT.sunDays).toBe(14);
    // 4 W through 7 dark days is 672 Wh: the Large Battery (720 Wh) covers it, the Medium (420 Wh) does not.
    expect(lastsDaysOn('moonSurface', 4, 20, 720)).toBeGreaterThan(21);
    expect(lastsDaysOn('moonSurface', 4, 20, 420)).toBeCloseTo(14 + 420 / 4 / 24, 5);
    // In orbit the same Spacecraft would never run out: sunlight is averaged over each lap.
    expect(lastsDaysOn('lowEarthOrbit', 4, 20, 420)).toBe(Infinity);
  });

  it('fails a Small Battery on the Moon, on the night, not the day', () => {
    const state = inEra3();
    acceptContract(state, 'apollo11');
    design(state, APOLLO.map((id) => (id === 'largeBattery' ? 'smallBattery' : id)));
    const check = checkDesign(state, state.design);
    expect(check.gauges.power.status).toBe('short');
    const flight = fly({ contract: 'apollo11', design: state.design, vehicle: 'saturnV', site: 'kennedy39A', tech: [] }, state.day, null);
    expect(flight.findings.find((f) => f.kind === 'power')?.ok).toBe(false);
    // Full battery through the lunar day, then it drains.
    expect(flight.batteryWh[14]).toBe(flight.batteryWh[0]);
    expect(flight.batteryWh[16]!).toBeLessThan(flight.batteryWh[14]!);
    expect(powerOf(state.design, [], {}, 'moonSurface').sunW).toBeCloseTo(20 * 0.67, 5);
  });

  it('sends a fifth from the Moon: the Simple Antenna is too weak, the Dish Antenna gets through', () => {
    expect(MOON_SEND_SHARE).toBe(0.2);
    const state = inEra3();
    acceptContract(state, 'apollo11');
    design(state, APOLLO.map((id) => (id === 'dishAntenna' ? 'simpleAntenna' : id)));
    expect(checkDesign(state, state.design).gauges.communications.status).toBe('short');
    choose(state.design, 'dishAntenna', state);
    state.parts.dishAntenna += 1;
    expect(checkDesign(state, state.design).gauges.communications.status).toBe('ok');
    expect(dataOf(state.design).sendPerDay).toBe(400);
  });
});

describe('Apollo 11 flies', () => {
  it('lands its package, plays the Moon sequence and completes Era 3', () => {
    const state = inEra3();
    acceptContract(state, 'apollo11');
    design(state, APOLLO);
    state.research = { processedKb: 2_000, tech: ['betterBatteries'] };
    expect(shipMission(state, state.design).ok).toBe(true);
    advanceDays(site, state, state.mission!.readyDay - state.day);
    let result = launch(state, SEED);
    for (let i = 0; !result && i < 40; i++) {
      advanceDays(site, state, 1);
      result = launch(state, SEED);
    }
    expect(result?.report.success).toBe(true);
    expect(result!.report.vehicle).toBe('saturnV');
    expect(state.completed).toContain('apollo11');
    expect(state.history).toContain('apollo11After');
    expect(milestonesDone(state, 3)).toBe(true);
    // The show has a 'moon' segment after 'orbit', as long as the Moon sequence.
    const show = flightShow('saturnV', result!.flight, contractById('apollo11').moonShow);
    const phases = show.map((s) => s.phase);
    expect(phases.indexOf('moon')).toBe(phases.indexOf('orbit') + 1);
    const moon = show.find((s) => s.phase === 'moon')!;
    expect(moon.moon).toEqual({ kind: 'apollo11' });
    expect(moon.playS).toBe(moonShowLength({ kind: 'apollo11' }));
    expect(phases.slice(-2)).toEqual(['mission', 'end']);
    // Saturn V goes back to NASA once its Contract is done.
    expect(state.vehicle).not.toBe('saturnV');
    // A show without a Moon sequence is unchanged.
    expect(flightShow('saturnV', result!.flight).some((s) => s.phase === 'moon')).toBe(false);
  });
});

describe('Old saves', () => {
  it('load a version 19 save, adding the new Parts with none in stock', () => {
    const state = newSiteState();
    const parts: Record<string, number> = { ...state.parts };
    const betterParts: Record<string, number[]> = { ...state.betterParts };
    for (const p of ['sciencePackage', 'dishAntenna', 'foldOutPanels', 'cubeSatBus', 'relayRadio', 'lander']) {
      delete parts[p];
      delete betterParts[p];
    }
    const old = { version: 19, company: { name: 'Old Co', logo: { ...DEFAULT_LOGO } }, site: { seed: SEED }, state: { ...state, parts, betterParts } };
    const data = new Map([['leap.save', JSON.stringify(old)]]);
    const loaded = loadGame({ getItem: (k) => data.get(k) ?? null, setItem: () => {} });
    expect(loaded?.version).toBe(SAVE_VERSION);
    expect(loaded?.state.parts.lander).toBe(0);
    expect(loaded?.state.betterParts.cubeSatBus).toEqual([]);
  });
});
