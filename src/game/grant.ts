import { GRANT_AGAIN, STARTUP_GRANT } from './balance';
import { availableContracts } from './contracts';
import { eraOf, milestonesDone } from './eras';
import type { SiteState } from './siteState';
import { nextUpgrade } from './upgrades';

/**
 * The startup grant: a safety net so a Company can't get stuck with no money. When its money is too low to go on
 * and no Mission is on its way (that Mission may still earn a reward), it gets STARTUP_GRANT.amount. It can come
 * again, in both modes, at most every GRANT_AGAIN.everyDays and GRANT_AGAIN.max times in a game.
 */

/**
 * Money the Company needs to go on: STARTUP_GRANT.belowMoney, or in the Campaign between Eras (nothing taken and
 * nothing on the board, so the HQ Upgrade is the only way on) what that Upgrade costs.
 */
export function grantNeed(state: SiteState): number {
  const hq = state.hq;
  if (state.playMode === 'campaign' && hq && hq.upgradeDay === null && state.contracts.length === 0 && availableContracts(state).length === 0 && milestonesDone(state, eraOf(state))) {
    const next = nextUpgrade('hq', hq, eraOf(state));
    if (next) return Math.max(STARTUP_GRANT.belowMoney, next.cost);
  }
  return STARTUP_GRANT.belowMoney;
}

/** The grant is due now: money is too low, nothing is on its way, and it is not too soon after the last one. */
export function grantDue(state: SiteState): boolean {
  if (state.mission !== null || state.money >= grantNeed(state)) return false;
  if (state.grantDay === null) return true;
  return grantsPaid(state) < GRANT_AGAIN.max && Math.floor(state.day) - state.grantDay >= GRANT_AGAIN.everyDays;
}

/** Grants paid so far. */
export function grantsPaid(state: Pick<SiteState, 'grants' | 'grantDay'>): number {
  return Math.max(state.grants, state.grantDay === null ? 0 : 1);
}

/** Pay the grant if it is due. Returns the amount paid, or 0. */
export function payGrant(state: SiteState): number {
  if (!grantDue(state)) return 0;
  state.grants = grantsPaid(state) + 1;
  state.money += STARTUP_GRANT.amount;
  state.grantDay = Math.floor(state.day);
  return STARTUP_GRANT.amount;
}
