import { type DesignReview, type ReviewLine, designReview } from '../game/designReview';
import { MATURITY_STEPS, maturity } from '../game/maturity';
import type { SiteState } from '../game/siteState';
import { SOURCES } from '../game/sources';
import { OPTIONS, checkDesign } from '../game/spacecraft';
import type { BusId } from '../game/upgrades';
import { t } from '../strings';
import { formatDecimal, formatMoney, formatNumber } from './format';
import { learnMore } from './learnMore';
import { sourcedTip } from './sourcedTip';
import { LINE_ROLE, ROLE_IDS, type RoleId, canSign, isSigned, mayChange, roleHolder, sign, waitingFor } from '../game/team';
import { TEAM_COLOUR_CSS, notYoursText, ownerText } from './teamBar';

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
export function makeDesignReview(onSign: () => void = () => {}): { root: HTMLElement; render(state: SiteState): DesignReview } {
  const root = el('details', 'review');
  root.dataset.tutorial = 'design-review';
  const summary = el('summary', 'review-summary');
  const title = el('span', 'review-title', t('review.heading'));
  const score = el('span', 'review-score');
  summary.append(title, score);
  const intro = el('p', 'planner-hint', t('review.intro'));
  const list = el('ul', 'review-lines');
  const note = el('p', 'planner-hint', t('review.shipAnyway'));
  // Team Mode (ticket 41): the lines sit under the role that signs them.
  const teamHint = el('p', 'planner-hint', t('team.signHint'));
  const waiting = el('p', 'review-waiting');
  waiting.setAttribute('aria-live', 'polite');
  root.append(summary, intro, teamHint, list, waiting, sourcedTip('limits'), note, learnMore(SOURCES.cml, t('sources.cml')));
  let teamWasOn = false;

  const render = (state: SiteState) => {
    const review = designReview(state, state.design);
    root.dataset.passed = String(review.passed);
    score.textContent = reviewSummary(review);
    note.hidden = review.passed;
    const lineItem = (line: ReviewLine) => {
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
    };
    const team = state.team;
    teamHint.hidden = waiting.hidden = !team;
    // With a team the review opens by itself the first time: it is where everyone signs.
    if (team && !teamWasOn) root.open = true;
    teamWasOn = !!team;
    if (!team) {
      list.replaceChildren(...review.lines.map(lineItem));
      return review;
    }
    const focused = (document.activeElement as HTMLElement | null)?.dataset.sign;
    const roleHead = (role: RoleId) => {
      const players = team.players;
      const signed = isSigned(state, role, review);
      const item = el('li', 'review-role');
      item.dataset.role = role;
      item.dataset.signed = String(signed);
      item.style.setProperty('--team-colour', TEAM_COLOUR_CSS[players[roleHolder(players.length, role)]!.colour]);
      const b = el('button', 'small review-sign', t(signed ? 'team.signed' : 'team.sign'));
      b.type = 'button';
      b.dataset.sign = role;
      b.setAttribute('aria-label', t(signed ? 'team.signed' : 'team.signName', { role: t(`team.role.${role}`) }));
      const mine = mayChange(state, role);
      const ready = canSign(state, role);
      b.disabled = signed || !mine || !ready;
      b.addEventListener('click', () => {
        if (sign(state, role)) onSign();
      });
      const why = signed ? '' : !mine ? notYoursText(players, role) : !ready ? t('team.signFill') : '';
      item.append(
        el('span', 'team-dot'),
        el('span', 'review-role-name', ownerText(players, role)),
        el('span', 'review-role-state', t(signed ? 'team.signed' : 'team.notSigned')),
        b,
        el('span', 'review-role-why', why),
      );
      return item;
    };
    list.replaceChildren(
      ...ROLE_IDS.flatMap((role) => [roleHead(role), ...review.lines.filter((l) => LINE_ROLE[l.id] === role).map(lineItem)]),
    );
    // Signing redraws the list: keep the keyboard where it was.
    if (focused) {
      const again = list.querySelector<HTMLButtonElement>(`[data-sign="${focused}"]`);
      (again && !again.disabled ? again : (list.querySelector<HTMLButtonElement>('[data-sign]:not(:disabled)') ?? summary)).focus();
    }
    const left = waitingFor(state, review);
    waiting.dataset.waiting = String(left.length > 0);
    waiting.textContent =
      left.length > 0 ? t('team.waiting', { roles: left.map((r) => t(`team.role.${r}`)).join(t('team.list')) }) : t('team.allSigned');
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
