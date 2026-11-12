import { CONTRACT_DEADLINE_DAYS, CONTRACT_REWARD } from './balance';
import { eraOf } from './eras';
import type { SiteState } from './siteState';
import { hashText, makeRng, randInt } from '../site/random';

/**
 * Contracts: a client's request with an objective, requirements, a reward and a deadline.
 * Text (client, objective) lives in strings.ts under `contract.<id>.*`.
 */

export const CONTRACT_IDS = ['explorer1', 'tiros1', 'telstar1', 'syncom3'] as const;
export type MilestoneId = (typeof CONTRACT_IDS)[number];
export type ContractId = MilestoneId | `free-${number}`;

/** A Milestone follows real history; Free Play generates work for fictional clients. */
export type ContractKind = 'milestone' | 'generated';

/**
 * Where the Spacecraft must go. A geostationary orbit circles the equator once a day, 35,786 km up: the rocket
 * leaves the Spacecraft in a transfer orbit, and its own main engine takes it the rest of the way.
 * More destinations arrive with later Eras.
 */
export const ORBITS = ['lowEarthOrbit', 'geostationary'] as const;
export type Orbit = (typeof ORBITS)[number];

/** Payloads named by Contracts. The Mission Designer (ticket 07) adds them as Parts. */
export type PayloadKind = 'radiationDetector' | 'tvCamera' | 'transponder';

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
  /** The target orbit, kilometres above the ground at its lowest and highest. Historical for Milestones. */
  orbitKm: { low: number; high: number };
  /** The orbit's tilt to the equator, in degrees. Drawn in the Space view. */
  inclinationDeg: number;
  /** A Milestone that must be done before this one is offered: the Campaign follows history in order. */
  after?: ContractId;
  /** The Era it belongs to: it is offered only once the Company has reached it (its HQ's level). */
  era: 1 | 2 | 5;
  /** Generated Contracts reuse a translated objective, with a unique number in their name. */
  template?: 'survey' | 'weather' | 'relay';
  /** The client pays for the whole Launch Vehicle instead of a Rideshare, as AT&T did for Telstar 1. */
  wholeLaunch?: boolean;
}

/**
 * Explorer 1: the first US satellite (1958). The US Army's ABMA and JPL built and launched it;
 * its cosmic-ray detector found the Van Allen belts. See docs/research/milestones.md.
 * Data for 30 days matches its high-power transmitter (31 days on mercury batteries).
 * Orbit: perigee 358 km, apogee 2,550 km (docs/research/earth-map.md).
 */
export const CONTRACTS: Record<MilestoneId, Contract> = {
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
    era: 1,
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
    era: 1,
  },
  // Telstar 1: the first satellite to relay live TV between America and Europe (10 July 1962, on a Thor-Delta).
  // Bell Labs built it for AT&T, which paid NASA $2,680,982 for the Launch. It worked normally until its command
  // channel stopped on 23 November 1962: 136 days. Orbit 952 × 5,933 km at 44.8°. docs/research/milestones.md.
  telstar1: {
    id: 'telstar1',
    kind: 'milestone',
    requirements: [
      { kind: 'orbit', orbit: 'lowEarthOrbit' },
      { kind: 'payload', payload: 'transponder' },
      { kind: 'dataDays', days: 136 },
    ],
    reward: CONTRACT_REWARD.telstar1,
    deadlineDays: CONTRACT_DEADLINE_DAYS.telstar1,
    orbitKm: { low: 952, high: 5_933 },
    inclinationDeg: 44.8,
    after: 'tiros1',
    era: 2,
    wholeLaunch: true,
  },
  // Syncom 3: the first geostationary satellite (19 August 1964, on a Delta D), built by Hughes for NASA. Its own
  // apogee motor took it from the transfer orbit up to a circle over the equator; it carried live TV of the Tokyo
  // Olympics (10–24 October 1964) to the US. 66 days runs from its launch to the end of the Games.
  syncom3: {
    id: 'syncom3',
    kind: 'milestone',
    requirements: [
      { kind: 'orbit', orbit: 'geostationary' },
      { kind: 'payload', payload: 'transponder' },
      { kind: 'dataDays', days: 66 },
    ],
    reward: CONTRACT_REWARD.syncom3,
    deadlineDays: CONTRACT_DEADLINE_DAYS.syncom3,
    orbitKm: { low: 35_786, high: 35_786 },
    inclinationDeg: 0.1,
    after: 'telstar1',
    era: 2,
  },
};

/** Stable IDs keep requirements and rewards identical in the board, flight, reports and saves. */
export function isContractId(id: unknown): id is ContractId {
  return typeof id === 'string' && ((CONTRACT_IDS as readonly string[]).includes(id) ||
    (/^free-(0|[1-9]\d{0,8})$/.test(id)));
}

/** Game estimates, not real historical Missions. Successive IDs cycle through all three Payloads. */
export function contractById(id: ContractId): Contract {
  if (!id.startsWith('free-')) return CONTRACTS[id as MilestoneId];
  const n = Number(id.slice(5));
  const rng = makeRng(hashText(id));
  const template = (['survey', 'weather', 'relay'] as const)[n % 3]!;
  const payload = ({ survey: 'radiationDetector', weather: 'tvCamera', relay: 'transponder' } as const)[template];
  const geo = template === 'relay';
  const days = randInt(rng, 2, 6) * 15;
  const height = randInt(rng, 4, 9) * 100;
  return {
    id, kind: 'generated', template, era: 5,
    requirements: [
      { kind: 'orbit', orbit: geo ? 'geostationary' : 'lowEarthOrbit' },
      { kind: 'payload', payload },
      { kind: 'dataDays', days },
    ],
    reward: (geo ? 2_000_000 : template === 'weather' ? 1_200_000 : 700_000) + days * 10_000,
    deadlineDays: days + 240,
    orbitKm: geo ? { low: 35_786, high: 35_786 } : { low: height, high: height },
    inclinationDeg: geo ? 0 : randInt(rng, 30, 55),
  };
}

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
  if (state.playMode === 'freePlay') {
    const used = new Set<ContractId>([...state.completed, ...state.contracts.map((c) => c.id)]);
    const offers: Contract[] = [];
    for (let n = 0; offers.length < 3; n++) {
      const id: ContractId = `free-${n}`;
      if (!used.has(id)) offers.push(contractById(id));
    }
    return offers;
  }
  return CONTRACT_IDS.filter((id) => !accepted(state, id) && !state.completed.includes(id) && isOffered(state, id)).map((id) => CONTRACTS[id]);
}

/** A Contract is offered once the Company has reached its Era and the Milestone before it is done. */
export function isOffered(state: SiteState, id: ContractId): boolean {
  if (state.playMode === 'freePlay') return availableContracts(state).some((c) => c.id === id);
  const contract = contractById(id);
  return contract.kind === 'milestone' && eraOf(state) >= contract.era && (!contract.after || state.completed.includes(contract.after));
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
  return Math.floor(contract.acceptedDay) + contractById(contract.id).deadlineDays;
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
  if (pay) state.money += contractById(id).reward;
  return contractById(id).reward;
}
