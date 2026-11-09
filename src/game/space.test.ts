import { describe, expect, it } from 'vitest';
import { advanceDays } from './siteState';
import { acceptContract } from './contracts';
import { launch, shipMission } from './mission';
import { newSiteState } from './siteState';
import { generateSite } from '../site/site';
import { type OptionId, choose, partsNeeded } from './spacecraft';
import { EARTH_KM, orbitMinutes, orbitPosition, satellitesInOrbit } from './space';

const site = generateSite('K7QXM2');
const EXPLORER: OptionId[] = ['smallBus', 'batteriesOnly', 'largeBattery', 'simpleAntenna', 'spin', 'radiationDetector'];
const swap = (from: OptionId, to: OptionId) => EXPLORER.map((id) => (id === from ? to : id));

function launched(ids: OptionId[] = EXPLORER) {
  const state = { ...newSiteState(), money: 5_000_000 };
  for (const id of ids) choose(state.design, id);
  for (const p of partsNeeded(state.design)) state.parts[p] += 1;
  acceptContract(state, 'explorer1');
  shipMission(state, state.design);
  advanceDays(site, state, 37);
  launch(state, 'K7QXM2');
  return state;
}

describe('Space view', () => {
  it("works out Explorer 1's real lap time from its orbit: 114.8 minutes", () => {
    expect(orbitMinutes({ low: 358, high: 2_550 })).toBeCloseTo(114.8, 1);
  });

  it('puts the lowest point on +x and moves fastest there', () => {
    const orbit = { low: 358, high: 2_550 };
    expect(orbitPosition(orbit, 0).x).toBeCloseTo(EARTH_KM + 358);
    expect(orbitPosition(orbit, 0.5).x).toBeCloseTo(-(EARTH_KM + 2_550));
    const step = (s: number) => {
      const a = orbitPosition(orbit, s);
      const b = orbitPosition(orbit, s + 0.01);
      return Math.hypot(b.x - a.x, b.y - a.y);
    };
    expect(step(0)).toBeGreaterThan(step(0.5));
  });

  it('lists a Spacecraft that reached orbit, with the design that flew and its real tilt', () => {
    const state = launched();
    const [sat, ...rest] = satellitesInOrbit(state);
    expect(rest).toEqual([]);
    expect(sat).toMatchObject({ id: 0, contract: 'explorer1', inclinationDeg: 33.24, orbitKm: { low: 358, high: 2_550 } });
    expect(sat!.report.design?.battery).toBe('largeBattery');
    expect(sat!.status).toEqual({ kind: 'working', day: 0, days: 30 });
    advanceDays(site, state, 12);
    expect(satellitesInOrbit(state)[0]!.status).toEqual({ kind: 'working', day: 12, days: 30 });
    advanceDays(site, state, 20);
    expect(satellitesInOrbit(state)[0]!.status).toEqual({ kind: 'done' });
  });

  it('keeps a Spacecraft whose Power ran out in orbit, silent from that day', () => {
    const state = launched(swap('largeBattery', 'smallBattery'));
    advanceDays(site, state, 10);
    expect(satellitesInOrbit(state)[0]!.status.kind).toBe('working');
    advanceDays(site, state, 10);
    expect(satellitesInOrbit(state)[0]!.status).toEqual({ kind: 'silent', powerOutDay: 16 });
  });

  it('leaves out a Spacecraft that never reached orbit', () => {
    const state = launched();
    state.reports[0]!.findings = state.reports[0]!.findings.map((f) => (f.kind === 'orbit' ? { ...f, ok: false } : f));
    expect(satellitesInOrbit(state)).toEqual([]);
  });
});
