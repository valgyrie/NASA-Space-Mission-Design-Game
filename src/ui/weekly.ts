import { OnlineClient, type WeeklyBoard } from '../online/client';
import { weeklyRules, weeklyState, weeklyAllows, weeklyTestRun, weeklyLaunchDay } from '../game/weekly';
import { showMissionDesigner } from './missionDesigner';
import { makePatch } from './patch';
import { DEFAULT_LOGO } from '../company/logo';
import { t } from '../strings';
import { contractText, formatDecimal, formatMoney } from './format';
import { findingText } from './missionReport';

function el<K extends keyof HTMLElementTagNameMap>(tag: K, text = '', className = ''): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.textContent = text;
  node.className = className;
  return node;
}
/** Shares the Online panel's account and busy/error handling; attempts never write the Company save. */
export function makeWeekly(root: HTMLElement, client: OnlineClient, run: (job: () => Promise<void>) => Promise<void>) {
  const section = el('section', '', 'weekly-section');
  const content = el('div');
  const result = el('div', '', 'weekly-result');
  let board: WeeklyBoard | null = null;
  let designer: ReturnType<typeof showMissionDesigner> | null = null;
  let designerWeek = '';
  let playing = false;
  const start = el('button', t('weekly.design'));
  start.type = 'button';
  start.addEventListener('click', () => {
    if (!board) return;
    const week = board.week;
    if (!designer || designerWeek !== week) {
      // A new week may be opened without reloading the game.
      designer?.destroy();
      designerWeek = week;
      designer = showMissionDesigner(root, weeklyState(week), weeklyRules(week).seed, {
        onOpen() { playing = true; }, onClose() { playing = false; }, onChange() {},
        challenge: {
          allows: weeklyAllows,
          launchDay: weeklyLaunchDay(week),
          testRun: (design) => weeklyTestRun(week, design),
          attempt(design) {
            void run(async () => {
              const scored = await client.attempt(week, design);
              result.replaceChildren(el('h3', t(scored.success ? 'weekly.passed' : 'weekly.failed')));
              result.append(el('p', t('weekly.score', { score: formatDecimal(scored.score / 100, 2) })));
              for (const key of ['reliability', 'science', 'money', 'mass'] as const) result.append(el('p', t(`weekly.${key}`, { n: formatDecimal(scored[key] * 100, 2) }), 'note'));
              result.append(el('p', t('weekly.cost', { money: formatMoney(scored.cost) }), 'note'));
              const why = el('ul', '', 'report-findings');
              for (const finding of scored.flight.findings) why.append(el('li', findingText(finding)));
              result.append(why);
              await refresh();
            });
          },
        },
      });
    }
    designer.open();
  });
  section.append(el('h2', t('weekly.heading')), el('p', t('weekly.note'), 'note'), content, start, result);
  async function refresh() {
    board = await client.weekly();
    const rules = weeklyRules(board.week);
    content.replaceChildren(el('h3', t('weekly.week', { week: board.week })), el('p', contractText(rules.contract)),
      el('p', t('weekly.budget', { money: formatMoney(rules.budget) }), 'note'), el('p', t('weekly.weights'), 'note'), el('p', t('weekly.scienceNote'), 'note'));
    const table = (leaders: WeeklyBoard['leaders'], finished: boolean) => {
      if (!leaders.length) { content.append(el('p', t('online.empty'), 'note')); return; }
      const list = el('ol');
      leaders.forEach((leader, i) => list.append(el('li', t(finished && i < 3 ? 'weekly.podium' : 'weekly.leader', { name: leader.nickname, score: formatDecimal(leader.score / 100, 2), rank: i + 1 }))));
      content.append(list);
    };
    content.append(el('h3', t('weekly.current')));
    table(board.leaders, false);
    content.append(el('h3', t('weekly.previous', { week: board.previous.week })));
    table(board.previous.leaders, true);
    content.append(el('h3', t('weekly.rewards')), el('p', t('weekly.rewardNote'), 'note'));
    for (const earned of board.earned) {
      const reward = el('div', '', 'weekly-reward');
      const contract = weeklyRules(earned.week).contract;
      reward.append(makePatch({ contract, day: weeklyState(earned.week).day }, t('weekly.heading'), DEFAULT_LOGO), el('p', t('weekly.patch', { week: earned.week, score: formatDecimal(earned.score / 100, 2) })));
      if (earned.rank) reward.append(el('p', t('weekly.badge', { rank: earned.rank }), 'weekly-badge'));
      content.append(reward);
    }
  }
  return { root: section, refresh, destroy() { designer?.destroy(); designer = null; section.remove(); }, get isPlaying() { return playing; }, closeDesigner() { designer?.close(); } };
}
