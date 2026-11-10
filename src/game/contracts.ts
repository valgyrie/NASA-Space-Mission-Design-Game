import { CONTRACT_DEADLINE_DAYS, CONTRACT_REWARD } from './balance';
import type { SiteState } from './siteState';

/**
 * Contracts: a client's request with an objective, requirements, a reward and a deadline.
 * Text (client, objective) lives in strings.ts under `contract.<id>.*`.
 */

export const CONTRACT_IDS = ['explorer1', 'tiros1'] as const;
export type ContractId = (typeof CONTRACT_IDS)[number];

/** A Milestone is a Campaign Contract based on a real event; side Contracts come later. */
export type ContractKind = 'milestone';

/** Where the Spacecraft must go. More destinations arrive with later Eras. */
export type Orbit = 'lowEarthOrbit';

/** Payloads named by Contracts. The Mission Designer (ticket 07) adds them as Parts. */
export type PayloadKind = 'radiationDetector' | 'tvCamera';

/** What the Mission must do to fulfil the Contract. Checked by the Mission Report later. */
export type Requirement =
  | { kind: 'orbit'; orbit: Orbit }
  | { kind: 'payload'; payload: PayloadKind }
  | { kind: 'dataDays'; days: number };

export interface Contract {
  id: ContractId;
  kind: ContractKind;
  requirements: readonly Requirement[];
  /** Money paid when the Mission succeeds. */
  reward: number;
  /** Game days from accepting to the deadline. */
  deadlineDays: number;
  /** The real Mission's orbit, kilometres above the ground at its lowest and highest. Drawn in the Test Run. */
  orbitKm: { low: number; high: number };
  /** The real orbit's tilt to the equator, in degrees. Drawn in the Space view. */
  inclinationDeg: number;
  /** A Milestone that must be done before this one is offered: the Campaign follows history in order. */
  after?: ContractId;
}

/**
 * Explorer 1: the first US satellite (1958). The US Army's ABMA and JPL built and launched it;
 * its cosmic-ray detector found the Van Allen belts. See docs/research/milestones.md.
 * Data for 30 days matches its high-power transmitter (31 days on mercury batteries).
 * Orbit: perigee 358 km, apogee 2,550 km (docs/research/earth-map.md).
 */
export const CONTRACTS: Record<ContractId, Contract> = {
  explorer1: {
    id: 'explorer1',
    kind: 'milestone',
    requirements: [
      { kind: 'orbit', orbit: 'lowEarthOrbit' },
      { kind: 'payload', payload: 'radiationDetector' },
      { kind: 'dataDays', days: 30 },
    ],
    reward: CONTRACT_REWARD.explorer1,
    deadlineDays: CONTRACT_DEADLINE_DAYS.explorer1,
    orbitKm: { low: 358, high: 2_550 },
    // docs/research/launch-vehicles.md (Explorer 1's orbit).
    inclinationDeg: 33.24,
  },
  // TIROS-1: the first weather satellite (1 April 1960), built by RCA for NASA. Two TV cameras, spin-stabilised,
  // powered by about 9,000 solar cells charging its batteries. NASA: "operational for only 78 days".
  // Orbit 693 × 750 km at 48.4°. Launched on a Thor-Able. See docs/research/milestones.md.
  tiros1: {
    id: 'tiros1',
    kind: 'milestone',
    requirements: [
      { kind: 'orbit', orbit: 'lowEarthOrbit' },
      { kind: 'payload', payload: 'tvCamera' },
      { kind: 'dataDays', days: 78 },
    ],
    reward: CONTRACT_REWARD.tiros1,
    deadlineDays: CONTRACT_DEADLINE_DAYS.tiros1,
    orbitKm: { low: 693, high: 750 },
    inclinationDeg: 48.4,
    after: 'explorer1',
  },
};

/** A Contract the Company has taken on. */
export interface AcceptedContract {
  id: ContractId;
  /** Game day it was accepted; the deadline counts from here. */
  acceptedDay: number;
}

export function accepted(state: SiteState, id: ContractId): AcceptedContract | undefined {
  return state.contracts.find((c) => c.id === id);
}

/** Contracts on the board that the Company hasn't taken or finished yet. */
export function availableContracts(state: SiteState): Contract[] {
  return CONTRACT_IDS.filter((id) => !accepted(state, id) && !state.completed.includes(id) && isOffered(state, id)).map((id) => CONTRACTS[id]);
}

/** A Contract is offered once the Milestone before it is done. */
export function isOffered(state: Pick<SiteState, 'completed'>, id: ContractId): boolean {
  const before = CONTRACTS[id].after;
  return !before || state.completed.includes(before);
}

export type AcceptResult = { ok: true } | { ok: false; problem: 'taken' | 'done' | 'notYet' };

/** Take on a Contract: it becomes active and its deadline starts today. */
export function acceptContract(state: SiteState, id: ContractId): AcceptResult {
  if (accepted(state, id)) return { ok: false, problem: 'taken' };
  if (state.completed.includes(id)) return { ok: false, problem: 'done' };
  if (!isOffered(state, id)) return { ok: false, problem: 'notYet' };
  state.contracts.push({ id, acceptedDay: state.day });
  state.reopened = state.reopened.filter((c) => c !== id);
  return { ok: true };
}

/**
 * Failed Milestones can always be tried again. A Contract whose deadline has passed goes back on the board,
 * marked as reopened, once no Mission for it is on its way (a Spacecraft at the Launch Site can still fly).
 * Accepting it again starts a fresh deadline. Returns the Contracts it reopened.
 */
export function expireContracts(state: SiteState): ContractId[] {
  const today = Math.floor(state.day);
  const late = state.contracts.filter((c) => today >= deadlineDay(c) && state.mission?.contract !== c.id).map((c) => c.id);
  if (late.length === 0) return [];
  state.contracts = state.contracts.filter((c) => !late.includes(c.id));
  for (const id of late) if (!state.reopened.includes(id)) state.reopened.push(id);
  return late;
}

/** The Game day an accepted Contract is due: whole days from the date it was accepted. */
export function deadlineDay(contract: AcceptedContract): number {
  return Math.floor(contract.acceptedDay) + CONTRACTS[contract.id].deadlineDays;
}

/** Whole game days left before the deadline, counted by date; 0 once it has passed. */
export function daysLeft(state: SiteState, contract: AcceptedContract): number {
  return Math.max(0, deadlineDay(contract) - Math.floor(state.day));
}

/**
 * A Mission fulfilled the Contract: move it from active to done and pay the reward, unless `pay` is false
 * (an Anomaly still to settle holds the payment back).
 */
export function completeContract(state: SiteState, id: ContractId, pay = true): number {
  state.contracts = state.contracts.filter((c) => c.id !== id);
  if (!state.completed.includes(id)) state.completed.push(id);
  if (pay) state.money += CONTRACTS[id].reward;
  return CONTRACTS[id].reward;
}
