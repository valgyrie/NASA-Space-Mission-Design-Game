import {
  LAUNCH_SITE_IDS,
  LAUNCH_SITES,
  LAUNCH_VEHICLE_IDS,
  LAUNCH_VEHICLES,
  type LaunchSiteId,
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

/** The planner's steps, one page each, in order: begin with the end in mind, the Launch last. */
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

/** Which step each problem belongs to, so the pager can flag it. */
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

const SVG = 'http://www.w3.org/2000/svg';
function svg<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>): SVGElementTagNameMap[K] {
  const e = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  return e;
}

/** A small padlock for closed tiles. */
function lockIcon(): SVGSVGElement {
  const icon = svg('svg', { viewBox: '0 0 16 16', class: 'planner-tile-lock', 'aria-hidden': 'true' });
  icon.append(
    svg('path', { d: 'M5 7V5a3 3 0 0 1 6 0v2', fill: 'none', stroke: 'currentColor', 'stroke-width': 1.6 }),
    svg('rect', { x: 3, y: 7, width: 10, height: 7, rx: 1.5, fill: 'currentColor' }),
  );
  return icon;
}

/** A Launch Site's tile picture: a globe with the equator and the site's latitude marked. */
function sitePicture(id: LaunchSiteId): SVGSVGElement {
  const lat = LAUNCH_SITES[id].lat;
  const r = 30;
  const picture = svg('svg', { viewBox: '-50 -50 100 100', class: 'planner-tile-globe', 'aria-hidden': 'true' });
  const tilt = 0.28;
  const y = -Math.sin((lat * Math.PI) / 180) * r;
  const ring = Math.cos((lat * Math.PI) / 180) * r;
  picture.append(
    svg('circle', { cx: 0, cy: 0, r, class: 'globe-disc' }),
    svg('ellipse', { cx: 0, cy: 0, rx: r, ry: r * tilt, class: 'globe-equator' }),
    svg('ellipse', { cx: 0, cy: y, rx: ring, ry: ring * tilt, class: 'globe-latitude' }),
    svg('circle', { cx: 0, cy: y + ring * tilt, r: 4.5, class: 'globe-dot' }),
  );
  const label = svg('text', { x: 0, y: y + ring * tilt - 8, class: 'globe-label', 'text-anchor': 'middle' });
  label.textContent = t('planner.siteLat', { lat: formatNumber(Math.round(lat)) });
  picture.append(label);
  return picture;
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
 * The Launch planner, shown inside the Mission Designer, laid out like a showcase: the chosen Launch Vehicle with the
 * Spacecraft stands on its pad in 3D behind everything, the step's name big at the top. One step at a time under
 * NASA's four Segments: who gets the Data and when (User), the Spacecraft and its Ground Tests (Space), the dishes
 * that talk to it (Ground), then the Launch: Launch Vehicle and Launch Site (big name, key numbers, a row of tiles),
 * Costs with Launch Insurance, timeline and weather, and the Design Review. A pager under the middle moves between
 * steps; the running costs sit bottom-left, Test Run and Ship bottom-right, always in view. The Seed prices the
 * insurance from the same Test Run.
 */
export function makeLaunchPlanner(
  state: SiteState,
  seed: string,
  hooks: { onBack(): void; onShip(): void; onTestRun(vehicle: LaunchVehicleId): void; onVehicle(): void },
): LaunchPlanner {
  const root = el('div', 'planner planner-show');
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

  // ---- Launch Vehicle: the chosen one's name and numbers, then a tile for each ----
  const vehicleName = el('h3', 'planner-show-name');
  const vehicleStats = el('p', 'planner-show-stats');
  const vehicleFit = el('p', 'planner-show-fit');
  const firstLaunch = el('p', 'planner-hint planner-show-note', t('planner.firstLaunch'));
  const vehicleTiles = el('div', 'planner-tiles');
  const vehicleTexts = new Map<LaunchVehicleId, { lifts: string; price: string; record: string; fits: boolean; reach: boolean; open: boolean; closed: string }>();
  const vehicleButtons = new Map<
    LaunchVehicleId,
    { button: HTMLButtonElement; img: HTMLImageElement; tag: HTMLElement; tip: HTMLElement }
  >();
  const vehicleLinks: HTMLElement[] = [];
  for (const id of LAUNCH_VEHICLE_IDS) {
    const b = button('planner-tile planner-vehicle', '');
    b.dataset.vehicle = id;
    b.setAttribute('aria-label', t(`launchVehicle.${id}`));
    const img = el('img', 'planner-tile-picture');
    img.alt = '';
    const tag = el('span', 'planner-tile-tag');
    const tip = el('span', 'planner-tile-tip');
    b.append(
      img,
      el('span', 'planner-tile-name', t(`launchVehicle.${id}`)),
      el('span', 'planner-tile-mark', t('planner.stepDone')),
      lockIcon(),
      tag,
      tip,
    );
    b.addEventListener('click', () => {
      if (!isVehicleOpen(state, id) || !mayChange(state, 'lead')) return;
      state.vehicle = id;
      hooks.onVehicle();
      render();
    });
    vehicleTiles.append(b);
    vehicleLinks.push(learnMore(VEHICLE_SOURCES[id], t(`launchVehicle.${id}`)));
    vehicleButtons.set(id, { button: b, img, tag, tip });
  }
  // How a geostationary orbit is reached, shown when the Contract asks for one.
  const geoNote = el('p', 'planner-hint', t('planner.geoNote'));
  const geoPath = transferPicture();
  const geoFold = fold(t('fold.howItWorks'), geoPath, learnMore(SOURCES.orbits, t('sources.orbits')));
  const vehicleExtras = el('div', 'planner-head-extras');
  vehicleExtras.append(geoNote, geoFold, fold(t('fold.sources'), ...vehicleLinks));
  const vehicleShow = el('div', 'planner-showcase');
  vehicleShow.append(vehicleName, vehicleStats, vehicleFit, firstLaunch, el('hr', 'planner-show-rule'), vehicleTiles);

  // ---- Launch Site. Teach why the equator helps: one line of advice, the reasons behind an arrow. ----
  const spinRow = (id: LaunchSiteId) => t('planner.equatorSite', {
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
  const siteName = el('h3', 'planner-show-name');
  const siteStats = el('p', 'planner-show-stats');
  const siteBadge = el('span', 'planner-best', t('planner.siteBest'));
  const siteNote = el('p', 'planner-hint planner-show-note', t('planner.siteAlternate'));
  const siteTiles = el('div', 'planner-tiles');
  const siteTexts = new Map<LaunchSiteId, { lift: string; shipping: string }>();
  const siteButtons = new Map<LaunchSiteId, HTMLButtonElement>();
  const siteLinks: HTMLElement[] = [];
  for (const id of LAUNCH_SITE_IDS) {
    const route = shippingTo(state.place, id);
    const b = button('planner-tile planner-site', '');
    b.dataset.site = id;
    b.setAttribute('aria-label', t(`launchSite.${id}`));
    const change = Math.round((liftFactor(id) - 1) * 100);
    siteTexts.set(id, {
      lift: change === 0 ? t('planner.siteLiftSame') : t(change > 0 ? 'planner.siteLiftMore' : 'planner.siteLiftLess', { pct: Math.abs(change) }),
      shipping: t('planner.shipping', { price: formatMoney(route.cost), days: formatNumber(route.days), km: formatNumber(route.km) }),
    });
    b.append(sitePicture(id), el('span', 'planner-tile-name', t(`launchSite.${id}.short`)), el('span', 'planner-tile-mark', t('planner.stepDone')));
    if (id === best) {
      const tag = el('span', 'planner-tile-tag planner-tile-best', t('planner.siteBestShort'));
      tag.title = t('planner.siteBest');
      b.append(tag);
    }
    b.addEventListener('click', () => {
      if (!mayChange(state, 'lead')) return;
      state.launchSite = id;
      hooks.onVehicle();
      render();
    });
    siteTiles.append(b);
    siteLinks.push(learnMore(SITE_SOURCES[id], t(`launchSite.${id}.short`)));
    siteButtons.set(id, b);
  }
  const siteExtras = el('div', 'planner-head-extras');
  siteExtras.append(tip, fold(t('fold.sources'), ...siteLinks));
  const siteShow = el('div', 'planner-showcase');
  const siteNameRow = el('div', 'planner-show-namerow');
  siteNameRow.append(siteName, siteBadge);
  siteShow.append(siteNameRow, siteStats, siteNote, el('hr', 'planner-show-rule'), siteTiles);

  // ---- Costs: the rows sit in the running totals bottom-left; this page has the insurance, timeline and weather ----
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
  const insureCard = el('section', 'planner-card');
  insureCard.append(insureLabel, insureLine, lighter, wholeNote);
  const timeRows = el('dl', 'planner-rows');
  const weatherLine = el('p', 'planner-weather');
  const adviceLine = el('p', 'planner-advice');
  const timeCard = el('section', 'planner-card');
  timeCard.append(
    el('h4', '', t('planner.timeline')),
    timeRows,
    el('h4', '', t('planner.weather')),
    weatherLine,
    adviceLine,
    fold(t('fold.howItWorks'), t('planner.weatherHint'), learnMore(SOURCES.climate, t('sources.climate')), t('sources.estimates')),
  );

  // ---- User segment: who gets the Data, where it goes, and when the Mission ends ----
  const user = el('section', 'planner-card');
  const userRows = el('dl', 'planner-rows');
  const labsHint = el('p', 'planner-hint', t('planner.labsHint'));
  user.append(userRows, labsHint);
  const intro = fold(t('segment.introShort'), t('segment.intro'), learnMore(SOURCES.segments, t('sources.segments')));
  intro.classList.add('planner-intro');
  const userExtras = el('div', 'planner-head-extras');
  userExtras.append(intro);

  // ---- Space segment: the Spacecraft itself, and its Ground Tests ----
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

  // ---- Ground segment: which dishes talk to it, and whether the Data fits through them ----
  const ground = el('section', 'planner-card');
  const groundRows = el('dl', 'planner-rows');
  const groundHint = el('p', 'planner-hint');
  ground.append(groundRows, groundHint);

  // ---- The Design Review and the problems that stop shipping ----
  const review = makeDesignReview(() => {
    hooks.onVehicle();
    render();
  });
  const problems = el('ul', 'planner-problems');
  problems.setAttribute('aria-live', 'polite');
  const reviewCard = el('section', 'planner-card planner-review-card');
  reviewCard.append(review.root, problems);

  // ---- The pages ----
  const cards = (...list: HTMLElement[]) => {
    const box = el('div', 'planner-cards');
    box.append(...list);
    return box;
  };
  const centres: Record<PlannerStep, HTMLElement> = {
    user: cards(user),
    space: cards(spacecraft, tests),
    ground: cards(ground),
    vehicle: vehicleShow,
    site: siteShow,
    costs: cards(insureCard, timeCard),
    review: cards(reviewCard),
  };
  const extras: Partial<Record<PlannerStep, HTMLElement>> = { user: userExtras, vehicle: vehicleExtras, site: siteExtras };
  const segmentOf: Record<PlannerStep, MissionSegment> = {
    user: 'user',
    space: 'space',
    ground: 'ground',
    vehicle: 'launch',
    site: 'launch',
    costs: 'launch',
    review: 'launch',
  };
  const hintOf: Record<PlannerStep, string> = {
    user: t('segment.user.hint'),
    space: t('segment.space.hint'),
    ground: t('segment.ground.hint'),
    vehicle: t('planner.vehicleHint'),
    site: t('planner.siteHint'),
    costs: t('planner.costsHint'),
    review: t('planner.reviewHint'),
  };

  // The title at the top: the step's name big, its Segment and one line small under it, then its folds.
  const head = el('header', 'planner-head');
  const headMain = el('div', 'planner-head-main');
  const headTitle = el('h2', 'planner-head-title');
  const headChip = el('span', 'planner-head-chip');
  headChip.append(chip('lead'));
  const headSegment = el('span', 'planner-head-segment');
  const headHint = el('span', 'planner-head-hint');
  const headSub = el('p', 'planner-head-sub');
  headSub.append(headSegment, headHint);
  headMain.append(headTitle, headSub, headChip);
  head.append(headMain, ...Object.values(extras));

  let current: PlannerStep = 'user';
  const visited = new Set<PlannerStep>([current]);
  const centre = el('div', 'planner-centre');
  for (const [step, page] of Object.entries(centres)) {
    page.dataset.step = step;
    page.classList.add('planner-page');
    centre.append(page);
  }
  // The pager: ‹ 4 / 7 · Launch Vehicle ›, with a dot per step (ticked when seen and fine, marked on a problem).
  const pager = el('nav', 'planner-pager');
  pager.setAttribute('aria-label', t('planner.stepsLabel'));
  const prev = button('planner-pager-arrow', t('planner.pagerPrev'));
  const next = button('planner-pager-arrow', t('planner.pagerNext'));
  const pagerText = el('span', 'planner-pager-text');
  const pagerCount = el('span', 'planner-pager-count');
  const pagerName = el('span', 'planner-pager-name');
  pagerText.append(pagerCount, pagerName);
  const dots = el('div', 'planner-dots');
  const dotButtons = new Map<PlannerStep, HTMLButtonElement>();
  for (const step of PLANNER_STEPS) {
    const d = button('planner-dot', '');
    d.dataset.step = step;
    d.setAttribute('aria-label', t(`planner.step.${step}`));
    d.title = t(`planner.step.${step}`);
    d.addEventListener('click', () => go(step));
    dots.append(d);
    dotButtons.set(step, d);
  }
  const pagerRow = el('div', 'planner-pager-row');
  pagerRow.append(prev, pagerText, next);
  pager.append(pagerRow, dots);
  prev.addEventListener('click', () => {
    const i = PLANNER_STEPS.indexOf(current);
    if (i > 0) go(PLANNER_STEPS[i - 1]!);
  });
  next.addEventListener('click', () => {
    const i = PLANNER_STEPS.indexOf(current);
    if (i < PLANNER_STEPS.length - 1) go(PLANNER_STEPS[i + 1]!);
  });
  centre.append(pager);
  const go = (step: PlannerStep) => {
    current = step;
    visited.add(step);
    // The Design Review opens when its step is reached.
    if (step === 'review' && review.root instanceof HTMLDetailsElement) review.root.open = true;
    render();
  };

  // ---- Bottom-left: the running costs, total against the money, and the problems ----
  const totals = el('aside', 'planner-totals');
  const totalsProblems = button('small planner-bar-problems', '');
  totalsProblems.addEventListener('click', () => go('review'));
  totals.append(el('h4', '', t('planner.costs')), costRows, totalsProblems);

  // ---- Bottom-right: Test Run, and Ship as the big button ----
  const actions = el('div', 'planner-actions');
  const testRun = button('planner-testrun', t('planner.testRun'));
  testRun.title = t('planner.testRunName');
  testRun.addEventListener('click', () => hooks.onTestRun(state.vehicle));
  const ship = button('planner-ship', '');
  ship.dataset.tutorial = 'planner-ship';
  testRun.dataset.tutorial = 'planner-testrun';
  actions.append(testRun, ship);

  const bottom = el('div', 'planner-bottom');
  bottom.append(totals, centre, actions);

  // ---- The 3D view behind everything, built the first time the planner is shown ----
  const stage = el('div', 'planner-stage');
  const shade = el('div', 'planner-shade');
  const dragHint = el('p', 'planner-stage-hint', t('designer.dragHint'));
  let view: PlannerView | null = null;
  let viewFailed = false;
  let logo: CompanyLogo = DEFAULT_LOGO;
  /** Tell the view how much of it the title and the bottom row cover, so the rocket stands in the space between. */
  const measure = () => {
    if (!view || root.hidden) return;
    const box = root.getBoundingClientRect();
    const top = head.getBoundingClientRect().bottom - box.top + 6;
    const below = box.bottom - centre.getBoundingClientRect().top + 10;
    view.setSafeArea(top, below);
    // The low tutorial guide sits above the buttons it points at.
    document.body.style.setProperty('--planner-actions', `${Math.round(window.innerHeight - actions.getBoundingClientRect().top)}px`);
  };
  new ResizeObserver(measure).observe(root);
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
    measure();
    view.frame(STEP_SHOT[current]);
    view.start();
    // The Launch Vehicle tiles' pictures, made by the view once and kept.
    const designKey = `${JSON.stringify(state.design)}|${JSON.stringify(logo)}`;
    for (const [id, ui] of vehicleButtons) {
      const key = `${id}|${designKey}`;
      if (ui.img.dataset.key === key) continue;
      ui.img.dataset.key = key;
      void view.vehicleThumbnail(id, state.design, logo).then((url) => {
        if (ui.img.dataset.key === key && url) ui.img.src = url;
      });
    }
  };

  root.append(stage, shade, head, back, dragHint, bottom);

  const row = (rows: HTMLElement, label: string, value: string, className = '') => {
    const dt = el('dt', className, label);
    const dd = el('dd', className, value);
    rows.append(dt, dd);
  };
  const stats = (box: HTMLElement, ...parts: string[]) => box.replaceChildren(...parts.filter(Boolean).map((p) => el('span', '', p)));

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

    // Launch Site tiles and the chosen site's name and numbers
    for (const [id, b] of siteButtons) {
      b.setAttribute('aria-pressed', String(id === site));
      b.disabled = !lead;
    }
    const siteText = siteTexts.get(site)!;
    siteName.textContent = t(`launchSite.${site}.short`);
    siteBadge.hidden = site !== best;
    siteNote.hidden = !LAUNCH_SITES[site].alternate;
    stats(siteStats, siteText.lift, siteText.shipping);

    // Launch Vehicle tiles and the chosen vehicle's name and numbers
    const orbit = plan.goal.orbit;
    const whole = !!plan.goal.contract.wholeLaunch;
    geoNote.hidden = geoFold.hidden = orbit !== 'geostationary';
    for (const [id, ui] of vehicleButtons) {
      const status = vehicleStatus(state, id);
      const open = status.open;
      const lift = liftFrom(id, orbit, site);
      const v = LAUNCH_VEHICLES[id];
      const texts = {
        lifts:
          lift <= 0
            ? t('planner.cantReach', { orbit: t(`orbit.${orbit}`) })
            : orbit === 'geostationary'
              ? t('planner.liftsTransfer', { kg: formatDecimal(lift) })
              : t('planner.lifts', { kg: formatDecimal(lift), orbit: t(`orbit.${orbit}`) }),
        price:
          whole && v.launchPrice !== undefined
            ? t('planner.wholePrice', { price: formatMoney(v.launchPrice) })
            : t('planner.perKg', { price: formatMoney(v.perKg) }),
        record: v.record
          ? t('planner.reliability', {
              pct: formatNumber(Math.round(v.reliability * 100)),
              worked: formatNumber(v.record.worked),
              flights: formatNumber(v.record.flights),
            })
          : t('planner.reliabilityEstimate', { pct: formatNumber(Math.round(v.reliability * 100)) }),
        fits: plan.massKg <= lift + 1e-9,
        reach: lift > 0,
        open,
        closed: closedText(status),
      };
      vehicleTexts.set(id, texts);
      // Closed tiles stay focusable, so their reason can be read; choosing them does nothing.
      ui.button.disabled = open && !lead;
      ui.button.setAttribute('aria-disabled', String(!open || !lead));
      ui.button.dataset.locked = String(!open);
      ui.button.setAttribute('aria-pressed', String(id === vehicle));
      ui.tip.textContent = open ? t('planner.tileTip', { lifts: texts.lifts, price: texts.price }) : texts.closed;
      ui.tag.hidden = !open || (texts.reach && texts.fits);
      ui.tag.textContent = texts.reach ? t('planner.tooHeavyTag') : t('planner.cantReachTag');
    }
    const chosen = vehicleTexts.get(vehicle)!;
    vehicleName.textContent = t(`launchVehicle.${vehicle}`);
    stats(vehicleStats, chosen.lifts, chosen.price, chosen.record);
    vehicleFit.hidden = !chosen.reach && chosen.open;
    vehicleFit.textContent = chosen.open
      ? t(chosen.fits ? 'planner.fits' : 'planner.tooHeavyShort', { kg: formatDecimal(plan.massKg) })
      : chosen.closed;
    vehicleFit.classList.toggle('warn', !chosen.fits || !chosen.open);

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
    const count = plan.problems.length;
    totalsProblems.hidden = count === 0;
    totalsProblems.textContent = t(count === 1 ? 'planner.problemsOne' : 'planner.problemsOther', { count: formatNumber(count) });

    // The page: title, folds, middle and pager.
    root.dataset.step = current;
    headTitle.textContent = t(`planner.step.${current}`);
    headSegment.textContent = t(`segment.${segmentOf[current]}`);
    headHint.textContent = hintOf[current];
    headChip.hidden = current !== 'vehicle' && current !== 'site';
    for (const [step, box] of Object.entries(extras)) box.hidden = step !== current;
    for (const [step, page] of Object.entries(centres)) page.hidden = step !== current;
    const index = PLANNER_STEPS.indexOf(current);
    pagerCount.textContent = t('planner.pager', { n: formatNumber(index + 1), total: formatNumber(PLANNER_STEPS.length) });
    pagerName.textContent = t(`planner.step.${current}`);
    prev.disabled = index === 0;
    next.disabled = index === PLANNER_STEPS.length - 1;
    prev.setAttribute('aria-label', index > 0 ? t(`planner.step.${PLANNER_STEPS[index - 1]!}`) : t('planner.stepBack'));
    next.setAttribute(
      'aria-label',
      index < PLANNER_STEPS.length - 1 ? t('planner.stepNext', { step: t(`planner.step.${PLANNER_STEPS[index + 1]!}`) }) : t('planner.stepBack'),
    );
    const flagged = new Set(plan.problems.map(problemStep));
    for (const [step, d] of dotButtons) {
      if (step === current) d.setAttribute('aria-current', 'step');
      else d.removeAttribute('aria-current');
      d.dataset.mark = flagged.has(step) ? 'problem' : visited.has(step) ? 'done' : 'todo';
    }
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
