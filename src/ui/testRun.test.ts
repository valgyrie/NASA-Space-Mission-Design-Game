import { describe, expect, it } from 'vitest';
import { testRun } from '../game/flight';
import { type Design, type OptionId, choose, emptyDesign } from '../game/spacecraft';
import { predictedProblems } from './testRun';

const EXPLORER: OptionId[] = ['smallBus', 'batteriesOnly', 'largeBattery', 'simpleAntenna', 'spin', 'radiationDetector'];

function design(ids: OptionId[]): Design {
  const d = emptyDesign();
  for (const id of ids) choose(d, id);
  return d;
}

const plan = (ids: OptionId[]) => ({ contract: 'explorer1' as const, design: design(ids), vehicle: 'juno1' as const });

describe('predicted problems', () => {
  it('lists nothing for the Explorer 1 design', () => {
    expect(predictedProblems(testRun('K7QXM2', plan(EXPLORER), 40, 365))).toEqual([]);
  });

  it('explains a Small Battery in plain words', () => {
    const weak = EXPLORER.map((id) => (id === 'largeBattery' ? 'smallBattery' : id));
    const lines = predictedProblems(testRun('K7QXM2', plan(weak), 40, 365));
    expect(lines).toEqual([expect.stringContaining('Power ran out on day 16 of 30')]);
  });

  it('warns about a thin margin when only some runs fail', () => {
    const wide = { batteryWh: 0.2, powerUseW: 0.2, sendPerDay: 0.2 };
    const run = testRun('K7QXM2', plan(EXPLORER), 40, 365, { share: wide });
    const lines = predictedProblems(run);
    expect(lines).toContain(`Power ran out in ${run.missed.power} of 200 runs: the margin is thin. A larger battery adds room.`);
  });
});
