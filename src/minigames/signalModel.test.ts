import { describe, expect, it } from 'vitest';
import {
  DISTANCE_KM,
  FIRST_WINDOW,
  INSTRUMENTS,
  LOCK_S,
  MIN_ELEVATION,
  ONE_WAY_H,
  RESERVE_WH,
  ROUND_TRIP_H,
  type SignalGame,
  assignStation,
  carrierNow,
  checkGround,
  confirmContact,
  canFastForward,
  cn0,
  elevation,
  inView,
  inverseSquareDb,
  lightHours,
  marginW,
  newSignalGame,
  shout,
  signalStars,
  spaceLossDb,
  stepName,
  stepSignal,
  toggleLoad,
  tuneTo,
} from './signalModel';

const run = (g: SignalGame, realS: number) => {
  for (let i = 0; i < realS * 20 && g.state === 'playing'; i++) stepSignal(g, 0.05);
};
const until = (g: SignalGame, done: (g: SignalGame) => boolean, limitS = 300) => {
  for (let i = 0; i < limitS * 20 && g.state === 'playing' && !done(g); i++) stepSignal(g, 0.05);
};

/** A clean run of the whole protocol. */
function playWell(g: SignalGame): SignalGame {
  checkGround(g, 'crossCheck');
  toggleLoad(g, 'backupHeater');
  toggleLoad(g, 'instHeaters');
  expect(stepName(g)).toBe('station');
  g.fast = true;
  until(g, (g) => inView('canberra', g.hours));
  expect(assignStation(g, 'canberra')).toBe('assigned');
  until(g, (g) => {
    tuneTo(g, carrierNow(g));
    return g.locked;
  });
  expect(shout(g)).toBe('sent');
  until(g, (g) => g.telemetry, 120);
  expect(stepName(g)).toBe('wait');
  // Restore: the backup heater stays off; the instruments are still on.
  expect(confirmContact(g)).toBe('restored');
  return g;
}

describe('Lost Signal: light time and the inverse-square law', () => {
  it('puts the probe 18.5 light-hours away, 37 hours there and back', () => {
    expect(lightHours(DISTANCE_KM)).toBeCloseTo(18.44, 1);
    expect(ONE_WAY_H).toBeCloseTo(18.5, 0);
    expect(ROUND_TRIP_H).toBeCloseTo(37, 0);
  });

  it('loses about 6 dB each time the distance doubles', () => {
    expect(inverseSquareDb(1, 2)).toBeCloseTo(6.02, 2);
    expect(spaceLossDb(2e9, 8420) - spaceLossDb(1e9, 8420)).toBeCloseTo(6.02, 2);
    expect(spaceLossDb(DISTANCE_KM, 8420)).toBeGreaterThan(300);
  });

  it('leaves a faint but findable carrier when 2° off', () => {
    expect(cn0(-170)).toBeGreaterThan(10);
    expect(cn0(-155)).toBeGreaterThan(cn0(-170));
  });
});

describe('Lost Signal: the DSN', () => {
  it('only Canberra can see a probe this far south', () => {
    for (let h = 0; h < 24; h += 0.5) {
      expect(elevation('goldstone', h)).toBeLessThan(0);
      expect(elevation('madrid', h)).toBeLessThan(0);
      expect(elevation('canberra', h)).toBeGreaterThan(0);
    }
  });

  it('starts with Canberra setting, then a full window later', () => {
    expect(inView('canberra', 0)).toBe(true);
    const [a, b] = FIRST_WINDOW;
    expect(a).toBeGreaterThan(6);
    expect(b - a).toBeGreaterThan(8);
    expect(elevation('canberra', (a + b) / 2)).toBeGreaterThan(MIN_ELEVATION + 20);
  });
});

describe('Lost Signal: the protocol', () => {
  it('runs the reserve flat if nothing is shed', () => {
    const g = newSignalGame(0.3);
    expect(marginW(g)).toBeLessThan(0);
    run(g, 60);
    expect(g).toMatchObject({ state: 'lost', lostTo: 'power' });
  });

  it('freezes the propellant line if its heater is shed', () => {
    const g = newSignalGame(0.3);
    toggleLoad(g, 'lineHeater');
    toggleLoad(g, 'backupHeater');
    run(g, 60);
    expect(g).toMatchObject({ state: 'lost', lostTo: 'freeze' });
  });

  it('goes step by step: no station before the ground check, no shout before lock', () => {
    const g = newSignalGame(0.3);
    expect(assignStation(g, 'canberra')).toBeNull();
    expect(checkGround(g, 'restart')).toBe(false);
    expect(g.mistakes).toBe(1);
    expect(g.hours).toBeGreaterThan(1.9);
    checkGround(g, 'crossCheck');
    expect(stepName(g)).toBe('power');
    toggleLoad(g, 'backupHeater');
    expect(stepName(g)).toBe('station');
    expect(assignStation(g, 'goldstone')).toBe('wrong');
    expect(shout(g)).toBeNull();
  });

  it('needs Canberra in view to take the uplink', () => {
    const g = newSignalGame(0.3);
    checkGround(g, 'crossCheck');
    toggleLoad(g, 'backupHeater');
    until(g, (g) => !inView('canberra', g.hours));
    expect(assignStation(g, 'canberra')).toBe('notYet');
  });

  it('loses if the window closes before the shout', () => {
    const g = newSignalGame(0.3);
    checkGround(g, 'crossCheck');
    toggleLoad(g, 'backupHeater');
    toggleLoad(g, 'instHeaters');
    g.fast = true;
    until(g, (g) => inView('canberra', g.hours));
    assignStation(g, 'canberra');
    until(g, () => false, 200);
    expect(g).toMatchObject({ state: 'lost', lostTo: 'window' });
  });

  it('can fast-forward while Canberra is down, even after choosing it', () => {
    const g = newSignalGame(0.3);
    checkGround(g, 'crossCheck');
    toggleLoad(g, 'backupHeater');
    expect(assignStation(g, 'canberra')).toBe('assigned');
    expect(canFastForward(g)).toBe(false);
    until(g, (g) => !inView('canberra', g.hours));
    expect(canFastForward(g)).toBe(true);
    g.fast = true;
    const before = g.hours;
    stepSignal(g, 0.1);
    expect(g.hours - before).toBeGreaterThan(0.3);
  });

  it('locks only when tuned close to the carrier for a moment', () => {
    const g = newSignalGame(0.8);
    checkGround(g, 'crossCheck');
    toggleLoad(g, 'backupHeater');
    toggleLoad(g, 'instHeaters');
    g.fast = true;
    until(g, (g) => inView('canberra', g.hours));
    assignStation(g, 'canberra');
    tuneTo(g, carrierNow(g) + 5);
    run(g, 3);
    expect(g.locked).toBe(false);
    expect(shout(g)).toBeNull();
    tuneTo(g, carrierNow(g));
    stepSignal(g, LOCK_S / 2);
    expect(g.locked).toBe(false);
    until(g, (g) => {
      tuneTo(g, carrierNow(g));
      return g.locked;
    });
    expect(stepName(g)).toBe('shout');
  });

  it('wins a clean run: telemetry back after the round trip, loads restored', () => {
    const g = playWell(newSignalGame(0.3));
    expect(g.state).toBe('won');
    expect(g.hours - g.shoutAt!).toBeGreaterThan(ROUND_TRIP_H);
    expect(signalStars(g)).toBeGreaterThanOrEqual(2);
    expect(g.minReserveWh).toBeGreaterThan(RESERVE_WH * 0.5);
  });

  it("waits for the instruments to be back on before it's done", () => {
    const g = newSignalGame(0.6);
    checkGround(g, 'crossCheck');
    for (const l of INSTRUMENTS) toggleLoad(g, l);
    toggleLoad(g, 'backupHeater');
    g.fast = true;
    until(g, (g) => inView('canberra', g.hours));
    assignStation(g, 'canberra');
    until(g, (g) => {
      tuneTo(g, carrierNow(g));
      return g.locked;
    });
    shout(g);
    until(g, (g) => g.telemetry, 120);
    run(g, 2);
    expect(g.state).toBe('playing');
    expect(confirmContact(g)).toBe('instruments');
    for (const l of INSTRUMENTS) toggleLoad(g, l);
    expect(confirmContact(g)).toBe('restored');
    expect(g.state).toBe('won');
    expect(g.instDamaged).toBe(false);
  });
});
