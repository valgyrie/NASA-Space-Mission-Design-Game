import { audio } from '../audio/sound';
import type { TestRun } from '../game/flight';
import { type TradeResult, buy, buyPrice } from '../game/market';
import { type SiteState, bestMark, partMass, partsByMark } from '../game/siteState';
import { type BusId, hallLevelFor, hallTakes } from '../game/upgrades';
import {
  type Design,
  type DesignCheck,
  type DesignProblem,
  type Gauge,
  type Resource,
  type Slot,
  type SpacecraftOption,
  RESOURCES,
  SLOTS,
  buyMissing,
  checkDesign,
  choose,
  costToBuy,
  isComplete,
  UNLOCKED_BY,
  isSlotShown,
  cannotAnswer,
  isUnlocked,
  optionEra,
  missionGoal,
  optionsFor,
  statsOf,
} from '../game/spacecraft';
import type { TechId } from '../game/research';
import { type Difficulty, isDirector, isExplorer } from '../game/modes';
import { dayPhase, ghostLayout, optionLevels, whatIf } from '../game/explorer';
import { icon } from './icons';
import { makeLaunchPlanner } from './launchPlanner';
import type { CompanyLogo } from '../company/logo';
import { makeMaturityStrip } from './designReview';
import { SLOT_ROLE, mayChange } from '../game/team';
import { makeRoleChip, makeTeamBar, notYoursText } from './teamBar';
import { recordTestRun } from '../game/maturity';
import { makeTestRunScreen } from './testRun';
import { planLaunch, testRunFor } from '../game/mission';
import type { Part } from '../economy/part';
import { type StringKey, t, textFor } from '../strings';
import { SpacecraftView } from '../world/spacecraftView';
import { spacecraftPicture } from '../world/spacecraftThumbnails';
import { missionLinks } from './learnMore';
import { fold } from './fold';
import { contractText, formatDecimal, formatMoney, formatNumber } from './format';

export interface MissionDesigner {
  open(): void;
  close(): void;
  destroy(): void;
  readonly isOpen: boolean;
}

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

/** The options that need no Part, named in strings.ts as `option.<id>`. */
type NoPartOption = 'batteriesOnly' | 'spin' | 'noEngine';

export function optionName(o: SpacecraftOption): string {
  return o.part ? t(`part.${o.part}`) : t(`option.${o.id as NoPartOption}`);
}

/**
 * "3 kg · carries 9 kg": mass and the one number that matters for the option, with tech tree Upgrades and the
 * Part's Mark applied. Better Marks are named first ("Mk 2 · 2.6 kg · ...").
 */
export function optionStats(o: SpacecraftOption, tech: readonly TechId[] = [], mark = 1, difficulty: Difficulty = 'easy'): string {
  const s = statsOf(o, tech, mark);
  const number = (n: number) => formatDecimal(n, difficulty === 'advanced' ? 2 : 1);
  const bits: string[] = [];
  if (o.part && mark > 1) bits.push(t('stat.mark', { mark }));
  if (o.part) bits.push(t('stat.mass', { kg: number(partMass(o.part, mark)) }));
  if (s.carriesKg) bits.push(t('stat.carries', { kg: formatNumber(s.carriesKg) }));
  if (s.batteryWh) bits.push(t('stat.battery', { wh: formatNumber(s.batteryWh) }));
  if (s.solarW) bits.push(t('stat.solar', { w: number(s.solarW) }));
  if (s.dataPerDay) bits.push(t('stat.makes', { kb: formatNumber(s.dataPerDay) }));
  if (s.sendPerDay) bits.push(t('stat.sends', { kb: formatNumber(s.sendPerDay) }));
  if (s.powerUseW) bits.push(t('stat.uses', { w: number(s.powerUseW) }));
  if (difficulty === 'advanced' && o.part && s.batteryWh) {
    bits.push(t('stat.energyDensity', { wh: number(s.batteryWh / partMass(o.part, mark)) }));
  }
  if (!o.part) bits.push(t(`option.${o.id as NoPartOption}.about`));
  if (o.id === 'mainEngine') bits.push(t('option.mainEngine.about'));
  if (o.id === 'lander') bits.push(t('option.lander.about'));
  return bits.join(t('stat.join'));
}

/** "3", or "3 (1 Mk 2, 2 Mk 1)" when some are better than Mk 1. Best Mark first. */
export function stockText(state: SiteState, part: Part): string {
  const counts = partsByMark(state, part);
  if (counts.every((n, i) => i === 0 || n === 0)) return formatNumber(state.parts[part]);
  const marks = counts
    .map((count, i) => ({ count, mark: i + 1 }))
    .filter(({ count }) => count > 0)
    .reverse()
    .map((m) => t('mark.count', m))
    .join(t('stat.list'));
  return `${formatNumber(state.parts[part])} (${marks})`;
}

/** The words under each bar. */
export function gaugeText(resource: Resource, g: Gauge, check: DesignCheck, money: number): string {
  if (g.status === 'waiting') return t('gauge.waiting', { slot: t(`slot.${g.waitingFor!}`) });
  switch (resource) {
    case 'mass':
      if (g.target <= 0) {
        return t('gauge.massCant', {
          kg: formatDecimal(g.value),
          vehicle: t(`launchVehicle.${check.goal.vehicle}`),
          orbit: t(`orbit.${check.goal.orbit}`),
        });
      }
      // NASA's ride: the room it gives (the Lunar Module, a CubeSat slot), not the rocket's lift.
      if (check.goal.ride) return t('gauge.massRide', { kg: formatDecimal(g.value), max: formatNumber(g.target) });
      return t('gauge.mass', {
        kg: formatDecimal(g.value),
        vehicle: t(`launchVehicle.${check.goal.vehicle}`),
        max: formatNumber(g.target),
      });
    case 'power':
      // On the Moon's surface: the battery against the lunar night.
      if (check.goal.orbit === 'moonSurface') return t('gauge.powerNight', { have: formatNumber(g.value), need: formatNumber(g.target) });
      return t('gauge.power', { have: formatNumber(g.value), need: formatNumber(g.target) });
    case 'budget':
      return t('gauge.budget', { cost: formatMoney(g.value), money: formatMoney(money) });
    case 'data':
      return g.status === 'ok'
        ? t('gauge.dataLong', { need: formatNumber(g.target) })
        : t('gauge.data', { days: formatNumber(Math.floor(g.value)), need: formatNumber(g.target) });
    case 'communications':
      return t('gauge.communications', { send: formatNumber(g.value), make: formatNumber(g.target) });
    case 'time':
      return t('gauge.time', { days: formatNumber(g.value), left: formatNumber(g.target) });
  }
}

/** One plain sentence per shortfall, naming the cause and a fix. */
export function problemText(p: DesignProblem, check: DesignCheck): string {
  switch (p.kind) {
    case 'tooHeavy':
      if (p.ride !== undefined) return t('problem.tooHeavyRide', { kg: formatDecimal(p.overKg), max: formatNumber(p.ride) });
      return p.bigger
        ? t('problem.tooHeavyBigger', { kg: formatDecimal(p.overKg), vehicle: t(`launchVehicle.${check.goal.vehicle}`), bigger: t(`launchVehicle.${p.bigger}`) })
        : t('problem.tooHeavy', { kg: formatDecimal(p.overKg), vehicle: t(`launchVehicle.${check.goal.vehicle}`) });
    case 'cantReach':
      return p.bigger
        ? t('problem.cantReachBigger', { vehicle: t(`launchVehicle.${check.goal.vehicle}`), orbit: t(`orbit.${p.orbit}`), bigger: t(`launchVehicle.${p.bigger}`) })
        : t('problem.cantReach', { vehicle: t(`launchVehicle.${check.goal.vehicle}`), orbit: t(`orbit.${p.orbit}`) });
    case 'needsEngine':
      return t(p.moon ? 'problem.needsEngineMoon' : 'problem.needsEngine');
    case 'needsLander':
      return t('problem.needsLander');
    case 'needsCubeSat':
      return t('problem.needsCubeSat');
    case 'hallTooSmall':
      return t('problem.hallTooSmall', { bus: t(`part.${p.bus as BusId}`), need: p.need, level: p.level });
    case 'busFull':
      return t('problem.busFull', {
        bus: t(`part.${p.bus as BusId}`),
        max: formatNumber(p.carriesKg),
        kg: formatDecimal(p.partsKg),
      });
    case 'powerShort':
      return t('problem.powerShort', { days: formatNumber(Math.floor(p.lastsDays)), need: formatNumber(p.needDays) });
    case 'money':
      return t('problem.money', { short: formatMoney(p.short) });
    case 'wrongPayload':
      return t('problem.wrongPayload', { payload: t(`payload.${p.payload}`) });
    case 'commsShort':
      return t(p.stations ? 'problem.commsShortStations' : 'problem.commsShort', { send: formatNumber(p.sendPerDay), make: formatNumber(p.dataPerDay) });
    case 'late':
      return t('problem.late', { days: formatNumber(p.needDays), left: formatNumber(p.daysLeft) });
  }
}

/** Explorer's word on a bar's first line ("Too heavy"); the Budget keeps its money. */
export function explorerGaugeShort(resource: Resource, g: Gauge): string {
  if (g.status === 'waiting' || resource === 'budget') return gaugeShort(resource, g);
  if (resource === 'mass' && g.target <= 0) return t('explorer.gauge.mass.cant');
  return t(`explorer.gauge.${resource}.${g.status === 'ok' ? 'ok' : 'no'}`);
}

/** Explorer's sentence under a bar: what it means, no numbers (the Budget keeps its money). */
export function explorerGaugeText(resource: Resource, g: Gauge, check: DesignCheck, money: number): string {
  if (g.status === 'waiting' || resource === 'budget') return gaugeText(resource, g, check, money);
  if (resource === 'mass' && g.target <= 0) return t('explorer.gaugeText.mass.cant');
  if (resource === 'communications' && g.status === 'short' && check.problems.some((p) => p.kind === 'commsShort' && p.stations)) {
    return t('explorer.gaugeText.communications.stations');
  }
  return t(`explorer.gaugeText.${resource}.${g.status === 'ok' ? 'ok' : 'no'}`);
}

/** Explorer's plain sentence for a shortfall: the cause and a fix, without the numbers. */
export function explorerProblemText(p: DesignProblem, check: DesignCheck): string {
  const vehicle = t(`launchVehicle.${check.goal.vehicle}`);
  switch (p.kind) {
    case 'tooHeavy':
      if (p.ride !== undefined) return t('explorer.problem.tooHeavyRide');
      return p.bigger ? t('explorer.problem.tooHeavyBigger', { vehicle, bigger: t(`launchVehicle.${p.bigger}`) }) : t('explorer.problem.tooHeavy', { vehicle });
    case 'busFull':
      return t('explorer.problem.busFull', { bus: t(`part.${p.bus as BusId}`) });
    case 'powerShort':
      return t('explorer.problem.powerShort', { phase: t(`explorer.phase.${dayPhase(p.lastsDays, p.needDays)}`) });
    case 'money':
      return t('explorer.problem.money', { short: formatMoney(p.short) });
    case 'commsShort':
      return t(p.stations ? 'explorer.problem.commsShortStations' : 'explorer.problem.commsShort');
    case 'late':
      return t('explorer.problem.late');
    default:
      return problemText(p, check);
  }
}

/** The short number on a bar's first line ("3.2 / 8 kg"); the full sentence from `gaugeText` sits under the bar. */
export function gaugeShort(resource: Resource, g: Gauge): string {
  if (g.status === 'waiting') return t('gauge.waiting', { slot: t(`slot.${g.waitingFor!}`) });
  switch (resource) {
    case 'mass':
      return g.target <= 0
        ? t('designer.gaugeShort.massCant', { kg: formatDecimal(g.value) })
        : t('designer.gaugeShort.mass', { kg: formatDecimal(g.value), max: formatNumber(g.target) });
    case 'power':
      return t('designer.gaugeShort.power', { have: formatNumber(g.value), need: formatNumber(g.target) });
    case 'budget':
      return t('designer.gaugeShort.budget', { cost: formatMoney(g.value) });
    case 'data':
      return g.status === 'ok'
        ? t('designer.gaugeShort.dataLong', { need: formatNumber(g.target) })
        : t('designer.gaugeShort.data', { days: formatNumber(Math.floor(g.value)), need: formatNumber(g.target) });
    case 'communications':
      return t('designer.gaugeShort.communications', { send: formatNumber(g.value), make: formatNumber(g.target) });
    case 'time':
      return t('designer.gaugeShort.time', { days: formatNumber(g.value), left: formatNumber(g.target) });
  }
}

/** Where the fill and the target line sit on a bar, as fractions of its width. */
export function gaugeLayout(g: Gauge): { fill: number; target: number } {
  // A huge surplus (e.g. lots of spare money) still shows the target line in view.
  const value = Math.min(g.value, Math.max(g.target, 1e-9) * 3);
  const scale = Math.max(value, g.target) * 1.25 || 1;
  return { fill: value / scale, target: g.target / scale };
}

/** A step of the Mission Designer: one slot at a time, then the Check. */
type Step = Slot | 'check';

/** The design a tile pictures: the current one with this option in its slot (and a Small Bus to hold it, if none yet). */
function tileDesign(design: Design, o: SpacecraftOption): Design {
  return { ...design, bus: design.bus ?? 'smallBus', [o.slot]: o.id } as Design;
}

/**
 * The Mission Designer, laid out like a showcase: the Spacecraft large in the middle over the whole screen, the
 * slot's name on top, the picked option's name under the Spacecraft, then one picture tile per option and a pager
 * through the slots, ending with a Check of the whole design. Resources sit bottom-left, "Plan the Launch →"
 * bottom-right. Parts come from the Warehouse or are bought here on the spot. `onChange` runs after every change worth saving.
 */
export function showMissionDesigner(
  root: HTMLElement,
  state: SiteState,
  seed: string,
  hooks: {
    onOpen(): void; onClose(): void; onChange(): void; onTestRun?(): void;
    /** The Company's logo, painted on the rocket in the Launch planner. */
    logo?(): CompanyLogo;
    challenge?: {
      allows(id: SpacecraftOption['id']): boolean;
      launchDay: number;
      testRun(design: SiteState['design']): TestRun;
      attempt(design: SiteState['design']): void;
    };
  },
): MissionDesigner {
  /** Explorer shows the same design with words, levels and bars instead of numbers. */
  const explorer = isExplorer(state);
  const backdrop = el('div', 'backdrop designer-backdrop');
  backdrop.hidden = true;
  const panel = el('div', 'panel designer');
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  const headingId = hooks.challenge ? 'weekly-designer-heading' : 'designer-heading';
  if (hooks.challenge) backdrop.classList.add('weekly-designer-backdrop');
  panel.setAttribute('aria-labelledby', headingId);
  backdrop.append(panel);
  root.append(backdrop);

  // Header
  const head = el('div', 'designer-head');
  const heading = el('h2', '', t('designer.heading'));
  heading.id = headingId;
  const goal = el('span', 'designer-goal');
  const paused = el('span', 'designer-paused', t('designer.paused'));
  const close = button('small designer-close', t(hooks.challenge ? 'weekly.back' : 'designer.close'));
  close.title = t('panel.closeName');
  // Team Mode (ticket 41): players pass the mouse; not in the Weekly Challenge, which one player enters.
  const team = hooks.challenge ? null : makeTeamBar(state, () => {
    hooks.onChange();
    redraw();
  });
  head.append(heading, goal, paused, ...(team ? [team.toggle] : []), close);

  // Top centre: the slot's name, big, with its one-line hint and "why" fold.
  const titleBox = el('div', 'designer-title');
  const title = el('h3', 'designer-title-name');
  const hintBox = el('div', 'designer-title-hint');
  titleBox.append(title, hintBox);

  // Under the Spacecraft: the picked option's name, its numbers, a thin rule, the tiles and the pager.
  const showcase = el('div', 'designer-showcase');
  const pickedName = el('p', 'designer-picked-name');
  const pickedStats = el('p', 'designer-picked-stats');
  const tilesBox = el('div', 'designer-tiles-box');
  const tileNote = el('p', 'designer-tile-note');
  tileNote.setAttribute('aria-live', 'polite');

  // Bottom-right: the Warehouse line for the picked Part, the Market's answer, and the big button.
  const actions = el('div', 'designer-actions');
  const stockBox = el('div', 'designer-stock-box');
  const problem = el('p', 'side-problem');
  problem.setAttribute('aria-live', 'polite');

  type Tile = {
    o: SpacecraftOption;
    b: HTMLButtonElement;
    img: HTMLImageElement;
    stats: string;
    reasons: string[];
    blocked: boolean;
  };
  const slotRows = new Map<
    Slot,
    { row: HTMLElement; hint: HTMLElement; tiles: Tile[]; stock: HTMLElement; chip: ReturnType<typeof makeRoleChip>; notYours: HTMLElement }
  >();
  const tileUi: Tile[] = [];
  /** The tile under the pointer or keyboard focus: its name, numbers and reasons show instead of the picked one's. */
  let previewing: Tile | null = null;
  /** The last check of the design, for the Check page's big line. */
  let checked: DesignCheck | null = null;
  const preview = (tile: Tile | null) => {
    previewing = tile;
    showPicked();
    showGhost();
  };

  for (const slot of SLOTS) {
    const hint = el('div', 'designer-slot-hint');
    const chip = makeRoleChip(SLOT_ROLE[slot]);
    // The idea in one line; the arrow opens why it matters.
    const slotWhy = fold(t(`slot.${slot}.hint`), textFor(`slot.${slot}.why`, explorer));
    slotWhy.classList.add('slot-why');
    hint.append(slotWhy, chip.root);
    hintBox.append(hint);
    const row = el('div', 'slot designer-tiles');
    row.dataset.slot = slot;
    const tiles: Tile[] = [];
    for (const o of optionsFor(slot, state.difficulty)) {
      if (hooks.challenge && !hooks.challenge.allows(o.id)) continue;
      const b = button('option-tile', '');
      b.dataset.option = o.id;
      const img = el('img', 'option-tile-img');
      img.alt = '';
      img.draggable = false;
      b.append(img, el('span', 'option-tile-name', optionName(o)), el('span', 'option-tile-lock', t('designer.lockIcon')), el('span', 'option-tile-mark', t('designer.stepTick')));
      const tile: Tile = { o, b, img, stats: '', reasons: [], blocked: false };
      // Picking does not move on: the player sees the Part arrive and the bars react, then turns the page.
      b.addEventListener('click', () => {
        if (tile.blocked || b.getAttribute('aria-disabled') === 'true') return;
        if ((!team || mayChange(state, SLOT_ROLE[slot])) && choose(state.design, o.id, state)) changed();
      });
      b.addEventListener('pointerenter', () => preview(tile));
      b.addEventListener('pointerleave', () => previewing === tile && preview(null));
      b.addEventListener('focus', () => preview(tile));
      b.addEventListener('blur', () => previewing === tile && preview(null));
      row.append(b);
      tiles.push(tile);
      tileUi.push(tile);
    }
    const notYours = el('p', 'team-not-yours');
    row.append(notYours);
    tilesBox.append(row);
    const stock = el('div', 'slot-stock');
    stockBox.append(stock);
    slotRows.set(slot, { row, hint, tiles, stock, chip, notYours });
  }

  // The Check page: what is still short, the buy-everything button, the mode and the reading links.
  const checkHint = el('p', 'designer-slot-hint designer-check-hint', t('designer.checkHint'));
  hintBox.append(checkHint);
  const checkBox = el('div', 'designer-check');
  const warnings = el('ul', 'designer-warnings');
  warnings.setAttribute('aria-live', 'polite');
  const status = el('p', 'designer-status');
  const buyAll = button('small designer-buy-all', '');
  const sourceLinks = el('div', '');
  const sources = fold(t('fold.sources'), sourceLinks);
  const folds = el('div', 'designer-check-folds');
  folds.append(fold(t('designer.mode', { mode: t(`mode.${state.difficulty}`) }), t(`designer.${state.difficulty}.note`)), sources);
  checkBox.append(warnings, status, buyAll, folds);

  // The pager: ‹ 3 / 7 · Power ›, with one dot per page (ticked when its slot is filled).
  const pager = el('div', 'designer-pager');
  // Explorer: a word beside each arrow.
  const back = button('designer-page designer-page-back', t(explorer ? 'explorer.pagePrev' : 'designer.pagePrev'));
  const forward = button('designer-page designer-page-next', t(explorer ? 'explorer.pageNext' : 'designer.pageNext'));
  const pageLabel = el('span', 'designer-page-label');
  const dots = el('ol', 'designer-dots');
  dots.setAttribute('aria-label', t('designer.steps'));
  const dotUi = new Map<Step, { item: HTMLLIElement; dot: HTMLButtonElement }>();
  for (const s of [...SLOTS, 'check'] as Step[]) {
    const item = el('li', '');
    const dot = button('designer-dot', '');
    dot.dataset.step = s;
    dot.addEventListener('click', () => goTo(s));
    item.append(dot);
    dots.append(item);
    dotUi.set(s, { item, dot });
  }
  const pagerRow = el('div', 'designer-pager-row');
  pagerRow.append(back, pageLabel, forward);
  pager.append(pagerRow, dots);
  showcase.append(pickedName, pickedStats, el('hr', 'designer-rule'), tilesBox, checkBox, tileNote, pager);

  // Plan the Launch (or the Weekly Challenge's submit and Test Run), always in view.
  const next = button('designer-next', t(hooks.challenge ? 'weekly.submit' : 'designer.next'));
  const challengeTest = button('small designer-challenge-test', t('testRun.heading'));
  challengeTest.hidden = !hooks.challenge;
  challengeTest.addEventListener('click', () => {
    showView('testRun');
    testRun.show(hooks.challenge!.testRun(state.design), missionGoal(state).contract.id);
  });
  next.title = t(hooks.challenge ? 'weekly.submit' : 'designer.nextName');
  next.dataset.tutorial = 'designer-next';
  actions.append(stockBox, problem, challengeTest, next);

  // Bottom-left: the six resource bars, in a card that folds away to its heading.
  const resBox = el('aside', 'designer-resources');
  const resToggle = button('designer-resources-toggle', t('designer.resources'));
  resToggle.setAttribute('aria-expanded', 'true');
  resToggle.addEventListener('click', () => {
    const open = resBox.classList.toggle('collapsed');
    resToggle.setAttribute('aria-expanded', String(!open));
  });
  resBox.append(resToggle);
  type GaugeUi = { row: HTMLElement; fill: HTMLElement; ghost: HTMLElement; target: HTMLElement; short: HTMLElement; arrow: HTMLElement; text: HTMLElement };
  const gauges = new Map<Resource, GaugeUi>();
  for (const r of RESOURCES) {
    const row = el('div', 'gauge');
    row.dataset.resource = r;
    const name = el('span', 'gauge-name', t(`resource.${r}`));
    // Explorer: an icon beside each bar's word.
    if (explorer) name.prepend(icon(r));
    const short = el('span', 'gauge-short');
    // The ghost preview: how the bar would change with the hovered or focused Part, and an arrow saying which way.
    const arrow = el('span', 'gauge-arrow');
    arrow.hidden = true;
    const track = el('div', 'gauge-track');
    const fill = el('div', 'gauge-fill');
    const ghost = el('div', 'gauge-ghost');
    ghost.hidden = true;
    const target = el('div', 'gauge-target');
    track.append(fill, ghost, target);
    const text = el('span', 'gauge-text');
    const head = el('span', 'gauge-head');
    head.append(arrow, short);
    row.append(name, head, track, text);
    resBox.append(row);
    gauges.set(r, { row, fill, ghost, target, short, arrow, text });
  }
  /** The bars as last drawn, for putting them back when the ghost preview ends. */
  let drawn: DesignCheck['gauges'] | null = null;
  const placeBar = (ui: GaugeUi, g: Gauge) => {
    const layout = gaugeLayout(g);
    ui.fill.style.width = `${(g.status === 'waiting' ? 0 : layout.fill) * 100}%`;
    ui.target.style.left = `${layout.target * 100}%`;
    ui.target.hidden = g.status === 'waiting';
  };
  /** Show on each bar what picking the previewed Part would do, from the same check the bars use. */
  const showGhost = () => {
    const tile = previewing && step !== 'check' && previewing.o.slot === step && state.design[step] !== previewing.o.id ? previewing : null;
    const changes = tile && drawn ? whatIf(state, state.design, tile.o.id, adjust) : null;
    for (const r of RESOURCES) {
      const ui = gauges.get(r)!;
      const c = changes?.[r];
      if (!c || c.change === 'same') {
        ui.ghost.hidden = ui.arrow.hidden = true;
        delete ui.row.dataset.ghost;
        if (drawn) placeBar(ui, drawn[r]);
        continue;
      }
      const l = ghostLayout(c.before, c.after);
      const fill = c.before.status === 'waiting' ? 0 : l.fill;
      ui.fill.style.width = `${fill * 100}%`;
      ui.target.style.left = `${l.target * 100}%`;
      ui.target.hidden = false;
      ui.ghost.hidden = ui.arrow.hidden = false;
      ui.ghost.style.left = `${Math.min(fill, l.ghost) * 100}%`;
      ui.ghost.style.width = `${Math.abs(l.ghost - fill) * 100}%`;
      ui.ghost.dataset.change = c.change;
      ui.row.dataset.ghost = c.better === false ? 'worse' : 'better';
      ui.arrow.textContent = t(c.change === 'up' ? 'explorer.ghostUp' : 'explorer.ghostDown');
      ui.arrow.title = t(c.better === false ? 'explorer.ghostWorse' : 'explorer.ghostBetter');
      ui.arrow.setAttribute('aria-label', ui.arrow.title);
    }
  };

  // The 3D view fills the whole area behind everything else.
  const viewBox = el('section', 'designer-view');
  const view = new SpacecraftView();
  const viewEmpty = el('p', 'designer-view-empty', t('designer.emptyView'));
  const small = el('div', 'designer-view-small');
  small.append(el('p', 'designer-view-hint', t('designer.dragHint')), el('p', 'designer-view-hint', t('data.globe')));
  viewBox.append(view.canvas, viewEmpty, small);

  const body = el('div', 'designer-body');
  body.append(viewBox, titleBox, showcase, resBox, actions);

  // JPL's Concept Maturity Levels for the Contract on the table; the Weekly Challenge has its own score instead.
  const strip = makeMaturityStrip();
  strip.root.hidden = !!hooks.challenge;

  // The Launch planner takes the designer's place once the design is complete; a Test Run takes the planner's.
  const planner = makeLaunchPlanner(state, seed, {
    onBack: () => showView('design'),
    onShip: () => {
      hooks.onChange();
      api.close();
    },
    onTestRun: (vehicle) => {
      recordTestRun(state, state.design);
      showView('testRun');
      hooks.onTestRun?.();
      testRun.show(testRunFor(state, seed, state.design, vehicle), missionGoal(state).contract.id);
    },
    onVehicle: () => {
      hooks.onChange();
      strip.render(state);
    },
  });
  const testRun = makeTestRunScreen({ onBack: () => showView(hooks.challenge ? 'design' : 'planner'), designBack: !!hooks.challenge, explorer, paid: !hooks.challenge && isDirector(state) });
  panel.append(head, ...(team ? [team.root] : []), strip.root, body, planner.root, testRun.root);

  /**
   * Fit the Spacecraft into the open space between the title and the tiles, and keep the low tutorial guide on
   * the left, clear of the tiles and the button.
   */
  const placeStage = () => {
    const open = !backdrop.hidden && !body.hidden;
    document.body.classList.toggle('designer-steps-open', open);
    if (!open) return;
    const area = body.getBoundingClientRect();
    if (area.height <= 0) return;
    const top = titleBox.getBoundingClientRect().bottom - area.top;
    const bottom = showcase.getBoundingClientRect().top - area.top;
    const free = Math.max(bottom - top, area.height * 0.25);
    view.setStage(0.5 - (top + free / 2) / area.height, (free / area.height) * 0.8);
    document.body.style.setProperty('--designer-top', `${Math.round(area.top)}px`);
  };
  const bodySize = new ResizeObserver(placeStage);
  bodySize.observe(body);

  const headings = { design: 'designer.heading', planner: 'planner.heading', testRun: 'testRun.heading' } as const;
  let shown: keyof typeof headings = 'design';
  /** Redraw the screen on show after the team changed: who is at the mouse decides what can be changed. */
  const redraw = () => {
    if (shown === 'design') render();
    else if (shown === 'planner') planner.render();
  };
  const showView = (which: keyof typeof headings) => {
    shown = which;
    team?.render();
    body.hidden = which !== 'design';
    planner.root.hidden = which !== 'planner';
    testRun.root.hidden = which !== 'testRun';
    heading.textContent = t(headings[which]);
    if (which !== 'testRun') testRun.stop();
    if (!hooks.challenge) strip.render(state);
    if (which === 'design') {
      view.start();
      render();
    } else {
      view.stop();
      if (which === 'planner') planner.render();
    }
    placeStage();
  };
  next.addEventListener('click', () => {
    if (hooks.challenge) { hooks.challenge.attempt({ ...state.design }); api.close(); }
    else showView('planner');
  });

  // Pages
  let step: Step = 'bus';
  /** The pages on show: slots of this Era with something to pick (respecting the Weekly Challenge's catalogue), then the Check. */
  const steps = (): Step[] => [...SLOTS.filter((s) => isSlotShown(state, s) && slotRows.get(s)!.tiles.length > 0), 'check'];
  const stepName = (s: Step): string => (s === 'check' ? t('designer.check') : t(`slot.${s}`));
  const goTo = (s: Step) => {
    step = s;
    previewing = null;
    problem.textContent = '';
    tileNote.textContent = '';
    render();
  };
  /** Where to start: the first slot still empty, or the Check when the design is complete. */
  const firstStep = (): Step => steps().find((s) => s !== 'check' && state.design[s] === null) ?? 'check';
  back.addEventListener('click', () => {
    const list = steps();
    goTo(list[Math.max(0, list.indexOf(step) - 1)]!);
  });
  forward.addEventListener('click', () => {
    const list = steps();
    goTo(list[Math.min(list.length - 1, list.indexOf(step) + 1)]!);
  });

  /** The name area: the hovered or focused tile's option, else the picked one (or the Check's heading). */
  const showPicked = () => {
    pickedName.classList.toggle('previewing', !!previewing);
    if (step === 'check') {
      const c = checked;
      pickedName.textContent = !c ? '' : c.ready
        ? t('designer.checkReady')
        : c.problems.length > 0
          ? t('designer.checkToFix', { count: formatNumber(c.problems.length) })
          : t('designer.checkEmpty');
      pickedStats.textContent = '';
      tileNote.textContent = '';
      return;
    }
    const pickedId = state.design[step];
    const tile = previewing ?? slotRows.get(step)!.tiles.find((x) => x.o.id === pickedId) ?? null;
    pickedName.classList.toggle('empty', !tile);
    pickedName.textContent = tile ? optionName(tile.o) : t('designer.pick');
    if (explorer) pickedStats.replaceChildren(...(tile ? [levelsOf(tile.o)] : []));
    else pickedStats.textContent = tile ? tile.stats : '';
    tileNote.textContent = previewing ? previewing.reasons.join(t('stat.join')) : '';
  };

  /** Explorer's stand-in for an option's numbers: a word and three pips for each, ranked against its slot's other options. */
  const levelsOf = (o: SpacecraftOption): HTMLElement => {
    const box = el('span', 'explorer-levels');
    const others = slotRows.get(o.slot)!.tiles.map((x) => x.o);
    const markOf = (x: SpacecraftOption) => (x.part ? bestMark(state, x.part) : 1);
    for (const l of optionLevels(o, others, state.research.tech, markOf)) {
      const item = el('span', 'explorer-level');
      const name = t(`explorer.level.${l.stat}`);
      item.title = t('explorer.levelName', { stat: name, level: l.level });
      item.setAttribute('aria-label', item.title);
      const pips = el('span', 'explorer-pips');
      pips.setAttribute('aria-hidden', 'true');
      for (let i = 1; i <= 3; i++) pips.append(el('span', i <= l.level ? 'on' : ''));
      item.append(el('span', 'explorer-level-name', name), pips);
      box.append(item);
    }
    const about = !o.part ? t(`option.${o.id as NoPartOption}.about`) : o.id === 'mainEngine' || o.id === 'lander' ? t(`option.${o.id}.about`) : '';
    if (about) box.append(el('span', 'explorer-about', about));
    return box;
  };

  /** The Weekly Challenge counts the Launch in the Budget and the wait for its Launch day in the Time. */
  const adjust = (check: DesignCheck, design: Design) => {
    if (!hooks.challenge) return;
    check.gauges.budget.value += planLaunch(state, design).total;
    check.gauges.budget.status = check.gauges.budget.value <= state.money ? 'ok' : 'short';
    check.gauges.time.value = hooks.challenge.launchDay - state.day + check.goal.missionDays;
    check.gauges.time.status = check.gauges.time.value <= check.goal.daysLeft ? 'ok' : 'short';
  };

  const report = (result: TradeResult) => {
    problem.textContent = result.ok ? '' : t(`market.problem.${result.problem}`);
    if (result.ok) hooks.onChange();
    render();
  };
  buyAll.addEventListener('click', () => report(buyMissing(state, state.design)));

  const render = () => {
    const check = checkDesign(state, state.design);
    checked = check;
    if (!hooks.challenge) strip.render(state);
    const contract = contractText(check.goal.contract.id);
    const forKey = { accepted: 'designer.for', offered: 'designer.forOffer', done: 'designer.forDone' } as const;
    goal.textContent = t(forKey[check.goal.status], { contract });
    sourceLinks.replaceChildren(missionLinks(check.goal.contract.id, check.goal.vehicle));

    const list = steps();
    if (!list.includes(step)) step = list[0]!;
    const players = team ? state.team?.players : undefined;
    const asked = check.goal.contract;
    for (const tile of tileUi) {
      const { o, b, img } = tile;
      const open = isUnlocked(state, o.id);
      const cannot = check.goal.status === 'accepted' && cannotAnswer(asked, o.id);
      const reasons: string[] = [];
      const card = UNLOCKED_BY[o.id];
      if (!open && card) reasons.push(t('designer.locked', { card: t(`history.${card}.title`) }));
      const era = optionEra(o.id);
      // A Part of a later Era is shown locked, so the player sees what is coming.
      if (!open && era > 1) reasons.push(t('designer.lockedEra', { era }));
      // A Bus the Assembly Hall can't take yet can still be picked and tested, but not shipped.
      const hall = o.slot === 'bus' && !hallTakes(state, o.id as BusId);
      if (hall) reasons.push(t('designer.needsHall', { level: hallLevelFor(o.id as BusId) }));
      // A question Contract greys out what can't answer its question, with one line why.
      if (cannot) reasons.push(t(`question.${asked.question}.no.${o.id}` as StringKey));
      tile.reasons = reasons;
      tile.blocked = !open || cannot;
      // In Team Mode a slot answers only to its role's player.
      const notMine = !!players && !mayChange(state, SLOT_ROLE[o.slot]);
      b.setAttribute('aria-disabled', String(tile.blocked || notMine));
      b.classList.toggle('locked', tile.blocked);
      b.classList.toggle('warn', hall && !tile.blocked);
      tile.stats = optionStats(o, state.research.tech, o.part ? bestMark(state, o.part) : 1, state.difficulty);
      const picked = state.design[o.slot] === o.id;
      b.setAttribute('aria-pressed', String(picked));
      b.title = [optionName(o), ...(explorer ? [] : [tile.stats]), ...reasons].join('\n');
      // Pictures are drawn only for the page on show, once per design (cached).
      if (o.slot === step) {
        const d = tileDesign(state.design, o);
        const key = JSON.stringify(d);
        if (img.dataset.key !== key) {
          img.dataset.key = key;
          img.src = spacecraftPicture(d, o.slot);
        }
      }
    }

    for (const slot of SLOTS) {
      const { row, hint, stock, chip, notYours } = slotRows.get(slot)!;
      const role = SLOT_ROLE[slot];
      chip.render(players ? state : {});
      row.dataset.role = players ? role : '';
      row.style.setProperty('--team-colour', chip.root.style.getPropertyValue('--team-colour'));
      notYours.hidden = !players || mayChange(state, role);
      notYours.textContent = players ? notYoursText(players, role) : '';
      // Only the current page's slot shows.
      row.hidden = slot !== step;
      hint.hidden = slot !== step;
      stock.hidden = slot !== step;
      const picked = state.design[slot];
      stock.replaceChildren();
      stock.classList.toggle('empty', !picked);
      if (!picked) {
        stock.textContent = t('designer.pick');
        continue;
      }
      const part = optionsFor(slot).find((o) => o.id === picked)!.part;
      if (!part) {
        stock.append(el('span', 'stock-ok', t('designer.noPart')));
      } else if (state.parts[part] > 0) {
        stock.append(el('span', 'stock-ok', t('designer.inStock', { count: stockText(state, part) })));
      } else {
        stock.append(el('span', 'stock-missing', hooks.challenge ? t('weekly.partCost', { money: formatMoney(buyPrice(part)) }) : t('designer.notInStock')));
        const b = button('small trade', t('designer.buy', { price: formatMoney(buyPrice(part)) }));
        b.addEventListener('click', () => report(buy(state, part)));
        if (!hooks.challenge) stock.append(b);
      }
    }
    checkHint.hidden = step !== 'check';
    checkBox.hidden = step !== 'check';
    tilesBox.hidden = step === 'check';
    showcase.dataset.page = step;
    title.textContent = stepName(step);
    showPicked();

    // The pager and its dots: a tick for every slot filled; the Check's dot ticks once the design is ready.
    let n = 0;
    for (const [s, { item, dot }] of dotUi) {
      const on = list.includes(s);
      item.hidden = !on;
      if (!on) continue;
      n++;
      const done = s === 'check' ? check.ready : state.design[s] !== null;
      const warn = s === 'check' && !done && check.problems.length > 0;
      dot.dataset.state = done ? 'done' : warn ? 'warn' : 'todo';
      dot.title = warn
        ? t('designer.stepProblems', { step: stepName(s), count: check.problems.length })
        : t(done ? 'designer.stepPicked' : 'designer.stepToDo', { step: stepName(s) });
      dot.setAttribute('aria-label', `${formatNumber(n)} · ${dot.title}`);
      if (s === step) dot.setAttribute('aria-current', 'step');
      else dot.removeAttribute('aria-current');
    }
    const at = list.indexOf(step);
    pageLabel.textContent = t('designer.page', { n: formatNumber(at + 1), total: formatNumber(list.length), step: stepName(step) });
    back.disabled = at <= 0;
    forward.disabled = at >= list.length - 1;
    const before = list[at - 1];
    const after = list[at + 1];
    back.title = before ? t('designer.stepPrev', { step: stepName(before) }) : '';
    forward.title = after ? t('designer.stepNext', { step: stepName(after) }) : '';
    back.setAttribute('aria-label', back.title || stepName(step));
    forward.setAttribute('aria-label', forward.title || stepName(step));
    // Once this slot is picked, the next page is the thing to press.
    forward.classList.toggle('designer-step-ready', step !== 'check' && state.design[step] !== null);

    view.show(state.design);
    viewEmpty.hidden = state.design.bus !== null;

    adjust(check, state.design);
    drawn = check.gauges;
    for (const r of RESOURCES) {
      const g = check.gauges[r];
      const ui = gauges.get(r)!;
      ui.row.dataset.status = g.status;
      placeBar(ui, g);
      const sentence = hooks.challenge && r === 'budget'
        ? t('weekly.budgetGauge', { cost: formatMoney(g.value), money: formatMoney(state.money) })
        : explorer ? explorerGaugeText(r, g, check, state.money) : gaugeText(r, g, check, state.money);
      ui.short.textContent = explorer ? explorerGaugeShort(r, g) : gaugeShort(r, g);
      // The sentence says it in full; while waiting it would only repeat the short line.
      ui.text.textContent = sentence;
      ui.text.hidden = g.status === 'waiting';
      ui.row.title = sentence;
    }
    resBox.dataset.short = String(RESOURCES.some((r) => check.gauges[r].status === 'short'));

    warnings.replaceChildren(...check.problems.map((p) => el('li', '', explorer ? explorerProblemText(p, check) : problemText(p, check))));
    showGhost();
    status.textContent = check.ready
      ? t('designer.ready', { contract })
      : check.problems.length === 0
        ? t('designer.fillSlots')
        : '';
    if (hooks.challenge) status.textContent = t('weekly.cost', { money: formatMoney(check.gauges.budget.value) });
    status.classList.toggle('ready', check.ready);
    const cost = costToBuy(state, state.design);
    buyAll.hidden = !!hooks.challenge || cost === 0;
    challengeTest.disabled = !isComplete(state.design);
    buyAll.textContent = t('designer.buyAll', { price: formatMoney(cost) });
    next.disabled = !isComplete(state.design);
  };

  const changed = () => {
    problem.textContent = '';
    hooks.onChange();
    render();
  };

  const api: MissionDesigner = {
    open() {
      if (!backdrop.hidden) return;
      backdrop.hidden = false;
      audio.setScene('designer', 'designer');
      problem.textContent = '';
      hooks.onOpen();
      if (hooks.logo) planner.setLogo?.(hooks.logo());
      // Each visit starts at the first empty slot and puts the Spacecraft together in front of the player.
      step = firstStep();
      previewing = null;
      view.assemble();
      showView('design');
      close.focus();
    },
    close() {
      if (backdrop.hidden) return;
      backdrop.hidden = true;
      audio.setScene('designer', null);
      view.stop();
      testRun.stop();
      team?.closeSetup();
      placeStage();
      hooks.onClose();
    },
    destroy() {
      api.close();
      bodySize.disconnect();
      view.dispose();
      planner.dispose?.();
      backdrop.remove();
    },
    get isOpen() {
      return !backdrop.hidden;
    },
  };
  close.addEventListener('click', () => api.close());
  return api;
}
