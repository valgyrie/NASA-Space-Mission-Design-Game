import { type Rng, hashText, makeRng } from '../site/random';
import { PART_SPREAD, TEST_RUNS } from './balance';
import { contractById } from './contracts';
import { LAUNCH_VEHICLES, type LaunchVehicleId } from './launchVehicles';
import type { Finding, Mission } from './mission';
import {
  type Design,
  SLOTS,
  batteryOnDay,
  contractNeeds,
  dataOf,
  hasLander,
  hasMainEngine,
  hasRightPayload,
  isCubeSat,
  lastsDaysOn,
  liftFor,
  linkShare,
  needsLander,
  needsMainEngine,
  powerOf,
  spacecraftMass,
} from './spacecraft';

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
 * were built with (all Mk 1 when `marks` is left out), and how much the Company's Ground Stations add to its
 * antenna (1, none, when `ground` is left out).
 */
export type FlightPlan = Pick<Mission, 'contract' | 'design' | 'vehicle' | 'tech'> & Partial<Pick<Mission, 'marks' | 'site' | 'ground' | 'relay'>>;

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

/**
 * Whether the rocket fails this time, and if so which stage: null when it works. Each stage is as likely to be
 * the one that fails. `reliability` is the share of Launches that work (1: it never fails).
 */
export function drawRocket(rng: Rng, vehicle: LaunchVehicleId, reliability: number): number | null {
  const fails = rng() >= reliability;
  const stage = 1 + Math.floor(rng() * LAUNCH_VEHICLES[vehicle].stages.length);
  return fails ? stage : null;
}

/**
 * Fly the design once. `failedStage` is the rocket stage that failed (from `drawRocket`), or null when the
 * rocket worked; a Spacecraft too heavy for the rocket fails on that alone.
 */
export function fly(
  plan: FlightPlan,
  launchDay: number,
  deadline: number | null,
  spread: Spread = AS_LABELLED,
  failedStage: number | null = null,
): Flight {
  const contract = contractById(plan.contract);
  const { orbit, payload, missionDays } = contractNeeds(contract);
  const design = plan.design;
  const marks = plan.marks ?? {};
  const massKg = spacecraftMass(design, marks);
  const liftKg = liftFor(contract, plan.vehicle, orbit, plan.site ?? 'capeCanaveral');
  const power = powerOf(design, plan.tech, marks, orbit);
  // From the Moon an antenna gets a fifth of its Data home; from the south pole, only while Earth or a relay is in view.
  const data = dataOf(design, plan.tech, (plan.ground ?? 1) * linkShare(orbit, plan.relay ?? false));
  const rightPayload = hasRightPayload(design, payload);
  // NASA's CubeSat slots take CubeSats only: anything else never gets on board.
  const fits = !contract.cubeSat || isCubeSat(design);
  const light = liftKg > 0 && massKg <= liftKg + 1e-9 && fits;
  const rocketFailed = light ? failedStage : null;
  // A geostationary orbit needs the Spacecraft's own main engine: without one it stays in the transfer orbit. Lunar
  // orbit needs it to brake (without, it flies past the Moon); landing alone needs a Lander.
  const stuck = light && rocketFailed === null &&
    ((needsMainEngine(orbit) && !hasMainEngine(design)) || (needsLander(contract) && !hasLander(design)));

  const batteryWh = power.batteryWh * spread.batteryWh;
  const powerUseW = power.powerUseW * spread.powerUseW;
  const lastsDays = lastsDaysOn(orbit, powerUseW, power.solarW, batteryWh);
  const sendPerDay = data.sendPerDay * spread.sendPerDay;
  const sentPerDay = rightPayload ? Math.min(data.dataPerDay, sendPerDay) : 0;
  const endDay = launchDay + missionDays;

  const days = Array.from({ length: missionDays + 1 }, (_, d) => d);
  const findings: Finding[] = [
    {
      kind: 'orbit',
      ok: light && rocketFailed === null && !stuck,
      orbit,
      vehicle: plan.vehicle,
      massKg,
      liftKg,
      failedStage: rocketFailed,
      ...(stuck ? { noEngine: true } : {}),
    },
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
    batteryWh: days.map((d) => batteryOnDay(orbit, powerUseW, power.solarW, batteryWh, d)),
    dataSentKb: days.map((d) => sentPerDay * Math.min(d, lastsDays)),
    dataGoalKb: data.dataPerDay * missionDays,
    powerOutDay: lastsDays < missionDays ? lastsDays : null,
  };
}

/**
 * The real flight: one Spread drawn from the Seed and the Launch day, and whether the rocket works
 * (`reliability`: the share of Launches that do; 1 for the first Launch, see `rocketReliability`).
 */
export function realFlight(seed: string, plan: FlightPlan, launchDay: number, deadline: number | null, reliability = 1): Flight {
  const rng = makeRng(hashText(`${seed}|flight|${plan.contract}|${launchDay}`));
  const rocket = makeRng(hashText(`${seed}|rocket|${plan.contract}|${launchDay}`));
  return fly(plan, launchDay, deadline, drawSpread(rng), drawRocket(rocket, plan.vehicle, reliability));
}

// ---- Test Run ----

export interface TestRun {
  /** The flight with every Part exactly as labelled: what the graphs and the orbit view show. */
  asLabelled: Flight;
  runs: number;
  /** Runs the design got through, with the rocket working. */
  successes: number;
  /** The Launch Vehicle it flew on, and the share of Launches it works (1 when it can't fail). */
  vehicle: LaunchVehicleId;
  reliability: number;
  /** The design alone: runs it got through, in whole percent. */
  designPercent: number;
  /**
   * Estimated success in whole percent: the design's runs times the rocket's reliability, so a design
   * change shows its effect without luck in the way. 0 and 100 only when every run agreed.
   */
  successPercent: number;
  /** In how many runs each requirement was missed. */
  missed: Record<Finding['kind'], number>;
  /** Lowest and highest battery energy across all runs, for each Mission day. */
  batteryLowWh: number[];
  batteryHighWh: number[];
}

/** The slots that name a Test Run's runs: Propulsion only when it holds an engine. */
function keyedSlots(design: Design) {
  return SLOTS.filter((s) => s !== 'propulsion' || (design.propulsion ?? 'noEngine') !== 'noEngine');
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
  { runs = TEST_RUNS, share = PART_SPREAD, reliability = 1 }: { runs?: number; share?: Spread; reliability?: number } = {},
): TestRun {
  // A design with no engine keeps the runs it had before the Propulsion slot existed.
  const slots = keyedSlots(plan.design);
  const design = slots.map((s) => plan.design[s] ?? '-').join(',');
  // Better Marks change the runs too; an all-Mk 1 design keeps the runs it always had.
  const marks = slots.some((s) => (plan.marks?.[s] ?? 1) > 1) ? `|${slots.map((s) => plan.marks?.[s] ?? 1).join('')}` : '';
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
  return {
    asLabelled,
    runs,
    successes,
    vehicle: plan.vehicle,
    reliability,
    designPercent: percent(successes, runs),
    successPercent: percent(successes * reliability, runs),
    missed,
    batteryLowWh,
    batteryHighWh,
  };
}
