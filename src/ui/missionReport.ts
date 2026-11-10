import type { Finding, MissionReport } from '../game/mission';
import { antennaChance } from '../game/anomalies';
import type { Patch } from '../game/history';
import { OPTIONS } from '../game/spacecraft';
import { t } from '../strings';
import { lostText, percentText } from './anomalyPanel';
import { formatDecimal, formatGameDate, formatMoney, formatNumber } from './format';
import { makePatch } from './patch';

/** The Mission Patch a report earned, and whether it is the Company's first. */
export interface EarnedPatch {
  patch: Patch;
  first: boolean;
}

export interface MissionReportDialog {
  show(report: MissionReport, deadlineDay: number | null, today: number, earned?: EarnedPatch | null): void;
  close(): void;
  readonly isOpen: boolean;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  e.className = className;
  if (text) e.textContent = text;
  return e;
}

/** One "because" line: what happened and the design numbers behind it. */
export function findingText(f: Finding): string {
  const state = f.ok ? 'ok' : 'short';
  switch (f.kind) {
    case 'orbit':
      return t(`finding.orbit.${state}`, {
        orbit: t(`orbit.${f.orbit}`),
        kg: formatDecimal(f.massKg),
        vehicle: t(`launchVehicle.${f.vehicle}`),
        max: formatNumber(f.liftKg),
      });
    case 'payload':
      if (f.payload === null) return t('finding.payload.any');
      return t(`finding.payload.${state}`, { payload: t(`payload.${f.payload}`) });
    case 'power': {
      const battery = f.battery && OPTIONS[f.battery].part ? t(`part.${OPTIONS[f.battery].part!}`) : t('slot.battery');
      const values = {
        need: formatNumber(f.needDays),
        battery,
        wh: formatNumber(f.batteryWh),
        w: formatDecimal(f.powerUseW),
        days: formatNumber(Math.floor(f.lastsDays ?? 0)),
      };
      if (f.ok && f.lastsDays === null) return t('finding.power.sun', values);
      return t(`finding.power.${state}`, values);
    }
    case 'comms':
      return t(`finding.comms.${state}`, { send: formatNumber(f.sendPerDay), make: formatNumber(f.dataPerDay) });
    case 'time':
      return t(`finding.time.${state}`, { end: formatGameDate(f.endDay), deadline: formatGameDate(f.deadlineDay) });
  }
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
  const numbers = { send: formatNumber(a.sendPerDay), make: formatNumber(a.dataPerDay) };
  const why = a.first
    ? t('report.anomaly.antenna.first', { ...numbers, chance: percentText(antennaChance(a.sendPerDay, a.dataPerDay)) })
    : t('report.anomaly.antenna.why', { ...numbers, chance: percentText(a.chance) });
  return [what + cut, why];
}

/** The Mission Report: the outcome, each requirement with the reason it was or wasn't met, and the reward. */
export function showMissionReport(
  root: HTMLElement,
  companyName: string,
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
  const outcome = el('p', 'report-outcome');
  const why = el('h3', '', t('report.why'));
  const findings = el('ul', 'report-findings');
  const anomalyHeading = el('h3', '', t('report.anomaly'));
  const anomaly = el('div', 'report-anomaly');
  const reward = el('p', 'report-reward');
  // A successful Mission earns a Mission Patch, shown here and kept in the History Archive.
  const patchHeading = el('h3', '', t('report.patch'));
  const patchBox = el('div', 'report-patch');
  const patchArt = el('div', 'report-patch-art');
  const patchText = el('p', '');
  patchBox.append(patchArt, patchText);
  const close = el('button', 'report-close', t('report.close'));
  close.type = 'button';
  // A Spacecraft that reached orbit is still up there: the Space view shows it.
  const seeOrbit = el('button', 'report-orbit', t('report.seeOrbit'));
  seeOrbit.type = 'button';
  const buttons = el('div', 'report-buttons');
  buttons.append(seeOrbit, close);
  panel.append(heading, subtitle, outcome, why, findings, anomalyHeading, anomaly, reward, patchHeading, patchBox, buttons);
  let shown: MissionReport | null = null;
  backdrop.append(panel);
  root.append(backdrop);

  const api: MissionReportDialog = {
    show(report, deadlineDay, today, earned = null) {
      const contract = t(`contract.${report.contract}.name`);
      subtitle.textContent = t('report.subtitle', {
        contract,
        vehicle: t(`launchVehicle.${report.vehicle}`),
        site: t(`launchSite.${report.site}.short`),
        date: formatGameDate(report.launchDay),
      });
      outcome.textContent = t(report.success ? 'report.success' : 'report.failure', { contract });
      outcome.classList.toggle('ok', report.success);
      // What went wrong comes first: that is what the player needs to fix.
      const sorted = [...report.findings].sort((a, b) => Number(a.ok) - Number(b.ok));
      findings.replaceChildren(
        ...sorted.map((f) => {
          const li = el('li', f.ok ? 'ok' : 'short');
          const mark = el('span', 'report-mark', t(f.ok ? 'report.ok' : 'report.short'));
          mark.setAttribute('aria-label', t(f.ok ? 'report.okName' : 'report.shortName'));
          li.append(mark, el('span', '', findingText(f)));
          return li;
        }),
      );
      const lines = anomalyLines(report);
      anomaly.replaceChildren(...lines.map((line, i) => el('p', i === 0 ? '' : 'report-anomaly-why', line)));
      anomalyHeading.hidden = anomaly.hidden = lines.length === 0;
      if (report.success) reward.textContent = t('report.reward', { money: formatMoney(report.reward) });
      else if (deadlineDay !== null && today < deadlineDay) reward.textContent = t('report.retry', { date: formatGameDate(deadlineDay) });
      else reward.textContent = t('report.tooLate');
      patchHeading.hidden = patchBox.hidden = !earned;
      patchArt.replaceChildren(...(earned ? [makePatch(earned.patch, companyName)] : []));
      patchText.textContent = earned ? t(earned.first ? 'report.patchFirst' : 'report.patchMore') : '';
      shown = report;
      seeOrbit.hidden = !report.findings.some((f) => f.kind === 'orbit' && f.ok);
      backdrop.hidden = false;
      close.focus();
    },
    close() {
      if (backdrop.hidden) return;
      backdrop.hidden = true;
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
