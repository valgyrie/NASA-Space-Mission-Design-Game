import { describe, expect, it } from 'vitest';
import { type ContractId, CONTRACT_IDS } from '../game/contracts';
import type { Finding, MissionReport } from '../game/mission';
import { REAL_CRAFT, REAL_CRAFT_IDS, realCraftFor } from '../game/realCraft';
import { type Design, emptyDesign } from '../game/spacecraft';
import { formatRealDate } from './format';
import { type Yours, comparisonLine, likeTheRealOne, yoursFrom } from './likeTheRealOne';

function report(contract: ContractId, findings: Finding[], power: Design['power'] = 'batteriesOnly'): MissionReport {
  const design = emptyDesign();
  design.power = power;
  return {
    contract,
    vehicle: 'juno1',
    site: 'capeCanaveral',
    launchDay: 40,
    success: true,
    reward: 0,
    findings,
    design,
    anomaly: null,
    insurancePaid: 0,
  };
}

const orbit = (ok: boolean, massKg: number): Finding => ({ kind: 'orbit', ok, orbit: 'lowEarthOrbit', vehicle: 'juno1', massKg, liftKg: 14 });
const power = (lastsDays: number | null, needDays: number): Finding => ({
  kind: 'power', ok: lastsDays === null || lastsDays >= needDays, battery: 'largeBattery', batteryWh: 100, powerUseW: 1, lastsDays, needDays,
});

describe('Like the real one: the data', () => {
  it('has a real Spacecraft for every Milestone and every Free Play kind', () => {
    for (const id of ['explorer1', 'tiros1', 'telstar1', 'syncom3'] as const) expect(realCraftFor(id)?.id).toBe(id);
    expect(realCraftFor('apollo11')?.id).toBe('easep');
    expect(realCraftFor('artemis4Mapper')?.id).toBe('lro');
    // Plans, not flown Spacecraft: no comparison.
    for (const id of CONTRACT_IDS.filter((c) => c.startsWith('artemis3') || c === 'artemis4Relay' || c === 'artemis4CargoLander')) expect(realCraftFor(id)).toBeNull();
    expect(realCraftFor('free-0')?.id).toBe('sampex'); // radiation survey
    expect(realCraftFor('free-1')?.id).toBe('noaa18'); // weather watch
    expect(realCraftFor('free-2')?.id).toBe('tdrs1'); // orbital relay
  });

  it('gives every figure a source and every Spacecraft a Learn more link', () => {
    for (const id of REAL_CRAFT_IDS) {
      const craft = REAL_CRAFT[id];
      expect(craft.learnMore).toMatch(/^https:\/\//);
      for (const figure of [craft.massKg, craft.power, craft.worked]) if (figure) expect(figure.source).toMatch(/^https:\/\//);
    }
  });

  it('writes real dates in full, or by month when the day is not known', () => {
    expect(formatRealDate('1958-05-23')).toBe('23 May 1958');
    expect(formatRealDate('1969-04')).toBe('April 1969');
  });
});

describe('Like the real one: the comparison line', () => {
  it('matches the ticket example for an Explorer 1 on batteries', () => {
    const yours: Yours = { massKg: 11.47, power: 'batteries', worked: { days: 30, whole: true } };
    expect(comparisonLine(yours, REAL_CRAFT.explorer1, 'Explorer 1')).toBe(
      'Yours is 2.5 kg lighter. Explorer 1 also ran on batteries alone. They lasted until 23 May 1958.',
    );
  });

  it('says heavier, and that the real one used solar cells', () => {
    const yours: Yours = { massKg: 140, power: 'batteries', worked: { days: 50, whole: false } };
    expect(comparisonLine(yours, REAL_CRAFT.tiros1, 'TIROS-1')).toBe('Yours is 18 kg heavier. TIROS-1 used solar cells. It worked 78 days.');
  });

  it('calls masses within 5% the same, and rounds big differences to whole kilograms', () => {
    const close: Yours = { massKg: 79, power: 'solarAndBatteries', worked: null };
    expect(comparisonLine(close, REAL_CRAFT.telstar1, 'Telstar 1')).toBe('Yours weighs about the same. Telstar 1 also used solar cells. It worked 136 days.');
    const small: Yours = { massKg: 42.6, power: 'solarAndBatteries', worked: null };
    expect(comparisonLine(small, REAL_CRAFT.tdrs1, 'TDRS-1')).toBe('Yours is 2,225 kg lighter. TDRS-1 also used solar cells. It worked until 27 June 2010.');
  });

  it('says what the real one used when the design is unknown (old saves)', () => {
    const old: Yours = { massKg: null, power: null, worked: null };
    expect(comparisonLine(old, REAL_CRAFT.explorer1, 'Explorer 1')).toBe('Explorer 1 ran on batteries alone. They lasted until 23 May 1958.');
  });
});

describe('Like the real one: the table', () => {
  it('shows Yours beside the Milestone, for a whole Mission', () => {
    const c = likeTheRealOne(report('explorer1', [orbit(true, 11.47), power(40, 30)]))!;
    expect(c.name).toBe('Explorer 1');
    expect(c.sameMission).toBe(true);
    expect(c.rows).toEqual([
      { label: 'Mass at launch', yours: '11.5 kg', real: '13.97 kg' },
      { label: 'Power', yours: 'Batteries only', real: 'Batteries only' },
      { label: 'How long it worked', yours: 'All 30 days of the Mission', real: 'Until 23 May 1958' },
    ]);
  });

  it('says when the Power ran out, and when it never reached orbit', () => {
    const short = likeTheRealOne(report('tiros1', [orbit(true, 120), power(41.7, 78)], 'solarCells'))!;
    expect(short.rows[2]).toEqual({ label: 'How long it worked', yours: '41 days, then the Power ran out', real: '78 days' });
    expect(short.rows[1]!.yours).toBe('Solar cells and batteries');
    const lost = likeTheRealOne(report('explorer1', [orbit(false, 20), power(40, 30)]))!;
    expect(lost.rows[2]!.yours).toBe('Never reached orbit');
  });

  it('uses a real mission of the same kind in Free Play', () => {
    const c = likeTheRealOne(report('free-1', [orbit(true, 60), power(null, 45)], 'solarCells'))!;
    expect(c.name).toBe('NOAA-18');
    expect(c.sameMission).toBe(false);
    expect(c.rows.map((r) => r.real)).toEqual(['1,420 kg', 'Solar cells', 'Until 6 June 2025']);
    expect(c.rows[2]!.yours).toBe('All 45 days of the Mission');
  });

  it('falls back to the design for the mass when no orbit line was kept', () => {
    expect(yoursFrom(report('explorer1', [])).massKg).toBeGreaterThanOrEqual(0);
  });
});
