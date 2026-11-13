import { designReview } from './designReview';
import type { SiteState } from './siteState';
import { type Design, RESOURCES, SLOTS, checkDesign, missionGoal } from './spacecraft';

/**
 * The maturity strip (ticket 33): JPL's first four Concept Maturity Levels for the Contract on the table.
 * Each step lights on its own rule, so a player who skips one sees it dark; the highest lit step is the current
 * one. Changing the design can drop a step again, like JPL's feedback loop between CMLs 2–4.
 * Nothing lights until a Contract is accepted: the client is the first step.
 */
export const MATURITY_STEPS = ['cocktailNapkin', 'initialFeasibility', 'tradeSpace', 'pointDesign'] as const;
export type MaturityStep = (typeof MATURITY_STEPS)[number];

/** Designs remembered per Contract for the Trade Space step. More are never needed. */
const MAX_TESTED = 12;

/** A short text naming the option in every slot, to tell designs apart. */
export function designKey(design: Design): string {
  return SLOTS.map((s) => design[s] ?? '-').join('|');
}

/** Remember a design tried in a Test Run for the Contract on the table. */
export function recordTestRun(state: SiteState, design: Design): void {
  const contract = missionGoal(state).contract.id;
  const key = designKey(design);
  const tested = state.testedDesigns?.contract === contract ? state.testedDesigns.designs : [];
  if (tested.includes(key)) return;
  state.testedDesigns = { contract, designs: [...tested, key].slice(-MAX_TESTED) };
}

/** How many different designs have had a Test Run for the Contract on the table. */
export function designsTested(state: SiteState): number {
  const contract = missionGoal(state).contract.id;
  return state.testedDesigns?.contract === contract ? state.testedDesigns.designs.length : 0;
}

export interface Maturity {
  reached: Record<MaturityStep, boolean>;
  /** The highest step reached, or null before a Contract is accepted. */
  current: MaturityStep | null;
}

export function maturity(state: SiteState, design: Design = state.design): Maturity {
  const check = checkDesign(state, design);
  const accepted = check.goal.status === 'accepted';
  const reached: Record<MaturityStep, boolean> = {
    cocktailNapkin: accepted,
    initialFeasibility: accepted && RESOURCES.every((r) => check.gauges[r].status === 'ok'),
    tradeSpace: accepted && designsTested(state) >= 2,
    pointDesign: accepted && designReview(state, design).passed,
  };
  const current = [...MATURITY_STEPS].reverse().find((s) => reached[s]) ?? null;
  return { reached, current };
}
