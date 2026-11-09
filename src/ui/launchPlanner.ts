import { LAUNCH_SITE_IDS, LAUNCH_SITES, LAUNCH_VEHICLE_IDS, LAUNCH_VEHICLES, type LaunchSiteId, type LaunchVehicleId } from '../game/launchVehicles';
import { type LaunchPlan, type PlanProblem, planLaunch, shipMission } from '../game/mission';
import type { SiteState } from '../game/siteState';
import { t } from '../strings';
import { formatDecimal, formatGameDate, formatMoney, formatNumber } from './format';

export interface LaunchPlanner {
  readonly root: HTMLElement;
  render(): void;
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

/** One plain sentence for each thing that stops the Spacecraft from shipping. */
export function planProblemText(p: PlanProblem, plan: LaunchPlan): string {
  switch (p.kind) {
    case 'noContract':
      return t('planner.problem.noContract', { contract: t(`contract.${plan.goal.contract.id}.name`) });
    case 'underway':
      return t('planner.problem.underway');
    case 'emptySlots':
      return t('planner.problem.emptySlots', { slots: p.slots.map((s) => t(`slot.${s}`)).join(t('planner.list')) });
    case 'tooHeavy':
      return t('planner.problem.tooHeavy', {
        kg: formatDecimal(p.overKg),
        vehicle: t(`launchVehicle.${plan.vehicle}`),
        max: formatNumber(plan.liftKg),
        orbit: t(`orbit.${plan.goal.orbit}`),
      });
    case 'busFull':
      return t('planner.problem.busFull', {
        bus: t(`part.${p.bus as 'smallBus' | 'mediumBus'}`),
        max: formatNumber(p.carriesKg),
        kg: formatDecimal(p.partsKg),
      });
    case 'missingParts':
      return t('planner.problem.missingParts');
    case 'money':
      return t('planner.problem.money', { short: formatMoney(p.short) });
  }
}

/**
 * The Launch planner, shown inside the Mission Designer: pick the Launch Vehicle (mass check), see
 * the Launch Site, what the Rideshare and Shipping cost, and when the Mission would end; then ship.
 * `designWarnings` gives the Mission Designer's warnings, so a weak design ships knowingly.
 */
export function makeLaunchPlanner(
  state: SiteState,
  hooks: { onBack(): void; onShip(): void; designWarnings(): string[] },
): LaunchPlanner {
  let vehicle: LaunchVehicleId = LAUNCH_VEHICLE_IDS[0];
  const site: LaunchSiteId = LAUNCH_SITE_IDS[0];

  const root = el('div', 'planner');
  root.hidden = true;
  const back = button('small planner-back', t('planner.back'));
  back.addEventListener('click', () => hooks.onBack());

  // Launch Vehicle and Launch Site
  const choices = el('section', 'planner-card');
  choices.append(el('h3', '', t('planner.vehicle')), el('p', 'planner-hint', t('planner.vehicleHint')));
  const vehicleButtons = new Map<LaunchVehicleId, { button: HTMLButtonElement; fit: HTMLElement }>();
  for (const id of LAUNCH_VEHICLE_IDS) {
    const v = LAUNCH_VEHICLES[id];
    const b = button('option planner-vehicle', '');
    const fit = el('span', 'planner-fit');
    b.append(
      el('span', 'option-name', t(`launchVehicle.${id}`)),
      el('span', 'option-stats', t('planner.lifts', { kg: formatNumber(v.liftKg.lowEarthOrbit), orbit: t('orbit.lowEarthOrbit') })),
      el('span', 'option-stats', t('planner.perKg', { price: formatMoney(v.perKg) })),
      fit,
    );
    b.addEventListener('click', () => {
      vehicle = id;
      render();
    });
    choices.append(b);
    vehicleButtons.set(id, { button: b, fit });
  }
  choices.append(el('h3', '', t('planner.site')), el('p', 'planner-hint', t('planner.siteHint')));
  const siteBox = el('div', 'option planner-site');
  siteBox.setAttribute('aria-pressed', 'true');
  siteBox.append(
    el('span', 'option-name', t(`launchSite.${site}`)),
    el('span', 'option-stats', t('planner.shipping', {
      price: formatMoney(LAUNCH_SITES[site].shippingCost),
      days: formatNumber(LAUNCH_SITES[site].shippingDays),
    })),
  );
  choices.append(siteBox);

  // Costs and timeline
  const costs = el('section', 'planner-card');
  const costRows = el('dl', 'planner-rows');
  costs.append(el('h3', '', t('planner.costs')), costRows, el('p', 'planner-hint', t('planner.lighter')));
  const timeline = el('section', 'planner-card');
  const timeRows = el('dl', 'planner-rows');
  timeline.append(el('h3', '', t('planner.timeline')), timeRows);

  // Warnings, blockers and the button
  const footer = el('section', 'planner-footer');
  const warnHead = el('h3', '', t('planner.warnings'));
  const warnings = el('ul', 'designer-warnings');
  const warnNote = el('p', 'planner-hint', t('planner.warningsNote'));
  const problems = el('ul', 'planner-problems');
  problems.setAttribute('aria-live', 'polite');
  const ship = button('planner-ship', '');
  footer.append(warnHead, warnings, warnNote, problems, ship);

  const grid = el('div', 'planner-grid');
  grid.append(choices, costs, timeline);
  root.append(back, grid, footer);

  const row = (rows: HTMLElement, label: string, value: string, className = '') => {
    const dt = el('dt', className, label);
    const dd = el('dd', className, value);
    rows.append(dt, dd);
  };

  ship.addEventListener('click', () => {
    if (shipMission(state, state.design, vehicle, site).ok) hooks.onShip();
    else render();
  });

  const render = () => {
    const plan = planLaunch(state, state.design, vehicle, site);
    for (const [id, ui] of vehicleButtons) {
      ui.button.setAttribute('aria-pressed', String(id === vehicle));
      const lift = LAUNCH_VEHICLES[id].liftKg[plan.goal.orbit];
      const fits = plan.massKg <= lift + 1e-9;
      ui.fit.textContent = t(fits ? 'planner.fits' : 'planner.tooHeavyShort', { kg: formatDecimal(plan.massKg) });
      ui.fit.classList.toggle('warn', !fits);
    }

    costRows.replaceChildren();
    row(costRows, t('planner.rideshare', { kg: formatDecimal(plan.massKg), perKg: formatMoney(LAUNCH_VEHICLES[vehicle].perKg) }), formatMoney(plan.rideshare));
    row(costRows, t('planner.shippingCost', { site: t(`launchSite.${site}.short`) }), formatMoney(plan.shipping));
    row(costRows, t('planner.total'), formatMoney(plan.total), 'total');
    row(costRows, t('planner.money'), formatMoney(state.money), state.money < plan.total ? 'warn' : '');

    timeRows.replaceChildren();
    const bus = state.design.bus;
    if (bus) row(timeRows, t('planner.assembly', { bus: t(`part.${bus as 'smallBus' | 'mediumBus'}`) }), t('planner.days', { days: formatNumber(plan.assemblyDays) }));
    row(timeRows, t('planner.shippingCost', { site: t(`launchSite.${site}.short`) }), t('planner.days', { days: formatNumber(plan.shippingDays) }));
    row(timeRows, t('planner.arrives', { site: t(`launchSite.${site}.short`) }), formatGameDate(plan.readyDay));
    row(timeRows, t('planner.ends', { days: formatNumber(plan.goal.missionDays) }), formatGameDate(plan.endDay));
    if (plan.deadlineDay !== null) {
      row(timeRows, t('planner.deadline'), formatGameDate(plan.deadlineDay), plan.endDay > plan.deadlineDay ? 'warn' : '');
    }

    const warn = hooks.designWarnings();
    warnings.replaceChildren(...warn.map((w) => el('li', '', w)));
    warnHead.hidden = warnNote.hidden = warn.length === 0;
    problems.replaceChildren(...plan.problems.map((p) => el('li', '', planProblemText(p, plan))));
    ship.textContent = t('planner.ship', { price: formatMoney(plan.total) });
    ship.disabled = !plan.ok;
  };

  return { root, render };
}
