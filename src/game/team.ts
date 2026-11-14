import { hasBadWord } from '../company/companyName';
import { type DesignReview, type ReviewLineId, REVIEW_LINES, designReview } from './designReview';
import { type GroundTestId, GROUND_TEST_IDS, chosenGroundTests } from './groundTests';
import type { Finding, MissionReport } from './mission';
import type { SiteState } from './siteState';
import { type Slot, SLOTS, isSlotShown, missionGoal } from './spacecraft';

/**
 * Team Mode (ticket 41): two to four players share one Company on one computer and pass the mouse.
 * Each player holds one or more roles; a role owns its slots, its Launch planner choices and its lines of the
 * Design Review. The design ships only when every role has signed its lines. Nothing here goes online:
 * player names are stripped from cloud saves (`withoutPlayerNames`).
 * Roles after the disciplines of Goddard's Mission Design Lab (docs/research/official-resources.md).
 */

export const ROLE_IDS = ['lead', 'power', 'comms', 'science'] as const;
export type RoleId = (typeof ROLE_IDS)[number];

export const TEAM_SIZES = [2, 3, 4] as const;
export type TeamSize = (typeof TEAM_SIZES)[number];

/** Player colours. None is the Design Review's green, yellow or red. */
export const TEAM_COLOURS = ['blue', 'orange', 'purple', 'pink', 'teal', 'white'] as const;
export type TeamColour = (typeof TEAM_COLOURS)[number];

export const PLAYER_NAME_MAX = 12;

export interface TeamPlayer {
  /** A short nickname, or '' for "Player N". Never leaves the computer. */
  name: string;
  colour: TeamColour;
}

export interface Team {
  players: TeamPlayer[];
  /** The player holding the mouse: only their roles' choices can be changed. */
  atMouse: number;
  /** Each role's signature: what it signed (`signatureOf`). It counts only while that still matches. */
  signed: Partial<Record<RoleId, string>>;
}

/** The role that owns each slot. The Bus and the engine set mass and orbit, the Mission lead's lines. */
export const SLOT_ROLE: Record<Slot, RoleId> = {
  bus: 'lead',
  propulsion: 'lead',
  power: 'power',
  battery: 'power',
  comms: 'comms',
  pointing: 'science',
  payload: 'science',
};

/** The role that owns, and signs, each line of the Design Review. */
export const LINE_ROLE: Record<ReviewLineId, RoleId> = {
  orbitMass: 'lead',
  time: 'lead',
  budget: 'lead',
  spareMass: 'lead',
  power: 'power',
  sparePower: 'power',
  spareEnergy: 'power',
  communications: 'comms',
  payload: 'science',
  data: 'science',
};

/** The role that decides each Ground Test: the one whose Anomaly it makes less likely. */
export const GROUND_TEST_ROLE: Record<GroundTestId, RoleId> = {
  dayInTheLife: 'comms',
  vibration: 'power',
  thermalVacuum: 'power',
};

/** Which player holds each role. With fewer than four players, someone holds two. */
const HOLDERS: Record<TeamSize, Record<RoleId, number>> = {
  2: { lead: 0, science: 0, power: 1, comms: 1 },
  3: { lead: 0, power: 1, comms: 2, science: 2 },
  4: { lead: 0, power: 1, comms: 2, science: 3 },
};

export const isTeamSize = (n: unknown): n is TeamSize => (TEAM_SIZES as readonly unknown[]).includes(n);

/** The player (by index) who holds a role in a team of this size. */
export function roleHolder(size: number, role: RoleId): number {
  return isTeamSize(size) ? HOLDERS[size][role] : 0;
}

/** The roles a player holds, in role order. */
export function rolesOf(size: number, player: number): RoleId[] {
  return ROLE_IDS.filter((role) => roleHolder(size, role) === player);
}

export function linesOf(role: RoleId): ReviewLineId[] {
  return REVIEW_LINES.filter((id) => LINE_ROLE[id] === role);
}

export function slotsOf(role: RoleId): Slot[] {
  return SLOTS.filter((slot) => SLOT_ROLE[slot] === role);
}

type HasTeam = Pick<SiteState, 'team'>;

/**
 * Switch Team Mode on with this many players, change the number, or switch it off (0).
 * Players already there keep their name and colour; signatures start again.
 */
export function setTeamSize(state: HasTeam, size: TeamSize | 0): void {
  if (size === 0) {
    delete state.team;
    return;
  }
  const old = state.team?.players ?? [];
  const players: TeamPlayer[] = [];
  for (let i = 0; i < size; i++) {
    const taken = players.map((p) => p.colour);
    const kept = old[i];
    const colour = kept && !taken.includes(kept.colour) ? kept.colour : TEAM_COLOURS.find((c) => !taken.includes(c))!;
    players.push({ name: kept?.name ?? '', colour });
  }
  state.team = { players, atMouse: Math.min(state.team?.atMouse ?? 0, size - 1), signed: {} };
}

/** Hand the mouse to another player. */
export function passMouse(state: HasTeam, player: number): boolean {
  const team = state.team;
  if (!team || !Number.isInteger(player) || player < 0 || player >= team.players.length) return false;
  team.atMouse = player;
  return true;
}

/** Is this role's player at the mouse? Always true without Team Mode. */
export function mayChange(state: HasTeam, role: RoleId): boolean {
  const team = state.team;
  return !team || roleHolder(team.players.length, role) === team.atMouse;
}

export type PlayerNameProblem = 'tooLong' | 'badWord';
export type PlayerNameCheck = { ok: true; name: string } | { ok: false; problem: PlayerNameProblem };

/** Tidy a player's nickname. Empty is fine: the player is then "Player N". */
export function checkPlayerName(raw: string): PlayerNameCheck {
  const name = raw.replace(/\s+/g, ' ').trim();
  if ([...name].length > PLAYER_NAME_MAX) return { ok: false, problem: 'tooLong' };
  if (name !== '' && hasBadWord(name)) return { ok: false, problem: 'badWord' };
  return { ok: true, name };
}

export function setPlayerName(state: HasTeam, player: number, raw: string): PlayerNameCheck {
  const check = checkPlayerName(raw);
  const p = state.team?.players[player];
  if (check.ok && p) p.name = check.name;
  return check;
}

/** Give a player a colour. If another player has it, the two swap, so every player keeps their own. */
export function setPlayerColour(state: HasTeam, player: number, colour: TeamColour): void {
  const players = state.team?.players;
  const p = players?.[player];
  if (!players || !p) return;
  const other = players.find((o) => o !== p && o.colour === colour);
  if (other) other.colour = p.colour;
  p.colour = colour;
}

/**
 * What a role puts its name to: the Contract, its own choices and the colours of its own lines.
 * A signature counts only while this is unchanged, so changing one of the role's choices clears it, and so
 * does another role's change that turns one of its lines another colour.
 */
export function signatureOf(state: SiteState, role: RoleId, review: DesignReview = designReview(state, state.design)): string {
  const design = state.design;
  const choices: (string | null)[] = slotsOf(role).map((slot) => design[slot]);
  if (role === 'lead') choices.push(state.vehicle, state.launchSite);
  const tests = chosenGroundTests(state, design);
  for (const id of GROUND_TEST_IDS) if (GROUND_TEST_ROLE[id] === role) choices.push(tests.includes(id) ? id : '-');
  const colours = review.lines.filter((l) => LINE_ROLE[l.id] === role).map((l) => (l.applies ? l.colour : 'none'));
  return [missionGoal(state).contract.id, ...choices.map((c) => c ?? '?'), ...colours].join(',');
}

/** A role can sign once the slots it owns (those on show) are filled. */
export function canSign(state: SiteState, role: RoleId): boolean {
  return slotsOf(role).every((slot) => !isSlotShown(state, slot) || state.design[slot] !== null);
}

/** Sign a role's lines of the Design Review. Only its player, at the mouse, can. */
export function sign(state: SiteState, role: RoleId): boolean {
  const team = state.team;
  if (!team || !mayChange(state, role) || !canSign(state, role)) return false;
  team.signed[role] = signatureOf(state, role);
  return true;
}

export function isSigned(state: SiteState, role: RoleId, review?: DesignReview): boolean {
  const signed = state.team?.signed[role];
  return signed !== undefined && signed === signatureOf(state, role, review);
}

/** The roles still to sign before the design can ship. Empty without Team Mode. */
export function waitingFor(state: SiteState, review?: DesignReview): RoleId[] {
  if (!state.team) return [];
  const r = review ?? designReview(state, state.design);
  return ROLE_IDS.filter((role) => !isSigned(state, role, r));
}

/**
 * The finding that tells a role's part in a Mission Report. Mission lead: the orbit, or the deadline when
 * that is what went wrong. Null when the report has no such finding.
 */
export function rolePart(report: Pick<MissionReport, 'findings'>, role: RoleId): Finding | null {
  const find = (kind: Finding['kind']) => report.findings.find((f) => f.kind === kind) ?? null;
  switch (role) {
    case 'lead': {
      const orbit = find('orbit');
      const time = find('time');
      return orbit?.ok && time && !time.ok ? time : (orbit ?? time);
    }
    case 'power':
      return find('power');
    case 'comms':
      return find('comms');
    case 'science':
      return find('payload');
  }
}

const nameless = (players: TeamPlayer[] | undefined): TeamPlayer[] | undefined => players?.map((p) => ({ ...p, name: '' }));

/** A copy of the state with every player's name blanked: what a cloud save may hold. Colours stay. */
export function withoutPlayerNames(state: SiteState): SiteState {
  const copy: SiteState = { ...state };
  if (state.team) copy.team = { ...state.team, players: nameless(state.team.players)! };
  if (state.mission?.team) copy.mission = { ...state.mission, team: nameless(state.mission.team) };
  copy.reports = state.reports.map((r) => (r.team ? { ...r, team: nameless(r.team) } : r));
  return copy;
}

const isPlayer = (v: unknown): boolean => {
  const p = v as Partial<TeamPlayer> | null;
  return (
    !!p &&
    typeof p.name === 'string' &&
    [...p.name].length <= PLAYER_NAME_MAX &&
    (TEAM_COLOURS as readonly unknown[]).includes(p.colour)
  );
};

/** The players as saved with a Mission or a Mission Report. */
export const isTeamPlayers = (v: unknown): boolean => Array.isArray(v) && isTeamSize(v.length) && v.every(isPlayer);

/** Is this a Team as the save holds it? */
export function isTeam(value: unknown): boolean {
  const team = value as Partial<Team> | null;
  return (
    !!team &&
    isTeamPlayers(team.players) &&
    Number.isInteger(team.atMouse) &&
    team.atMouse! >= 0 &&
    team.atMouse! < team.players!.length &&
    typeof team.signed === 'object' &&
    team.signed !== null &&
    Object.entries(team.signed).every(
      ([role, s]) => (ROLE_IDS as readonly string[]).includes(role) && typeof s === 'string' && s.length < 200,
    )
  );
}
