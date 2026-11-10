import { type Rng, hashText, makeRng } from '../site/random';
import { PART_SPREAD, TEST_RUNS } from './balance';
import { CONTRACTS } from './contracts';
import { liftFrom } from './launchVehicles';
import type { Finding, Mission } from './mission';
import { SLOTS, contractNeeds, dataOf, hasRightPayload, powerOf, spacecraftMass } from './spacecraft';

/**
 * The flight, worked out day by day. The real Launch flies it once; a Test Run flies it many times.
 * Each flight's Parts are a little off their labels (`Spread`), so a design with a thin margin
 * sometimes fails and one with room to spare never does. Same Seed in, same flights out.
 */

/** How far this flight's Parts are from their labels: 1 is exactly as labelled. */
export interface Spread {
  batteryWh: number;
  powerUseW: number;
  sendPerDay: number;
}

export const AS_LABELLED: Spread = { batteryWh: 1, powerUseW: 1, sendPerDay: 1 };

/** Draw one flight's Spread: up to ±`share`, most often close to the label (two dice added). */
export function drawSpread(rng: Rng, share: Spread = PART_SPREAD): Spread {
  const vary = (most: number) => 1 + (rng() + rng() - 1) * most;
  return {
    batteryWh: vary(share.batteryWh),
    powerUseW: vary(share.powerUseW),
    sendPerDay: vary(share.sendPerDay),
  };
}

/**
 * What flies: the Contract, the design, the Launch Vehicle, and the tech tree Upgrades and Marks its Parts
 * were built with (all Mk 1 when `marks` is left out).
 */
export type FlightPlan = Pick<Mission, 'contract' | 'design' | 'vehicle' | 'tech'> & Partial<Pick<Mission, 'marks' | 'site'>>;

/** One flight. The day lists hold the value at the start of each Mission day, 0 to `missionDays`. */
export interface Flight {
  findings: Finding[];
  /** Every finding was ok. */
  success: boolean;
  missionDays: number;
  /** Watt-hours left in the battery. */
  batteryWh: number[];
  /** Kilobytes of the Data the client wants that reached home so far. */
  dataSentKb: number[];
  /** Kilobytes the client wants: the Payload's Data for every Mission day. */
  dataGoalKb: number;
  /** Mission day the Power ran out, or null if it lasted. */
  powerOutDay: number | null;
}

export function fly(plan: FlightPlan, launchDay: number, deadline: number | null, spread: Spread = AS_LABELLED): Flight {
  const { orbit, payload, missionDays } = contractNeeds(CONTRACTS[plan.contract]);
  const design = plan.design;
  const marks = plan.marks ?? {};
  const massKg = spacecraftMass(design, marks);
  const liftKg = liftFrom(plan.vehicle, orbit, plan.site ?? 'capeCanaveral');
  const power = powerOf(design, plan.tech, marks);
  const data = dataOf(design, plan.tech);
  const rightPayload = hasRightPayload(design, payload);

  const batteryWh = power.batteryWh * spread.batteryWh;
  const powerUseW = power.powerUseW * spread.powerUseW;
  const drainW = powerUseW - power.sunW;
  const lastsDays = drainW > 0 ? batteryWh / drainW / 24 : Infinity;
  const sendPerDay = data.sendPerDay * spread.sendPerDay;
  const sentPerDay = rightPayload ? Math.min(data.dataPerDay, sendPerDay) : 0;
  const endDay = launchDay + missionDays;

  const days = Array.from({ length: missionDays + 1 }, (_, d) => d);
  const findings: Finding[] = [
    { kind: 'orbit', ok: massKg <= liftKg + 1e-9, orbit, vehicle: plan.vehicle, massKg, liftKg },
    { kind: 'payload', ok: rightPayload, payload, carried: design.payload },
    {
      kind: 'power',
      ok: lastsDays >= missionDays - 1e-9,
      battery: design.battery,
      batteryWh,
      powerUseW,
      lastsDays: Number.isFinite(lastsDays) ? lastsDays : null,
      needDays: missionDays,
    },
    { kind: 'comms', ok: sendPerDay >= data.dataPerDay - 1e-9, sendPerDay, dataPerDay: data.dataPerDay },
    { kind: 'time', ok: deadline === null || endDay <= deadline, endDay, deadlineDay: deadline ?? endDay },
  ];
  return {
    findings,
    success: findings.every((f) => f.ok),
    missionDays,
    batteryWh: days.map((d) => Math.max(0, batteryWh - Math.max(0, drainW) * 24 * d)),
    dataSentKb: days.map((d) => sentPerDay * Math.min(d, lastsDays)),
    dataGoalKb: data.dataPerDay * missionDays,
    powerOutDay: lastsDays < missionDays ? lastsDays : null,
  };
}

/** The real flight: one Spread drawn from the Seed and the Launch day. */
export function realFlight(seed: string, plan: FlightPlan, launchDay: number, deadline: number | null): Flight {
  const rng = makeRng(hashText(`${seed}|flight|${plan.contract}|${launchDay}`));
  return fly(plan, launchDay, deadline, drawSpread(rng));
}

// ---- Test Run ----

export interface TestRun {
  /** The flight with every Part exactly as labelled: what the graphs and the orbit view show. */
  asLabelled: Flight;
  runs: number;
  successes: number;
  /** Estimated success in whole percent. 0 and 100 only when every run agreed. */
  successPercent: number;
  /** In how many runs each requirement was missed. */
  missed: Record<Finding['kind'], number>;
  /** Lowest and highest battery energy across all runs, for each Mission day. */
  batteryLowWh: number[];
  batteryHighWh: number[];
}

/** Whole percent, kept off 0 and 100 unless it really is all or nothing. */
export function percent(part: number, whole: number): number {
  if (whole <= 0 || part <= 0) return 0;
  if (part >= whole) return 100;
  return Math.min(99, Math.max(1, Math.round((part / whole) * 100)));
}

/**
 * Fly the design many times with its Parts a little off their labels and count the successes.
 * Free and repeatable: the same Seed and design always give the same Test Run.
 */
export function testRun(
  seed: string,
  plan: FlightPlan,
  launchDay: number,
  deadline: number | null,
  { runs = TEST_RUNS, share = PART_SPREAD }: { runs?: number; share?: Spread } = {},
): TestRun {
  const design = SLOTS.map((s) => plan.design[s] ?? '-').join(',');
  // Better Marks change the runs too; an all-Mk 1 design keeps the runs it always had.
  const marks = SLOTS.some((s) => (plan.marks?.[s] ?? 1) > 1) ? `|${SLOTS.map((s) => plan.marks?.[s] ?? 1).join('')}` : '';
  const rng = makeRng(hashText(`${seed}|test|${plan.contract}|${plan.vehicle}|${design}|${plan.tech.join(',')}${marks}`));
  const asLabelled = fly(plan, launchDay, deadline);
  const missed: Record<Finding['kind'], number> = { orbit: 0, payload: 0, power: 0, comms: 0, time: 0 };
  const batteryLowWh = [...asLabelled.batteryWh];
  const batteryHighWh = [...asLabelled.batteryWh];
  let successes = 0;
  for (let i = 0; i < runs; i++) {
    const flight = fly(plan, launchDay, deadline, drawSpread(rng, share));
    if (flight.success) successes++;
    for (const f of flight.findings) if (!f.ok) missed[f.kind]++;
    flight.batteryWh.forEach((wh, d) => {
      batteryLowWh[d] = Math.min(batteryLowWh[d]!, wh);
      batteryHighWh[d] = Math.max(batteryHighWh[d]!, wh);
    });
  }
  return { asLabelled, runs, successes, successPercent: percent(successes, runs), missed, batteryLowWh, batteryHighWh };
}
