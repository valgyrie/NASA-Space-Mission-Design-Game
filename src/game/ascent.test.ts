import { describe, expect, it } from 'vitest';
import { COUNTDOWN_S, flightShow, showAt, showLength, stageTimes } from './ascent';
import type { Finding } from './mission';

const orbit = (ok: boolean): Finding => ({ kind: 'orbit', ok, orbit: 'lowEarthOrbit', vehicle: 'juno1', massKg: 11.5, liftKg: 14 });

describe('Launch show', () => {
  it("follows Juno I's real stages: 155 s first stage, coast, then three 6 s upper stages", () => {
    expect(stageTimes('juno1')).toEqual([
      { start: 0, end: 155 },
      { start: 402, end: 408 },
      { start: 408, end: 414 },
      { start: 414, end: 420 },
    ]);
    const show = flightShow('juno1', { findings: [orbit(true)], missionDays: 30 });
    expect(show.map((s) => (s.stage ? `${s.phase}${s.stage}` : s.phase))).toEqual([
      'countdown',
      'burn1',
      'coast',
      'burn2',
      'burn3',
      'burn4',
      'orbit',
      'mission',
      'end',
    ]);
    // Flight time runs on without gaps from the countdown to orbit.
    for (let i = 1; i <= 6; i++) expect(show[i]!.from).toBe(show[i - 1]!.to);
  });

  it('lasts one to two minutes at normal speed', () => {
    for (const days of [30, 90, 365]) {
      const length = showLength(flightShow('juno1', { findings: [orbit(true)], missionDays: days }));
      expect(length).toBeGreaterThanOrEqual(60);
      expect(length).toBeLessThanOrEqual(120);
    }
  });

  it('stops after the last stage when the Spacecraft does not reach orbit', () => {
    const show = flightShow('juno1', { findings: [orbit(false)], missionDays: 30 });
    expect(show.at(-1)!.phase).toBe('lost');
    expect(show.some((s) => s.phase === 'mission')).toBe(false);
  });

  it('reads the flight time or Mission day off the screen time', () => {
    const show = flightShow('juno1', { findings: [orbit(true)], missionDays: 30 });
    expect(showAt(show, 0)).toMatchObject({ index: 0, value: -COUNTDOWN_S, done: false });
    expect(showAt(show, COUNTDOWN_S).segment).toMatchObject({ phase: 'burn', stage: 1 });
    expect(showAt(show, COUNTDOWN_S + 11).value).toBeCloseTo(77.5);
    const days = show.findIndex((s) => s.phase === 'mission');
    const before = showLength(show.slice(0, days));
    expect(showAt(show, before + show[days]!.playS / 2)).toMatchObject({ value: 15, done: false });
    expect(showAt(show, showLength(show) + 1)).toMatchObject({ done: true, value: 30 });
  });
});
