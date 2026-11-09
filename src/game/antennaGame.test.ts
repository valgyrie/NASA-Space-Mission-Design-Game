import { describe, expect, it } from 'vitest';
import {
  ANTENNA_HOLD_S,
  ANTENNA_TIME_S,
  type AntennaGame,
  aimAt,
  antennaScore,
  newAntennaGame,
  onStation,
  stationDeg,
  stepAntenna,
} from './antennaGame';

const STEP = 1 / 60;

/** Play with a player who points at the Ground Station from `reactS` seconds on. */
function play(reactS: number, follow = true): AntennaGame {
  const g = newAntennaGame();
  while (g.state === 'playing') {
    if (g.elapsedS >= reactS && follow) aimAt(g, stationDeg(g, g.elapsedS));
    stepAntenna(g, STEP);
  }
  return g;
}

describe('Point the antenna', () => {
  it('starts with the beam off the Ground Station', () => {
    expect(onStation(newAntennaGame())).toBe(false);
    expect(onStation(newAntennaGame(1))).toBe(false);
  });

  it('locks when the beam stays on the station long enough, scoring 100% when quick', () => {
    const g = play(0);
    expect(g.state).toBe('won');
    expect(g.lockedAtS).toBeGreaterThanOrEqual(ANTENNA_HOLD_S);
    expect(antennaScore(g)).toBe(1);
  });

  it('scores less the longer it takes', () => {
    const slow = play(8);
    expect(slow.state).toBe('won');
    expect(antennaScore(slow)).toBeGreaterThan(0);
    expect(antennaScore(slow)).toBeLessThan(1);
    expect(antennaScore(play(10))).toBeLessThan(antennaScore(slow));
  });

  it('loses contact, scoring 0, if nobody aims', () => {
    const g = play(0, false);
    expect(g.state).toBe('lost');
    expect(g.elapsedS).toBe(ANTENNA_TIME_S);
    expect(antennaScore(g)).toBe(0);
  });

  it('turns the antenna at a limited speed, so it takes a moment to swing round', () => {
    const g = newAntennaGame();
    const start = g.aimDeg;
    aimAt(g, 0);
    stepAntenna(g, 0.1);
    expect(Math.abs(g.aimDeg - start)).toBeLessThan(20);
    expect(Math.abs(g.aimDeg - start)).toBeGreaterThan(5);
  });

  it('moves the station across the sky as Earth turns', () => {
    const g = newAntennaGame();
    expect(stationDeg(g, 0)).toBeGreaterThan(0);
    expect(stationDeg(g, ANTENNA_TIME_S)).toBeLessThan(0);
  });
});
