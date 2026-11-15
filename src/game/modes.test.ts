import { describe, expect, it } from 'vitest';
import { DEFAULT_LOGO } from '../company/logo';
import { SAVE_KEY, SAVE_VERSION, type SaveData, loadGame, saveGame } from '../save/save';
import { generateSite } from '../site/site';
import {
  DEPOSIT_KG_PER_TILE,
  EXPLORER_PACE,
  GRANT_AGAIN,
  MINE_OUTPUT_PER_DAY,
  OFFER_DAYS,
  STARTUP_GRANT,
  TEST_RUN_FEE,
} from './balance';
import { acceptContract, availableContracts, offerDaysLeft, questionOffers, refreshOffers } from './contracts';
import { depositLeft } from './deposits';
import { grantDue, payGrant } from './grant';
import { explorerRefund, launch, planLaunch, shipMission } from './mission';
import { isDirector, isExplorer, switchToDirector } from './modes';
import { JPL, shippingTo } from './places';
import {
  type SiteState,
  advanceDays,
  build,
  checkBuild,
  mineDeposit,
  mineEmpty,
  mineOutput,
  newSiteState,
  outputPerDay,
  placeAssemblyHall,
  placeHQ,
} from './siteState';
import { type Design, type OptionId, buyMissing, choose, emptyDesign, partsNeeded } from './spacecraft';
import { checkTestRun, payTestRun, testRunFee } from './testRunFee';
import { evaluateWeekly, weeklyRules, weeklyState, weeklyTestRun } from './weekly';
import { contractById } from './contracts';
import { contractNeeds } from './spacecraft';

const SEED = 'K7QXM2';
const site = generateSite(SEED);
const director = (playMode: 'campaign' | 'freePlay' = 'freePlay') => newSiteState(JPL, 'advanced', playMode);
const explorer = (playMode: 'campaign' | 'freePlay' = 'freePlay') => newSiteState(JPL, 'easy', playMode);

const EXPLORER_1: OptionId[] = ['smallBus', 'batteriesOnly', 'largeBattery', 'simpleAntenna', 'spin', 'radiationDetector'];
const SURVEY: OptionId[] = ['smallBus', 'solarCells', 'smallBattery', 'simpleAntenna', 'spin', 'noEngine', 'radiationDetector'];

function design(ids: OptionId[]): Design {
  const d = emptyDesign();
  for (const id of ids) choose(d, id);
  return d;
}

/** A tile where a copper Mine can stand. */
function copperSpot(): [number, number] {
  for (let i = 0; i < site.tiles.length; i++) {
    const x = i % site.size;
    const z = Math.floor(i / site.size);
    if (site.tiles[i]!.deposit === 'copper' && checkBuild(site, newSiteState(), 'mine', x, z).ok) return [x, z];
  }
  throw new Error('no copper');
}

/** Fly the Mission waiting at the Launch Site on the first day the weather allows. */
function launchWhenClear(state: SiteState) {
  state.day = Math.max(state.day, state.mission!.readyDay);
  let result = launch(state, SEED);
  for (let d = 0; !result && d < 60; d++) {
    state.day += 1;
    result = launch(state, SEED);
  }
  return result;
}

describe('Game modes', () => {
  it('names the two modes by their ids', () => {
    expect(isDirector(director())).toBe(true);
    expect(isExplorer(explorer())).toBe(true);
    expect(isDirector(explorer())).toBe(false);
  });
});

describe('Contracts on the board expire (Mission Director)', () => {
  it('replaces Free Play offers nobody accepts after OFFER_DAYS, with the next IDs', () => {
    const state = director();
    const first = availableContracts(state).map((c) => c.id);
    expect(first).toEqual(['free-0', 'free-1', 'free-2']);
    refreshOffers(state);
    expect(offerDaysLeft(state, 'free-0')).toBe(OFFER_DAYS);
    advanceDays(site, state, OFFER_DAYS - 1);
    expect(offerDaysLeft(state, 'free-0')).toBe(1);
    expect(availableContracts(state).map((c) => c.id)).toEqual(first);
    advanceDays(site, state, 1);
    expect(state.expiredOffers).toEqual(first);
    expect(availableContracts(state).map((c) => c.id)).toEqual(['free-3', 'free-4', 'free-5']);
    expect(offerDaysLeft(state, 'free-3')).toBe(OFFER_DAYS);
    expect(acceptContract(state, 'free-0')).toEqual({ ok: false, problem: 'notYet' });
  });

  it('dates each offer from the day it appeared, and keeps accepted Contracts', () => {
    const state = director();
    refreshOffers(state);
    advanceDays(site, state, 30);
    expect(acceptContract(state, 'free-1').ok).toBe(true);
    advanceDays(site, state, 1);
    expect(offerDaysLeft(state, 'free-3')).toBe(OFFER_DAYS);
    expect(offerDaysLeft(state, 'free-1')).toBeNull();
    advanceDays(site, state, 29);
    expect(state.expiredOffers).toEqual(['free-0', 'free-2']);
    expect(state.contracts.map((c) => c.id)).toEqual(['free-1']);
    expect(availableContracts(state).map((c) => c.id)).toEqual(['free-3', 'free-4', 'free-5']);
  });

  it('never expires offers in Explorer, Campaign Milestones, or the question Contracts', () => {
    const easy = explorer();
    advanceDays(site, easy, 500);
    expect(easy.expiredOffers).toEqual([]);
    expect(availableContracts(easy).map((c) => c.id)).toEqual(['free-0', 'free-1', 'free-2']);
    expect(offerDaysLeft(easy, 'free-0')).toBeNull();

    const campaign = director('campaign');
    advanceDays(site, campaign, 500);
    expect(availableContracts(campaign).map((c) => c.id)).toEqual(['explorer1']);
    expect(offerDaysLeft(campaign, 'explorer1')).toBeNull();

    const free = director();
    const questions = questionOffers(free);
    advanceDays(site, free, 500);
    expect(questionOffers(free)).toEqual(questions);
    expect(questions).toContain('ask-radiation-0');
    expect(availableContracts(free)).toHaveLength(3);
  });
});

describe('Test Run fees (Mission Director)', () => {
  const ready = (state: SiteState) => {
    acceptContract(state, 'explorer1');
    state.design = design(EXPLORER_1);
    return state;
  };

  it('runs each design free once, then charges for the same design again', () => {
    const state = ready(director('campaign'));
    expect(testRunFee(state, state.design)).toBe(0);
    const money = state.money;
    expect(payTestRun(state, state.design)).toEqual({ ok: true, fee: 0 });
    expect(state.money).toBe(money);
    const fee = Math.round(contractById('explorer1').reward * TEST_RUN_FEE.share);
    expect(testRunFee(state, state.design)).toBe(fee);
    expect(payTestRun(state, state.design)).toEqual({ ok: true, fee });
    expect(state.money).toBe(money - fee);
    // Another design is free again.
    const other = design(EXPLORER_1.map((id) => (id === 'largeBattery' ? 'smallBattery' : id)));
    expect(testRunFee(state, other)).toBe(0);
  });

  it('charges the minimum with no Contract, and blocks the run when money is short', () => {
    const state = director('campaign');
    state.design = design(EXPLORER_1);
    payTestRun(state, state.design);
    expect(testRunFee(state, state.design)).toBe(TEST_RUN_FEE.min);
    state.money = 1_000;
    expect(checkTestRun(state, state.design)).toEqual({ ok: false, fee: TEST_RUN_FEE.min, short: TEST_RUN_FEE.min - 1_000 });
    expect(payTestRun(state, state.design).ok).toBe(false);
    expect(state.money).toBe(1_000);
  });

  it('keeps Explorer Test Runs free and unlimited', () => {
    const state = ready(explorer('campaign'));
    for (let i = 0; i < 5; i++) expect(payTestRun(state, state.design)).toEqual({ ok: true, fee: 0 });
    expect(state.money).toBe(newSiteState().money);
    expect(state.testRuns).toEqual([]);
  });
});

describe('Deposits run out (Mission Director)', () => {
  it('draws each Mine down its Deposit, and stops it when the Deposit is empty', () => {
    const state = director('campaign');
    state.warehouses.push({ x: 0, z: 0, level: 3, upgradeDay: null }, { x: 0, z: 0, level: 3, upgradeDay: null });
    expect(build(site, state, 'mine', ...copperSpot()).ok).toBe(true);
    const mine = state.mines[0]!;
    const deposit = mineDeposit(site, mine)!;
    expect(deposit.material).toBe('copper');
    expect(deposit.sizeKg).toBe(deposit.tiles * DEPOSIT_KG_PER_TILE);
    advanceDays(site, state, 10);
    expect(depositLeft(state, deposit)).toBeCloseTo(deposit.sizeKg - 10 * MINE_OUTPUT_PER_DAY);
    // Dig the rest: it stops at what the Deposit held.
    state.depositsUsed[deposit.key] = deposit.sizeKg - 5;
    const before = state.stock.copper;
    advanceDays(site, state, 10);
    expect(state.stock.copper - before).toBeCloseTo(5);
    expect(mineEmpty(site, state, mine)).toBe(true);
    expect(outputPerDay(site, state).copper).toBe(0);
    advanceDays(site, state, 10);
    expect(state.stock.copper - before).toBeCloseTo(5);
    // A new Mine on the empty Deposit is refused, with the reason.
    const other = director('campaign');
    other.depositsUsed = { ...state.depositsUsed };
    expect(checkBuild(site, other, 'mine', ...copperSpot())).toEqual({ ok: false, problem: 'emptyDeposit' });
    expect(checkBuild(site, explorer('campaign'), 'mine', ...copperSpot()).ok).toBe(true);
  });

  it('never runs out in Explorer, where Mines dig faster', () => {
    const state = explorer('campaign');
    state.warehouses.push({ x: 0, z: 0, level: 3, upgradeDay: null });
    build(site, state, 'mine', ...copperSpot());
    const mine = state.mines[0]!;
    expect(mineOutput(mine, state)).toBe(MINE_OUTPUT_PER_DAY * EXPLORER_PACE.mineOutput);
    advanceDays(site, state, 2);
    expect(state.stock.copper).toBeCloseTo(2 * MINE_OUTPUT_PER_DAY * EXPLORER_PACE.mineOutput);
    expect(state.depositsUsed).toEqual({});
    expect(mineEmpty(site, state, mine)).toBe(false);
  });
});

describe('Explorer: shorter waits and gentler failure', () => {
  it('ships in half the days', () => {
    expect(shippingTo(JPL, 'capeCanaveral', 'advanced').days).toBe(7);
    expect(shippingTo(JPL, 'capeCanaveral', 'easy').days).toBe(Math.ceil(7 * EXPLORER_PACE.shippingDays));
    const easy = explorer('campaign');
    acceptContract(easy, 'explorer1');
    const hard = director('campaign');
    acceptContract(hard, 'explorer1');
    const d = design(EXPLORER_1);
    expect(planLaunch(hard, d).readyDay - planLaunch(easy, d).readyDay).toBe(3);
  });

  it('refunds a failed Mission’s Launch and Shipping once per Contract', () => {
    const state = explorer('campaign');
    acceptContract(state, 'explorer1');
    state.design = design(EXPLORER_1.map((id) => (id === 'largeBattery' ? 'smallBattery' : id)));
    for (const p of partsNeeded(state.design)) state.parts[p] += 2;
    const start = state.money;
    const plan = planLaunch(state, state.design);
    expect(shipMission(state, state.design).ok).toBe(true);
    expect(state.mission!.launchCost).toBe(plan.rideshare + plan.shipping);
    const first = launchWhenClear(state)!;
    expect(first.report.success).toBe(false);
    expect(first.report.refund).toBe(plan.rideshare + plan.shipping);
    expect(state.money).toBe(start);
    expect(state.refunds).toEqual(['explorer1']);
    // The second failure for the same Contract is not refunded.
    expect(shipMission(state, state.design).ok).toBe(true);
    const second = launchWhenClear(state)!;
    expect(second.report.success).toBe(false);
    expect(second.report.refund).toBeUndefined();
    expect(state.money).toBe(start - plan.total);
  });

  it('never refunds in Mission Director', () => {
    const state = director('campaign');
    acceptContract(state, 'explorer1');
    state.mission = { contract: 'explorer1', launchCost: 100_000 } as SiteState['mission'];
    expect(explorerRefund(state, state.mission!)).toBe(0);
  });
});

describe('Safety valve', () => {
  it('pays the grant again after GRANT_AGAIN.everyDays, up to GRANT_AGAIN.max times', () => {
    const state = director();
    state.money = 0;
    expect(payGrant(state)).toBe(STARTUP_GRANT.amount);
    expect(state.grants).toBe(1);
    state.money = 0;
    expect(grantDue(state)).toBe(false);
    state.day += GRANT_AGAIN.everyDays;
    expect(payGrant(state)).toBe(STARTUP_GRANT.amount);
    for (let i = 2; i < GRANT_AGAIN.max; i++) {
      state.money = 0;
      state.day += GRANT_AGAIN.everyDays;
      expect(payGrant(state)).toBe(STARTUP_GRANT.amount);
    }
    expect(state.grants).toBe(GRANT_AGAIN.max);
    state.money = 0;
    state.day += GRANT_AGAIN.everyDays;
    expect(grantDue(state)).toBe(false);
  });

  it('pays the grant between Eras when money can’t buy the HQ Upgrade', () => {
    const state = director('campaign');
    placeHQ(site, state);
    state.completed = ['explorer1', 'tiros1'];
    state.money = 1_000_000;
    expect(availableContracts(state)).toEqual([]);
    expect(grantDue(state)).toBe(true);
    state.completed = ['explorer1'];
    expect(grantDue(state)).toBe(false);
  });

  it('gets a broke Company with empty Deposits and no Missions back to a Launch', () => {
    for (const playMode of ['freePlay', 'campaign'] as const) {
      const state = director(playMode);
      placeHQ(site, state);
      placeAssemblyHall(site, state);
      state.warehouses.push({ x: 0, z: 0, level: 1, upgradeDay: null });
      build(site, state, 'mine', ...copperSpot());
      const deposit = mineDeposit(site, state.mines[0]!)!;
      state.depositsUsed[deposit.key] = deposit.sizeKg;
      state.money = 0;
      state.grantDay = 0;
      state.grants = 1;
      advanceDays(site, state, GRANT_AGAIN.everyDays);
      expect(state.stock.copper, playMode).toBe(0);
      // A Contract is always on offer: the question card in Free Play, the next Milestone in the Campaign.
      const contract = playMode === 'freePlay' ? questionOffers(state).find((id) => id.startsWith('ask-radiation'))! : 'explorer1';
      expect(payGrant(state), playMode).toBe(STARTUP_GRANT.amount);
      expect(acceptContract(state, contract).ok, playMode).toBe(true);
      state.design = design(playMode === 'freePlay' ? SURVEY : EXPLORER_1);
      // The Market is the costly backup for Parts.
      expect(buyMissing(state, state.design).ok, playMode).toBe(true);
      expect(shipMission(state, state.design).ok, playMode).toBe(true);
      const result = launchWhenClear(state);
      expect(result?.report.contract, playMode).toBe(contract);
      expect(result?.report.success, playMode).toBe(true);
    }
  });
});

describe('Switching Explorer to Mission Director', () => {
  it('switches one way: Deposits full, offers dated from the switch', () => {
    const state = explorer();
    advanceDays(site, state, 100);
    expect(switchToDirector(state)).toBe(true);
    expect(state.difficulty).toBe('advanced');
    expect(switchToDirector(state)).toBe(false);
    expect(state.depositsUsed).toEqual({});
    refreshOffers(state);
    expect(offerDaysLeft(state, 'free-0')).toBe(OFFER_DAYS);
    advanceDays(site, state, OFFER_DAYS);
    expect(state.expiredOffers).toEqual(['free-0', 'free-1', 'free-2']);
  });

  it('saves the switch', () => {
    const storage = new Map<string, string>();
    const store = { getItem: (k: string) => storage.get(k) ?? null, setItem: (k: string, v: string) => void storage.set(k, v) };
    const game: SaveData = { version: SAVE_VERSION, company: { name: 'Comet Works', logo: { ...DEFAULT_LOGO } }, site: { seed: SEED }, state: explorer() };
    switchToDirector(game.state);
    advanceDays(site, game.state, 5);
    expect(saveGame(store, game)).toBe(true);
    expect(loadGame(store)?.state.difficulty).toBe('advanced');
    expect(loadGame(store)).toEqual(game);
  });
});

describe('Save version 21', () => {
  it('migrates a version 20 save: Deposits full, nothing paid, the grant counted once if paid', () => {
    const storage = new Map<string, string>();
    const store = { getItem: (k: string) => storage.get(k) ?? null, setItem: (k: string, v: string) => void storage.set(k, v) };
    const state = director();
    state.grantDay = 40;
    state.grants = 1;
    const game: SaveData = { version: SAVE_VERSION, company: { name: 'Comet Works', logo: { ...DEFAULT_LOGO } }, site: { seed: SEED }, state };
    const { grants: _g, offerDays: _o, expiredOffers: _e, testRuns: _t, depositsUsed: _d, refunds: _r, ...old } = state;
    store.setItem(SAVE_KEY, JSON.stringify({ ...game, version: 20, state: old }));
    expect(loadGame(store)).toEqual(game);
    store.setItem(SAVE_KEY, JSON.stringify({ ...game, version: 20, state: { ...old, grantDay: null } }));
    expect(loadGame(store)?.state.grants).toBe(0);
  });

  it('rejects bad game-mode fields', () => {
    const base = { version: SAVE_VERSION, company: { name: 'Comet Works', logo: { ...DEFAULT_LOGO } }, site: { seed: SEED }, state: director() };
    for (const bad of [{ grants: -1 }, { offerDays: { nope: 3 } }, { expiredOffers: ['nope'] }, { testRuns: [5] }, { depositsUsed: { here: 5 } }, { refunds: [1] }]) {
      const storage = new Map<string, string>();
      const store = { getItem: (k: string) => storage.get(k) ?? null, setItem: (k: string, v: string) => void storage.set(k, v) };
      store.setItem(SAVE_KEY, JSON.stringify({ ...base, state: { ...base.state, ...bad } }));
      expect(loadGame(store), JSON.stringify(bad)).toBeNull();
    }
  });
});

describe('Weekly Challenge', () => {
  it('uses none of the mode rules, whatever mode the Company plays', () => {
    const week = '2026-11-09';
    const picked: Design = {
      bus: 'mediumBus', power: 'solarCells', battery: 'largeBattery', comms: 'simpleAntenna', pointing: 'spin', propulsion: 'noEngine',
      payload: contractNeeds(contractById(weeklyRules(week).contract)).payload,
    };
    const state = weeklyState(week);
    const result = evaluateWeekly(week, picked)!;
    expect(result.success).toBe(true);
    // Its cost is the Market Parts and the Launch alone: no Ground Tests, Test Run fees or refunds.
    const plan = planLaunch(state, picked);
    expect(plan.testCost).toBe(0);
    const bought = { ...state, design: picked };
    buyMissing(bought, picked);
    expect(result.cost).toBe(state.money - bought.money + plan.total);
    // Its Test Run is its own: it never charges.
    weeklyTestRun(week, picked);
    weeklyTestRun(week, picked);
    expect(weeklyState(week).money).toBe(state.money);
    expect(weeklyState(week).testRuns).toEqual([]);
  });
});
