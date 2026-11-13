import { describe, expect, it } from 'vitest';
import { t } from '../strings';
import { readMissionVizSource } from '../world/missionVizSource';
import { REFERENCE_PATH_DATA } from '../world/referencePaths';
import { contractById } from './contracts';
import { EARTH_KM, orbitMinutes, orbitPosition } from './space';

/**
 * LEAP's orbit maths checked against NASA's General Mission Analysis Tool (GMAT), using the runs that NASA
 * Mission Viz ships (ticket 34's Reference Trajectories). No network and no GMAT install: the runs are in the repo.
 *
 * What is compared: the distance from Earth's centre over time, and the lap time. LEAP's Space view moves a
 * Spacecraft on a fixed ellipse round a point Earth (two-body maths: `orbitMinutes`, `orbitPosition`). We give
 * LEAP the long-ellipse run's lowest and highest points, line up the time of the lowest point, and compare the
 * distance at every one of GMAT's 155 times.
 *
 * What is not compared: direction in space. LEAP draws each orbit in its own plane, so only distances count.
 *
 * Why the tolerance is not tighter: GMAT also includes the Moon's and the Sun's pull and Earth's flattened shape.
 * This orbit reaches 158,000 km out, about 40% of the way to the Moon, where the Moon's pull bends it: its two
 * highest points in the run differ by 118 km. Two-body maths cannot follow that, so it can only come close.
 * The test's real result is in the Real data line (`data.missionViz.check`), which this test keeps honest.
 */

type Sample = { minutes: number; km: number };

function samples(file: string): Sample[] {
  return readMissionVizSource(file).map((p) => ({ minutes: p.minutes, km: Math.hypot(p.x, p.y, p.z) }));
}

/** Time of the peak near sample `i`, from a parabola through three samples round it (the first three at the start). */
function peakMinutes(s: Sample[], i: number): number {
  const j = Math.min(Math.max(i, 1), s.length - 2);
  const [a, b, c] = [s[j - 1], s[j], s[j + 1]];
  const d1 = (b.km - a.km) / (b.minutes - a.minutes);
  const d2 = (c.km - b.km) / (c.minutes - b.minutes);
  const curve = (d2 - d1) / ((c.minutes - a.minutes) / 2);
  return (a.minutes + b.minutes) / 2 - d1 / curve;
}

const ellipse = samples(REFERENCE_PATH_DATA.longEllipse.file);
const lowest = ellipse.reduce((best, s, i) => (s.km < ellipse[best].km ? i : best), 0);
const highest = ellipse.reduce((best, s, i) => (s.km > ellipse[best].km ? i : best), 0);
/** The same orbit for LEAP: heights above the ground of GMAT's lowest and highest points. */
const orbit = { low: ellipse[lowest].km - EARTH_KM, high: ellipse[highest].km - EARTH_KM };

/** LEAP's distance from Earth's centre at each of GMAT's times, with the lowest points lined up. */
function differences(): number[] {
  const lap = orbitMinutes(orbit);
  return ellipse.map((s) => {
    const share = ((((s.minutes - ellipse[lowest].minutes) / lap) % 1) + 1) % 1;
    const p = orbitPosition(orbit, share);
    return Math.abs(Math.hypot(p.x, p.y) - s.km) / s.km;
  });
}

const mean = (xs: number[]) => xs.reduce((sum, x) => sum + x, 0) / xs.length;

describe("LEAP's orbit maths against NASA's GMAT", () => {
  it('reads the long-ellipse run: one lap from high point to high point, low point in the middle', () => {
    expect(ellipse).toHaveLength(155);
    expect(highest).toBeGreaterThan(lowest);
    expect(orbit.low).toBeCloseTo(2_233, -1);
    expect(orbit.high).toBeCloseTo(152_058, -1);
  });

  it('keeps the distance from Earth within 2% on average and 5% at worst', () => {
    const d = differences();
    expect(mean(d)).toBeLessThan(0.02);
    expect(Math.max(...d)).toBeLessThan(0.05);
  });

  it("takes a lap within 1% of GMAT's (high point to high point)", () => {
    // The run starts at its first high point and ends just after the next one.
    const gmatLap = peakMinutes(ellipse, highest) - peakMinutes(ellipse, 0);
    expect(gmatLap / 60).toBeCloseTo(66.7, 1);
    expect(Math.abs(orbitMinutes(orbit) - gmatLap) / gmatLap).toBeLessThan(0.01);
  });

  it("puts geostationary orbit within 0.1% of where GMAT's transfer run ends", () => {
    const transfer = samples(REFERENCE_PATH_DATA.geoTransfer.file);
    const gmatKm = transfer[transfer.length - 1].km;
    expect(gmatKm).toBeCloseTo(42_165, 0);
    const geo = contractById('syncom3').orbitKm;
    expect(geo.low).toBe(geo.high);
    expect(Math.abs(EARTH_KM + geo.low - gmatKm) / gmatKm).toBeLessThan(0.001);
  });

  it('says the real result in Real data', () => {
    const d = differences();
    const percent = (x: number) => `${(x * 100).toFixed(1)}%`;
    expect(t('data.missionViz.check')).toContain(percent(mean(d)));
    expect(t('data.missionViz.check')).toContain(percent(Math.max(...d)));
  });
});
