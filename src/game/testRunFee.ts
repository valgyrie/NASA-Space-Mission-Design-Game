import { TEST_RUN_FEE } from './balance';
import { rewardFor } from './contracts';
import { designKey } from './maturity';
import { isDirector } from './modes';
import type { SiteState } from './siteState';
import { type Design, marksFor, missionGoal } from './spacecraft';

/**
 * Test Run fees (Mission Director). The first Test Run of each design for a Contract is free; running the same
 * design again costs a small fee (TEST_RUN_FEE). A design is its options and the Marks of its Parts. Explorer's
 * Test Runs are always free. The Weekly Challenge has its own Test Run, which never charges.
 */

/** Designs remembered as tested. Older ones are forgotten (their next run is free again). */
const MAX_REMEMBERED = 40;

/** What tells designs apart for the fee: the Contract, every option, and the Mark of each Part. */
export function testRunKey(state: SiteState, design: Design): string {
  const marks = marksFor(state, design);
  const markText = Object.entries(marks).sort(([a], [b]) => a.localeCompare(b)).map(([slot, m]) => `${slot}${m}`).join(',');
  return `${missionGoal(state).contract.id}|${designKey(design)}|${markText}`;
}

/** What the next Test Run of this design costs: 0 when it is free. */
export function testRunFee(state: SiteState, design: Design): number {
  if (!isDirector(state) || !state.testRuns.includes(testRunKey(state, design))) return 0;
  const goal = missionGoal(state);
  const reward = goal.status === 'accepted' ? rewardFor(state, goal.contract.id) : 0;
  return Math.max(TEST_RUN_FEE.min, Math.round((reward * TEST_RUN_FEE.share) / 1_000) * 1_000);
}

export type TestRunPay = { ok: true; fee: number } | { ok: false; fee: number; short: number };

/** Can the Company pay for this Test Run? */
export function checkTestRun(state: SiteState, design: Design): TestRunPay {
  const fee = testRunFee(state, design);
  return state.money < fee ? { ok: false, fee, short: fee - state.money } : { ok: true, fee };
}

/** Pay for a Test Run (if it costs anything) and remember the design as tested. Does nothing if money is short. */
export function payTestRun(state: SiteState, design: Design): TestRunPay {
  const check = checkTestRun(state, design);
  if (!check.ok) return check;
  state.money -= check.fee;
  if (isDirector(state)) {
    const key = testRunKey(state, design);
    if (!state.testRuns.includes(key)) state.testRuns = [...state.testRuns, key].slice(-MAX_REMEMBERED);
  }
  return check;
}
