import { describe, expect, it } from 'vitest';
import { generateSite } from '../site/site';
import { flightShow } from './ascent';
import { BUILD_COST, HQ_COST, LAUNCH_PRICE, RIDESHARE_PER_KG, UPGRADE } from './balance';
import { acceptContract, availableContracts } from './contracts';
import { ERA_START_UTC, eraOf, eraStartDay, isBuildingOpen, isPartOpen, milestonesDone } from './eras';
import { fly } from './flight';
import { isVehicleOpen, liftFrom, vehicleStatus } from './launchVehicles';
import { launch, planLaunch, shipMission } from './mission';
import { type SiteState, advanceDays, build, checkBuild, newSiteState, placeAssemblyHall, placeHQ } from './siteState';
import { type OptionId, checkDesign, choose, dataOf, groundBoost, isSlotShown, isUnlocked, partsNeeded, powerOf, spacecraftMass } from './spacecraft';
import { checkUpgrade, maxLevel, nextUpgrade, startUpgrade } from './upgrades';

const SEED = 'K7QXM2';
const site = generateSite(SEED);

const TELSTAR: OptionId[] = ['mediumBus', 'solarCells', 'smallBattery', 'simpleAntenna', 'spin', 'noEngine', 'transponder'];
const SYNCOM: OptionId[] = ['largeBus', 'solarCells', 'smallBattery', 'simpleAntenna', 'spin', 'mainEngine', 'transponder'];

/** A Company that has done Era 1's Milestones, on a Site with its Assembly Hall and HQ placed. */
function eraOneDone(): SiteState {
  const state = newSiteState();
  placeAssemblyHall(site, state);
  placeHQ(site, state);
  state.money = 50_000_000;
  state.completed = ['explorer1', 'tiros1'];
  state.history = ['explorer1Before', 'explorer1After', 'vanguard1', 'tiros1Before', 'tiros1After'];
  state.vehicle = 'thorAble';
  state.day = 800;
  return state;
}

/** The same Company once its HQ has moved it into Era 2, with a level 3 Assembly Hall. */
function inEra2(): SiteState {
  const state = eraOneDone();
  state.hq!.level = 2;
  state.assemblyHall!.level = 3;
  state.vehicle = 'thorDelta';
  state.day = eraStartDay(2);
  return state;
}

function design(state: SiteState, ids: OptionId[]): void {
  for (const id of ids) expect(choose(state.design, id, state), id).toBe(true);
  for (const p of partsNeeded(state.design)) state.parts[p] += 1;
}

describe('HQ and Eras', () => {
  it('every Site starts with an HQ beside the Assembly Hall, in Era 1', () => {
    const state = newSiteState();
    expect(eraOf(state)).toBe(1);
    const hall = placeAssemblyHall(site, state);
    const hq = placeHQ(site, state);
    expect(hq.level).toBe(1);
    expect(Math.abs(hq.x - hall.x) >= 3 || Math.abs(hq.z - hall.z) >= 3).toBe(true);
    expect(Math.hypot(hq.x - hall.x, hq.z - hall.z)).toBeLessThan(12);
    expect(placeHQ(site, state)).toBe(hq);
  });

  it("can't be upgraded until Era 1's Milestones are done", () => {
    const state = eraOneDone();
    state.completed = ['explorer1'];
    expect(milestonesDone(state, 1)).toBe(false);
    expect(checkUpgrade(state, 'hq', state.hq!)).toEqual({ ok: false, problem: 'milestones' });
    state.completed.push('tiros1');
    expect(checkUpgrade(state, 'hq', state.hq!)).toEqual({ ok: true });
    expect(nextUpgrade('hq', state.hq!)).toEqual({ level: 2, cost: HQ_COST, days: UPGRADE[2].days });
  });

  it('moves the Company into Era 2 and jumps the date to 1962, moving the dates still to come', () => {
    const state = eraOneDone();
    build(site, state, 'warehouse', ...spot(state));
    const w = state.warehouses[0]!;
    // An Upgrade still under way when the Era changes: 40 days left.
    w.upgradeDay = state.day + 40;
    const warehouseLeft = 40;
    expect(startUpgrade(state, 'hq', state.hq!).ok).toBe(true);
    const before = state.money;
    advanceDays(site, state, UPGRADE[2].days);
    expect(eraOf(state)).toBe(2);
    expect(Math.floor(state.day)).toBe(eraStartDay(2));
    expect(new Date(ERA_START_UTC[2]).toISOString().slice(0, 10)).toBe('1962-01-01');
    // The warehouse's Upgrade finishes as many days after the jump as it had left before it.
    expect(w.upgradeDay! - state.day).toBeCloseTo(warehouseLeft - UPGRADE[2].days, 5);
    // Juno I and Thor-Able have retired: the planner moves to Thor-Delta.
    expect(state.vehicle).toBe('thorDelta');
    expect(state.money).toBe(before);
    // The next HQ level is Era 3's, open once Era 2's Milestones are done.
    expect(nextUpgrade('hq', state.hq!, 2)?.level).toBe(3);
    expect(checkUpgrade(state, 'hq', state.hq!)).toEqual({ ok: false, problem: 'milestones' });
  });

  it('never moves the date backwards', () => {
    const state = eraOneDone();
    state.day = eraStartDay(2) + 300;
    startUpgrade(state, 'hq', state.hq!);
    const day = state.day;
    advanceDays(site, state, UPGRADE[2].days);
    expect(eraOf(state)).toBe(2);
    expect(state.day).toBeCloseTo(day + UPGRADE[2].days, 5);
  });

  it('opens Era 2 Milestones in history order', () => {
    const done = eraOneDone();
    expect(availableContracts(done)).toEqual([]);
    expect(acceptContract(done, 'telstar1')).toEqual({ ok: false, problem: 'notYet' });
    const state = inEra2();
    expect(availableContracts(state).map((c) => c.id)).toEqual(['telstar1']);
    state.completed.push('telstar1');
    expect(availableContracts(state).map((c) => c.id)).toEqual(['syncom3']);
  });
});

describe('Era 2 Launch Vehicles', () => {
  it('Thor-Delta and Delta D open in Era 2, when Juno I and Thor-Able retire', () => {
    const one = eraOneDone();
    expect(vehicleStatus(one, 'thorDelta')).toEqual({ open: false, why: 'era', era: 2 });
    expect(isVehicleOpen(one, 'thorAble')).toBe(true);
    const two = inEra2();
    expect(isVehicleOpen(two, 'thorDelta')).toBe(true);
    expect(isVehicleOpen(two, 'deltaD')).toBe(true);
    expect(vehicleStatus(two, 'juno1')).toEqual({ open: false, why: 'retired', year: 1958 });
    expect(vehicleStatus(two, 'thorAble')).toEqual({ open: false, why: 'retired', year: 1960 });
  });

  it('use their real lift: Low Earth Orbit, and only the Deltas reach a geostationary transfer orbit', () => {
    expect(liftFrom('thorDelta', 'lowEarthOrbit', 'capeCanaveral')).toBe(226);
    expect(liftFrom('deltaD', 'lowEarthOrbit', 'capeCanaveral')).toBe(450);
    expect(liftFrom('thorDelta', 'geostationary', 'capeCanaveral')).toBe(45);
    expect(liftFrom('deltaD', 'geostationary', 'capeCanaveral')).toBe(104);
    expect(liftFrom('thorAble', 'geostationary', 'capeCanaveral')).toBe(0);
  });
});

describe('Ground Stations', () => {
  it('open in Era 2 and multiply what antennas send home', () => {
    const one = eraOneDone();
    expect(isBuildingOpen(one, 'groundStation')).toBe(false);
    const at = spot(one);
    expect(checkBuild(site, one, 'groundStation', ...at)).toEqual({ ok: false, problem: 'era' });
    const state = inEra2();
    expect(groundBoost(state)).toBe(1);
    expect(build(site, state, 'groundStation', ...at)).toEqual({ ok: true });
    expect(state.money).toBe(50_000_000 - BUILD_COST.groundStation);
    expect(groundBoost(state)).toBe(2);
    state.groundStations[0]!.level = 2;
    expect(groundBoost(state)).toBe(2.5);
  });
});

describe('Telstar 1 Milestone', () => {
  it('needs a Ground Station: a Simple Antenna alone sends too little of the transponder\'s Data', () => {
    const state = inEra2();
    acceptContract(state, 'telstar1');
    design(state, TELSTAR);
    expect(dataOf(state.design).dataPerDay).toBe(90);
    let check = checkDesign(state, state.design);
    expect(check.problems).toContainEqual({ kind: 'commsShort', sendPerDay: 50, dataPerDay: 90, stations: true });
    expect(check.ready).toBe(false);
    build(site, state, 'groundStation', ...spot(state));
    check = checkDesign(state, state.design);
    expect(check.gauges.communications.status).toBe('ok');
    // Solar Cells run it on sunlight alone, so the battery never empties.
    expect(check.lastsDays).toBe(Infinity);
    expect(check.ready).toBe(true);
  });

  it('pays for the whole Thor-Delta, as AT&T did: the price does not change with mass', () => {
    const state = inEra2();
    acceptContract(state, 'telstar1');
    design(state, TELSTAR);
    const plan = planLaunch(state, state.design, 'thorDelta');
    expect(plan.wholeLaunch).toBe(true);
    expect(plan.rideshare).toBe(LAUNCH_PRICE.thorDelta);
    choose(state.design, 'largeBattery');
    state.parts.largeBattery += 1;
    expect(planLaunch(state, state.design, 'thorDelta').rideshare).toBe(LAUNCH_PRICE.thorDelta);
  });

  it('flies, keeps the Ground Stations it shipped with, and unlocks its after card', () => {
    const state = inEra2();
    acceptContract(state, 'telstar1');
    design(state, TELSTAR);
    build(site, state, 'groundStation', ...spot(state));
    expect(shipMission(state, state.design, 'thorDelta').ok).toBe(true);
    expect(state.mission!.ground).toBe(2);
    state.day = state.mission!.readyDay;
    // Find a calm day to launch.
    let result = launch(state, SEED);
    for (let d = 1; !result && d < 30; d++) {
      state.day += 1;
      result = launch(state, SEED);
    }
    expect(result).not.toBeNull();
    const comms = result!.report.findings.find((f) => f.kind === 'comms');
    expect(comms?.kind === 'comms' && comms.sendPerDay).toBeGreaterThan(90);
    if (result!.report.success) expect(state.history).toContain('telstar1After');
  });
});

describe('Syncom 3 Milestone', () => {
  function syncomState(): SiteState {
    const state = inEra2();
    state.completed.push('telstar1');
    acceptContract(state, 'syncom3');
    build(site, state, 'groundStation', ...spot(state));
    return state;
  }

  it('needs a Main Engine to climb from the transfer orbit to geostationary orbit', () => {
    const state = syncomState();
    state.vehicle = 'deltaD';
    design(state, SYNCOM);
    choose(state.design, 'noEngine');
    expect(checkDesign(state, state.design).problems).toContainEqual({ kind: 'needsEngine' });
    const plan = { contract: 'syncom3' as const, design: state.design, vehicle: 'deltaD' as const, tech: [], ground: 2 };
    const stuck = fly(plan, 0, null);
    const orbit = stuck.findings.find((f) => f.kind === 'orbit');
    expect(orbit).toMatchObject({ ok: false, noEngine: true, failedStage: null });
    expect(flightShow('deltaD', stuck).at(-1)).toMatchObject({ phase: 'lost', stuck: true });

    choose(state.design, 'mainEngine');
    const flight = fly({ ...plan, design: state.design }, 0, null);
    expect(flight.success).toBe(true);
    expect(checkDesign(state, state.design).ready).toBe(true);
  });

  it('is too heavy for Thor-Delta with a Main Engine on board, and fits Delta D', () => {
    const state = syncomState();
    design(state, SYNCOM);
    expect(spacecraftMass(state.design)).toBe(48);
    expect(planLaunch(state, state.design, 'thorDelta').problems).toContainEqual({ kind: 'tooHeavy', overKg: 3 });
    const plan = planLaunch(state, state.design, 'deltaD');
    expect(plan.ok).toBe(true);
    expect(plan.rideshare).toBe(48 * RIDESHARE_PER_KG.deltaD);
    expect(planLaunch(state, state.design, 'thorAble').problems).toContainEqual({ kind: 'cantReach' });
  });

  it('needs the Large Bus (Assembly Hall level 3), which opens in Era 2', () => {
    const one = eraOneDone();
    expect(isUnlocked(one, 'largeBus')).toBe(false);
    expect(isUnlocked(one, 'mainEngine')).toBe(false);
    expect(isPartOpen(one, 'transponder')).toBe(false);
    expect(isSlotShown(one, 'propulsion')).toBe(false);
    expect(maxLevel('assemblyHall', 1)).toBe(2);
    expect(maxLevel('assemblyHall', 2)).toBe(3);
    const state = syncomState();
    state.assemblyHall!.level = 2;
    design(state, SYNCOM);
    expect(checkDesign(state, state.design).problems).toContainEqual({ kind: 'hallTooSmall', bus: 'largeBus', need: 3, level: 2 });
    choose(state.design, 'mediumBus');
    expect(checkDesign(state, state.design).problems.map((p) => p.kind)).toContain('busFull');
  });

  it('is in sunlight 99% of the time up there', () => {
    const state = syncomState();
    design(state, SYNCOM);
    expect(powerOf(state.design, [], {}, 'geostationary').sunW).toBeCloseTo(3 * 0.99, 5);
    expect(powerOf(state.design, [], {}, 'lowEarthOrbit').sunW).toBeCloseTo(3 * 0.6, 5);
  });
});

/** A free spot for a 3 × 3 building on the test Site. */
function spot(state: SiteState): [number, number] {
  for (let z = 2; z < site.size - 2; z++) {
    for (let x = 2; x < site.size - 2; x++) {
      if (checkBuild(site, { ...state, money: Infinity, hq: { x: 0, z: 0, level: 2, upgradeDay: null } }, 'groundStation', x, z).ok) {
        if (checkBuild(site, state, 'warehouse', x, z).ok) return [x, z];
      }
    }
  }
  throw new Error('no free spot');
}
