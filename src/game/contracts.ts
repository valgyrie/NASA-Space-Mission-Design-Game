import { CONTRACT_DEADLINE_DAYS, CONTRACT_EXTRA_REWARD, CONTRACT_REWARD, LAND_CONTRACT_EVERY, OFFER_DAYS } from './balance';
import { isDirector } from './modes';
import { type Era, eraOf } from './eras';
import type { LaunchSiteId, LaunchVehicleId } from './launchVehicles';
import type { SiteState } from './siteState';
import type { MoonShowSpec } from '../world/moonShow';
import { hashText, makeRng, randInt } from '../site/random';

/**
 * Contracts: a client's request with an objective, requirements, a reward and a deadline.
 * Text (client, objective) lives in strings.ts under `contract.<id>.*`.
 */

export const CONTRACT_IDS = [
  'explorer1',
  'tiros1',
  'telstar1',
  'syncom3',
  'apollo11',
  'artemis2',
  'artemis3Camera',
  'artemis3Relay',
  'artemis3SpaceWeather',
  'artemis4Relay',
  'artemis4CargoLander',
  'artemis4Mapper',
] as const;
export type MilestoneId = (typeof CONTRACT_IDS)[number];
/** A question Contract's ID names its question and a number, so the same question can be asked again. */
export type ContractId = MilestoneId | `free-${number}` | `ask-${QuestionId}-${number}`;

/**
 * Choice Milestones (Artemis III and IV): the board offers several Contracts side by side, each a different way to
 * help, and any one of them completes the Milestone. Each extra one done pays its smaller extra reward.
 */
export const CHOICE_MILESTONES = {
  artemis3: ['artemis3Camera', 'artemis3Relay', 'artemis3SpaceWeather'],
  artemis4: ['artemis4Relay', 'artemis4CargoLander', 'artemis4Mapper'],
} as const satisfies Record<string, readonly MilestoneId[]>;
export type ChoiceMilestoneId = keyof typeof CHOICE_MILESTONES;

/** The Choice Milestone a Contract is one of the choices of, if any. */
export function choiceOf(id: ContractId): ChoiceMilestoneId | null {
  for (const [group, ids] of Object.entries(CHOICE_MILESTONES)) {
    if ((ids as readonly string[]).includes(id)) return group as ChoiceMilestoneId;
  }
  return null;
}

/** A Milestone is done: its Contract completed, or for a Choice Milestone, any one of its Contracts. */
export function milestoneDone(state: Pick<SiteState, 'completed'>, id: ContractId | ChoiceMilestoneId): boolean {
  const choices = (CHOICE_MILESTONES as Record<string, readonly ContractId[]>)[id];
  return choices ? choices.some((c) => state.completed.includes(c)) : state.completed.includes(id as ContractId);
}

/** A Milestone follows real history; Free Play generates work for fictional clients. */
export type ContractKind = 'milestone' | 'generated';

/**
 * Where the Spacecraft must go. A geostationary orbit circles the equator once a day, 35,786 km up: the rocket
 * leaves the Spacecraft in a transfer orbit, and its own main engine takes it the rest of the way.
 * High Earth orbit: Artemis II's 185 × 74,080 km. Lunar orbit: round the Moon (the Spacecraft's main engine brakes it
 * into orbit). The Moon's surface: Apollo 11's Tranquility Base, with its two-week lunar night. The lunar south pole:
 * a sunlit ridge near the pole, where Earth is often out of sight (docs/research/eras-3-5.md).
 */
export const ORBITS = ['lowEarthOrbit', 'geostationary', 'highEarthOrbit', 'lunarOrbit', 'moonSurface', 'lunarSouthPole'] as const;
export type Orbit = (typeof ORBITS)[number];

/** Orbits at the Moon: radios send less from there, and the Launch show plays a Moon sequence. */
export function atMoon(orbit: Orbit): boolean {
  return orbit === 'lunarOrbit' || orbit === 'moonSurface' || orbit === 'lunarSouthPole';
}

/** On the Moon's ground: no orbit to hold, and a Lander (or NASA's Lunar Module) to get down. */
export function onMoonGround(orbit: Orbit): boolean {
  return orbit === 'moonSurface' || orbit === 'lunarSouthPole';
}

/** Payloads named by Contracts. The Mission Designer (ticket 07) adds them as Parts. */
export type PayloadKind = 'radiationDetector' | 'tvCamera' | 'transponder' | 'sciencePackage' | 'relayRadio';

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
  after?: ContractId | ChoiceMilestoneId;
  /** The Era it belongs to: it is offered only once the Company has reached it (its HQ's level). */
  era: Era;
  /**
   * NASA flies it on its own rocket from its own pad, free: the Launch costs the Company nothing, no other rocket can
   * take it, and the Spacecraft must weigh no more than `maxKg` (the room NASA gives it: Apollo 11's Lunar Module,
   * Artemis II's CubeSat slot).
   */
  ride?: { vehicle: LaunchVehicleId; site: LaunchSiteId; maxKg: number };
  /** The rocket and Launch Site picked for it when it is accepted (the player can still change them). */
  rocket?: { vehicle: LaunchVehicleId; site: LaunchSiteId };
  /** The Spacecraft must be a CubeSat (Artemis II's slots took 12U CubeSats only). */
  cubeSat?: boolean;
  /** For a Choice Milestone's Contract: what it pays when another choice of the same Milestone is already done. */
  extraReward?: number;
  /** Its Launch show plays this Moon sequence after the climb. */
  moonShow?: MoonShowSpec;
  /** Finishing it finishes the Campaign: a closing card, then Continue in Free Play. */
  finale?: boolean;
  /** Generated Contracts reuse a translated objective, with a unique number in their name. */
  template?: 'survey' | 'weather' | 'relay';
  /** The client pays for the whole Launch Vehicle instead of a Rideshare, as AT&T did for Telstar 1. */
  wholeLaunch?: boolean;
  /** Success also gives a Plot of land next to the Site, free to choose (ticket 30). */
  plot?: boolean;
  /** Generated Contracts: which "who needs it" line of their kind they show (strings `contract.<template>.need.<n>`). */
  need?: number;
  /** A question Contract: the player picked this question, and it set the orbit, the Payload and the days. */
  question?: QuestionId;
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
  // Apollo 11's science package (EASEP): a seismometer with its own solar panels and a laser reflector, set up by
  // Buzz Aldrin at Tranquility Base (0.674° N, 23.473° E) on 20 July 1969. NASA: "just three weeks" of data. It rode
  // in the Lunar Module on a Saturn V from Pad 39A that NASA paid for. The Lunar Module limit (45 kg) is a game
  // estimate: the real package's two parts weighed 77 kg. docs/research/eras-3-5.md.
  apollo11: {
    id: 'apollo11',
    kind: 'milestone',
    requirements: [
      { kind: 'orbit', orbit: 'moonSurface' },
      { kind: 'payload', payload: 'sciencePackage' },
      { kind: 'dataDays', days: 21 },
    ],
    reward: CONTRACT_REWARD.apollo11,
    deadlineDays: CONTRACT_DEADLINE_DAYS.apollo11,
    orbitKm: { low: 0, high: 0 },
    inclinationDeg: 0,
    after: 'syncom3',
    era: 3,
    ride: { vehicle: 'saturnV', site: 'kennedy39A', maxKg: 45 },
    moonShow: { kind: 'apollo11' },
  },
  // Artemis II (1–10 April 2026): four 12U CubeSats (each up to 26 kg) rode SLS with Orion and were released in high
  // Earth orbit, 185 × 74,080 km; K-Rad Cube measured radiation across the Van Allen belts. About a day from release
  // to re-entry. NASA picked them, so the ride was free. The tilt is a game estimate (the Cape's latitude).
  artemis2: {
    id: 'artemis2',
    kind: 'milestone',
    requirements: [
      { kind: 'orbit', orbit: 'highEarthOrbit' },
      { kind: 'payload', payload: 'radiationDetector' },
      { kind: 'dataDays', days: 1 },
    ],
    reward: CONTRACT_REWARD.artemis2,
    deadlineDays: CONTRACT_DEADLINE_DAYS.artemis2,
    orbitKm: { low: 185, high: 74_080 },
    inclinationDeg: 28.5,
    after: 'apollo11',
    era: 5,
    ride: { vehicle: 'sls', site: 'kennedy39B', maxKg: 26 },
    cubeSat: true,
    moonShow: { kind: 'artemis2' },
  },
  // Artemis III (NASA's plan of 23 Oct 2026, for 2027): Orion docks with lander test articles in low Earth orbit,
  // the Blue Moon one waiting about 440 km up; a planned 14-day mission. The three ways to help are game ideas built
  // on real needs (NASA's plan studies times the crew cannot talk to mission control). On the Company's own Falcon 9.
  artemis3Camera: artemisThree('artemis3Camera', 'tvCamera', 'camera'),
  artemis3Relay: artemisThree('artemis3Relay', 'relayRadio', 'relay'),
  artemis3SpaceWeather: artemisThree('artemis3SpaceWeather', 'radiationDetector', 'spaceWeather'),
  // Artemis IV (NASA's plan of 23 Oct 2026, for 2028): the first crewed landing since 1972, near the south pole.
  // A relay in a high polar lunar orbit (NASA's LCRNS design: 6,500 km from the Moon's centre, about 4,760 km up);
  // a cargo lander on a sunlit south-pole ridge for one lunar day; a Moon Mapper in a 50 km polar orbit like LRO's,
  // for one turn of the Moon under it (27 days). Any one finishes the Campaign.
  artemis4Relay: artemisFour('artemis4Relay', 'lunarOrbit', 'relayRadio', 30, { low: 4_760, high: 4_760 }, 90, 'relay'),
  artemis4CargoLander: artemisFour('artemis4CargoLander', 'lunarSouthPole', 'sciencePackage', 14, { low: 0, high: 0 }, 0, 'cargoLander'),
  artemis4Mapper: artemisFour('artemis4Mapper', 'lunarOrbit', 'tvCamera', 27, { low: 50, high: 50 }, 90, 'mapper'),
};

function artemisThree(id: MilestoneId, payload: PayloadKind, choice: MoonShowSpec['choice']): Contract {
  return {
    id,
    kind: 'milestone',
    requirements: [
      { kind: 'orbit', orbit: 'lowEarthOrbit' },
      { kind: 'payload', payload },
      { kind: 'dataDays', days: 14 },
    ],
    reward: CONTRACT_REWARD.artemis3,
    extraReward: CONTRACT_EXTRA_REWARD.artemis3,
    deadlineDays: CONTRACT_DEADLINE_DAYS.artemis3,
    orbitKm: { low: 440, high: 440 },
    // Game estimate: the plan gives the height, not the tilt.
    inclinationDeg: 28.5,
    after: 'artemis2',
    era: 5,
    rocket: { vehicle: 'falcon9', site: 'capeCanaveral' },
    moonShow: { kind: 'artemis3', choice },
  };
}

function artemisFour(
  id: MilestoneId,
  orbit: Orbit,
  payload: PayloadKind,
  days: number,
  orbitKm: { low: number; high: number },
  inclinationDeg: number,
  choice: MoonShowSpec['choice'],
): Contract {
  return {
    id,
    kind: 'milestone',
    requirements: [
      { kind: 'orbit', orbit },
      { kind: 'payload', payload },
      { kind: 'dataDays', days },
    ],
    reward: CONTRACT_REWARD.artemis4,
    extraReward: CONTRACT_EXTRA_REWARD.artemis4,
    deadlineDays: CONTRACT_DEADLINE_DAYS.artemis4,
    orbitKm,
    inclinationDeg,
    after: 'artemis3',
    era: 5,
    rocket: { vehicle: 'falcon9', site: 'capeCanaveral' },
    moonShow: { kind: 'artemis4', choice },
    finale: true,
  };
}

/** What finishing a Contract pays now: a Choice Milestone's extra choice pays its extra reward. */
export function rewardFor(state: Pick<SiteState, 'completed'>, id: ContractId): number {
  const contract = contractById(id);
  const group = choiceOf(id);
  const other = group !== null && CHOICE_MILESTONES[group].some((c) => c !== id && state.completed.includes(c));
  return other && contract.extraReward !== undefined ? contract.extraReward : contract.reward;
}

/** How many "who needs it" lines each generated Contract kind has in strings.ts. */
export const NEED_LINES = 4;

/**
 * Free Play's "Choose a question" Contract: the player picks a question, and the question sets the orbit, the
 * Payload and the days of Data. Questions use the Payloads LEAP has. Game estimates built on the Milestones they
 * echo (docs/research/milestones.md): TIROS-1's cloud pictures, Explorer 1's radiation detector, Syncom 3's
 * geostationary relay. An orbit tilted N degrees passes over latitudes up to N degrees, so sea ice near the poles
 * needs a steep tilt.
 */
export const QUESTION_IDS = ['storms', 'seaIce', 'radiation', 'farCall'] as const;
export type QuestionId = (typeof QUESTION_IDS)[number];

interface Question {
  template: 'survey' | 'weather' | 'relay';
  orbitKm: { low: number; high: number };
  inclinationDeg: number;
  days: number;
  reward: number;
}

export const QUESTIONS: Record<QuestionId, Question> = {
  storms: { template: 'weather', orbitKm: { low: 700, high: 700 }, inclinationDeg: 48, days: 60, reward: 1_900_000 },
  seaIce: { template: 'weather', orbitKm: { low: 800, high: 800 }, inclinationDeg: 82, days: 90, reward: 2_300_000 },
  // Explorer 1's oval orbit dipped into the inner radiation belt.
  radiation: { template: 'survey', orbitKm: { low: 360, high: 2_550 }, inclinationDeg: 33, days: 45, reward: 1_200_000 },
  farCall: { template: 'relay', orbitKm: { low: 35_786, high: 35_786 }, inclinationDeg: 0, days: 90, reward: 3_000_000 },
};

const QUESTION_ID = new RegExp(`^ask-(${QUESTION_IDS.join('|')})-(0|[1-9]\\d{0,8})$`);

/** Stable IDs keep requirements and rewards identical in the board, flight, reports and saves. */
export function isContractId(id: unknown): id is ContractId {
  return typeof id === 'string' && ((CONTRACT_IDS as readonly string[]).includes(id) ||
    (/^free-(0|[1-9]\d{0,8})$/.test(id)) || QUESTION_ID.test(id));
}

function questionContract(id: ContractId): Contract {
  const question = QUESTION_ID.exec(id)![1] as QuestionId;
  const q = QUESTIONS[question];
  const payload = ({ survey: 'radiationDetector', weather: 'tvCamera', relay: 'transponder' } as const)[q.template];
  return {
    id, kind: 'generated', template: q.template, question, era: 5,
    requirements: [
      { kind: 'orbit', orbit: q.template === 'relay' ? 'geostationary' : 'lowEarthOrbit' },
      { kind: 'payload', payload },
      { kind: 'dataDays', days: q.days },
    ],
    reward: q.reward,
    deadlineDays: q.days + 240,
    orbitKm: q.orbitKm,
    inclinationDeg: q.inclinationDeg,
  };
}

/** Game estimates, not real historical Missions. Successive IDs cycle through all three Payloads. */
export function contractById(id: ContractId): Contract {
  if (id.startsWith('ask-')) return questionContract(id);
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
    // Its own seed, so the line doesn't shift the numbers drawn above.
    need: hashText(`${id}:need`) % NEED_LINES,
    ...(n % LAND_CONTRACT_EVERY === LAND_CONTRACT_EVERY - 1 ? { plot: true } : {}),
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
    const used = new Set<ContractId>([...state.completed, ...state.contracts.map((c) => c.id), ...(state.expiredOffers ?? [])]);
    const offers: Contract[] = [];
    for (let n = 0; offers.length < 3; n++) {
      const id: ContractId = `free-${n}`;
      if (!used.has(id)) offers.push(contractById(id));
    }
    return offers;
  }
  return CONTRACT_IDS.filter((id) => !accepted(state, id) && !state.completed.includes(id) && isOffered(state, id)).map((id) => CONTRACTS[id]);
}

/** Free Play's question Contracts the player can pick now: each question's next unused number. None while one is active. */
export function questionOffers(state: SiteState): ContractId[] {
  if (state.playMode !== 'freePlay') return [];
  if (state.contracts.some((c) => contractById(c.id).question)) return [];
  const used = new Set<ContractId>([...state.completed, ...state.contracts.map((c) => c.id)]);
  return QUESTION_IDS.map((q) => {
    let n = 0;
    while (used.has(`ask-${q}-${n}`)) n++;
    return `ask-${q}-${n}` as ContractId;
  });
}

/** A Contract is offered once the Company has reached its Era and the Milestone before it is done. */
export function isOffered(state: SiteState, id: ContractId): boolean {
  if (state.playMode === 'freePlay') return availableContracts(state).some((c) => c.id === id) || questionOffers(state).includes(id);
  const contract = contractById(id);
  return contract.kind === 'milestone' && eraOf(state) >= contract.era && (!contract.after || milestoneDone(state, contract.after));
}

export type AcceptResult = { ok: true } | { ok: false; problem: 'taken' | 'done' | 'notYet' };

/** Take on a Contract: it becomes active and its deadline starts today. */
export function acceptContract(state: SiteState, id: ContractId): AcceptResult {
  if (accepted(state, id)) return { ok: false, problem: 'taken' };
  if (state.completed.includes(id)) return { ok: false, problem: 'done' };
  if (!isOffered(state, id)) return { ok: false, problem: 'notYet' };
  state.contracts.push({ id, acceptedDay: state.day });
  // NASA's ride sets the rocket and pad; the Artemis choices start on the Company's own Falcon 9 from the Cape.
  const launch = contractById(id).ride ?? contractById(id).rocket;
  if (launch && state.contracts.length === 1) {
    state.vehicle = launch.vehicle;
    state.launchSite = launch.site;
  }
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

/**
 * Mission Director: Free Play Contracts on the board go away if nobody accepts them within OFFER_DAYS of being
 * offered, and the next ones take their place. Campaign Milestones and the "Choose a question" Contracts never
 * expire (the question card is the small Contract always on offer); accepted Contracts keep their deadline.
 * Dates the Contracts on the board, forgets those no longer on it, and returns the ones that expired.
 */
export function refreshOffers(state: SiteState): ContractId[] {
  if (!isDirector(state) || state.playMode !== 'freePlay') return [];
  const today = Math.floor(state.day);
  const expired: ContractId[] = [];
  // Expired offers make room for new ones, which are dated today, so this settles in two rounds.
  for (let round = 0; round < 2; round++) {
    const offers = availableContracts(state).map((c) => c.id);
    const days: Partial<Record<ContractId, number>> = {};
    for (const id of offers) days[id] = state.offerDays[id] ?? today;
    state.offerDays = days;
    const late = offers.filter((id) => today - days[id]! >= OFFER_DAYS);
    if (late.length === 0) break;
    for (const id of late) delete state.offerDays[id];
    state.expiredOffers.push(...late);
    state.reopened = state.reopened.filter((id) => !late.includes(id));
    expired.push(...late);
  }
  return expired;
}

/** Mission Director: whole game days before a Contract on the board goes away, or null if it never does. */
export function offerDaysLeft(state: SiteState, id: ContractId): number | null {
  if (!isDirector(state) || state.playMode !== 'freePlay' || !id.startsWith('free-') || accepted(state, id)) return null;
  const today = Math.floor(state.day);
  return Math.max(0, (state.offerDays[id] ?? today) + OFFER_DAYS - today);
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
  // A Choice Milestone's second or third choice pays its extra reward (worked out before this one counts as done).
  const reward = state.completed.includes(id) ? contractById(id).reward : rewardFor(state, id);
  state.contracts = state.contracts.filter((c) => c.id !== id);
  if (!state.completed.includes(id)) state.completed.push(id);
  if (pay) state.money += reward;
  // Land is not cut by an Anomaly, so it comes at once.
  if (contractById(id).plot) state.freePlots += 1;
  return reward;
}
