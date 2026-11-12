import { type TradeResult, buy, buyPrice } from '../game/market';
import { type SiteState, bestMark, partMass, partsByMark } from '../game/siteState';
import { type BusId, hallLevelFor, hallTakes } from '../game/upgrades';
import {
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
  isUnlocked,
  optionEra,
  missionGoal,
  optionsFor,
  statsOf,
} from '../game/spacecraft';
import type { TechId } from '../game/research';
import type { Difficulty } from '../game/modes';
import { makeLaunchPlanner } from './launchPlanner';
import { makeTestRunScreen } from './testRun';
import { testRunFor } from '../game/mission';
import type { Part } from '../economy/part';
import { t } from '../strings';
import { SpacecraftView } from '../world/spacecraftView';
import { contractText, formatDecimal, formatMoney, formatNumber } from './format';

export interface MissionDesigner {
  open(): void;
  close(): void;
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
      return t('gauge.mass', {
        kg: formatDecimal(g.value),
        vehicle: t(`launchVehicle.${check.goal.vehicle}`),
        max: formatNumber(g.target),
      });
    case 'power':
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
      return p.bigger
        ? t('problem.tooHeavyBigger', { kg: formatDecimal(p.overKg), vehicle: t(`launchVehicle.${check.goal.vehicle}`), bigger: t(`launchVehicle.${p.bigger}`) })
        : t('problem.tooHeavy', { kg: formatDecimal(p.overKg), vehicle: t(`launchVehicle.${check.goal.vehicle}`) });
    case 'cantReach':
      return p.bigger
        ? t('problem.cantReachBigger', { vehicle: t(`launchVehicle.${check.goal.vehicle}`), orbit: t(`orbit.${p.orbit}`), bigger: t(`launchVehicle.${p.bigger}`) })
        : t('problem.cantReach', { vehicle: t(`launchVehicle.${check.goal.vehicle}`), orbit: t(`orbit.${p.orbit}`) });
    case 'needsEngine':
      return t('problem.needsEngine');
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

/** Where the fill and the target line sit on a bar, as fractions of its width. */
export function gaugeLayout(g: Gauge): { fill: number; target: number } {
  // A huge surplus (e.g. lots of spare money) still shows the target line in view.
  const value = Math.min(g.value, Math.max(g.target, 1e-9) * 3);
  const scale = Math.max(value, g.target) * 1.25 || 1;
  return { fill: value / scale, target: g.target / scale };
}

/**
 * The Mission Designer: pick one option per slot, watch the Spacecraft take shape and the six
 * resource bars react. Parts come from the Warehouse or are bought here on the spot.
 * `onChange` runs after every change worth saving.
 */
export function showMissionDesigner(
  root: HTMLElement,
  state: SiteState,
  seed: string,
  hooks: { onOpen(): void; onClose(): void; onChange(): void; onTestRun?(): void },
): MissionDesigner {
  const backdrop = el('div', 'backdrop designer-backdrop');
  backdrop.hidden = true;
  const panel = el('div', 'panel designer');
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-labelledby', 'designer-heading');
  backdrop.append(panel);
  root.append(backdrop);

  // Header
  const head = el('div', 'designer-head');
  const heading = el('h2', '', t('designer.heading'));
  heading.id = 'designer-heading';
  const goal = el('span', 'designer-goal');
  const paused = el('span', 'designer-paused', t('designer.paused'));
  const close = button('small designer-close', t('designer.close'));
  close.title = t('panel.closeName');
  head.append(heading, goal, paused, close);

  // Slots
  const slotsBox = el('section', 'designer-slots');
  slotsBox.append(el('h3', '', t('designer.slots')));
  slotsBox.append(el('p', 'side-note', t('designer.mode', { mode: t(`mode.${state.difficulty}`) })),
    el('p', 'side-note', t(`designer.${state.difficulty}.note`)));
  const slotRows = new Map<Slot, { row: HTMLElement; options: Map<string, HTMLButtonElement>; stock: HTMLElement }>();
  const optionUi: {
    o: SpacecraftOption;
    b: HTMLButtonElement;
    stats: HTMLElement;
    locked: HTMLElement | null;
    eraLock: HTMLElement | null;
    hall: HTMLElement | null;
  }[] = [];
  for (const slot of SLOTS) {
    const row = el('div', 'slot');
    const label = el('div', 'slot-head');
    label.append(el('span', 'slot-name', t(`slot.${slot}`)), el('span', 'slot-hint', t(`slot.${slot}.hint`)));
    const choices = el('div', 'slot-options');
    const options = new Map<string, HTMLButtonElement>();
    for (const o of optionsFor(slot, state.difficulty)) {
      const b = button('option', '');
      b.dataset.option = o.id;
      const stats = el('span', 'option-stats');
      b.append(el('span', 'option-name', optionName(o)), stats);
      const card = UNLOCKED_BY[o.id];
      const locked = card ? el('span', 'option-locked', t('designer.locked', { card: t(`history.${card}.title`) })) : null;
      if (locked) b.append(locked);
      // A Part of a later Era is shown locked, so the player sees what is coming.
      const era = optionEra(o.id);
      const eraLock = era > 1 ? el('span', 'option-locked', t('designer.lockedEra', { era })) : null;
      if (eraLock) b.append(eraLock);
      // A Bus the Assembly Hall can't take yet can still be picked and tested, but not shipped.
      const hall = slot === 'bus' ? el('span', 'option-locked', t('designer.needsHall', { level: hallLevelFor(o.id as BusId) })) : null;
      if (hall) b.append(hall);
      optionUi.push({ o, b, stats, locked, eraLock, hall });
      b.addEventListener('click', () => {
        if (choose(state.design, o.id, state)) changed();
      });
      choices.append(b);
      options.set(o.id, b);
    }
    const stock = el('div', 'slot-stock');
    row.append(label, choices, stock);
    slotsBox.append(row);
    slotRows.set(slot, { row, options, stock });
  }

  // 3D view
  const viewBox = el('section', 'designer-view');
  const view = new SpacecraftView();
  const viewEmpty = el('p', 'designer-view-empty', t('designer.emptyView'));
  viewBox.append(view.canvas, viewEmpty, el('p', 'designer-view-hint', t('designer.dragHint')));

  // Resources
  const resBox = el('section', 'designer-resources');
  resBox.append(el('h3', '', t('designer.resources')));
  const gauges = new Map<Resource, { row: HTMLElement; fill: HTMLElement; target: HTMLElement; text: HTMLElement }>();
  for (const r of RESOURCES) {
    const row = el('div', 'gauge');
    const name = el('span', 'gauge-name', t(`resource.${r}`));
    const track = el('div', 'gauge-track');
    const fill = el('div', 'gauge-fill');
    const target = el('div', 'gauge-target');
    track.append(fill, target);
    const text = el('span', 'gauge-text');
    row.append(name, text, track);
    resBox.append(row);
    gauges.set(r, { row, fill, target, text });
  }
  const warnings = el('ul', 'designer-warnings');
  warnings.setAttribute('aria-live', 'polite');
  const status = el('p', 'designer-status');
  const buyAll = button('small designer-buy-all', '');
  const problem = el('p', 'side-problem');
  problem.setAttribute('aria-live', 'polite');
  const next = button('designer-next', t('designer.next'));
  next.title = t('designer.nextName');
  next.dataset.tutorial = 'designer-next';
  resBox.append(warnings, status, buyAll, problem, next);

  const body = el('div', 'designer-body');
  body.append(slotsBox, viewBox, resBox);

  // The Launch planner takes the designer's place once the design is complete; a Test Run takes the planner's.
  const planner = makeLaunchPlanner(state, seed, {
    onBack: () => showView('design'),
    onShip: () => {
      hooks.onChange();
      api.close();
    },
    onTestRun: (vehicle) => {
      showView('testRun');
      hooks.onTestRun?.();
      testRun.show(testRunFor(state, seed, state.design, vehicle), missionGoal(state).contract.id);
    },
    onVehicle: () => hooks.onChange(),
    designWarnings: () => {
      const check = checkDesign(state, state.design);
      // Mass blocks shipping (the planner says why) and missing Parts are bought in the designer.
      const blocking = new Set(['tooHeavy', 'busFull', 'money']);
      return check.problems.filter((p) => !blocking.has(p.kind)).map((p) => problemText(p, check));
    },
  });
  const testRun = makeTestRunScreen({ onBack: () => showView('planner') });
  panel.append(head, body, planner.root, testRun.root);

  const headings = { design: 'designer.heading', planner: 'planner.heading', testRun: 'testRun.heading' } as const;
  const showView = (which: keyof typeof headings) => {
    body.hidden = which !== 'design';
    planner.root.hidden = which !== 'planner';
    testRun.root.hidden = which !== 'testRun';
    heading.textContent = t(headings[which]);
    if (which !== 'testRun') testRun.stop();
    if (which === 'design') {
      view.start();
      render();
    } else {
      view.stop();
      if (which === 'planner') planner.render();
    }
  };
  next.addEventListener('click', () => showView('planner'));

  const report = (result: TradeResult) => {
    problem.textContent = result.ok ? '' : t(`market.problem.${result.problem}`);
    if (result.ok) hooks.onChange();
    render();
  };
  buyAll.addEventListener('click', () => report(buyMissing(state, state.design)));

  const render = () => {
    const check = checkDesign(state, state.design);
    const contract = contractText(check.goal.contract.id);
    const forKey = { accepted: 'designer.for', offered: 'designer.forOffer', done: 'designer.forDone' } as const;
    goal.textContent = t(forKey[check.goal.status], { contract });

    for (const { o, b, stats, locked, eraLock, hall } of optionUi) {
      const open = isUnlocked(state, o.id);
      b.disabled = !open;
      if (locked) locked.hidden = open;
      if (eraLock) eraLock.hidden = open;
      if (hall) hall.hidden = hallTakes(state, o.id as BusId);
      stats.textContent = optionStats(o, state.research.tech, o.part ? bestMark(state, o.part) : 1, state.difficulty);
    }
    for (const slot of SLOTS) {
      const { row, options, stock } = slotRows.get(slot)!;
      // Propulsion joins in Era 2; until then it holds "none".
      row.hidden = !isSlotShown(state, slot);
      const picked = state.design[slot];
      for (const [id, b] of options) b.setAttribute('aria-pressed', String(id === picked));
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
        stock.append(el('span', 'stock-missing', t('designer.notInStock')));
        const b = button('small trade', t('designer.buy', { price: formatMoney(buyPrice(part)) }));
        b.addEventListener('click', () => report(buy(state, part)));
        stock.append(b);
      }
    }

    view.show(state.design);
    viewEmpty.hidden = state.design.bus !== null;

    for (const r of RESOURCES) {
      const g = check.gauges[r];
      const ui = gauges.get(r)!;
      const layout = gaugeLayout(g);
      ui.row.dataset.status = g.status;
      ui.fill.style.width = `${(g.status === 'waiting' ? 0 : layout.fill) * 100}%`;
      ui.target.style.left = `${layout.target * 100}%`;
      ui.target.hidden = g.status === 'waiting';
      ui.text.textContent = gaugeText(r, g, check, state.money);
    }

    warnings.replaceChildren(...check.problems.map((p) => el('li', '', problemText(p, check))));
    status.textContent = check.ready
      ? t('designer.ready', { contract })
      : check.problems.length === 0
        ? t('designer.fillSlots')
        : '';
    status.classList.toggle('ready', check.ready);
    const cost = costToBuy(state, state.design);
    buyAll.hidden = cost === 0;
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
      problem.textContent = '';
      hooks.onOpen();
      showView('design');
      close.focus();
    },
    close() {
      if (backdrop.hidden) return;
      backdrop.hidden = true;
      view.stop();
      testRun.stop();
      hooks.onClose();
    },
    get isOpen() {
      return !backdrop.hidden;
    },
  };
  close.addEventListener('click', () => api.close());
  return api;
}
