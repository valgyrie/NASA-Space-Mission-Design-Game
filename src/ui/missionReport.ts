import { missionLinks } from './learnMore';
import { audio } from '../audio/sound';
import type { Company } from '../save/save';
import type { Finding, MissionReport } from '../game/mission';
import { type Anomaly, antennaChance } from '../game/anomalies';
import { LAUNCH_VEHICLES } from '../game/launchVehicles';
import type { Patch } from '../game/history';
import { contractById } from '../game/contracts';
import { OPTIONS } from '../game/spacecraft';
import { t, textFor } from '../strings';
import { dayPhase } from '../game/explorer';
import { explorerShown } from './displayMode';
import { lostText, percentText } from './anomalyPanel';
import { groundTestFor, testedChance, untestedChance } from '../game/groundTests';
import { contractText, formatDecimal, formatGameDate, formatMoney, formatNumber } from './format';
import { makePatch } from './patch';
import { type MissionSegment, bySegment, findingSegment } from '../game/segments';
import { SOURCES } from '../game/sources';
import { learnMore } from './learnMore';
import { likeTheRealOne } from './likeTheRealOne';
import { sourcedTip } from './sourcedTip';
import { ROLE_IDS, type RoleId, roleHolder, rolePart } from '../game/team';
import { TEAM_COLOUR_CSS, ownerText } from './teamBar';

/** The Mission Patch a report earned, and whether it is the Company's first. */
export interface EarnedPatch {
  patch: Patch;
  first: boolean;
}

export interface MissionReportDialog {
  /** `labs`: the Company's Research Labs now, for where the Data goes. */
  show(report: MissionReport, deadlineDay: number | null, today: number, earned?: EarnedPatch | null, labs?: number): void;
  close(): void;
  readonly isOpen: boolean;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  e.className = className;
  if (text) e.textContent = text;
  return e;
}

/** Whether the Spacecraft reached its orbit. If not, the rest of the flight never happened (ticket 17). */
export function reachedOrbit(findings: Finding[]): boolean {
  return findings.some((f) => f.kind === 'orbit' && f.ok);
}

/**
 * One "because" line: what happened and the design numbers behind it. With `flown` false the Spacecraft
 * never reached orbit, so the line says what the design would have done instead. `explorer`: the same line in
 * plain words, without the numbers (days and dates stay).
 */
export function findingText(f: Finding, flown = true, explorer = false): string {
  const state = f.ok ? 'ok' : 'short';
  const d = flown ? '' : '.design';
  if (explorer) {
    const plain = explorerFindingText(f, d);
    if (plain) return plain;
  }
  switch (f.kind) {
    case 'orbit':
      if (!f.ok && f.failedStage != null) {
        const { record } = LAUNCH_VEHICLES[f.vehicle];
        if (!record) return t('finding.orbit.rocketModern', { orbit: t(`orbit.${f.orbit}`), vehicle: t(`launchVehicle.${f.vehicle}`), n: formatNumber(f.failedStage) });
        return t('finding.orbit.rocket', {
          orbit: t(`orbit.${f.orbit}`),
          vehicle: t(`launchVehicle.${f.vehicle}`),
          n: formatNumber(f.failedStage),
          worked: formatNumber(record.worked),
          flights: formatNumber(record.flights),
        });
      }
      if (!f.ok && f.noEngine) {
        const key = f.orbit === 'lunarOrbit' ? 'finding.orbit.noEngineMoon' : f.orbit === 'moonSurface' || f.orbit === 'lunarSouthPole' ? 'finding.orbit.noLander' : 'finding.orbit.noEngine';
        return t(key, { orbit: t(`orbit.${f.orbit}`), vehicle: t(`launchVehicle.${f.vehicle}`) });
      }
      return t(`finding.orbit.${state}`, {
        orbit: t(`orbit.${f.orbit}`),
        kg: formatDecimal(f.massKg),
        vehicle: t(`launchVehicle.${f.vehicle}`),
        max: formatNumber(f.liftKg),
      });
    case 'payload':
      if (f.payload === null) return t(`finding.payload.any${d}`);
      return t(`finding.payload.${state}${d}`, { payload: t(`payload.${f.payload}`) });
    case 'power': {
      const battery = f.battery && OPTIONS[f.battery].part ? t(`part.${OPTIONS[f.battery].part!}`) : t('slot.battery');
      const values = {
        need: formatNumber(f.needDays),
        battery,
        wh: formatNumber(f.batteryWh),
        w: formatDecimal(f.powerUseW),
        days: formatNumber(Math.floor(f.lastsDays ?? 0)),
      };
      // A one-day Mission (Artemis II) reads "the whole day", not "all 1 days".
      const one = f.ok && f.needDays === 1 ? '.one' : '';
      if (f.ok && f.lastsDays === null) return t(`finding.power.sun${one}${d}`, values);
      return one ? t(`finding.power.ok.one${d}`, values) : t(`finding.power.${state}${d}`, values);
    }
    case 'comms':
      return t(`finding.comms.${state}${d}`, { send: formatNumber(f.sendPerDay), make: formatNumber(f.dataPerDay) });
    case 'time':
      return t(`finding.time.${state}${d}`, { end: formatGameDate(f.endDay), deadline: formatGameDate(f.deadlineDay) });
  }
}

/** Explorer's wording of a finding with numbers in it, or '' when the full line has none to hide. */
function explorerFindingText(f: Finding, d: '' | '.design'): string {
  const mark = f.ok ? 'ok' : 'no';
  switch (f.kind) {
    case 'orbit': {
      const values = { orbit: t(`orbit.${f.orbit}`), vehicle: t(`launchVehicle.${f.vehicle}`) };
      if (!f.ok && f.failedStage != null) return t('explorer.finding.orbit.rocket', values);
      if (!f.ok && f.noEngine) return '';
      return t(`explorer.finding.orbit.${mark}`, values);
    }
    case 'power':
      // Sunlight lines say only how many days: keep them.
      if (f.ok && f.lastsDays === null) return '';
      return f.ok
        ? t(`explorer.finding.power.ok${d}`)
        : t(`explorer.finding.power.no${d}`, { phase: t(`explorer.phase.${dayPhase(f.lastsDays ?? 0, f.needDays)}`) });
    case 'comms':
      return t(`explorer.finding.comms.${mark}${d}`);
    default:
      return '';
  }
}

/** A line of the Mission Report: a requirement met (ok), not met (short), or a plain fact (info). */
export interface ReportLine {
  segment: MissionSegment;
  mark: 'ok' | 'short' | 'info';
  text: string;
}

/**
 * The report's "Why" lines under NASA's four Segments. Segments with something that went wrong come first, and
 * inside each, what went wrong comes first: that is what the player needs to fix. A Segment with nothing to say
 * is left out. `labs` is how many Research Labs the Company has, for where the Data goes.
 */
export function reportSegments(report: MissionReport, labs: number, explorer = false): { segment: MissionSegment; lines: ReportLine[] }[] {
  const flown = reachedOrbit(report.findings);
  const finding = (f: Finding): ReportLine => ({
    segment: findingSegment(f),
    mark: f.ok ? 'ok' : 'short',
    // Without orbit, only the orbit line is about what happened; the rest say what the design would have done.
    text: findingText(f, flown || f.kind === 'orbit', explorer),
  });
  const rank = { short: 0, ok: 1, info: 2 } as const;
  const lines = [...report.findings].sort((a, b) => Number(b.kind === 'orbit') - Number(a.kind === 'orbit')).map(finding);
  if (flown) {
    const client = contractText(report.contract, 'client');
    lines.push({ segment: 'user', mark: 'info', text: t(labs > 0 ? 'report.user.labs' : 'report.user.waiting', { client }) });
    if (report.ground !== undefined) {
      lines.push({
        segment: 'ground',
        mark: 'info',
        text: report.ground > 1
          ? explorer ? t('explorer.report.groundOwn') : t('report.ground.own', { boost: formatDecimal(report.ground) })
          : t('report.ground.borrowed'),
      });
    }
  }
  const groups = bySegment(lines, (l) => l.segment).map(({ segment, items }) => ({
    segment,
    lines: [...items].sort((a, b) => rank[a.mark] - rank[b.mark]),
  }));
  const hasShort = (g: (typeof groups)[number]) => g.lines.some((l) => l.mark === 'short');
  return [...groups].sort((a, b) => Number(hasShort(b)) - Number(hasShort(a)));
}

/** The Anomaly's lines: what happened and what it cost, and why it happened. Empty when there was none. */
export function anomalyLines(report: MissionReport): string[] {
  const a = report.anomaly;
  if (!a || a.score === null || a.answer === null) return [];
  const what = t(`report.anomaly.${a.answer}`, {
    day: formatNumber(a.day),
    name: t(`anomaly.${a.kind}.name`),
    score: percentText(a.score),
    lost: lostText(a.lostDays),
  });
  const cut = a.cut > 0 ? ` ${t('report.anomaly.cut', { money: formatMoney(a.cut) })}` : '';
  const tested = groundTestLine(a);
  return tested ? [what + cut, anomalyWhy(a), tested] : [what + cut, anomalyWhy(a)];
}

/**
 * Whether the Anomaly's Ground Test was done (ticket 40), or '' for reports from before Ground Tests.
 * The first flight's Point the antenna came whatever the test.
 */
function groundTestLine(a: Anomaly): string {
  if (a.tested === undefined) return '';
  const test = t(`groundTest.${groundTestFor(a.kind)}`);
  if (!a.tested) return t('report.groundTest.missed', { test, after: percentText(testedChance(a.chance)) });
  if (a.kind === 'antenna' && a.first) return t('report.groundTest.first', { test });
  return t('report.groundTest.done', { test, chance: percentText(a.chance), before: percentText(untestedChance(a.chance)) });
}

/** Why the Anomaly happened, from the design numbers behind its chance. */
function anomalyWhy(a: Anomaly): string {
  const chance = percentText(a.chance);
  switch (a.kind) {
    case 'antenna': {
      const numbers = { send: formatNumber(a.sendPerDay), make: formatNumber(a.dataPerDay) };
      return a.first
        ? t('report.anomaly.antenna.first', { ...numbers, chance: percentText(antennaChance(a.sendPerDay, a.dataPerDay)) })
        : t('report.anomaly.antenna.why', { ...numbers, chance });
    }
    case 'panel':
      return t('report.anomaly.panel.why', { chance, mark: formatNumber(a.solarMark ?? 1) });
    case 'eclipse': {
      const battery = t(`part.${a.battery ?? 'largeBattery'}`);
      const margin =
        a.lastsDays === null || a.lastsDays === undefined
          ? t('report.anomaly.eclipse.sun', { battery })
          : t('report.anomaly.eclipse.lasts', { battery, lasts: formatNumber(Math.floor(a.lastsDays)), days: formatNumber(a.missionDays) });
      return t('report.anomaly.eclipse.why', { chance, margin });
    }
  }
}

/** One role's part in a Mission flown in Team Mode: who, their colour, and the finding that was theirs. */
export interface TeamLine {
  role: RoleId;
  player: number;
  ok: boolean;
  text: string;
}

/** Each role's part ("Power · Ada: Power lasted all 78 days…"). Empty for a Mission built by one player. */
export function teamLines(report: MissionReport, explorer = false): TeamLine[] {
  const players = report.team;
  if (!players) return [];
  const flown = reachedOrbit(report.findings);
  return ROLE_IDS.flatMap((role) => {
    const f = rolePart(report, role);
    if (!f) return [];
    const text = t('report.team.line', { who: ownerText(players, role), text: findingText(f, flown || f.kind === 'orbit', explorer) });
    return [{ role, player: roleHolder(players.length, role), ok: f.ok, text }];
  });
}

/** The "Like the real one" section: a line on who the real one is, a two-column table, one comparing line. */
function realSection(report: MissionReport): HTMLElement[] {
  const c = likeTheRealOne(report);
  if (!c) return [];
  const intro = el('p', 'report-real-intro', t(c.sameMission ? 'report.real.introMilestone' : 'report.real.introFree', { name: c.name }));
  intro.append(' ', learnMore(c.craft.learnMore, c.name));
  const table = el('table', 'report-real-table');
  const head = el('tr', '');
  head.append(el('th', '', t('report.real.what')), el('th', '', t('report.real.yours')), el('th', '', c.name));
  for (const th of head.children) th.setAttribute('scope', 'col');
  const rows = c.rows.map((r) => {
    const tr = el('tr', '');
    const label = el('th', '', r.label);
    label.setAttribute('scope', 'row');
    tr.append(label, el('td', '', r.yours), el('td', '', r.real));
    return tr;
  });
  const thead = el('thead', '');
  thead.append(head);
  const tbody = el('tbody', '');
  tbody.append(...rows);
  table.append(thead, tbody);
  return [intro, table, el('p', 'report-real-line', c.line)];
}

/** The Mission Report: the outcome, each requirement with the reason it was or wasn't met, and the reward. */
export function showMissionReport(
  root: HTMLElement,
  company: Company,
  onClose: () => void,
  onSeeOrbit: (report: MissionReport) => void,
): MissionReportDialog {
  const backdrop = el('div', 'backdrop report-backdrop');
  backdrop.hidden = true;
  const panel = el('div', 'panel report');
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-labelledby', 'report-heading');
  const heading = el('h2', '', t('report.heading'));
  heading.id = 'report-heading';
  const subtitle = el('p', 'report-subtitle');
  // Who needed the Data and why (ticket 42): generated Contracts only.
  const need = el('p', 'report-need');
  const sources = el('div', '');
  const outcome = el('p', 'report-outcome');
  const why = el('h3', '', t('report.why'));
  // The lines sit under NASA's four Segments, with one line on what they are.
  const segmentsIntro = el('p', 'report-segments-intro');
  const segmentsLink = learnMore(SOURCES.segments, t('sources.segments'));
  const notFlown = el('p', 'report-not-flown');
  const findings = el('div', 'report-segments');
  const anomalyHeading = el('h3', '', t('report.anomaly'));
  const anomaly = el('div', 'report-anomaly');
  const reward = el('p', 'report-reward');
  // Team Mode (ticket 41): each role's part.
  const teamHeading = el('h3', '', t('report.team'));
  const teamBox = el('div', 'report-team');
  // A successful Mission earns a Mission Patch, shown here and kept in the History Archive.
  const patchHeading = el('h3', '', t('report.patch'));
  const patchBox = el('div', 'report-patch');
  const patchArt = el('div', 'report-patch-art');
  const patchText = el('p', '');
  patchBox.append(patchArt, patchText);
  // Like the real one (ticket 36): the player's Spacecraft beside the real one, last thing in the report.
  const realHeading = el('h3', '', t('report.real.heading'));
  const real = el('div', 'report-real');
  const close = el('button', 'report-close', t('report.close'));
  close.type = 'button';
  // A Spacecraft that reached orbit is still up there: the Space view shows it.
  const seeOrbit = el('button', 'report-orbit', t('report.seeOrbit'));
  seeOrbit.type = 'button';
  const buttons = el('div', 'report-buttons');
  buttons.append(seeOrbit, close);
  panel.append(heading, subtitle, need, sources, outcome, why, segmentsIntro, notFlown, findings, anomalyHeading, anomaly, reward, teamHeading, teamBox, patchHeading, patchBox, realHeading, real, buttons);
  let shown: MissionReport | null = null;
  backdrop.append(panel);
  root.append(backdrop);

  const api: MissionReportDialog = {
    show(report, deadlineDay, today, earned = null, labs = 0) {
      // Explorer: the same report in plain words (the mode is fixed per Company, so it is read when shown).
      const explorer = explorerShown();
      segmentsIntro.replaceChildren(textFor('segment.intro', explorer), ' ', segmentsLink);
      notFlown.textContent = textFor('report.notFlown', explorer);
      const contract = contractText(report.contract);
      sources.replaceChildren(missionLinks(report.contract, report.vehicle));
      subtitle.textContent = t('report.subtitle', {
        contract,
        vehicle: t(`launchVehicle.${report.vehicle}`),
        site: t(`launchSite.${report.site}.short`),
        date: formatGameDate(report.launchDay),
      });
      need.textContent = contractText(report.contract, 'need');
      need.hidden = !need.textContent;
      outcome.textContent = t(report.success ? 'report.success' : 'report.failure', { contract });
      outcome.classList.toggle('ok', report.success);
      const line = (l: ReportLine) => {
        const li = el('li', l.mark);
        const mark = el('span', 'report-mark', t(l.mark === 'ok' ? 'report.ok' : l.mark === 'short' ? 'report.short' : 'report.info'));
        if (l.mark === 'info') mark.setAttribute('aria-hidden', 'true');
        else mark.setAttribute('aria-label', t(l.mark === 'ok' ? 'report.okName' : 'report.shortName'));
        li.append(mark, el('span', '', l.text));
        return li;
      };
      notFlown.hidden = reachedOrbit(report.findings);
      findings.replaceChildren(
        ...reportSegments(report, labs, explorer).map(({ segment, lines }) => {
          const group = el('section', 'report-segment');
          group.dataset.segment = segment;
          const list = el('ul', 'report-findings');
          list.append(...lines.map(line));
          group.append(el('h4', '', t(`segment.${segment}`)), list);
          return group;
        }),
      );
      const lines = anomalyLines(report);
      anomaly.replaceChildren(...lines.map((line, i) => el('p', i === 0 ? '' : 'report-anomaly-why', line)));
      if (lines.length > 0 && report.anomaly?.kind === 'panel') anomaly.append(sourcedTip('panel'));
      anomalyHeading.hidden = anomaly.hidden = lines.length === 0;
      if (report.success) {
        reward.textContent = t('report.reward', { money: formatMoney(report.reward) });
        if (contractById(report.contract).plot) reward.textContent += ` ${t('report.rewardPlot')}`;
      }
      else if (deadlineDay !== null && today < deadlineDay) {
        // Only the rocket let it down: the design was fine, so the same one can fly again.
        const rocketOnly = report.findings.every((f) => f.ok || (f.kind === 'orbit' && f.failedStage != null));
        reward.textContent = t(rocketOnly ? 'report.retryRocket' : 'report.retry', { date: formatGameDate(deadlineDay) });
      }
      else reward.textContent = t('report.tooLate');
      if (report.insurancePaid > 0) reward.textContent += ` ${t('report.insurance', { money: formatMoney(report.insurancePaid) })}`;
      // Game modes: Explorer's refund of the launch costs.
      if (report.refund) reward.textContent += ` ${t('modes.refund', { money: formatMoney(report.refund) })}`;
      const team = teamLines(report, explorer);
      teamHeading.hidden = teamBox.hidden = team.length === 0;
      const teamList = el('ul', 'report-team-lines');
      teamList.append(
        ...team.map((l) => {
          const li = el('li', l.ok ? 'ok' : 'short');
          li.dataset.role = l.role;
          li.style.setProperty('--team-colour', TEAM_COLOUR_CSS[report.team![l.player]!.colour]);
          li.append(el('span', 'team-dot'), el('span', '', l.text));
          return li;
        }),
      );
      teamBox.replaceChildren(el('p', 'report-team-intro', t('report.team.intro')), teamList);
      patchHeading.hidden = patchBox.hidden = !earned;
      patchArt.replaceChildren(...(earned ? [makePatch(earned.patch, company.name, company.logo)] : []));
      patchText.textContent = earned ? t(earned.first ? 'report.patchFirst' : 'report.patchMore') : '';
      real.replaceChildren(...realSection(report));
      shown = report;
      seeOrbit.hidden = !report.findings.some((f) => f.kind === 'orbit' && f.ok);
      backdrop.hidden = false;
      audio.setScene('report', report.success ? 'success' : 'failure');
      audio.effect(report.success ? 'reward' : 'alarm');
      close.focus();
    },
    close() {
      if (backdrop.hidden) return;
      backdrop.hidden = true;
      audio.setScene('report', null);
      onClose();
    },
    get isOpen() {
      return !backdrop.hidden;
    },
  };
  close.addEventListener('click', () => api.close());
  seeOrbit.addEventListener('click', () => {
    const report = shown;
    api.close();
    if (report) onSeeOrbit(report);
  });
  return api;
}
