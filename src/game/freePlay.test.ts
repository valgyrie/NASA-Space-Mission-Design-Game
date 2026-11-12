import { describe, expect, it } from 'vitest';
import { DEFAULT_LOGO } from '../company/logo';
import { generateSite } from '../site/site';
import { SAVE_KEY, SAVE_VERSION, type SaveData, loadGame, saveGame } from '../save/save';
import { contractText } from '../ui/format';
import { findingText } from '../ui/missionReport';
import { CONTRACT_IDS, acceptContract, availableContracts, completeContract, contractById, deadlineDay, expireContracts } from './contracts';
import { MODERN_ERA, eraOf, eraStartDay } from './eras';
import { fly } from './flight';
import { historyCardFor } from './history';
import { isVehicleOpen } from './launchVehicles';
import { launch, shipMission, testRunFor } from './mission';
import { JPL } from './places';
import { canContinueFreePlay, continueFreePlay, newSiteState, placeAssemblyHall, placeHQ } from './siteState';
import { type OptionId, checkDesign, choose, isUnlocked, partsNeeded } from './spacecraft';
import { satellitesInOrbit } from './space';
import { tutorialStep } from './tutorial';

const site = generateSite('K7QXM2');
const modern = () => newSiteState({ lat: -33.86, lon: 151.21, start: 'anywhere' }, 'easy', 'freePlay');

function storage() {
  const data = new Map<string, string>();
  return { data, getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => { data.set(k, v); } };
}

function game(state = modern()): SaveData {
  return { version: SAVE_VERSION, company: { name: 'Comet Works', logo: { ...DEFAULT_LOGO } }, site: { seed: 'K7QXM2' }, state };
}

describe('Free Play', () => {
  it('starts a modern Company outside the US, with existing Parts and a modern Launch Vehicle', () => {
    const state = modern();
    expect(eraOf(state)).toBe(MODERN_ERA);
    expect(state.day).toBe(eraStartDay(MODERN_ERA));
    expect(state.place.lon).toBe(151.21);
    expect(placeHQ(site, state).level).toBe(MODERN_ERA);
    expect(placeAssemblyHall(site, state).level).toBe(1);
    expect(isUnlocked(state, 'solarCells')).toBe(true);
    expect(isUnlocked(state, 'mainEngine')).toBe(true);
    expect(tutorialStep(state)).toBeNull();
    expect(isVehicleOpen(state, 'falcon9')).toBe(true);
    for (const id of ['juno1', 'thorAble', 'thorDelta', 'deltaD'] as const) expect(isVehicleOpen(state, id)).toBe(false);
    expect(isVehicleOpen(newSiteState(), 'falcon9')).toBe(false);
  });

  it('keeps three varied, stable offers, replaces completed work and retries missed deadlines', () => {
    const state = modern();
    const offers = availableContracts(state);
    expect(offers.map((c) => c.template)).toEqual(['survey', 'weather', 'relay']);
    expect(new Set(offers.map((c) => c.reward)).size).toBe(3);
    expect(availableContracts(state)).toEqual(offers);
    const id = offers[0]!.id;
    expect(acceptContract(state, id)).toEqual({ ok: true });
    expect(acceptContract(state, 'free-999')).toEqual({ ok: false, problem: 'notYet' });
    expect(acceptContract(state, 'explorer1')).toEqual({ ok: false, problem: 'notYet' });
    expect(availableContracts(state)).toHaveLength(3);
    expect(availableContracts(state).map((c) => c.id)).not.toContain(id);
    state.day = deadlineDay(state.contracts[0]!);
    expect(expireContracts(state)).toEqual([id]);
    expect(availableContracts(state)[0]).toEqual(offers[0]);
    expect(acceptContract(state, id).ok).toBe(true);
    const money = state.money;
    expect(completeContract(state, id)).toBe(offers[0]!.reward);
    expect(state.money).toBe(money + offers[0]!.reward);
    expect(availableContracts(state).map((c) => c.id)).not.toContain(id);
    expect(historyCardFor(id, 'before')).toBeNull();
    expect(contractText(id)).toBe('Radiation survey 1');
  });

  it('flies all generated objective types through the same design, Test Run and Launch rules', () => {
    for (const contract of availableContracts(modern())) {
      const state = modern();
      state.money = 20_000_000;
      placeHQ(site, state);
      placeAssemblyHall(site, state).level = 3;
      state.groundStations.push({ x: 1, z: 1, level: 1, upgradeDay: null });
      expect(acceptContract(state, contract.id).ok).toBe(true);
      const geo = contract.template === 'relay';
      const ids: OptionId[] = [geo ? 'largeBus' : 'mediumBus', 'solarCells', 'smallBattery', 'simpleAntenna', 'spin', geo ? 'mainEngine' : 'noEngine', geo ? 'transponder' : contract.template === 'weather' ? 'tvCamera' : 'radiationDetector'];
      for (const id of ids) expect(choose(state.design, id, state)).toBe(true);
      for (const part of partsNeeded(state.design)) { state.parts[part] += 1; state.betterParts[part] = [1]; }
      expect(checkDesign(state, state.design).ready).toBe(true);
      expect(testRunFor(state, 'K7QXM2', state.design).asLabelled.success).toBe(true);
      expect(shipMission(state, state.design).ok).toBe(true);
      state.day = state.mission!.readyDay;
      let result = launch(state, 'K7QXM2');
      for (let d = 0; !result && d < 40; d++) { state.day += 1; result = launch(state, 'K7QXM2'); }
      expect(result?.report.success).toBe(true);
      expect(state.completed).toContain(contract.id);
      expect(state.patches.at(-1)?.contract).toBe(contract.id);
      expect(satellitesInOrbit(state)[0]?.orbitKm).toEqual(contract.orbitKm);
      const failure = fly({ contract: contract.id, design: state.design, vehicle: 'falcon9', tech: [] }, state.day, null, undefined, 2);
      expect(findingText(failure.findings[0]!)).toContain("Falcon 9's stage 2 failed");
    }
  });

  it('continues the same Campaign Company and shifts pending Upgrades without changing history or stock', () => {
    const state = newSiteState();
    placeHQ(site, state).level = 2;
    placeAssemblyHall(site, state);
    expect(continueFreePlay(state)).toBe(false);
    state.completed = [...CONTRACT_IDS];
    state.day = eraStartDay(2) + 100;
    state.warehouses.push({ x: 1, z: 1, level: 1, upgradeDay: state.day + 9 });
    state.stock.copper = 125;
    state.parts.smallBus = 2;
    state.history = ['explorer1Before', 'vanguard1'];
    state.patches = [{ contract: 'explorer1', day: 40 }];
    const old = structuredClone(state);
    expect(canContinueFreePlay(state)).toBe(true);
    expect(continueFreePlay(state)).toBe(true);
    expect(state.day).toBe(eraStartDay(MODERN_ERA));
    expect(state.warehouses[0]!.upgradeDay! - state.day).toBe(9);
    for (const key of ['money', 'place', 'stock', 'parts', 'completed', 'history', 'patches', 'research', 'assemblyHall'] as const) expect(state[key]).toEqual(old[key]);
    expect(state.vehicle).toBe('falcon9');
    expect(continueFreePlay(state)).toBe(false);
    const late = newSiteState();
    late.completed = [...CONTRACT_IDS];
    late.day = eraStartDay(MODERN_ERA) + 10;
    expect(continueFreePlay(late)).toBe(true);
    expect(late.day).toBe(eraStartDay(MODERN_ERA) + 10);
  });

  it('keeps Free Play offers, accepted work and a shipping Mission through reload', () => {
    const saved = game();
    placeHQ(site, saved.state);
    placeAssemblyHall(site, saved.state);
    acceptContract(saved.state, 'free-0');
    const ids: OptionId[] = ['smallBus', 'solarCells', 'smallBattery', 'simpleAntenna', 'spin', 'noEngine', 'radiationDetector'];
    for (const id of ids) choose(saved.state.design, id, saved.state);
    for (const p of partsNeeded(saved.state.design)) saved.state.parts[p] += 1;
    expect(shipMission(saved.state, saved.state.design).ok).toBe(true);
    const store = storage();
    expect(saveGame(store, saved)).toBe(true);
    expect(loadGame(store)).toEqual(saved);
    expect(availableContracts(loadGame(store)!.state)).toEqual(availableContracts(saved.state));
    expect(contractById(loadGame(store)!.state.mission!.contract)).toEqual(contractById('free-0'));
  });

  it('migrates version 17 into Campaign without changing the Company or a shipping Mission', () => {
    const saved = game(newSiteState(JPL, 'advanced'));
    acceptContract(saved.state, 'explorer1');
    for (const id of ['smallBus', 'batteriesOnly', 'largeBattery', 'simpleAntenna', 'spin', 'radiationDetector'] as OptionId[]) choose(saved.state.design, id, saved.state);
    for (const p of partsNeeded(saved.state.design)) saved.state.parts[p] += 1;
    expect(shipMission(saved.state, saved.state.design).ok).toBe(true);
    const { playMode: _mode, ...oldState } = saved.state;
    const store = storage();
    store.setItem(SAVE_KEY, JSON.stringify({ ...saved, version: 17, state: oldState }));
    expect(loadGame(store)).toEqual(saved);
  });

  it('rejects invalid saved play modes and generated Contract IDs', () => {
    for (const bad of ['free--1', 'free-01', 'free-1.5', 'free-1000000000', 'free-NaN', 'unknown']) {
      const saved = game();
      const store = storage();
      store.setItem(SAVE_KEY, JSON.stringify({ ...saved, state: { ...saved.state, completed: [bad] } }));
      expect(loadGame(store), bad).toBeNull();
    }
    const saved = game();
    const store = storage();
    store.setItem(SAVE_KEY, JSON.stringify({ ...saved, state: { ...saved.state, playMode: 'sandbox' } }));
    expect(loadGame(store)).toBeNull();
  });
});
