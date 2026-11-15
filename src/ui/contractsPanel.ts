import {
  type AcceptedContract,
  type Contract,
  type ContractId,
  type Requirement,
  CHOICE_MILESTONES,
  type ChoiceMilestoneId,
  acceptContract,
  accepted,
  availableContracts,
  choiceOf,
  contractById,
  milestoneDone,
  rewardFor,
  daysLeft,
  deadlineDay,
  offerDaysLeft,
  questionOffers,
} from '../game/contracts';
import { eraAfter, eraOf, milestonesDone } from '../game/eras';
import { type SiteState, canContinueFreePlay, continueFreePlay } from '../game/siteState';
import { upgradeDaysLeft } from '../game/upgrades';
import { t } from '../strings';
import { contractText, eraName, formatDays, formatGameDate, formatMoney, formatNumber } from './format';
import { missionLinks } from './learnMore';

export interface ContractsPanel {
  toggle(): void;
  close(): void;
  readonly isOpen: boolean;
  /** Refresh days left. Cheap enough to call every frame. */
  update(): void;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  e.className = className;
  if (text) e.textContent = text;
  return e;
}

function setText(e: HTMLElement, text: string): void {
  if (e.textContent !== text) e.textContent = text;
}

/** "Reach Low Earth Orbit", "Carry a radiation detector", "Send Data for 30 days" */
export function requirementText(r: Requirement): string {
  switch (r.kind) {
    case 'orbit':
      return t('requirement.orbit', { orbit: t(`orbit.${r.orbit}`) });
    case 'payload':
      return t('requirement.payload', { payload: t(`payload.${r.payload}`) });
    case 'dataDays':
      return t('requirement.dataDays', { days: r.days });
  }
}

/** "12 Mar 1959 · 340 days left", or that the deadline has passed. */
export function deadlineText(state: SiteState, c: AcceptedContract): string {
  const left = daysLeft(state, c);
  const date = formatGameDate(deadlineDay(c));
  return left > 0 ? t('contracts.due', { date, days: formatNumber(left) }) : t('contracts.overdue', { date });
}

/** The Contracts board: Contracts on offer and the ones the Company has accepted. `onAccept` runs after accepting. */
export function showContractsPanel(root: HTMLElement, state: SiteState, onAccept: (id: ContractId) => void, onContinue: () => void): ContractsPanel {
  const panel = el('div', 'panel side-panel contracts');
  panel.hidden = true;
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-labelledby', 'contracts-heading');

  const head = el('div', 'side-head');
  const heading = el('h2', '', t('contracts.heading'));
  heading.id = 'contracts-heading';
  const close = el('button', 'small icon-button', t('panel.close'));
  close.type = 'button';
  close.title = t('panel.closeName');
  close.setAttribute('aria-label', t('panel.closeName'));
  head.append(heading, close);
  const body = el('div', 'side-body');
  const problem = el('p', 'side-problem');
  problem.setAttribute('aria-live', 'polite');
  panel.append(head, body, problem);
  root.append(panel);

  /** Deadline lines of active Contracts, refreshed as the Game date moves. */
  let dueLines: { line: HTMLElement; contract: AcceptedContract }[] = [];
  /** Mission Director: days left on each offer, refreshed the same way. */
  let offerLines: { line: HTMLElement; id: ContractId }[] = [];
  const boardKey = () => `${state.contracts.map((c) => c.id).join()}|${availableContracts(state).map((c) => c.id).join()}`;

  const field = (label: string, value: HTMLElement | string) => {
    const row = el('div', 'contract-field');
    row.append(el('span', 'contract-label', label));
    row.append(typeof value === 'string' ? el('span', '', value) : value);
    return row;
  };

  const card = (contract: Contract) => {
    const taken = accepted(state, contract.id);
    const box = el('article', 'contract-card');
    const title = el('div', 'contract-title');
    title.append(el('h4', '', contractText(contract.id)));
    if (contract.kind === 'milestone') title.append(el('span', 'tag', t('contracts.milestone')));
    const requirements = el('ul', 'contract-requirements');
    for (const r of contract.requirements) requirements.append(el('li', '', requirementText(r)));
    const deadline = el('span', '');
    if (taken) dueLines.push({ line: deadline, contract: taken });
    else deadline.textContent = t('contracts.deadlineAfter', { days: formatNumber(contract.deadlineDays) });
    box.append(title);
    if (contract.question) box.append(field(t('contracts.question'), t(`question.${contract.question}.text`)));
    // A Choice Milestone's Contract says in one line why NASA needs it.
    const group = choiceOf(contract.id);
    if (group) box.append(field(t('contracts.why'), t(`contract.${contract.id as (typeof CHOICE_MILESTONES)[ChoiceMilestoneId][number]}.why`)));
    const reward = rewardFor(state, contract.id);
    const rewardLine = reward !== contract.reward ? t('contracts.extraReward', { money: formatMoney(reward) }) : formatMoney(reward);
    box.append(
      // Generated Contracts say who needs the Data and why; Milestones name their real client.
      contract.kind === 'generated'
        ? field(t('contracts.need'), contractText(contract.id, 'need'))
        : field(t('contracts.client'), contractText(contract.id, 'client')),
      field(t('contracts.objective'), contractText(contract.id, 'objective')),
      field(t('contracts.requirements'), requirements),
      field(
        t('contracts.reward'),
        contract.plot ? t('contracts.rewardPlot', { money: formatMoney(contract.reward) }) : rewardLine,
      ),
      field(t('contracts.deadline'), deadline),
    );
    if (contract.question) box.append(field(t('contracts.orbitWhy'), t(`question.${contract.question}.orbit`)));
    box.append(missionLinks(contract.id));
    if (contract.wholeLaunch) box.append(el('p', 'side-note', t('contracts.wholeLaunch')));
    if (contract.ride) {
      box.append(el('p', 'side-note', t('contracts.ride', {
        vehicle: t(`launchVehicle.${contract.ride.vehicle}`),
        site: t(`launchSite.${contract.ride.site}.short`),
        kg: formatNumber(contract.ride.maxKg),
      })));
    }
    // A Milestone whose deadline passed is back: say so, so the player knows they can try again.
    if (!taken && state.reopened.includes(contract.id)) box.append(el('p', 'side-note', t('contracts.reopened')));
    // Mission Director: an offer nobody accepts goes away; show the days left.
    if (!taken && offerDaysLeft(state, contract.id) !== null) {
      const line = el('p', 'side-note offer-left');
      offerLines.push({ line, id: contract.id });
      box.append(line);
    }
    if (!taken) {
      const accept = el('button', 'small accept', t('contracts.accept'));
      accept.type = 'button';
      accept.dataset.tutorial = `accept-${contract.id}`;
      accept.addEventListener('click', () => {
        const result = acceptContract(state, contract.id);
        setText(problem, result.ok ? '' : t(`contracts.problem.${result.problem}`));
        render();
        if (result.ok) onAccept(contract.id);
      });
      box.append(accept);
    }
    return box;
  };

  /** Free Play's "Choose a question" card: picking a question takes on its Contract. */
  const questionCard = () => {
    const box = el('article', 'contract-card question-card');
    const title = el('div', 'contract-title');
    title.append(el('h4', '', t('contracts.question.heading')));
    box.append(title, el('p', 'side-note', t('contracts.question.intro')));
    const offers = questionOffers(state);
    if (offers.length === 0) {
      box.append(el('p', 'side-note', t('contracts.question.busy')));
      return box;
    }
    const list = el('div', 'question-list');
    for (const id of offers) {
      const pick = el('button', 'small question', t(`question.${contractById(id).question!}.text`));
      pick.type = 'button';
      pick.dataset.question = contractById(id).question;
      pick.addEventListener('click', () => {
        const result = acceptContract(state, id);
        setText(problem, result.ok ? '' : t(`contracts.problem.${result.problem}`));
        render();
        if (result.ok) onAccept(id);
      });
      list.append(pick);
    }
    box.append(list);
    return box;
  };

  const render = () => {
    shownTaken = boardKey();
    dueLines = [];
    offerLines = [];
    body.replaceChildren();
    if (state.contracts.length > 0) {
      body.append(el('h3', '', t('contracts.active')));
      for (const c of state.contracts) body.append(card(contractById(c.id)));
    }
    body.append(el('h3', '', t('contracts.available')));
    if (state.playMode === 'freePlay') body.append(el('p', 'side-note', t('freePlay.boardNote')));
    const open = availableContracts(state);
    if (open.length === 0 && state.contracts.length === 0) body.append(eraLine);
    else if (open.length === 0) body.append(el('p', 'side-note', t('contracts.none')));
    // A Choice Milestone's Contracts sit side by side under one heading; the rest one under another.
    const groups = new Map<ChoiceMilestoneId, Contract[]>();
    for (const c of open) {
      const group = choiceOf(c.id);
      if (group) groups.set(group, [...(groups.get(group) ?? []), c]);
      else body.append(card(c));
    }
    for (const [group, list] of groups) {
      const name = t(`contract.group.${group}`);
      const first = contractById(CHOICE_MILESTONES[group][0]);
      const extra = formatMoney(first.extraReward ?? first.reward);
      body.append(
        el('h4', 'contract-choice-heading', t('contracts.choice.heading', { name })),
        el('p', 'side-note', t(milestoneDone(state, group) ? 'contracts.choice.done' : 'contracts.choice.intro', { name, extra })),
      );
      const row = el('div', 'contract-choices');
      for (const c of list) row.append(card(c));
      body.append(row, el('p', 'side-note', t('contracts.plan')));
    }
    panel.classList.toggle('has-choices', groups.size > 0);
    if (state.playMode === 'freePlay') body.append(questionCard());
    if (canContinueFreePlay(state)) {
      body.append(el('p', 'side-note', t('freePlay.continueNote')));
      const next = el('button', 'small', t('freePlay.continue'));
      next.type = 'button';
      next.addEventListener('click', () => {
        if (continueFreePlay(state)) {
          onContinue();
          render();
        }
      });
      body.append(next);
    }
    if (state.completed.length > 0) {
      body.append(el('h3', '', t('contracts.completed')));
      const done = el('ul', 'contract-done');
      for (const id of state.completed) {
        const item = el('li', '', t('contracts.completedLine', { name: contractText(id) }));
        item.append(missionLinks(id));
        done.append(item);
      }
      body.append(done);
    }
    update();
  };

  // With nothing on the board, the line says what comes next: the HQ Upgrade to the next Era, or its progress.
  const eraLine = el('p', 'side-note');
  const eraText = () => {
    const era = eraOf(state);
    const hq = state.hq;
    const left = hq ? upgradeDaysLeft(state, hq) : null;
    const after = state.playMode === 'freePlay' ? null : eraAfter(era);
    if (left !== null && after) return t('contracts.hqUnderway', { next: eraName(after), days: formatDays(left) });
    if (after && milestonesDone(state, era)) return t('contracts.hqHint', { era, next: eraName(after) });
    return !after && milestonesDone(state, era) ? t('contracts.allDone') : t('contracts.none');
  };

  // Redraw when a Contract changes column on its own (a missed deadline puts it back on the board), or a new Era opens.
  let shownTaken = '';
  const update = () => {
    if (panel.hidden) return;
    setText(eraLine, eraText());
    const taken = boardKey();
    if (taken !== shownTaken) {
      shownTaken = taken;
      render();
      return;
    }
    for (const d of dueLines) {
      setText(d.line, deadlineText(state, d.contract));
      d.line.classList.toggle('warn', daysLeft(state, d.contract) === 0);
    }
    for (const o of offerLines) {
      const left = offerDaysLeft(state, o.id) ?? 0;
      setText(o.line, left > 0 ? t('modes.offerLeft', { days: formatDays(left) }) : t('modes.offerLastDay'));
      o.line.classList.toggle('warn', left <= 7);
    }
  };

  const api: ContractsPanel = {
    toggle() {
      if (panel.hidden) {
        panel.hidden = false;
        setText(problem, '');
        render();
      } else api.close();
    },
    close() {
      panel.hidden = true;
    },
    get isOpen() {
      return !panel.hidden;
    },
    update,
  };
  close.addEventListener('click', () => api.close());
  return api;
}
