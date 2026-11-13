import { describe, expect, it } from 'vitest';
import { fly } from './flight';
import type { MissionReport } from './mission';
import { MISSION_SEGMENTS, bySegment, findingSegment } from './segments';
import { type Design, type OptionId, choose, emptyDesign } from './spacecraft';
import { reportSegments } from '../ui/missionReport';

const EXPLORER: OptionId[] = ['smallBus', 'batteriesOnly', 'largeBattery', 'simpleAntenna', 'spin', 'radiationDetector'];

function explorer(failedStage: number | null = null, ground?: number): MissionReport {
  const design: Design = emptyDesign();
  for (const id of EXPLORER) choose(design, id);
  const flight = fly({ contract: 'explorer1', design, vehicle: 'juno1', tech: [] }, 40, 400, undefined, failedStage);
  return {
    contract: 'explorer1',
    vehicle: 'juno1',
    site: 'capeCanaveral',
    launchDay: 40,
    success: flight.success,
    reward: 0,
    findings: flight.findings,
    design,
    anomaly: null,
    insurancePaid: 0,
    ...(ground === undefined ? {} : { ground }),
  };
}

describe('Mission Segments (ticket 32)', () => {
  it('come in NASA order, user first', () => {
    expect(MISSION_SEGMENTS).toEqual(['user', 'space', 'ground', 'launch']);
  });

  it('put each requirement under the Segment that answers for it', () => {
    const kinds = Object.fromEntries(explorer().findings.map((f) => [f.kind, findingSegment(f)]));
    expect(kinds).toEqual({ orbit: 'launch', payload: 'space', power: 'space', comms: 'ground', time: 'user' });
  });

  it('blame the Spacecraft, not the rocket, when it had no Main Engine for geostationary orbit', () => {
    const design: Design = emptyDesign();
    for (const id of ['largeBus', 'solarCells', 'smallBattery', 'simpleAntenna', 'spin', 'transponder'] as OptionId[]) choose(design, id);
    const orbit = fly({ contract: 'syncom3', design, vehicle: 'deltaD', tech: [] }, 0, null).findings.find((f) => f.kind === 'orbit')!;
    expect(findingSegment(orbit)).toBe('space');
  });

  it('leave out a Segment with nothing in it', () => {
    const groups = bySegment(['a', 'b'], (x) => (x === 'a' ? 'launch' : 'user'));
    expect(groups.map((g) => g.segment)).toEqual(['user', 'launch']);
  });
});

describe('Mission Report under the four Segments', () => {
  it('names who gets the Data and where it goes', () => {
    const user = (labs: number) => reportSegments(explorer(null, 1), labs).find((g) => g.segment === 'user')!.lines;
    expect(user(0).map((l) => l.text)).toContain('US Army gets the Data. It waits for a Research Lab: build one to turn it into Research Points.');
    expect(user(2).find((l) => l.mark === 'info')!.text).toContain('goes to your Research Lab');
  });

  it('says which stations picked up the Data', () => {
    const ground = (boost?: number) => reportSegments(explorer(null, boost), 0).find((g) => g.segment === 'ground')!.lines.map((l) => l.text);
    expect(ground(1)).toContain("Borrowed stations picked up the Data: other people's dishes.");
    expect(ground(3)).toContain('Your Ground Stations picked up the Data: the antenna sent 3× as much as with borrowed stations alone.');
    // Saves from before ticket 32 don't know: say nothing rather than guess.
    expect(ground(undefined).some((l) => l.includes('stations'))).toBe(false);
  });

  it('puts the Segment that went wrong first, and its failed line first', () => {
    const groups = reportSegments(explorer(2, 1), 0);
    expect(groups[0]!.segment).toBe('launch');
    expect(groups[0]!.lines[0]!.mark).toBe('short');
    // It never flew: no "who got the Data" or station lines, only what the design would have done.
    expect(groups.flatMap((g) => g.lines).some((l) => l.mark === 'info')).toBe(false);
    expect(groups.find((g) => g.segment === 'space')!.lines.find((l) => l.text.startsWith('Power'))!.text).toMatch(/^Power would have/);
  });

  it('keeps every requirement exactly once', () => {
    const report = explorer(null, 1);
    const shown = reportSegments(report, 1).flatMap((g) => g.lines).filter((l) => l.mark !== 'info');
    expect(shown).toHaveLength(report.findings.length);
  });
});
