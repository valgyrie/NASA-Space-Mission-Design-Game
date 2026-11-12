import {
  LAUNCH_SITE_IDS,
  LAUNCH_SITES,
  LAUNCH_VEHICLE_IDS,
  LAUNCH_VEHICLES,
  type LaunchVehicleId,
  type VehicleStatus,
  isVehicleOpen,
  liftFactor,
  liftFrom,
  spinSpeed,
  vehicleStatus,
} from '../game/launchVehicles';
import type { BusId } from '../game/upgrades';
import { type LaunchPlan, type PlanProblem, insuranceQuote, planLaunch, shipMission } from '../game/mission';
import { adviseLaunch, shippingTo } from '../game/places';
import { adviceText, weatherText } from './weatherText';
import type { SiteState } from '../game/siteState';
import { t } from '../strings';
import { contractText, formatDecimal, formatGameDate, formatMoney, formatNumber } from './format';

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
      return t('planner.problem.noContract', { contract: contractText(plan.goal.contract.id) });
    case 'underway':
      return t('planner.problem.underway');
    case 'vehicleClosed':
      return t('planner.problem.vehicleClosed');
    case 'cantReach':
      return t('planner.problem.cantReach', { vehicle: t(`launchVehicle.${plan.vehicle}`), orbit: t(`orbit.${plan.goal.orbit}`) });
    case 'emptySlots':
      return t('planner.problem.emptySlots', { slots: p.slots.map((s) => t(`slot.${s}`)).join(t('planner.list')) });
    case 'tooHeavy':
      return t('planner.problem.tooHeavy', {
        kg: formatDecimal(p.overKg),
        vehicle: t(`launchVehicle.${plan.vehicle}`),
        max: formatNumber(plan.liftKg),
        orbit: t(`orbit.${plan.goal.orbit}`),
      });
    case 'hallTooSmall':
      return t('planner.problem.hallTooSmall', { bus: t(`part.${p.bus as BusId}`), need: p.need, level: p.level });
    case 'busFull':
      return t('planner.problem.busFull', {
        bus: t(`part.${p.bus as BusId}`),
        max: formatNumber(p.carriesKg),
        kg: formatDecimal(p.partsKg),
      });
    case 'missingParts':
      return t('planner.problem.missingParts');
    case 'money':
      return t('planner.problem.money', { short: formatMoney(p.short) });
  }
}

/** Why a Launch Vehicle can't be booked yet: too early in history, or retired. */
function closedText(status: VehicleStatus): string {
  if (status.open) return '';
  if (status.why === 'after') return t('planner.opensAfter', { contract: contractText(status.contract) });
  if (status.why === 'era') return status.era === 5 ? t('planner.freePlayOnly') : t('planner.opensInEra', { era: status.era });
  return t('planner.retired', { year: status.year });
}

/**
 * The Launch planner, shown inside the Mission Designer: pick the Launch Vehicle (mass check, how often it
 * works), see the Launch Site, what the Rideshare and Shipping cost, choose Launch Insurance, and when the
 * Mission would end; try a free Test Run; then ship.
 * `designWarnings` gives the Mission Designer's warnings, so a weak design ships knowingly.
 * The Seed prices the insurance from the same Test Run the player sees.
 */
export function makeLaunchPlanner(
  state: SiteState,
  seed: string,
  hooks: { onBack(): void; onShip(): void; onTestRun(vehicle: LaunchVehicleId): void; onVehicle(): void; designWarnings(): string[] },
): LaunchPlanner {
  const root = el('div', 'planner');
  root.hidden = true;
  const back = button('small planner-back', t('planner.back'));
  back.addEventListener('click', () => hooks.onBack());

  // Launch Vehicle and Launch Site
  const choices = el('section', 'planner-card');
  const firstLaunch = el('p', 'planner-hint', t('planner.firstLaunch'));
  choices.append(el('h3', '', t('planner.vehicle')), el('p', 'planner-hint', t('planner.vehicleHint')), firstLaunch);
  const vehicleButtons = new Map<
    LaunchVehicleId,
    { button: HTMLButtonElement; fit: HTMLElement; locked: HTMLElement; lifts: HTMLElement; price: HTMLElement }
  >();
  for (const id of LAUNCH_VEHICLE_IDS) {
    const v = LAUNCH_VEHICLES[id];
    const b = button('option planner-vehicle', '');
    const fit = el('span', 'planner-fit');
    const locked = el('span', 'option-locked');
    b.dataset.vehicle = id;
    const lifts = el('span', 'option-stats');
    const price = el('span', 'option-stats');
    b.append(
      el('span', 'option-name', t(`launchVehicle.${id}`)),
      lifts,
      price,
      el('span', 'option-stats', v.record ? t('planner.reliability', {
        pct: formatNumber(Math.round(v.reliability * 100)),
        worked: formatNumber(v.record.worked),
        flights: formatNumber(v.record.flights),
      }) : t('planner.reliabilityEstimate', { pct: formatNumber(Math.round(v.reliability * 100)) })),
      fit,
      locked,
    );
    b.addEventListener('click', () => {
      if (!isVehicleOpen(state, id)) return;
      state.vehicle = id;
      hooks.onVehicle();
      render();
    });
    choices.append(b);
    vehicleButtons.set(id, { button: b, fit, locked, lifts, price });
  }
  // How a geostationary orbit is reached, shown when the Contract asks for one.
  const geoNote = el('p', 'planner-hint', t('planner.geoNote'));
  choices.append(geoNote);
  choices.append(el('h3', '', t('planner.site')), el('p', 'planner-hint', t('planner.siteHint')));
  const siteButtons = new Map<string, HTMLButtonElement>();
  for (const id of LAUNCH_SITE_IDS) {
    const ls = LAUNCH_SITES[id];
    const route = shippingTo(state.place, id);
    const b = button('option planner-site', '');
    b.dataset.site = id;
    const change = Math.round((liftFactor(id) - 1) * 100);
    b.append(
      el('span', 'option-name', t(`launchSite.${id}`)),
      el('span', 'option-stats', t('planner.siteSpin', {
        lat: formatDecimal(ls.lat),
        speed: formatNumber(Math.round(spinSpeed(ls.lat))),
      })),
      el('span', 'option-stats', change === 0 ? t('planner.siteLiftSame') : t(change > 0 ? 'planner.siteLiftMore' : 'planner.siteLiftLess', { pct: Math.abs(change) })),
      el('span', 'option-stats', t('planner.shipping', { price: formatMoney(route.cost), days: formatNumber(route.days), km: formatNumber(route.km) })),
    );
    if (ls.alternate) b.append(el('span', 'option-locked', t('planner.siteAlternate')));
    b.addEventListener('click', () => {
      state.launchSite = id;
      hooks.onVehicle();
      render();
    });
    choices.append(b);
    siteButtons.set(id, b);
  }

  // Launch weather and the Launch Window advisor
  const weather = el('section', 'planner-card');
  const weatherLine = el('p', 'planner-weather');
  const adviceLine = el('p', 'planner-advice');
  weather.append(el('h3', '', t('planner.weather')), weatherLine, adviceLine, el('p', 'planner-hint', t('planner.weatherHint')));

  // Costs and timeline
  const costs = el('section', 'planner-card');
  const costRows = el('dl', 'planner-rows');
  // Launch Insurance: a tick box, its price, and one line on what it pays and why it costs that much.
  let insure = false;
  const insureBox = el('input', 'planner-insure-box');
  insureBox.type = 'checkbox';
  insureBox.addEventListener('change', () => {
    insure = insureBox.checked;
    render();
  });
  const insurePrice = el('span', 'planner-insure-price');
  const insureLabel = el('label', 'planner-insure');
  insureLabel.append(insureBox, el('span', '', t('planner.insurance')), insurePrice);
  const insureLine = el('p', 'planner-hint');
  const lighter = el('p', 'planner-hint', t('planner.lighter'));
  const wholeNote = el('p', 'planner-hint', t('planner.wholeLaunchNote'));
  costs.append(el('h3', '', t('planner.costs')), costRows, insureLabel, insureLine, lighter, wholeNote);
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
  const testRun = button('planner-testrun', t('planner.testRun'));
  testRun.title = t('planner.testRunName');
  testRun.addEventListener('click', () => hooks.onTestRun(state.vehicle));
  const ship = button('planner-ship', '');
  ship.dataset.tutorial = 'planner-ship';
  testRun.dataset.tutorial = 'planner-testrun';
  footer.append(warnHead, warnings, warnNote, problems, testRun, ship);

  const grid = el('div', 'planner-grid');
  grid.append(choices, costs, timeline, weather);
  root.append(back, grid, footer);

  const row = (rows: HTMLElement, label: string, value: string, className = '') => {
    const dt = el('dt', className, label);
    const dd = el('dd', className, value);
    rows.append(dt, dd);
  };

  ship.addEventListener('click', () => {
    if (shipMission(state, state.design, state.vehicle, state.launchSite, { insure, seed }).ok) {
      insure = insureBox.checked = false;
      hooks.onShip();
    } else render();
  });

  const render = () => {
    const vehicle = state.vehicle;
    const site = state.launchSite;
    const quote = insuranceQuote(state, seed, state.design, vehicle, site);
    const insured = insure && quote.ok;
    const plan = planLaunch(state, state.design, vehicle, site, insured ? quote.price : 0);
    firstLaunch.hidden = state.reports.length > 0;
    for (const [id, b] of siteButtons) b.setAttribute('aria-pressed', String(id === site));
    const orbit = plan.goal.orbit;
    const whole = !!plan.goal.contract.wholeLaunch;
    geoNote.hidden = orbit !== 'geostationary';
    for (const [id, ui] of vehicleButtons) {
      const status = vehicleStatus(state, id);
      const open = status.open;
      ui.button.disabled = !open;
      ui.locked.hidden = open;
      ui.locked.textContent = closedText(status);
      ui.button.setAttribute('aria-pressed', String(id === vehicle));
      const lift = liftFrom(id, orbit, site);
      ui.lifts.textContent =
        lift <= 0
          ? t('planner.cantReach', { orbit: t(`orbit.${orbit}`) })
          : orbit === 'geostationary'
            ? t('planner.liftsTransfer', { kg: formatDecimal(lift) })
            : t('planner.lifts', { kg: formatDecimal(lift), orbit: t(`orbit.${orbit}`) });
      const v = LAUNCH_VEHICLES[id];
      ui.price.textContent =
        whole && v.launchPrice !== undefined
          ? t('planner.wholePrice', { price: formatMoney(v.launchPrice) })
          : t('planner.perKg', { price: formatMoney(v.perKg) });
      ui.fit.hidden = !open || lift <= 0;
      const fits = plan.massKg <= lift + 1e-9;
      ui.fit.textContent = t(fits ? 'planner.fits' : 'planner.tooHeavyShort', { kg: formatDecimal(plan.massKg) });
      ui.fit.classList.toggle('warn', !fits);
    }

    costRows.replaceChildren();
    row(
      costRows,
      plan.wholeLaunch
        ? t('planner.wholeLaunch', { vehicle: t(`launchVehicle.${vehicle}`) })
        : t('planner.rideshare', { kg: formatDecimal(plan.massKg), perKg: formatMoney(LAUNCH_VEHICLES[vehicle].perKg) }),
      formatMoney(plan.rideshare),
    );
    lighter.hidden = plan.wholeLaunch;
    wholeNote.hidden = !plan.wholeLaunch;
    row(costRows, t('planner.shippingCost', { site: t(`launchSite.${site}.short`) }), formatMoney(plan.shipping));
    if (insured) row(costRows, t('planner.insurance'), formatMoney(plan.insurance));
    const total = plan.total + plan.insurance;
    row(costRows, t('planner.total'), formatMoney(total), 'total');
    row(costRows, t('planner.money'), formatMoney(state.money), state.money < total ? 'warn' : '');
    const pct = formatNumber(quote.successPercent);
    insureBox.disabled = !quote.ok;
    insureBox.checked = insured;
    insurePrice.textContent = quote.ok ? formatMoney(quote.price) : '';
    insureLine.textContent = quote.ok
      ? t('planner.insuranceLine', { payout: formatMoney(quote.payout), pct })
      : t('planner.insuranceRefused', { pct });

    timeRows.replaceChildren();
    const bus = state.design.bus;
    if (bus) row(timeRows, t('planner.assembly', { bus: t(`part.${bus as BusId}`) }), t('planner.days', { days: formatNumber(plan.assemblyDays) }));
    row(timeRows, t('planner.shippingCost', { site: t(`launchSite.${site}.short`) }), t('planner.days', { days: formatNumber(plan.shippingDays) }));
    row(timeRows, t('planner.arrives', { site: t(`launchSite.${site}.short`) }), formatGameDate(plan.readyDay));
    row(timeRows, t('planner.ends', { days: formatNumber(plan.goal.missionDays) }), formatGameDate(plan.endDay));
    if (plan.deadlineDay !== null) {
      row(timeRows, t('planner.deadline'), formatGameDate(plan.deadlineDay), plan.endDay > plan.deadlineDay ? 'warn' : '');
    }

    weatherLine.textContent = weatherText(site, plan.readyDay);
    adviceLine.textContent = adviceText(adviseLaunch(site, plan.readyDay));

    const warn = hooks.designWarnings();
    warnings.replaceChildren(...warn.map((w) => el('li', '', w)));
    warnHead.hidden = warnNote.hidden = warn.length === 0;
    problems.replaceChildren(...plan.problems.map((p) => el('li', '', planProblemText(p, plan))));
    ship.textContent = t('planner.ship', { price: formatMoney(total) });
    ship.disabled = !plan.ok;
  };

  return { root, render };
}
