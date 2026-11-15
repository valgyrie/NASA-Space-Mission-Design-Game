import { describe, expect, it } from 'vitest';
import { fly } from '../game/flight';
import { satelliteStatus } from '../game/space';
import { type Design, type OptionId, choose, emptyDesign } from '../game/spacecraft';
import type { MissionReport } from '../game/mission';
import { satelliteFacts, statusText } from './spaceScreen';

const EXPLORER: OptionId[] = ['smallBus', 'batteriesOnly', 'largeBattery', 'simpleAntenna', 'spin', 'radiationDetector'];

function report(ids: OptionId[]): MissionReport {
  const design: Design = emptyDesign();
  for (const id of ids) choose(design, id);
  const flight = fly({ contract: 'explorer1', design, vehicle: 'juno1', tech: [] }, 40, 365);
  return { contract: 'explorer1', vehicle: 'juno1', site: 'capeCanaveral', launchDay: 40, success: flight.success, reward: 0, findings: flight.findings, design, anomaly: null, insurancePaid: 0 };
}

describe('Space view text', () => {
  it('says what a Spacecraft is doing, day by day', () => {
    const r = report(EXPLORER);
    expect(statusText(satelliteStatus(r, 40))).toBe('Sending Data: day 1 of 30');
    expect(statusText(satelliteStatus(r, 69))).toBe('Sending Data: day 30 of 30');
    expect(statusText(satelliteStatus(r, 70))).toBe('Mission done. Still in orbit.');
    const weak = report(EXPLORER.map((id) => (id === 'largeBattery' ? 'smallBattery' : id)));
    expect(statusText(satelliteStatus(weak, 60))).toBe('Silent since day 16: the Power ran out. Still in orbit.');
  });

  it("gives Explorer 1's real orbit and lap time", () => {
    const r = report(EXPLORER);
    const facts = satelliteFacts({ id: 0, contract: 'explorer1', report: r, orbitKm: { low: 358, high: 2_550 }, inclinationDeg: 33.24, place: 'earth', status: satelliteStatus(r, 40) });
    expect(facts).toEqual([
      expect.stringContaining('on Juno I from Cape Canaveral'),
      '358 to 2,550 km above Earth, tilted 33.2° to the equator.',
      'One lap takes 115 minutes. Shown 300× faster.',
    ]);
  });
});
