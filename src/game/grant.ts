import { STARTUP_GRANT } from './balance';
import type { SiteState } from './siteState';

/**
 * The startup grant: a safety net so a new Company can't go broke. The first time its money falls below
 * STARTUP_GRANT.belowMoney with no Mission on its way (that Mission may still earn a reward), it gets
 * STARTUP_GRANT.amount, once per game.
 */

/** The grant is due now: money is low, nothing is on its way, and it hasn't been paid before. */
export function grantDue(state: SiteState): boolean {
  return state.grantDay === null && state.mission === null && state.money < STARTUP_GRANT.belowMoney;
}

/** Pay the grant if it is due. Returns the amount paid, or 0. */
export function payGrant(state: SiteState): number {
  if (!grantDue(state)) return 0;
  state.money += STARTUP_GRANT.amount;
  state.grantDay = Math.floor(state.day);
  return STARTUP_GRANT.amount;
}
