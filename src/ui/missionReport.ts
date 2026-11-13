import { missionLinks } from './learnMore';
import { audio } from '../audio/sound';
import type { Company } from '../save/save';
import type { Finding, MissionReport } from '../game/mission';
import { type Anomaly, antennaChance } from '../game/anomalies';
import { LAUNCH_VEHICLES } from '../game/launchVehicles';
import type { Patch } from '../game/history';
import { contractById } from '../game/contracts';
import { OPTIONS } from '../game/spacecraft';
import { t } from '../strings';
import { lostText, percentText } from './anomalyPanel';
import { contractText, formatDecimal, formatGameDate, formatMoney, formatNumber } from './format';
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

/** Whether the Spacecraft reached its orbit. If not, the rest of the flight never happened (ticket 17). */
export function reachedOrbit(findings: Finding[]): boolean {
  return findings.some((f) => f.kind === 'orbit' && f.ok);
}

/**
 * One "because" line: what happened and the design numbers behind it. With `flown` false the Spacecraft
 * never reached orbit, so the line says what the design would have done instead.
 */
export function findingText(f: Finding, flown = true): string {
  const state = f.ok ? 'ok' : 'short';
  const d = flown ? '' : '.design';
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
      if (!f.ok && f.noEngine) return t('finding.orbit.noEngine', { orbit: t(`orbit.${f.orbit}`), vehicle: t(`launchVehicle.${f.vehicle}`) });
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
      if (f.ok && f.lastsDays === null) return t(`finding.power.sun${d}`, values);
      return t(`finding.power.${state}${d}`, values);
    }
    case 'comms':
      return t(`finding.comms.${state}${d}`, { send: formatNumber(f.sendPerDay), make: formatNumber(f.dataPerDay) });
    case 'time':
      return t(`finding.time.${state}${d}`, { end: formatGameDate(f.endDay), deadline: formatGameDate(f.deadlineDay) });
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
  return [what + cut, anomalyWhy(a)];
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
  const sources = el('div', '');
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
  panel.append(heading, subtitle, sources, outcome, why, findings, anomalyHeading, anomaly, reward, patchHeading, patchBox, buttons);
  let shown: MissionReport | null = null;
  backdrop.append(panel);
  root.append(backdrop);

  const api: MissionReportDialog = {
    show(report, deadlineDay, today, earned = null) {
      const contract = contractText(report.contract);
      sources.replaceChildren(missionLinks(report.contract, report.vehicle));
      subtitle.textContent = t('report.subtitle', {
        contract,
        vehicle: t(`launchVehicle.${report.vehicle}`),
        site: t(`launchSite.${report.site}.short`),
        date: formatGameDate(report.launchDay),
      });
      outcome.textContent = t(report.success ? 'report.success' : 'report.failure', { contract });
      outcome.classList.toggle('ok', report.success);
      const line = (f: Finding, flown: boolean) => {
        const li = el('li', f.ok ? 'ok' : 'short');
        const mark = el('span', 'report-mark', t(f.ok ? 'report.ok' : 'report.short'));
        mark.setAttribute('aria-label', t(f.ok ? 'report.okName' : 'report.shortName'));
        li.append(mark, el('span', '', findingText(f, flown)));
        return li;
      };
      // What went wrong comes first: that is what the player needs to fix.
      const sorted = [...report.findings].sort((a, b) => Number(a.ok) - Number(b.ok));
      if (reachedOrbit(report.findings)) findings.replaceChildren(...sorted.map((f) => line(f, true)));
      else {
        // It never reached orbit: say so, then what the design would have done, never what it did.
        const orbit = sorted.filter((f) => f.kind === 'orbit');
        const rest = sorted.filter((f) => f.kind !== 'orbit');
        findings.replaceChildren(...orbit.map((f) => line(f, true)), el('li', 'report-not-flown', t('report.notFlown')), ...rest.map((f) => line(f, false)));
      }
      const lines = anomalyLines(report);
      anomaly.replaceChildren(...lines.map((line, i) => el('p', i === 0 ? '' : 'report-anomaly-why', line)));
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
      patchHeading.hidden = patchBox.hidden = !earned;
      patchArt.replaceChildren(...(earned ? [makePatch(earned.patch, company.name, company.logo)] : []));
      patchText.textContent = earned ? t(earned.first ? 'report.patchFirst' : 'report.patchMore') : '';
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
