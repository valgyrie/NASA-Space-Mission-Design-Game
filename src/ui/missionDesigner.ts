import { type TradeResult, buy, buyPrice } from '../game/market';
import type { SiteState } from '../game/siteState';
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
  isUnlocked,
  optionsFor,
} from '../game/spacecraft';
import { makeLaunchPlanner } from './launchPlanner';
import { RECIPES } from '../game/balance';
import { t } from '../strings';
import { SpacecraftView } from '../world/spacecraftView';
import { formatDecimal, formatMoney, formatNumber } from './format';

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

export function optionName(o: SpacecraftOption): string {
  return o.part ? t(`part.${o.part}`) : t(`option.${o.id as 'batteriesOnly' | 'spin'}`);
}

/** "3 kg · carries 9 kg": mass and the one number that matters for the option. */
export function optionStats(o: SpacecraftOption): string {
  const s = o.stats;
  const bits: string[] = [];
  if (o.part) bits.push(t('stat.mass', { kg: formatDecimal(RECIPES[o.part].massKg) }));
  if (s.carriesKg) bits.push(t('stat.carries', { kg: formatNumber(s.carriesKg) }));
  if (s.batteryWh) bits.push(t('stat.battery', { wh: formatNumber(s.batteryWh) }));
  if (s.solarW) bits.push(t('stat.solar', { w: formatDecimal(s.solarW) }));
  if (s.dataPerDay) bits.push(t('stat.makes', { kb: formatNumber(s.dataPerDay) }));
  if (s.sendPerDay) bits.push(t('stat.sends', { kb: formatNumber(s.sendPerDay) }));
  if (s.powerUseW) bits.push(t('stat.uses', { w: formatDecimal(s.powerUseW) }));
  if (!o.part) bits.push(t(`option.${o.id as 'batteriesOnly' | 'spin'}.about`));
  return bits.join(t('stat.join'));
}

/** The words under each bar. */
export function gaugeText(resource: Resource, g: Gauge, check: DesignCheck, money: number): string {
  if (g.status === 'waiting') return t('gauge.waiting', { slot: t(`slot.${g.waitingFor!}`) });
  switch (resource) {
    case 'mass':
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
      return t('problem.tooHeavy', { kg: formatDecimal(p.overKg), vehicle: t(`launchVehicle.${check.goal.vehicle}`) });
    case 'busFull':
      return t('problem.busFull', {
        bus: t(`part.${p.bus as 'smallBus' | 'mediumBus'}`),
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
      return t('problem.commsShort', { send: formatNumber(p.sendPerDay), make: formatNumber(p.dataPerDay) });
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
  hooks: { onOpen(): void; onClose(): void; onChange(): void },
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
  const slotRows = new Map<Slot, { options: Map<string, HTMLButtonElement>; stock: HTMLElement }>();
  for (const slot of SLOTS) {
    const row = el('div', 'slot');
    const label = el('div', 'slot-head');
    label.append(el('span', 'slot-name', t(`slot.${slot}`)), el('span', 'slot-hint', t(`slot.${slot}.hint`)));
    const choices = el('div', 'slot-options');
    const options = new Map<string, HTMLButtonElement>();
    for (const o of optionsFor(slot)) {
      const b = button('option', '');
      b.append(el('span', 'option-name', optionName(o)), el('span', 'option-stats', optionStats(o)));
      if (!isUnlocked(o.id)) {
        b.disabled = true;
        b.append(el('span', 'option-locked', t('designer.locked')));
      }
      b.addEventListener('click', () => {
        if (choose(state.design, o.id)) changed();
      });
      choices.append(b);
      options.set(o.id, b);
    }
    const stock = el('div', 'slot-stock');
    row.append(label, choices, stock);
    slotsBox.append(row);
    slotRows.set(slot, { options, stock });
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
  resBox.append(warnings, status, buyAll, problem, next);

  const body = el('div', 'designer-body');
  body.append(slotsBox, viewBox, resBox);

  // The Launch planner takes the designer's place once the design is complete.
  const planner = makeLaunchPlanner(state, {
    onBack: () => showPlanner(false),
    onShip: () => {
      hooks.onChange();
      api.close();
    },
    designWarnings: () => {
      const check = checkDesign(state, state.design);
      // Mass blocks shipping (the planner says why) and missing Parts are bought in the designer.
      const blocking = new Set(['tooHeavy', 'busFull', 'money']);
      return check.problems.filter((p) => !blocking.has(p.kind)).map((p) => problemText(p, check));
    },
  });
  panel.append(head, body, planner.root);

  const showPlanner = (on: boolean) => {
    body.hidden = on;
    planner.root.hidden = !on;
    heading.textContent = t(on ? 'planner.heading' : 'designer.heading');
    if (on) {
      view.stop();
      planner.render();
    } else {
      view.start();
      render();
    }
  };
  next.addEventListener('click', () => showPlanner(true));

  const report = (result: TradeResult) => {
    problem.textContent = result.ok ? '' : t(`market.problem.${result.problem}`);
    if (result.ok) hooks.onChange();
    render();
  };
  buyAll.addEventListener('click', () => report(buyMissing(state, state.design)));

  const render = () => {
    const check = checkDesign(state, state.design);
    const contract = t(`contract.${check.goal.contract.id}.name`);
    const forKey = { accepted: 'designer.for', offered: 'designer.forOffer', done: 'designer.forDone' } as const;
    goal.textContent = t(forKey[check.goal.status], { contract });

    for (const slot of SLOTS) {
      const { options, stock } = slotRows.get(slot)!;
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
        stock.append(el('span', 'stock-ok', t('designer.inStock', { count: state.parts[part] })));
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
      showPlanner(false);
      close.focus();
    },
    close() {
      if (backdrop.hidden) return;
      backdrop.hidden = true;
      view.stop();
      hooks.onClose();
    },
    get isOpen() {
      return !backdrop.hidden;
    },
  };
  close.addEventListener('click', () => api.close());
  return api;
}
