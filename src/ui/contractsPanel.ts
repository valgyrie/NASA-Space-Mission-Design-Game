import {
  type AcceptedContract,
  type Contract,
  type Requirement,
  acceptContract,
  accepted,
  availableContracts,
  CONTRACTS,
  daysLeft,
  deadlineDay,
} from '../game/contracts';
import type { SiteState } from '../game/siteState';
import { t } from '../strings';
import { formatGameDate, formatMoney, formatNumber } from './format';

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
export function showContractsPanel(root: HTMLElement, state: SiteState, onAccept: () => void): ContractsPanel {
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
    title.append(el('h4', '', t(`contract.${contract.id}.name`)));
    if (contract.kind === 'milestone') title.append(el('span', 'tag', t('contracts.milestone')));
    const requirements = el('ul', 'contract-requirements');
    for (const r of contract.requirements) requirements.append(el('li', '', requirementText(r)));
    const deadline = el('span', '');
    if (taken) dueLines.push({ line: deadline, contract: taken });
    else deadline.textContent = t('contracts.deadlineAfter', { days: formatNumber(contract.deadlineDays) });
    box.append(
      title,
      field(t('contracts.client'), t(`contract.${contract.id}.client`)),
      field(t('contracts.objective'), t(`contract.${contract.id}.objective`)),
      field(t('contracts.requirements'), requirements),
      field(t('contracts.reward'), formatMoney(contract.reward)),
      field(t('contracts.deadline'), deadline),
    );
    if (!taken) {
      const accept = el('button', 'small accept', t('contracts.accept'));
      accept.type = 'button';
      accept.addEventListener('click', () => {
        const result = acceptContract(state, contract.id);
        setText(problem, result.ok ? '' : t(`contracts.problem.${result.problem}`));
        if (result.ok) onAccept();
        render();
      });
      box.append(accept);
    }
    return box;
  };

  const render = () => {
    dueLines = [];
    body.replaceChildren();
    if (state.contracts.length > 0) {
      body.append(el('h3', '', t('contracts.active')));
      for (const c of state.contracts) body.append(card(CONTRACTS[c.id]));
    }
    body.append(el('h3', '', t('contracts.available')));
    const open = availableContracts(state);
    if (open.length === 0) body.append(el('p', 'side-note', t('contracts.none')));
    for (const c of open) body.append(card(c));
    if (state.completed.length > 0) {
      body.append(el('h3', '', t('contracts.completed')));
      const done = el('ul', 'contract-done');
      for (const id of state.completed) done.append(el('li', '', t('contracts.completedLine', { name: t(`contract.${id}.name`) })));
      body.append(done);
    }
    update();
  };

  const update = () => {
    if (panel.hidden) return;
    for (const d of dueLines) {
      setText(d.line, deadlineText(state, d.contract));
      d.line.classList.toggle('warn', daysLeft(state, d.contract) === 0);
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
