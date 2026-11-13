import { type DesignReview, type ReviewLine, designReview } from '../game/designReview';
import { MATURITY_STEPS, maturity } from '../game/maturity';
import type { SiteState } from '../game/siteState';
import { SOURCES } from '../game/sources';
import { OPTIONS, checkDesign } from '../game/spacecraft';
import type { BusId } from '../game/upgrades';
import { t } from '../strings';
import { formatDecimal, formatMoney, formatNumber } from './format';
import { learnMore } from './learnMore';

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  e.className = className;
  if (text) e.textContent = text;
  return e;
}

/** "22% spare", "10% short" or "Plenty spare". */
function spareText(margin: number): string {
  return !Number.isFinite(margin) && margin > 0
    ? t('review.plenty')
    : margin < 0
      ? t('review.short', { pct: formatNumber(Math.round(Math.min(-margin, 9.99) * 100)) })
      : t('review.spare', { pct: formatNumber(Math.round(Math.min(margin, 99.99) * 100)) });
}

/** The number behind one line of the Design Review. */
export function reviewLineText(line: ReviewLine, state: SiteState): string {
  const check = checkDesign(state, state.design);
  const { goal } = check;
  const vehicle = t(`launchVehicle.${goal.vehicle}`);
  const orbit = t(`orbit.${goal.orbit}`);
  switch (line.id) {
    case 'orbitMass': {
      const busFull = check.problems.find((p) => p.kind === 'busFull');
      if (busFull?.kind === 'busFull') {
        return t('review.orbitMassBus', { bus: t(`part.${busFull.bus as BusId}`), max: formatNumber(busFull.carriesKg), kg: formatDecimal(busFull.partsKg) });
      }
      if (line.need <= 0) return t('review.orbitMassCant', { vehicle, orbit });
      if (check.problems.some((p) => p.kind === 'needsEngine')) return t('review.orbitMassEngine', { orbit });
      return t('review.orbitMass', { kg: formatDecimal(line.have), vehicle, max: formatNumber(line.need), orbit });
    }
    case 'payload': {
      const picked = state.design.payload;
      if (!picked) return t('review.payloadNone');
      if (line.colour === 'red' && goal.payload) return t('review.payloadWrong', { payload: t(`payload.${goal.payload}`) });
      const kind = OPTIONS[picked].payload;
      return kind ? t('review.payload', { payload: t(`payload.${kind}`) }) : t('review.payloadAny');
    }
    case 'power':
      return t('gauge.power', { have: formatNumber(line.have), need: formatNumber(line.need) });
    case 'data':
      return line.colour === 'green'
        ? t('gauge.dataLong', { need: formatNumber(line.need) })
        : t('gauge.data', { days: formatNumber(Math.floor(line.have)), need: formatNumber(line.need) });
    case 'communications':
      return t('gauge.communications', { send: formatNumber(line.have), make: formatNumber(line.need) });
    case 'time':
      return t('gauge.time', { days: formatNumber(line.have), left: formatNumber(line.need) });
    case 'budget':
      return t('review.budget', { cost: formatMoney(line.have), money: formatMoney(line.need) });
    case 'spareMass':
      return t('review.spareMass', { spare: spareText(line.margin!), lift: formatDecimal(line.have), kg: formatDecimal(line.need) });
    case 'sparePower':
      if (!line.applies) return t('review.sparePowerNone');
      return t('review.sparePower', { spare: spareText(line.margin!), sun: formatDecimal(line.have), use: formatDecimal(line.need) });
    case 'spareEnergy':
      return t('review.spareEnergy', { spare: spareText(line.margin!), have: formatNumber(line.have), need: formatNumber(line.need) });
  }
}

/** "8 of 10 green (80%) · Passed". */
export function reviewSummary(review: DesignReview): string {
  const summary = t('review.summary', {
    green: formatNumber(review.green),
    counted: formatNumber(review.counted),
    pct: formatNumber(Math.floor(review.share * 100 + 1e-9)),
  });
  return `${summary} · ${t(review.passed ? 'review.passed' : 'review.notPassed')}`;
}

/**
 * The Design Review in the Launch planner: a summary that opens into one line per requirement and margin,
 * each with its colour, its colour's name and the number behind it.
 */
export function makeDesignReview(): { root: HTMLElement; render(state: SiteState): DesignReview } {
  const root = el('details', 'review');
  root.dataset.tutorial = 'design-review';
  const summary = el('summary', 'review-summary');
  const title = el('span', 'review-title', t('review.heading'));
  const score = el('span', 'review-score');
  summary.append(title, score);
  const intro = el('p', 'planner-hint', t('review.intro'));
  const list = el('ul', 'review-lines');
  const note = el('p', 'planner-hint', t('review.shipAnyway'));
  root.append(summary, intro, list, note, learnMore(SOURCES.cml, t('sources.cml')));

  const render = (state: SiteState) => {
    const review = designReview(state, state.design);
    root.dataset.passed = String(review.passed);
    score.textContent = reviewSummary(review);
    note.hidden = review.passed;
    list.replaceChildren(
      ...review.lines.map((line) => {
        const item = el('li', 'review-line');
        item.dataset.line = line.id;
        item.dataset.colour = line.applies ? line.colour : 'none';
        item.append(
          el('span', 'review-dot'),
          el('span', 'review-name', t(`review.line.${line.id}`)),
          el('span', 'review-colour', t(line.applies ? `review.colour.${line.colour}` : 'review.colour.none')),
          el('span', 'review-text', reviewLineText(line, state)),
        );
        return item;
      }),
    );
    return review;
  };
  return { root, render };
}

/** The maturity strip at the top of the Mission Designer: JPL's first four Concept Maturity Levels. */
export function makeMaturityStrip(): { root: HTMLElement; render(state: SiteState): void } {
  const root = el('nav', 'maturity');
  root.setAttribute('aria-label', t('maturity.label'));
  const list = el('ol', 'maturity-steps');
  const steps = MATURITY_STEPS.map((step, i) => {
    const item = el('li', 'maturity-step');
    item.dataset.step = step;
    const state = el('span', 'maturity-state');
    item.append(
      el('span', 'maturity-name', t('maturity.step', { n: i + 1, name: t(`maturity.${step}`) })),
      el('span', 'maturity-hint', t(`maturity.${step}.hint`)),
      state,
    );
    list.append(item);
    return { step, item, state };
  });
  root.append(el('span', 'maturity-label', t('maturity.label')), list, learnMore(SOURCES.cml, t('sources.cml')));

  const render = (state: SiteState) => {
    const { reached, current } = maturity(state);
    for (const { step, item, state: label } of steps) {
      item.dataset.reached = String(reached[step]);
      label.textContent = t(reached[step] ? 'maturity.reached' : 'maturity.notYet');
      if (step === current) item.setAttribute('aria-current', 'step');
      else item.removeAttribute('aria-current');
    }
  };
  return { root, render };
}
