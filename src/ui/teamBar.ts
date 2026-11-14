import type { SiteState } from '../game/siteState';
import {
  type RoleId,
  type TeamColour,
  type TeamPlayer,
  PLAYER_NAME_MAX,
  TEAM_COLOURS,
  TEAM_SIZES,
  passMouse,
  roleHolder,
  rolesOf,
  setPlayerColour,
  setPlayerName,
  setTeamSize,
} from '../game/team';
import { t } from '../strings';

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  e.className = className;
  if (text) e.textContent = text;
  return e;
}

function button(className: string, text: string): HTMLButtonElement {
  const b = el('button', className, text);
  b.type = 'button';
  return b;
}

/** Player colours on the dark panels. Kept apart from the Design Review's green, yellow and red. */
export const TEAM_COLOUR_CSS: Record<TeamColour, string> = {
  blue: '#5aa9ff',
  orange: '#ff9d4d',
  purple: '#b794ff',
  pink: '#ff7ab8',
  teal: '#3fd0c9',
  white: '#e8eef7',
};

/** "Ada", or "Player 2" for a player with no name. */
export function playerName(players: readonly TeamPlayer[], player: number): string {
  return players[player]?.name || t('team.player', { n: player + 1 });
}

/** "Power + Communications": the roles a player holds. */
export function rolesText(size: number, player: number): string {
  return rolesOf(size, player).map((role) => t(`team.role.${role}`)).join(t('team.rolesJoin'));
}

/** "Power · Ada": a role and the player who holds it. */
export function ownerText(players: readonly TeamPlayer[], role: RoleId): string {
  return t('team.owner', { role: t(`team.role.${role}`), player: playerName(players, roleHolder(players.length, role)) });
}

/**
 * A small label naming the role (and player) that owns a choice, in the player's colour.
 * Hidden without Team Mode. `mine` marks it when that player is at the mouse.
 */
export function makeRoleChip(role: RoleId): { root: HTMLElement; render(state: Pick<SiteState, 'team'>): void } {
  const root = el('span', 'team-chip');
  root.dataset.role = role;
  const render = (state: Pick<SiteState, 'team'>) => {
    const team = state.team;
    root.hidden = !team;
    if (!team) return;
    const holder = roleHolder(team.players.length, role);
    root.textContent = ownerText(team.players, role);
    root.style.setProperty('--team-colour', TEAM_COLOUR_CSS[team.players[holder]!.colour]);
    root.dataset.mine = String(holder === team.atMouse);
  };
  return { root, render };
}

/** "Pass the mouse to Ada (Power) to change this." */
export function notYoursText(players: readonly TeamPlayer[], role: RoleId): string {
  return t('team.notYours', { player: playerName(players, roleHolder(players.length, role)), role: t(`team.role.${role}`) });
}

export interface TeamBar {
  /** The button for the Mission Designer's header. */
  readonly toggle: HTMLButtonElement;
  /** The row under the header: who is at the mouse, and the setup when it is open. */
  readonly root: HTMLElement;
  render(): void;
  /** Close the setup, e.g. when the Mission Designer closes. */
  closeSetup(): void;
}

/**
 * Team Mode in the Mission Designer (ticket 41): a button that opens the setup (2, 3 or 4 players, a
 * nickname and a colour each), and a row of player buttons to pass the mouse. `onChange` runs after
 * every change, so the screen under it can redraw and the game can save.
 */
export function makeTeamBar(state: SiteState, onChange: () => void): TeamBar {
  const toggle = button('small team-toggle', t('team.heading'));
  toggle.title = t('team.openName');
  toggle.setAttribute('aria-expanded', 'false');

  const root = el('div', 'team-bar');
  const turn = el('div', 'team-turn');
  turn.setAttribute('role', 'group');
  const turnLabel = el('span', 'team-turn-label', t('team.atMouse'));
  turnLabel.id = 'team-turn-label';
  turn.setAttribute('aria-labelledby', turnLabel.id);
  const turnButtons = el('div', 'team-turn-players');
  turn.append(turnLabel, turnButtons);

  const setup = el('section', 'team-setup');
  setup.hidden = true;
  const setupHeading = el('h3', '', t('team.heading'));
  setupHeading.id = 'team-setup-heading';
  setup.setAttribute('aria-labelledby', setupHeading.id);
  const sizes = el('div', 'team-sizes');
  sizes.setAttribute('role', 'group');
  sizes.setAttribute('aria-label', t('team.players'));
  const sizeButtons = new Map<number, HTMLButtonElement>();
  for (const size of [0, ...TEAM_SIZES] as const) {
    const b = button('small team-size', size === 0 ? t('team.off') : t('team.count', { n: size }));
    b.dataset.size = String(size);
    b.addEventListener('click', () => {
      setTeamSize(state, size);
      problem.textContent = '';
      changed();
    });
    sizes.append(b);
    sizeButtons.set(size, b);
  }
  const playersBox = el('div', 'team-players');
  const problem = el('p', 'side-problem');
  problem.setAttribute('aria-live', 'polite');
  const nameHint = el('p', 'side-note', t('team.nameHint'));
  const done = button('small team-done', t('team.done'));
  setup.append(setupHeading, el('p', 'side-note', t('team.hint')), sizes, playersBox, problem, nameHint, done);
  root.append(turn, setup);

  let open = false;
  const setOpen = (on: boolean) => {
    open = on;
    render();
    if (on) (sizeButtons.get(state.team?.players.length ?? 0) ?? done).focus();
  };
  toggle.addEventListener('click', () => setOpen(!open));
  done.addEventListener('click', () => {
    setOpen(false);
    toggle.focus();
  });

  const changed = () => {
    render();
    onChange();
  };

  /** The setup's player rows are rebuilt only when the number of players changes, so typing keeps its focus. */
  let rowsFor = -1;
  const rows: { name: HTMLInputElement; dot: HTMLElement; roles: HTMLElement; swatches: Map<TeamColour, HTMLButtonElement> }[] = [];
  const buildRows = (size: number) => {
    rowsFor = size;
    rows.length = 0;
    playersBox.replaceChildren();
    for (let i = 0; i < size; i++) {
      const row = el('div', 'team-player-row');
      const dot = el('span', 'team-dot');
      const name = el('input', 'team-name');
      name.type = 'text';
      name.maxLength = PLAYER_NAME_MAX;
      name.autocomplete = 'off';
      name.spellcheck = false;
      name.placeholder = t('team.player', { n: i + 1 });
      name.setAttribute('aria-label', t('team.name', { n: i + 1 }));
      name.addEventListener('input', () => {
        const check = setPlayerName(state, i, name.value);
        problem.textContent = check.ok ? '' : t(`team.name.${check.problem}`, { max: PLAYER_NAME_MAX });
        if (check.ok) {
          renderLive();
          onChange();
        }
      });
      const colours = el('div', 'team-colours');
      colours.setAttribute('role', 'group');
      colours.setAttribute('aria-label', t('team.colour', { n: i + 1 }));
      const swatches = new Map<TeamColour, HTMLButtonElement>();
      for (const colour of TEAM_COLOURS) {
        const b = button('team-swatch', '');
        b.dataset.colour = colour;
        b.style.setProperty('--team-colour', TEAM_COLOUR_CSS[colour]);
        b.title = t(`team.colour.${colour}`);
        b.setAttribute('aria-label', t(`team.colour.${colour}`));
        b.addEventListener('click', () => {
          setPlayerColour(state, i, colour);
          changed();
        });
        colours.append(b);
        swatches.set(colour, b);
      }
      const roles = el('span', 'team-player-roles');
      row.append(dot, name, colours, roles);
      playersBox.append(row);
      rows.push({ name, dot, roles, swatches });
    }
  };

  /** Everything except the name fields' own text, which the player may be typing in. */
  const renderLive = () => {
    const team = state.team;
    const players = team?.players ?? [];
    turn.hidden = !team;
    turnButtons.replaceChildren(
      ...players.map((p, i) => {
        const b = button('team-player', '');
        b.dataset.player = String(i);
        b.style.setProperty('--team-colour', TEAM_COLOUR_CSS[p.colour]);
        b.setAttribute('aria-pressed', String(i === team!.atMouse));
        b.title = t('team.pass', { player: playerName(players, i) });
        b.append(el('span', 'team-dot'), el('span', 'team-player-name', playerName(players, i)), el('span', 'team-player-roles', rolesText(players.length, i)));
        b.addEventListener('click', () => {
          if (passMouse(state, i)) changed();
          // The buttons were redrawn: keep the keyboard on the player just picked.
          turnButtons.querySelector<HTMLButtonElement>(`[data-player="${i}"]`)?.focus();
        });
        return b;
      }),
    );
    rows.forEach((row, i) => {
      const p = players[i]!;
      row.dot.style.setProperty('--team-colour', TEAM_COLOUR_CSS[p.colour]);
      row.roles.textContent = rolesOf(players.length, i).map((role) => t('team.owns', { role: t(`team.role.${role}`), owns: t(`team.role.${role}.owns`) })).join(' ');
      for (const [colour, b] of row.swatches) b.setAttribute('aria-pressed', String(colour === p.colour));
    });
  };

  const render = () => {
    const size = state.team?.players.length ?? 0;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-pressed', String(size > 0));
    toggle.textContent = size > 0 ? t('team.on', { n: size }) : t('team.heading');
    setup.hidden = !open;
    root.hidden = !open && size === 0;
    for (const [n, b] of sizeButtons) b.setAttribute('aria-pressed', String(n === size));
    if (size !== rowsFor) buildRows(size);
    rows.forEach((row, i) => {
      if (document.activeElement !== row.name) row.name.value = state.team!.players[i]!.name;
    });
    playersBox.hidden = nameHint.hidden = size === 0;
    renderLive();
  };

  render();
  return {
    toggle,
    root,
    render,
    closeSetup() {
      if (open) setOpen(false);
    },
  };
}
