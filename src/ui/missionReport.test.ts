import { describe, expect, it } from 'vitest';
import type { Anomaly } from '../game/anomalies';
import { fly } from '../game/flight';
import type { MissionReport } from '../game/mission';
import { type Design, type OptionId, choose, emptyDesign } from '../game/spacecraft';
import { lostText } from './anomalyPanel';
import { anomalyLines } from './missionReport';

const EXPLORER: OptionId[] = ['smallBus', 'batteriesOnly', 'largeBattery', 'simpleAntenna', 'spin', 'radiationDetector'];

function report(anomaly: Partial<Anomaly> | null): MissionReport {
  const design: Design = emptyDesign();
  for (const id of EXPLORER) choose(design, id);
  const flight = fly({ contract: 'explorer1', design, vehicle: 'juno1', tech: [] }, 40, 365);
  const base: Anomaly = {
    kind: 'antenna',
    day: 12,
    chance: 0.34,
    first: false,
    sendPerDay: 50,
    dataPerDay: 20,
    missionDays: 30,
    untilDay: 30,
    score: 0.5,
    answer: 'played',
    lostDays: 4,
    cut: 400_000,
  };
  return {
    contract: 'explorer1',
    vehicle: 'juno1',
    site: 'capeCanaveral',
    launchDay: 40,
    success: true,
    reward: 2_600_000,
    findings: flight.findings,
    design,
    anomaly: anomaly && { ...base, ...anomaly },
    insurancePaid: 0,
  };
}

describe('Mission Report: the Anomaly', () => {
  it('says what happened, what it cost and why', () => {
    const [what, why] = anomalyLines(report({}));
    expect(what).toBe('Day 12: Point the antenna. You scored 50%. 4 days of Data were lost. The reward was cut by $400K for the lost Data.');
    expect(why).toContain('the chance was 34%');
    expect(why).toContain('sends 50 kB a day for 20 kB of Data');
  });

  it('explains the first one, and says the chance from then on', () => {
    const [, why] = anomalyLines(report({ first: true, chance: 1 }));
    expect(why).toContain('every Company meets this on its first flight');
    expect(why).toContain('the chance is 34%');
  });

  it('says when the best score was used', () => {
    const [what] = anomalyLines(report({ answer: 'skipped', score: 0.9, lostDays: 1, cut: 100_000 }));
    expect(what).toContain('Skipped, so your best score counted (90%). 1 day of Data was lost.');
  });

  it('shows nothing without an Anomaly, or before it is settled', () => {
    expect(anomalyLines(report(null))).toEqual([]);
    expect(anomalyLines(report({ score: null, answer: null }))).toEqual([]);
  });

  it('counts lost days in plain words', () => {
    expect(lostText(0)).toBe('No Data was lost.');
    expect(lostText(1)).toBe('1 day of Data was lost.');
    expect(lostText(9)).toBe('9 days of Data were lost.');
  });
});
