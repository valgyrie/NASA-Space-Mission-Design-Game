import { missionStage } from './mission';
import type { SiteState } from './siteState';
import { isComplete } from './spacecraft';

/**
 * The Explorer 1 tutorial: one short step at a time from the first Contract to the first Launch (GDD §16).
 * Each step is worked out from the game itself, so it survives a reload and never blocks the player:
 * doing things out of order just moves the guide on. It ends with the first Mission Report.
 */

export const TUTORIAL_STEPS = ['contract', 'mine', 'factory', 'design', 'testRun', 'ship', 'travel', 'launch'] as const;
export type TutorialStep = (typeof TUTORIAL_STEPS)[number];

/**
 * NASA's six steps to design and develop a space mission (Design and Develop Science Missions, slide 10),
 * in order. The tutorial's steps sit under them (ticket 39), so the player learns the real process by playing it.
 */
export const NASA_STEPS = ['needGoals', 'concept', 'requirements', 'design', 'buildVerify', 'implement'] as const;
export type NasaStep = (typeof NASA_STEPS)[number];

/**
 * Which NASA step each tutorial step belongs to, never going backwards. The Mines and the Metal Works sit under
 * Define Concept: choosing how the Parts will be made is part of the plan (an open point for the team, ticket 39).
 */
export const NASA_STEP_OF: Record<TutorialStep, NasaStep> = {
  contract: 'needGoals',
  mine: 'concept',
  factory: 'concept',
  design: 'requirements',
  testRun: 'design',
  ship: 'buildVerify',
  travel: 'implement',
  launch: 'implement',
};

/** What the tutorial can't see in the rest of the state. Saved. */
export interface TutorialProgress {
  /** The player closed the guide. */
  skipped: boolean;
  /** The player has opened a Test Run. */
  testRun: boolean;
}

export function newTutorial(): TutorialProgress {
  return { skipped: false, testRun: false };
}

function done(state: SiteState, step: TutorialStep): boolean {
  // Once a Spacecraft has shipped, everything before shipping counts as done.
  const shipped = state.mission !== null || state.reports.length > 0;
  switch (step) {
    case 'contract':
      return state.contracts.length > 0 || state.completed.length > 0 || shipped;
    case 'mine':
      return state.mines.length > 0 || shipped;
    case 'factory':
      return state.factories.length > 0 || shipped;
    case 'design':
      return isComplete(state.design) || shipped;
    case 'testRun':
      return state.tutorial.testRun || shipped;
    case 'ship':
      return shipped;
    case 'travel':
      return missionStage(state)?.stage === 'ready' || state.reports.length > 0;
    case 'launch':
      return state.reports.length > 0;
  }
}

/** The step to show now, or null once the tutorial is over or skipped. */
export function tutorialStep(state: SiteState): TutorialStep | null {
  if (state.tutorial.skipped) return null;
  return TUTORIAL_STEPS.find((s) => !done(state, s)) ?? null;
}

/**
 * The tutorial's last card: the first Mission Report is in and nothing new is on its way. It names NASA's six
 * steps and stays until the player closes it or ships the next Mission. Never blocks.
 */
export function tutorialEnded(state: SiteState): boolean {
  return !state.tutorial.skipped && state.reports.length === 1 && state.mission === null;
}
