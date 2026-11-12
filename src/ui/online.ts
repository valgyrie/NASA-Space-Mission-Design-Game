import { makeWeekly } from './weekly';
import { checkCompanyName, NAME_MAX } from '../company/companyName';
import { OnlineClient, OnlineError } from '../online/client';
import { METRICS, formatCode, generateNickname, type Metric } from '../online/model';
import { type SaveData, saveGame } from '../save/save';
import { t, type StringKey } from '../strings';
import { formatMoney, formatNumber } from './format';

function el<K extends keyof HTMLElementTagNameMap>(tag: K, text = '', className = ''): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  node.textContent = text;
  return node;
}

/** The same dialog is reachable before starting a Company and from the Free Play pause menu. */
export function showOnline(root: HTMLElement, current: () => SaveData | null, hooks: { onOpen(): void; onClose(): void; onLoad?(game: SaveData): void }) {
  const client = new OnlineClient(localStorage);
  const backdrop = el('div', '', 'backdrop online-backdrop');
  backdrop.hidden = true;
  const panel = el('section', '', 'panel dialog online-dialog');
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-labelledby', 'online-heading');
  const heading = el('h1', t('online.heading'));
  heading.id = 'online-heading';
  const status = el('p', '', 'error');
  status.setAttribute('role', 'status');
  const accountArea = el('div', '', 'online-account');
  const recoveryArea = el('div', '', 'online-recover');
  const board = el('div', '', 'online-board');
  let busy = false;
  let metric: Metric = 'value';
  const button = (key: StringKey, run: () => void) => {
    const b = el('button', t(key));
    b.type = 'button';
    b.addEventListener('click', run);
    return b;
  };
  const note = (key: StringKey) => el('p', t(key), 'note');
  const input = (label: StringKey, value: string) => {
    const wrapper = el('label', t(label));
    const field = el('input');
    field.type = 'text';
    field.value = value;
    field.autocomplete = 'off';
    field.spellcheck = false;
    wrapper.append(field);
    return { wrapper, field };
  };
  const run = async (job: () => Promise<void>, success?: StringKey) => {
    if (busy) return;
    busy = true;
    status.textContent = t('online.busy');
    panel.setAttribute('aria-busy', 'true');
    panel.querySelectorAll<HTMLButtonElement>('button').forEach((b) => { b.disabled = true; });
    try {
      await job();
      status.textContent = success ? t(success) : '';
    } catch (error) {
      status.textContent = t(`online.error.${error instanceof OnlineError ? error.problem : 'network'}`);
    } finally {
      busy = false;
      panel.removeAttribute('aria-busy');
      renderAccount();
      // Re-rendered controls have their own eligibility; restore the remaining controls.
      recoveryArea.querySelectorAll<HTMLButtonElement>('button').forEach((b) => { b.disabled = false; });
      tabs.querySelectorAll<HTMLButtonElement>('button').forEach((b) => { b.disabled = false; });
      close.disabled = false;
      weeklyHost.querySelectorAll<HTMLButtonElement>('button').forEach((b) => { b.disabled = false; });
    }
  };
  const weekly = makeWeekly(root, client, run);
  const weeklyHost = el('div');
  weeklyHost.append(weekly.root);
  function nicknameForm(creating: boolean) {
    const name = input('online.nickname', creating ? generateNickname() : client.account!.nickname);
    name.field.maxLength = NAME_MAX;
    const reroll = button('online.reroll', () => { name.field.value = generateNickname(); });
    reroll.title = t('online.rerollTitle');
    reroll.setAttribute('aria-label', t('online.rerollTitle'));
    const row = el('div', '', 'row');
    row.append(name.wrapper, reroll);
    const submit = button(creating ? 'online.create' : 'online.rename', () => void run(async () => {
      const checked = checkCompanyName(name.field.value);
      if (!checked.ok) throw new OnlineError('name');
      if (creating) await client.create(checked.name);
      else await client.rename(checked.name);
      await renderBoard();
      if (current()?.state.playMode === 'freePlay') await weekly.refresh();
    }, creating ? 'online.ready' : 'online.renamed'));
    accountArea.append(row, submit);
  }
  function renderAccount() {
    accountArea.replaceChildren();
    weeklyHost.hidden = current()?.state.playMode !== 'freePlay' || !client.account;
    if (!client.account) {
      if (!client.code) nicknameForm(true);
      return;
    }
    nicknameForm(false);
    const code = input('online.recovery', formatCode(client.code!));
    code.field.readOnly = true;
    code.field.className = 'online-code';
    const copy = button('online.copyCode', () => {
      code.field.select();
      void navigator.clipboard.writeText(code.field.value).then(() => { copy.textContent = t('online.copied'); }).catch(() => {
        code.field.focus(); code.field.select(); document.execCommand('copy');
      });
    });
    accountArea.append(code.wrapper, copy, note('online.recoveryNote'), el('h2', t('online.cloud')), note('online.cloudNote'));
    const account = client.account;
    const date = account.updatedAt ? new Intl.DateTimeFormat(t('format.locale'), { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(account.updatedAt)) : null;
    accountArea.append(el('p', date ? t('online.cloudDate', { date }) : t('online.noCloud'), 'note'));
    const game = current();
    const save = button('online.save', () => void run(async () => {
      const latest = current();
      if (!latest || latest.state.playMode !== 'freePlay') throw new OnlineError('invalidSave');
      if (!saveGame(localStorage, latest)) throw new OnlineError('storage');
      await client.save(latest);
      await renderBoard();
    }, 'online.saved'));
    save.disabled = game?.state.playMode !== 'freePlay';
    if (save.disabled) accountArea.append(note('online.freePlayOnly'));
    const confirm = el('div', '', 'online-confirm');
    confirm.hidden = true;
    const replace = button('online.replace', () => void run(async () => {
      const saved = await client.load();
      if (!saveGame(localStorage, saved)) throw new OnlineError('storage');
      hooks.onLoad?.(saved);
      window.location.reload();
    }));
    confirm.append(note('online.replaceNote'), replace, button('online.cancel', () => { confirm.hidden = true; }));
    const load = button('online.load', () => { confirm.hidden = false; replace.focus(); });
    load.disabled = account.revision === 0;
    accountArea.append(save, load, confirm);
  }

  const recover = input('online.recovery', '');
  recoveryArea.append(el('h2', t('online.recover')), note('online.recoverNote'), recover.wrapper,
    button('online.recover', () => void run(async () => { await client.recover(recover.field.value); recover.field.value = ''; if (current()?.state.playMode === 'freePlay') await weekly.refresh(); }, 'online.ready')));

  const tabs = el('div', '', 'online-tabs');
  for (const id of METRICS) {
    const b = button(`online.metric.${id}`, () => {
      metric = id;
      void run(renderBoard);
    });
    b.dataset.metric = id;
    tabs.append(b);
  }
  async function renderBoard() {
    const leaders = await client.leaders(metric);
    tabs.querySelectorAll<HTMLButtonElement>('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.metric === metric)));
    board.replaceChildren();
    if (leaders.length === 0) { board.append(note('online.empty')); return; }
    const table = el('table');
    const head = el('thead');
    const row = el('tr');
    for (const label of [t('online.rank'), t('online.nickname'), t(`online.metric.${metric}`)]) row.append(el('th', label));
    head.append(row);
    const body = el('tbody');
    leaders.forEach((leader, i) => {
      const row = el('tr');
      row.append(el('td', formatNumber(i + 1)), el('td', leader.nickname), el('td', metric === 'value' ? formatMoney(leader.value) : formatNumber(leader[metric])));
      body.append(row);
    });
    table.append(head, body);
    board.append(table);
  }
  const close = button('mainMenu.back', () => api.close());
  panel.append(heading, note('online.intro'), status, accountArea, recoveryArea, el('h2', t('online.leaderboards')), note('online.leaderNote'), tabs, board, note('online.scoreNote'), weeklyHost, close);
  backdrop.append(panel);
  root.append(backdrop);
  const onKey = (event: KeyboardEvent) => {
    if (!api.isOpen || event.key !== 'Escape') return;
    event.stopImmediatePropagation();
    event.preventDefault();
    if (weekly.isPlaying) weekly.closeDesigner();
    else api.close();
  };
  const api = {
    get isOpen() { return !backdrop.hidden; },
    open() {
      if (api.isOpen) return;
      backdrop.hidden = false;
      hooks.onOpen();
      renderAccount();
      close.focus({ preventScroll: true });
      panel.scrollTop = 0;
      void run(async () => { await client.refresh(); await renderBoard(); if (current()?.state.playMode === 'freePlay' && client.account) await weekly.refresh(); });
    },
    close() {
      if (!api.isOpen || busy) return;
      backdrop.hidden = true;
      hooks.onClose();
    },
    destroy() {
      weekly.destroy();
      window.removeEventListener('keydown', onKey, true);
      backdrop.remove();
    },
  };
  window.addEventListener('keydown', onKey, true);
  return api;
}
