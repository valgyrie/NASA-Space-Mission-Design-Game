import { describe, expect, it } from 'vitest';
import {
  COLD_LIMIT_S,
  ECLIPSE_TIME_S,
  type EclipseGame,
  START_CHARGE,
  SURVIVE_SCORE,
  type System,
  drawW,
  eclipseScore,
  lastsS,
  newEclipseGame,
  stepEclipse,
  toggleSystem,
} from './eclipseGame';

/** Play to the end at 60 frames a second; `plan` may switch things at each moment. */
function play(g: EclipseGame, plan: (g: EclipseGame) => void = () => {}): EclipseGame {
  while (g.state === 'playing') {
    plan(g);
    stepEclipse(g, 1 / 60);
  }
  return g;
}

const off = (g: EclipseGame, s: System) => g.on[s] && toggleSystem(g, s);
const on = (g: EclipseGame, s: System) => !g.on[s] && toggleSystem(g, s);

describe('Survive the eclipse: the mini-game', () => {
  it('goes flat before sunrise with everything left on', () => {
    const g = newEclipseGame('largeBattery');
    expect(lastsS(g)).toBeLessThan(ECLIPSE_TIME_S);
    play(g);
    expect(g).toMatchObject({ state: 'lost', lostTo: 'flat', charge: 0 });
    expect(g.elapsedS).toBeLessThan(ECLIPSE_TIME_S);
    expect(eclipseScore(g)).toBe(0);
  });

  it("keeps the computer on: it can't be switched off", () => {
    const g = newEclipseGame();
    expect(toggleSystem(g, 'computer')).toBe(false);
    expect(g.on.computer).toBe(true);
    expect(toggleSystem(g, 'radio')).toBe(true);
    expect(drawW(g)).toBe(9);
  });

  it('freezes with the heaters off too long', () => {
    const g = play(newEclipseGame(), (x) => {
      off(x, 'heaters');
      off(x, 'radio');
      off(x, 'payload');
    });
    expect(g).toMatchObject({ state: 'lost', lostTo: 'cold' });
    expect(g.elapsedS).toBeCloseTo(COLD_LIMIT_S, 1);
  });

  it('survives with only the radio and Payload off, for the lowest score', () => {
    const g = play(newEclipseGame('smallBattery'), (x) => {
      off(x, 'radio');
      off(x, 'payload');
    });
    expect(g.state).toBe('won');
    expect(eclipseScore(g)).toBeCloseTo(SURVIVE_SCORE);
  });

  it('scores 100% with a Large Battery: radio off, Payload on all the way', () => {
    const g = play(newEclipseGame('largeBattery'), (x) => off(x, 'radio'));
    expect(g.state).toBe('won');
    expect(g.payloadS).toBeCloseTo(ECLIPSE_TIME_S, 1);
    expect(eclipseScore(g)).toBe(1);
  });

  it('is harder with a Small Battery: the Payload must go off part of the way', () => {
    expect(START_CHARGE.smallBattery).toBeLessThan(START_CHARGE.largeBattery);
    const allOn = play(newEclipseGame('smallBattery'), (x) => off(x, 'radio'));
    expect(allOn.state).toBe('lost');
    const g = play(newEclipseGame('smallBattery'), (x) => {
      off(x, 'radio');
      if (x.elapsedS >= 6) off(x, 'payload');
    });
    expect(g.state).toBe('won');
    expect(eclipseScore(g)).toBeGreaterThan(0.8);
    expect(eclipseScore(g)).toBeLessThan(1);
  });

  it('rewards switching the heaters off for short spells', () => {
    const g = play(newEclipseGame('smallBattery'), (x) => {
      off(x, 'radio');
      // Off for 3 s, on for 3 s: never cold for 4 s in a row.
      if (Math.floor(x.elapsedS / 3) % 2 === 0) off(x, 'heaters');
      else on(x, 'heaters');
      if (x.elapsedS >= 8.5) off(x, 'payload');
    });
    expect(g.state).toBe('won');
    expect(eclipseScore(g)).toBe(1);
  });

  it('stops at sunrise exactly, at any frame rate', () => {
    const a = newEclipseGame();
    off(a, 'radio');
    stepEclipse(a, 100);
    expect(a.state).toBe('won');
    expect(a.elapsedS).toBe(ECLIPSE_TIME_S);
  });
});
