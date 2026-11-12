import { contractById, type ContractId } from './contracts';
import type { MissionReport } from './mission';
import type { SiteState } from './siteState';
import { contractNeeds } from './spacecraft';

/**
 * The Company's Spacecraft in orbit, for the Space view. A Spacecraft that reached orbit stays there:
 * when its Power runs out or its Mission is over it goes quiet but keeps circling.
 * Numbers: docs/research/orbits.md.
 */

/** Earth's mean radius, km. */
export const EARTH_KM = 6_371;
/** Earth's gravity parameter GM, km³/s². */
export const EARTH_GM = 398_600;

/** Minutes for one lap of an orbit `low`–`high` km above the ground (Kepler's third law). */
export function orbitMinutes(orbitKm: { low: number; high: number }): number {
  const a = EARTH_KM + (orbitKm.low + orbitKm.high) / 2;
  return (2 * Math.PI * Math.sqrt((a * a * a) / EARTH_GM)) / 60;
}

/**
 * Where a Spacecraft is on its orbit after `share` of a lap (0–1, from the lowest point), in km in the
 * orbit's own plane: Earth's centre at (0, 0), lowest point on +x. It moves fastest at its lowest point.
 */
export function orbitPosition(orbitKm: { low: number; high: number }, share: number): { x: number; y: number } {
  const rp = EARTH_KM + orbitKm.low;
  const ra = EARTH_KM + orbitKm.high;
  const a = (rp + ra) / 2;
  const e = (ra - rp) / (ra + rp);
  const b = a * Math.sqrt(1 - e * e);
  const mean = share * Math.PI * 2;
  let E = mean;
  for (let i = 0; i < 8; i++) E -= (E - e * Math.sin(E) - mean) / (1 - e * Math.cos(E));
  return { x: a * (Math.cos(E) - e), y: b * Math.sin(E) };
}

/** What a Spacecraft in orbit is doing on a Game day. */
export type SatelliteStatus =
  | { kind: 'working'; day: number; days: number }
  | { kind: 'silent'; powerOutDay: number }
  | { kind: 'done' };

export interface Satellite {
  /** Its Mission Report's place in the Company's list: stays the same for good. */
  id: number;
  contract: ContractId;
  report: MissionReport;
  orbitKm: { low: number; high: number };
  inclinationDeg: number;
  status: SatelliteStatus;
}

export function satelliteStatus(report: MissionReport, today: number): SatelliteStatus {
  const days = contractNeeds(contractById(report.contract)).missionDays;
  const day = Math.max(0, Math.floor(today) - report.launchDay);
  const power = report.findings.find((f) => f.kind === 'power');
  const lasts = power?.kind === 'power' ? power.lastsDays : null;
  if (lasts !== null && lasts < days && day >= lasts) return { kind: 'silent', powerOutDay: Math.floor(lasts) };
  if (day < days) return { kind: 'working', day, days };
  return { kind: 'done' };
}

/** Every Spacecraft the Company has put in orbit, oldest first. */
export function satellitesInOrbit(state: SiteState): Satellite[] {
  return state.reports.flatMap((report, id) => {
    const orbit = report.findings.find((f) => f.kind === 'orbit');
    if (!orbit?.ok) return [];
    const contract = contractById(report.contract);
    return [
      {
        id,
        contract: report.contract,
        report,
        orbitKm: contract.orbitKm,
        inclinationDeg: contract.inclinationDeg,
        status: satelliteStatus(report, state.day),
      },
    ];
  });
}
