import { describe, expect, it } from 'vitest';
import { flightShow, showAt } from '../game/ascent';
import { fly } from '../game/flight';
import type { LaunchResult } from '../game/mission';
import { type Design, type OptionId, choose, emptyDesign } from '../game/spacecraft';
import { clockText, showText } from './launchShow';

const EXPLORER: OptionId[] = ['smallBus', 'batteriesOnly', 'largeBattery', 'simpleAntenna', 'spin', 'radiationDetector'];

function result(ids: OptionId[]): LaunchResult {
  const design: Design = emptyDesign();
  for (const id of ids) choose(design, id);
  const flight = fly({ contract: 'explorer1', design, vehicle: 'juno1', tech: [] }, 40, 365);
  const report = { contract: 'explorer1' as const, vehicle: 'juno1' as const, site: 'capeCanaveral' as const, launchDay: 40, success: flight.success, reward: 0, findings: flight.findings, design, anomaly: null };
  return { report, flight, design };
}

describe('Launch show text', () => {
  it('counts down, then counts up from liftoff', () => {
    expect(clockText(-3)).toBe('T−00:03');
    expect(clockText(0)).toBe('T+00:00');
    expect(clockText(155)).toBe('T+02:35');
  });

  it("names each stage with Juno I's real motors and burn times", () => {
    const r = result(EXPLORER);
    const show = flightShow('juno1', r.flight);
    const textAt = (i: number) => showText({ segment: show[i]!, index: i, fraction: 0, value: show[i]!.from, done: false }, r, true);
    expect(textAt(1).detail).toContain('155 seconds');
    expect(textAt(3)).toEqual({ title: 'Stage 2', detail: '11 small rockets fire together for 6 seconds.' });
    expect(textAt(4).detail).toContain('3 small rockets');
    expect(textAt(6).detail).toContain('358 and 2,550 km');
  });

  it('tells the same story as the flight: a Small Battery goes silent on day 16', () => {
    const r = result(EXPLORER.map((id) => (id === 'largeBattery' ? 'smallBattery' : id)));
    const show = flightShow('juno1', r.flight);
    const days = show.findIndex((s) => s.phase === 'mission');
    const m = showAt(show, show.slice(0, days).reduce((sum, s) => sum + s.playS, 0) + show[days]!.playS * 0.9);
    expect(showText(m, r, false).detail).toBe('Day 16: Power out. The Spacecraft goes silent.');
    const end = showAt(show, 1e9);
    expect(showText(end, r, false).title).toBe('Mission over');
  });

  it('says no Data reaches home on the days an Anomaly lost', () => {
    const r = result(EXPLORER);
    r.report.anomaly = { kind: 'antenna', day: 10, chance: 1, first: true, sendPerDay: 50, dataPerDay: 20, missionDays: 30, untilDay: 30, score: 0.5, answer: 'played', lostDays: 4, cut: 0 };
    const show = flightShow('juno1', r.flight);
    const days = show.findIndex((s) => s.phase === 'mission');
    const at = (day: number) => showText({ segment: show[days]!, index: days, fraction: day / 30, value: day, done: false }, r, true).detail;
    expect(at(9)).toBe('Sending Data home every day.');
    expect(at(11)).toBe('No contact: Data from these days never reaches home.');
    expect(at(14)).toBe('Sending Data home every day.');
  });
});
