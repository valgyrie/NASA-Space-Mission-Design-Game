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
import { isBuildingOpen } from '../game/eras';
import type { MissionSegment } from '../game/segments';
import { dataOf } from '../game/spacecraft';
import { type LaunchPlan, type PlanProblem, insuranceQuote, shipMission, shipPlan } from '../game/mission';
import { GROUND_TEST_ROLE, mayChange } from '../game/team';
import { makeRoleChip } from './teamBar';
import { adviseLaunch, shippingTo } from '../game/places';
import { adviceText, weatherText } from './weatherText';
import type { SiteState } from '../game/siteState';
import { t } from '../strings';
import { contractText, formatDecimal, formatGameDate, formatMoney, formatNumber } from './format';
import { learnMore } from './learnMore';
import { SITE_SOURCES, SOURCES, VEHICLE_SOURCES } from '../game/sources';
import { makeDesignReview } from './designReview';
import { transferPicture } from './transferPicture';
import { GROUND_TESTS } from '../game/balance';
import { GROUND_TEST_IDS, GROUND_TEST_PAGES, type GroundTestId, groundTestChances, toggleGroundTest } from '../game/groundTests';
import { percentText } from './anomalyPanel';
import { fold } from './fold';
import { type CompanyLogo, DEFAULT_LOGO } from '../company/logo';
import { type PlannerShot, PlannerView } from '../world/plannerView';

export interface LaunchPlanner {
  readonly root: HTMLElement;
  render(): void;
  /** Paint the Company's logo on the rocket in the 3D view (the default logo until called). */
  setLogo?(logo: CompanyLogo): void;
  /** Release the 3D view and its WebGL context (when the Mission Designer is destroyed). */
  dispose?(): void;
}

/** The planner's steps, one panel each, in order: begin with the end in mind, the Launch last. */
export const PLANNER_STEPS = ['user', 'space', 'ground', 'vehicle', 'site', 'costs', 'review'] as const;
export type PlannerStep = (typeof PLANNER_STEPS)[number];

/** What the 3D view looks at on each step. */
const STEP_SHOT: Record<PlannerStep, PlannerShot> = {
  user: 'overview',
  space: 'spacecraft',
  ground: 'ground',
  vehicle: 'vehicle',
  site: 'site',
  costs: 'sky',
  review: 'overview',
};

/** Which step each problem belongs to, so the step bar can flag it. */
export function problemStep(p: PlanProblem): PlannerStep {
  switch (p.kind) {
    case 'noContract':
    case 'underway':
      return 'user';
    case 'emptySlots':
    case 'hallTooSmall':
    case 'busFull':
    case 'missingParts':
      return 'space';
    case 'vehicleClosed':
    case 'cantReach':
    case 'tooHeavy':
      return 'vehicle';
    case 'money':
      return 'costs';
    case 'unsigned':
      return 'review';
  }
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
    case 'unsigned':
      return t('planner.problem.unsigned', { roles: p.roles.map((r) => t(`team.role.${r}`)).join(t('team.list')) });
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
 * The Launch planner, shown inside the Mission Designer. On top, a 3D view of the chosen Launch Vehicle with the
 * Spacecraft on its pad. Below it, one step at a time under NASA's four Segments: who gets the Data and when (User),
 * the Spacecraft and its Ground Tests (Space), the dishes that talk to it (Ground), then the Launch: Launch Vehicle,
 * Launch Site, costs with Launch Insurance and weather, and the Design Review. A slim bar at the bottom always shows
 * the total, the problems, the free Test Run and Ship. The Seed prices the insurance from the same Test Run.
 */
export function makeLaunchPlanner(
  state: SiteState,
  seed: string,
  hooks: { onBack(): void; onShip(): void; onTestRun(vehicle: LaunchVehicleId): void; onVehicle(): void },
): LaunchPlanner {
  const root = el('div', 'planner planner-steps');
  root.hidden = true;
  const back = button('small planner-back', t('planner.back'));
  back.addEventListener('click', () => hooks.onBack());

  // Team Mode: the Launch Vehicle, Launch Site and Launch Insurance are the Mission lead's.
  const chips: ReturnType<typeof makeRoleChip>[] = [];
  const chip = (role: Parameters<typeof makeRoleChip>[0]) => {
    const c = makeRoleChip(role);
    chips.push(c);
    return c.root;
  };

  // Launch Vehicle
  const vehicleBody = el('div', 'planner-step-cards');
  const vehicleRow = el('div', 'planner-options');
  const firstLaunch = el('p', 'planner-hint', t('planner.firstLaunch'));
  const vehicleButtons = new Map<
    LaunchVehicleId,
    { button: HTMLButtonElement; fit: HTMLElement; locked: HTMLElement; lifts: HTMLElement; price: HTMLElement }
  >();
  const vehicleLinks: HTMLElement[] = [];
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
      if (!isVehicleOpen(state, id) || !mayChange(state, 'lead')) return;
      state.vehicle = id;
      hooks.onVehicle();
      render();
    });
    vehicleRow.append(b);
    vehicleLinks.push(learnMore(VEHICLE_SOURCES[id], t(`launchVehicle.${id}`)));
    vehicleButtons.set(id, { button: b, fit, locked, lifts, price });
  }
  // How a geostationary orbit is reached, shown when the Contract asks for one.
  const geoNote = el('p', 'planner-hint', t('planner.geoNote'));
  const geoPath = transferPicture();
  const geoFold = fold(t('fold.howItWorks'), geoPath, learnMore(SOURCES.orbits, t('sources.orbits')));
  vehicleBody.append(vehicleRow, firstLaunch, geoNote, geoFold, fold(t('fold.sources'), ...vehicleLinks));

  // Launch Site. Teach why the equator helps: one line of advice, the reasons behind an arrow (Earth's spin, orbit tilt, Kourou).
  const siteBody = el('div', 'planner-step-cards');
  const spinRow = (id: (typeof LAUNCH_SITE_IDS)[number]) => t('planner.equatorSite', {
    site: t(`launchSite.${id}.short`),
    lat: formatDecimal(LAUNCH_SITES[id].lat),
    speed: formatNumber(Math.round(spinSpeed(LAUNCH_SITES[id].lat))),
  });
  const tip = el('div', 'planner-tip', t('planner.equatorTip'));
  tip.append(fold(
    t('planner.equatorWhy'),
    t('planner.equatorSpin'),
    t('planner.equatorFree'),
    ...LAUNCH_SITE_IDS.map(spinRow),
    t('planner.equatorTilt'),
    t('planner.equatorKourou'),
    learnMore(SOURCES.equator, t('sources.equator')),
  ));
  const best = LAUNCH_SITE_IDS.reduce((a, b) => (liftFactor(b) > liftFactor(a) ? b : a));
  const siteRow = el('div', 'planner-options');
  const siteButtons = new Map<string, HTMLButtonElement>();
  const siteLinks: HTMLElement[] = [];
  for (const id of LAUNCH_SITE_IDS) {
    const ls = LAUNCH_SITES[id];
    const route = shippingTo(state.place, id);
    const b = button('option planner-site', '');
    b.dataset.site = id;
    const change = Math.round((liftFactor(id) - 1) * 100);
    const badge = el('span', 'planner-best', t('planner.siteBest'));
    badge.hidden = id !== best;
    b.append(
      el('span', 'option-name', t(`launchSite.${id}`)),
      badge,
      el('span', 'option-stats', change === 0 ? t('planner.siteLiftSame') : t(change > 0 ? 'planner.siteLiftMore' : 'planner.siteLiftLess', { pct: Math.abs(change) })),
      el('span', 'option-stats', t('planner.shipping', { price: formatMoney(route.cost), days: formatNumber(route.days), km: formatNumber(route.km) })),
    );
    if (ls.alternate) b.append(el('span', 'option-locked', t('planner.siteAlternate')));
    b.addEventListener('click', () => {
      if (!mayChange(state, 'lead')) return;
      state.launchSite = id;
      hooks.onVehicle();
      render();
    });
    siteRow.append(b);
    siteLinks.push(learnMore(SITE_SOURCES[id], t(`launchSite.${id}.short`)));
    siteButtons.set(id, b);
  }
  siteBody.append(tip, siteRow, fold(t('fold.sources'), ...siteLinks));

  // Launch weather and the Launch Window advisor
  const weather = el('section', 'planner-card');
  const weatherLine = el('p', 'planner-weather');
  const adviceLine = el('p', 'planner-advice');
  weather.append(el('h4', '', t('planner.weather')), weatherLine, adviceLine, fold(t('fold.howItWorks'), t('planner.weatherHint'), learnMore(SOURCES.climate, t('sources.climate')), t('sources.estimates')));

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
  insureLabel.append(insureBox, el('span', '', t('planner.insurance')), insurePrice, chip('lead'));
  const insureLine = el('p', 'planner-hint');
  const lighter = el('p', 'planner-hint', t('planner.lighter'));
  const wholeNote = el('p', 'planner-hint', t('planner.wholeLaunchNote'));
  costs.append(el('h4', '', t('planner.costs')), costRows, insureLabel, insureLine, lighter, wholeNote);
  const timeline = el('section', 'planner-card');
  const timeRows = el('dl', 'planner-rows');
  timeline.append(el('h4', '', t('planner.timeline')), timeRows);
  const costsBody = el('div', 'planner-step-cards planner-columns');
  costsBody.append(costs, timeline, weather);

  // User segment: who gets the Data, where it goes, and when the Mission ends.
  const user = el('section', 'planner-card');
  const userRows = el('dl', 'planner-rows');
  const labsHint = el('p', 'planner-hint', t('planner.labsHint'));
  user.append(userRows, labsHint);
  const intro = fold(t('segment.introShort'), t('segment.intro'), learnMore(SOURCES.segments, t('sources.segments')));
  intro.classList.add('planner-intro');
  const userBody = el('div', 'planner-step-cards planner-columns');
  const introCard = el('section', 'planner-card');
  introCard.append(intro);
  userBody.append(user, introCard);
  // Space segment: the Spacecraft itself.
  const spacecraft = el('section', 'planner-card');
  const spaceRows = el('dl', 'planner-rows');
  spacecraft.append(spaceRows);
  // Ground Tests (ticket 40): a tick box each, shown only when its Anomaly can strike this design.
  const tests = el('section', 'planner-card planner-tests');
  tests.dataset.tutorial = 'planner-tests';
  const testFirst = el('p', 'planner-hint', t('planner.groundTests.first'));
  const testSolar = el('p', 'planner-hint', t('planner.groundTests.solar'));
  const testsHow = fold(t('fold.howItWorks'), t('planner.groundTests.hint'), testFirst, testSolar, t('planner.groundTests.estimates'));
  tests.append(el('h4', '', t('planner.groundTests')), testsHow);
  const testRows = new Map<GroundTestId, { wrap: HTMLElement; box: HTMLInputElement; chance: HTMLElement }>();
  for (const id of GROUND_TEST_IDS) {
    const wrap = el('div', 'planner-test');
    wrap.dataset.test = id;
    const box = el('input', 'planner-test-box');
    box.type = 'checkbox';
    box.addEventListener('change', () => {
      toggleGroundTest(state, id, box.checked);
      hooks.onVehicle();
      render();
    });
    const label = el('label', 'planner-insure');
    const g = GROUND_TESTS[id];
    label.append(box, el('span', '', t('planner.groundTests.option', { name: t(`groundTest.${id}`), days: formatNumber(g.days), price: formatMoney(g.cost) })), chip(GROUND_TEST_ROLE[id]));
    const chance = el('span', 'planner-test-chance');
    const what = fold(t('fold.what'), t(`groundTest.${id}.what`), learnMore(`${SOURCES.cubesat101}#page=${GROUND_TEST_PAGES[id] + 8}`, t('groundTest.source', { page: GROUND_TEST_PAGES[id] })));
    wrap.append(label, chance, what);
    tests.append(wrap);
    testRows.set(id, { wrap, box, chance });
  }
  const spaceBody = el('div', 'planner-step-cards planner-columns');
  spaceBody.append(spacecraft, tests);
  // Ground segment: which dishes talk to it, and whether the Data fits through them.
  const ground = el('section', 'planner-card');
  const groundRows = el('dl', 'planner-rows');
  const groundHint = el('p', 'planner-hint');
  ground.append(groundRows, groundHint);
  const groundBody = el('div', 'planner-step-cards planner-columns');
  groundBody.append(ground);

  // The Design Review and the problems that stop shipping
  const review = makeDesignReview(() => {
    hooks.onVehicle();
    render();
  });
  const problems = el('ul', 'planner-problems');
  problems.setAttribute('aria-live', 'polite');
  const reviewBody = el('div', 'planner-step-cards');
  reviewBody.append(review.root, problems);

  // ---- The step panels ----
  const segmentOf: Record<PlannerStep, MissionSegment> = {
    user: 'user',
    space: 'space',
    ground: 'ground',
    vehicle: 'launch',
    site: 'launch',
    costs: 'launch',
    review: 'launch',
  };
  const stepHead = (step: PlannerStep): HTMLElement[] => {
    const h = el('h3', 'planner-step-title');
    const hint = (text: string) => el('p', 'planner-hint planner-step-hint', text);
    switch (step) {
      case 'user':
      case 'space':
      case 'ground':
        h.append(t(`segment.${step}`));
        return [h, hint(t(`segment.${step}.hint`))];
      case 'vehicle':
        h.append(el('span', 'planner-step-segment', t('segment.launch')), t('planner.vehicle'), ' ', chip('lead'));
        return [h, hint(t('planner.vehicleHint'))];
      case 'site':
        h.append(el('span', 'planner-step-segment', t('segment.launch')), t('planner.site'), ' ', chip('lead'));
        return [h, hint(t('planner.siteHint'))];
      case 'costs':
        h.append(el('span', 'planner-step-segment', t('segment.launch')), t('planner.step.costs'));
        return [h, hint(t('planner.costsHint'))];
      case 'review':
        h.append(el('span', 'planner-step-segment', t('segment.launch')), t('planner.reviewTitle'));
        return [h, hint(t('planner.reviewHint'))];
    }
  };
  const bodies: Record<PlannerStep, HTMLElement> = {
    user: userBody,
    space: spaceBody,
    ground: groundBody,
    vehicle: vehicleBody,
    site: siteBody,
    costs: costsBody,
    review: reviewBody,
  };
  let current: PlannerStep = 'user';
  const visited = new Set<PlannerStep>([current]);
  const stepBar = el('nav', 'planner-stepbar');
  stepBar.setAttribute('aria-label', t('planner.stepsLabel'));
  const stepButtons = new Map<PlannerStep, { button: HTMLButtonElement; mark: HTMLElement }>();
  const panels = new Map<PlannerStep, HTMLElement>();
  const panelBox = el('div', 'planner-panel');
  PLANNER_STEPS.forEach((step, i) => {
    const b = button('planner-stepbtn', '');
    b.dataset.step = step;
    const mark = el('span', 'planner-stepmark');
    b.append(el('span', 'planner-stepnum', formatNumber(i + 1)), el('span', 'planner-stepname', t(`planner.step.${step}`)), mark);
    b.addEventListener('click', () => go(step));
    stepBar.append(b);
    stepButtons.set(step, { button: b, mark });

    const panel = el('section', `planner-step planner-segment planner-segment-${segmentOf[step]}`);
    panel.dataset.step = step;
    panel.dataset.segment = segmentOf[step];
    const nav = el('div', 'planner-step-nav');
    const prev = PLANNER_STEPS[i - 1];
    const next = PLANNER_STEPS[i + 1];
    if (prev) {
      const p = button('small planner-step-back', t('planner.stepBack'));
      p.addEventListener('click', () => go(prev));
      nav.append(p);
    }
    if (next) {
      const n = button('small planner-step-next', t('planner.stepNext', { step: t(`planner.step.${next}`) }));
      n.addEventListener('click', () => go(next));
      nav.append(n);
    }
    const head = el('div', 'planner-step-head');
    head.append(...stepHead(step));
    panel.append(head, bodies[step], nav);
    panels.set(step, panel);
    panelBox.append(panel);
  });
  const go = (step: PlannerStep) => {
    current = step;
    visited.add(step);
    // The Design Review opens when its step is reached.
    if (step === 'review' && review.root instanceof HTMLDetailsElement) review.root.open = true;
    render();
    panelBox.scrollTop = 0;
  };

  // ---- The 3D view, built the first time the planner is shown ----
  const stage = el('div', 'planner-stage');
  stage.append(el('p', 'planner-stage-hint', t('designer.dragHint')));
  let view: PlannerView | null = null;
  let viewFailed = false;
  let logo: CompanyLogo = DEFAULT_LOGO;
  const drawView = () => {
    if (root.hidden || viewFailed) return;
    if (!view) {
      try {
        view = new PlannerView();
        view.canvas.setAttribute('aria-label', t('planner.viewLabel'));
        stage.prepend(view.canvas);
      } catch (e) {
        console.warn('No WebGL: the Launch planner goes without its 3D view.', e);
        viewFailed = true;
        stage.hidden = true;
        return;
      }
    }
    view.show(state.design, state.vehicle, logo);
    view.setSite(state.launchSite);
    view.frame(STEP_SHOT[current]);
    view.start();
  };

  // ---- The bar that is always there: total, problems, Test Run and Ship ----
  const bar = el('section', 'planner-bar');
  const barMoney = el('p', 'planner-bar-money');
  const barProblems = button('small planner-bar-problems', '');
  barProblems.addEventListener('click', () => go('review'));
  const testRun = button('planner-testrun', t('planner.testRun'));
  testRun.title = t('planner.testRunName');
  testRun.addEventListener('click', () => hooks.onTestRun(state.vehicle));
  const ship = button('planner-ship', '');
  ship.dataset.tutorial = 'planner-ship';
  testRun.dataset.tutorial = 'planner-testrun';
  bar.append(barMoney, barProblems, testRun, ship);

  const top = el('div', 'planner-top');
  top.append(back, stepBar);
  root.append(stage, top, panelBox, bar);

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
    const plan = shipPlan(state, state.design, vehicle, site, insured ? quote.price : 0);
    const lead = mayChange(state, 'lead');
    for (const c of chips) c.render(state);
    firstLaunch.hidden = state.reports.length > 0;
    for (const [id, b] of siteButtons) {
      b.setAttribute('aria-pressed', String(id === site));
      b.disabled = !lead;
    }
    const orbit = plan.goal.orbit;
    const whole = !!plan.goal.contract.wholeLaunch;
    geoNote.hidden = geoFold.hidden = orbit !== 'geostationary';
    for (const [id, ui] of vehicleButtons) {
      const status = vehicleStatus(state, id);
      const open = status.open;
      ui.button.disabled = !open || !lead;
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
    if (plan.testCost > 0) row(costRows, t('planner.groundTests'), formatMoney(plan.testCost));
    if (insured) row(costRows, t('planner.insurance'), formatMoney(plan.insurance));
    const total = plan.total + plan.insurance;
    row(costRows, t('planner.total'), formatMoney(total), 'total');
    row(costRows, t('planner.money'), formatMoney(state.money), state.money < total ? 'warn' : '');
    const pct = formatNumber(quote.successPercent);
    insureBox.disabled = !quote.ok || !lead;
    insureBox.checked = insured;
    insurePrice.textContent = quote.ok ? formatMoney(quote.price) : '';
    insureLine.textContent = quote.ok
      ? t('planner.insuranceLine', { payout: formatMoney(quote.payout), pct })
      : t('planner.insuranceRefused', { pct });

    timeRows.replaceChildren();
    row(timeRows, t('planner.shippingCost', { site: t(`launchSite.${site}.short`) }), t('planner.days', { days: formatNumber(plan.shippingDays) }));
    row(timeRows, t('planner.arrives', { site: t(`launchSite.${site}.short`) }), formatGameDate(plan.readyDay));

    userRows.replaceChildren();
    const labs = state.labs.length;
    row(userRows, t('planner.client'), contractText(plan.goal.contract.id, 'client'));
    row(userRows, t('planner.dataTo'), labs === 0 ? t('planner.labs.none') : t(labs === 1 ? 'planner.labs.one' : 'planner.labs.other', { count: formatNumber(labs) }));
    labsHint.hidden = labs > 0;
    row(userRows, t('planner.ends', { days: formatNumber(plan.goal.missionDays) }), formatGameDate(plan.endDay));
    if (plan.deadlineDay !== null) {
      row(userRows, t('planner.deadline'), formatGameDate(plan.deadlineDay), plan.endDay > plan.deadlineDay ? 'warn' : '');
    }

    spaceRows.replaceChildren();
    row(spaceRows, t('planner.mass'), t('planner.kg', { kg: formatDecimal(plan.massKg) }));
    const bus = state.design.bus;
    if (bus) row(spaceRows, t('planner.assembly', { bus: t(`part.${bus as BusId}`) }), t('planner.days', { days: formatNumber(plan.assemblyDays) }));
    if (plan.testDays > 0) row(spaceRows, t('planner.groundTests.days'), t('planner.days', { days: formatNumber(plan.testDays) }));

    const chances = new Map(groundTestChances(state, state.design, plan.marks).map((c) => [c.id, c]));
    for (const [id, ui] of testRows) {
      const c = chances.get(id);
      ui.wrap.hidden = !c;
      ui.box.checked = plan.groundTests.includes(id);
      ui.box.disabled = !mayChange(state, GROUND_TEST_ROLE[id]);
      if (c) {
        ui.chance.textContent = t('planner.groundTests.chance', {
          anomaly: t(`anomaly.${c.kind}.name`),
          before: percentText(c.before),
          after: percentText(c.after),
        });
      }
    }
    testFirst.hidden = state.reports.length > 0;
    testSolar.hidden = state.design.power === 'solarCells';

    groundRows.replaceChildren();
    const stations = state.groundStations.length;
    row(
      groundRows,
      t('planner.stations'),
      stations === 0 ? t('planner.stations.none') : t(stations === 1 ? 'planner.stations.one' : 'planner.stations.other', { count: formatNumber(stations) }),
    );
    const data = dataOf(state.design, state.research.tech, plan.goal.ground);
    const short = data.sendPerDay < data.dataPerDay;
    row(groundRows, t('planner.sends'), t('planner.kbPerDay', { kb: formatNumber(data.sendPerDay) }), short ? 'warn' : '');
    row(groundRows, t('planner.makes'), t('planner.kbPerDay', { kb: formatNumber(data.dataPerDay) }));
    groundHint.textContent =
      stations > 0
        ? t('planner.stationsBoost', { boost: formatDecimal(plan.goal.ground) })
        : isBuildingOpen(state, 'groundStation')
          ? t('planner.stationsBuild')
          : t('planner.stationsBorrowed');

    weatherLine.textContent = weatherText(site, plan.readyDay);
    adviceLine.textContent = adviceText(adviseLaunch(site, plan.readyDay));

    review.render(state);
    problems.replaceChildren(...plan.problems.map((p) => el('li', '', planProblemText(p, plan))));
    ship.textContent = t('planner.ship', { price: formatMoney(total) });
    ship.disabled = !plan.ok;

    // The step bar: the current step, a tick on visited steps with nothing wrong, a mark on steps with a problem.
    const flagged = new Set(plan.problems.map(problemStep));
    for (const [step, ui] of stepButtons) {
      const here = step === current;
      if (here) ui.button.setAttribute('aria-current', 'step');
      else ui.button.removeAttribute('aria-current');
      const mark = flagged.has(step) ? 'problem' : visited.has(step) ? 'done' : 'todo';
      ui.button.dataset.mark = mark;
      ui.mark.textContent = mark === 'problem' ? t('planner.stepProblem') : mark === 'done' ? t('planner.stepDone') : '';
    }
    for (const [step, panel] of panels) panel.hidden = step !== current;
    barMoney.replaceChildren(
      el('span', 'planner-bar-label', t('planner.total')),
      el('strong', '', formatMoney(total)),
      el('span', 'planner-bar-label', t('planner.money')),
      el('strong', state.money < total ? 'warn' : '', formatMoney(state.money)),
    );
    const count = plan.problems.length;
    barProblems.hidden = count === 0;
    barProblems.textContent = t(count === 1 ? 'planner.problemsOne' : 'planner.problemsOther', { count: formatNumber(count) });
    drawView();
  };

  return {
    root,
    render,
    setLogo(next) {
      logo = next;
      if (view && !root.hidden) view.show(state.design, state.vehicle, logo);
    },
    dispose() {
      view?.dispose();
      view = null;
    },
  };
}
