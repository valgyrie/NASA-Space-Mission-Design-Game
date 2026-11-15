import type { PlanProblem } from '../game/mission';
import type { Difficulty } from '../game/modes';

/** The planner's steps, one page each, in order: begin with the end in mind, the Launch last. */
export const PLANNER_STEPS = ['user', 'space', 'ground', 'vehicle', 'site', 'costs', 'review'] as const;
export type PlannerStep = (typeof PLANNER_STEPS)[number];

/**
 * Explorer's four steps: Rocket, Launch Site, Weather (the Costs page, about the weather) and Launch (the review).
 * The User line moves to the top of the first step; the Space and Ground checks become checklist lines.
 */
export const EXPLORER_STEPS = ['vehicle', 'site', 'costs', 'review'] as const satisfies readonly PlannerStep[];

/** The steps on show in a game mode: Mission Director keeps all seven. */
export function plannerSteps(difficulty: Difficulty): readonly PlannerStep[] {
  return difficulty === 'easy' ? EXPLORER_STEPS : PLANNER_STEPS;
}

/** Which step each problem belongs to, so the pager can flag it; in Explorer, problems of hidden steps go to the review. */
export function problemStep(p: PlanProblem, difficulty: Difficulty = 'advanced'): PlannerStep {
  const step = fullProblemStep(p);
  return plannerSteps(difficulty).includes(step) ? step : 'review';
}

function fullProblemStep(p: PlanProblem): PlannerStep {
  switch (p.kind) {
    case 'noContract':
    case 'underway':
      return 'user';
    case 'emptySlots':
    case 'hallTooSmall':
    case 'busFull':
    case 'needsCubeSat':
    case 'missingParts':
      return 'space';
    case 'vehicleClosed':
    case 'cantReach':
    case 'tooHeavy':
      return 'vehicle';
    case 'money':
      return 'costs';
    case 'unsigned':
      return 'review';
  }
}
