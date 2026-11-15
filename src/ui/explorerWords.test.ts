import { describe, expect, it } from 'vitest';
import { fly, testRun } from '../game/flight';
import { type Design, type OptionId, choose, emptyDesign } from '../game/spacecraft';
import { findingText } from './missionReport';
import { predictedProblems } from './testRun';

function design(ids: OptionId[]): Design {
  const d = emptyDesign();
  for (const id of ids) choose(d, id);
  return d;
}
const SHORT_BATTERY: OptionId[] = ['smallBus', 'batteriesOnly', 'smallBattery', 'simpleAntenna', 'spin', 'radiationDetector'];
const plan = { contract: 'explorer1' as const, design: design(SHORT_BATTERY), vehicle: 'juno1' as const, tech: [] };

describe('Explorer wording of the Test Run and Mission Report', () => {
  const power = fly(plan, 40, 365).findings.find((f) => f.kind === 'power')!;

  it('says when the battery ran out in words, not on which day', () => {
    expect(power.ok).toBe(false);
    const plain = findingText(power, true, true);
    expect(plain).toMatch(/^The battery ran out (early in|about halfway through|near the end of) the Mission\./);
    expect(plain).not.toMatch(/\d/);
    // Mission Director keeps the numbers.
    expect(findingText(power)).toMatch(/day \d+ of 30/);
  });

  it('says what the design would have done when it never flew', () => {
    expect(findingText(power, false, true)).toMatch(/^The battery would have run out/);
  });

  it('lists predicted problems without numbers', () => {
    const lines = predictedProblems(testRun('K7QXM2', plan, 40, 365), true);
    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) expect(line).not.toMatch(/\d/);
  });
});
