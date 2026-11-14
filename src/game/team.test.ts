import { describe, expect, it } from 'vitest';
import { acceptContract } from './contracts';
import { REVIEW_LINES } from './designReview';
import { toggleGroundTest } from './groundTests';
import { launch, shipMission, shipPlan } from './mission';
import { type SiteState, newSiteState } from './siteState';
import { type OptionId, SLOTS, choose, partsNeeded } from './spacecraft';
import {
  LINE_ROLE,
  PLAYER_NAME_MAX,
  ROLE_IDS,
  SLOT_ROLE,
  canSign,
  checkPlayerName,
  isSigned,
  isTeam,
  linesOf,
  mayChange,
  passMouse,
  roleHolder,
  rolePart,
  rolesOf,
  setPlayerColour,
  setPlayerName,
  setTeamSize,
  sign,
  slotsOf,
  waitingFor,
  withoutPlayerNames,
} from './team';
import { loadGame, saveGame, SAVE_KEY, SAVE_VERSION } from '../save/save';
import { DEFAULT_LOGO } from '../company/logo';

const TIROS: OptionId[] = ['mediumBus', 'solarCells', 'largeBattery', 'simpleAntenna', 'spin', 'tvCamera'];

/** A Company ready to ship TIROS-1 on Thor-Able, with the Parts in the Warehouse. */
function tiros(players: 0 | 2 | 3 | 4 = 3): SiteState {
  const state = newSiteState();
  state.money = 50_000_000;
  state.assemblyHall = { x: 0, z: 0, level: 3, upgradeDay: null };
  state.completed = ['explorer1'];
  state.history = ['vanguard1'];
  state.reports = [];
  state.vehicle = 'thorAble';
  acceptContract(state, 'tiros1');
  for (const id of TIROS) choose(state.design, id);
  for (const p of partsNeeded(state.design)) state.parts[p] = 2;
  setTeamSize(state, players);
  return state;
}

/** Each role signs with its own player at the mouse. */
function signAll(state: SiteState): void {
  for (const role of ROLE_IDS) {
    passMouse(state, roleHolder(state.team!.players.length, role));
    expect(sign(state, role)).toBe(true);
  }
}

describe('Team Mode roles', () => {
  it('gives every slot and every Design Review line to one role', () => {
    for (const slot of SLOTS) expect(ROLE_IDS).toContain(SLOT_ROLE[slot]);
    for (const id of REVIEW_LINES) expect(ROLE_IDS).toContain(LINE_ROLE[id]);
    expect(slotsOf('power')).toEqual(['power', 'battery']);
    expect(slotsOf('comms')).toEqual(['comms']);
    expect(slotsOf('science')).toEqual(['pointing', 'payload']);
    expect(linesOf('power')).toEqual(['power', 'sparePower', 'spareEnergy']);
    expect(linesOf('science')).toEqual(['payload', 'data']);
    expect(linesOf('lead')).toEqual(['orbitMass', 'time', 'budget', 'spareMass']);
  });

  it('shares four roles among two, three or four players', () => {
    expect(rolesOf(2, 0)).toEqual(['lead', 'science']);
    expect(rolesOf(2, 1)).toEqual(['power', 'comms']);
    expect(rolesOf(3, 0)).toEqual(['lead']);
    expect(rolesOf(3, 1)).toEqual(['power']);
    expect(rolesOf(3, 2)).toEqual(['comms', 'science']);
    for (let p = 0; p < 4; p++) expect(rolesOf(4, p)).toEqual([ROLE_IDS[p]]);
  });

  it('switches on with a colour each, keeps players when the number changes, and switches off', () => {
    const state = tiros(0);
    expect(state.team).toBeUndefined();
    expect(mayChange(state, 'power')).toBe(true);
    setTeamSize(state, 2);
    expect(state.team!.players.map((p) => p.colour)).toEqual(['blue', 'orange']);
    setPlayerName(state, 1, '  Ada  ');
    setTeamSize(state, 4);
    expect(state.team!.players).toHaveLength(4);
    expect(state.team!.players[1]!.name).toBe('Ada');
    expect(new Set(state.team!.players.map((p) => p.colour)).size).toBe(4);
    setTeamSize(state, 0);
    expect(state.team).toBeUndefined();
  });

  it('lets only the player at the mouse change their roles', () => {
    const state = tiros(3);
    expect(mayChange(state, 'lead')).toBe(true);
    expect(mayChange(state, 'power')).toBe(false);
    expect(passMouse(state, 2)).toBe(true);
    expect(mayChange(state, 'comms')).toBe(true);
    expect(mayChange(state, 'science')).toBe(true);
    expect(mayChange(state, 'lead')).toBe(false);
    expect(passMouse(state, 3)).toBe(false);
    expect(state.team!.atMouse).toBe(2);
  });

  it('checks nicknames and swaps colours so each player keeps their own', () => {
    expect(checkPlayerName('')).toEqual({ ok: true, name: '' });
    expect(checkPlayerName(' Sam   K ')).toEqual({ ok: true, name: 'Sam K' });
    expect(checkPlayerName('x'.repeat(PLAYER_NAME_MAX + 1))).toEqual({ ok: false, problem: 'tooLong' });
    expect(checkPlayerName('sh1t')).toEqual({ ok: false, problem: 'badWord' });
    const state = tiros(2);
    expect(setPlayerName(state, 0, 'sh1t').ok).toBe(false);
    expect(state.team!.players[0]!.name).toBe('');
    setPlayerColour(state, 0, 'orange');
    expect(state.team!.players.map((p) => p.colour)).toEqual(['orange', 'blue']);
  });
});

describe('signing the Design Review', () => {
  it('signs a role only for its own player at the mouse', () => {
    const state = tiros(3);
    expect(sign(state, 'power')).toBe(false);
    expect(isSigned(state, 'power')).toBe(false);
    passMouse(state, 1);
    expect(sign(state, 'power')).toBe(true);
    expect(isSigned(state, 'power')).toBe(true);
    expect(sign(state, 'lead')).toBe(false);
    expect(waitingFor(state)).toEqual(['lead', 'comms', 'science']);
  });

  it('needs the role\'s slots filled before it can sign', () => {
    const state = tiros(3);
    state.design.battery = null;
    passMouse(state, 1);
    expect(canSign(state, 'power')).toBe(false);
    expect(sign(state, 'power')).toBe(false);
    expect(canSign(state, 'comms')).toBe(true);
  });

  it('clears a signature when that role changes a slot, and keeps the others', () => {
    const state = tiros(3);
    signAll(state);
    expect(waitingFor(state)).toEqual([]);
    passMouse(state, 2);
    choose(state.design, 'radiationDetector');
    expect(isSigned(state, 'science')).toBe(false);
    expect(isSigned(state, 'comms')).toBe(true);
    expect(isSigned(state, 'lead')).toBe(true);
    // Putting it back is the design that was signed.
    choose(state.design, 'tvCamera');
    expect(waitingFor(state)).toEqual([]);
  });

  it('clears the Mission lead\'s signature for another Launch Vehicle or Launch Site', () => {
    const state = tiros(4);
    signAll(state);
    state.launchSite = state.launchSite === 'capeCanaveral' ? 'wallops' : 'capeCanaveral';
    expect(waitingFor(state)).toEqual(['lead']);
  });

  it('clears a signature when the role ticks one of its Ground Tests', () => {
    const state = tiros(4);
    signAll(state);
    toggleGroundTest(state, 'vibration', true);
    expect(isSigned(state, 'power')).toBe(false);
    expect(isSigned(state, 'comms')).toBe(true);
    toggleGroundTest(state, 'dayInTheLife', true);
    expect(isSigned(state, 'comms')).toBe(false);
  });

  it('clears a signature when another role turns one of its lines another colour', () => {
    const state = tiros(4);
    signAll(state);
    // The Mission lead swaps to a rocket too small for the design: Power did nothing, and stays signed.
    state.vehicle = 'juno1';
    expect(isSigned(state, 'lead')).toBe(false);
    expect(isSigned(state, 'power')).toBe(true);
    state.vehicle = 'thorAble';
    expect(waitingFor(state)).toEqual([]);
    // Power drops the Solar Cells: the Mission lead's own choices are the same, but nothing was signed for this.
    passMouse(state, 1);
    choose(state.design, 'batteriesOnly');
    expect(isSigned(state, 'power')).toBe(false);
  });

  it('keeps the design from shipping until every role has signed', () => {
    const state = tiros(3);
    const waiting = shipPlan(state, state.design);
    expect(waiting.ok).toBe(false);
    expect(waiting.problems).toEqual([{ kind: 'unsigned', roles: ['lead', 'power', 'comms', 'science'] }]);
    expect(shipMission(state, state.design).ok).toBe(false);
    expect(state.mission).toBeNull();
    signAll(state);
    expect(shipPlan(state, state.design).ok).toBe(true);
    setPlayerName(state, 1, 'Ada');
    expect(shipMission(state, state.design).ok).toBe(true);
    expect(state.mission!.team!.map((p) => p.name)).toEqual(['', 'Ada', '']);
    // The next design starts unsigned.
    expect(state.team!.signed).toEqual({});
  });

  it('ships as before without Team Mode', () => {
    const state = tiros(0);
    expect(shipMission(state, state.design).ok).toBe(true);
    expect(state.mission!.team).toBeUndefined();
  });
});

describe('Team Mode in the Mission Report and the save', () => {
  function flown(): SiteState {
    const state = tiros(3);
    setPlayerName(state, 0, 'Kit');
    signAll(state);
    shipMission(state, state.design);
    state.day = state.mission!.readyDay;
    for (let i = 0; i < 60 && !launch(state, 'TEAM41'); i++) state.day += 1;
    return state;
  }

  it('files the players with the report and finds each role\'s part', () => {
    const state = flown();
    const report = state.reports.at(-1)!;
    expect(report.team!.map((p) => p.name)).toEqual(['Kit', '', '']);
    expect(rolePart(report, 'power')!.kind).toBe('power');
    expect(rolePart(report, 'comms')!.kind).toBe('comms');
    expect(rolePart(report, 'science')!.kind).toBe('payload');
    expect(rolePart(report, 'lead')!.kind).toBe('orbit');
    // The Mission lead answers for the deadline when that is what went wrong.
    const late = { findings: [{ kind: 'orbit' as const, ok: true, orbit: 'lowEarthOrbit' as const, vehicle: 'thorAble' as const, massKg: 1, liftKg: 2 }, { kind: 'time' as const, ok: false, endDay: 9, deadlineDay: 5 }] };
    expect(rolePart(late, 'lead')!.kind).toBe('time');
  });

  it('saves and loads a team, and refuses a broken one', () => {
    const state = flown();
    let stored = '';
    const storage = { getItem: () => stored, setItem: (_k: string, v: string) => void (stored = v) };
    saveGame(storage, { version: SAVE_VERSION, company: { name: 'Test', logo: { ...DEFAULT_LOGO } }, site: { seed: 'TEAM41' }, state });
    expect(SAVE_KEY).toBe('leap.save');
    const loaded = loadGame(storage)!;
    expect(loaded.state.team!.players[0]!.name).toBe('Kit');
    expect(loaded.state.reports.at(-1)!.team).toHaveLength(3);
    expect(isTeam({ players: [{ name: 'A', colour: 'blue' }], atMouse: 0, signed: {} })).toBe(false);
    expect(isTeam({ players: [{ name: 'A', colour: 'blue' }, { name: 'B', colour: 'red' }], atMouse: 0, signed: {} })).toBe(false);
    expect(isTeam({ players: [{ name: 'A', colour: 'blue' }, { name: 'B', colour: 'pink' }], atMouse: 2, signed: {} })).toBe(false);
    expect(isTeam({ players: [{ name: 'A', colour: 'blue' }, { name: 'B', colour: 'pink' }], atMouse: 1, signed: { boss: 'x' } })).toBe(false);
    expect(isTeam({ players: [{ name: 'A', colour: 'blue' }, { name: 'B', colour: 'pink' }], atMouse: 1, signed: { power: 'x' } })).toBe(true);
  });

  it('blanks every player name for a cloud save and leaves the game alone', () => {
    const state = flown();
    signAll(state);
    const cloud = withoutPlayerNames(state);
    expect(JSON.stringify(cloud)).not.toContain('Kit');
    expect(cloud.team!.players.map((p) => p.colour)).toEqual(state.team!.players.map((p) => p.colour));
    expect(cloud.reports.at(-1)!.team!.map((p) => p.name)).toEqual(['', '', '']);
    expect(state.team!.players[0]!.name).toBe('Kit');
    expect(state.reports.at(-1)!.team![0]!.name).toBe('Kit');
  });
});
