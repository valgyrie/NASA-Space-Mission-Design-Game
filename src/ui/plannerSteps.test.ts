import { describe, expect, it } from 'vitest';
import { PLANNER_STEPS, plannerSteps, problemStep } from './plannerSteps';

describe('Launch planner steps per game mode', () => {
  it('gives Explorer four steps: Rocket, Launch Site, Weather and Launch', () => {
    expect(plannerSteps('easy')).toEqual(['vehicle', 'site', 'costs', 'review']);
  });

  it('keeps all seven for Mission Director', () => {
    expect(plannerSteps('advanced')).toEqual(PLANNER_STEPS);
    expect(PLANNER_STEPS).toHaveLength(7);
  });

  it('flags a problem on a step that is shown', () => {
    expect(problemStep({ kind: 'tooHeavy', overKg: 1 }, 'easy')).toBe('vehicle');
    expect(problemStep({ kind: 'money', short: 1 }, 'easy')).toBe('costs');
    // The Space and User steps are not shown in Explorer: their problems go to the review.
    expect(problemStep({ kind: 'missingParts', parts: [] }, 'easy')).toBe('review');
    expect(problemStep({ kind: 'noContract' }, 'easy')).toBe('review');
    expect(problemStep({ kind: 'missingParts', parts: [] }, 'advanced')).toBe('space');
    expect(problemStep({ kind: 'noContract' })).toBe('user');
  });
});
