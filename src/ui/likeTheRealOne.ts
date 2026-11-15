import { contractById } from '../game/contracts';
import type { MissionReport } from '../game/mission';
import { type RealCraft, type RealPower, type RealWorked, realCraftFor } from '../game/realCraft';
import { spacecraftMass } from '../game/spacecraft';
import { t } from '../strings';
import { formatDecimal, formatNumber, formatRealDate } from './format';

/** The player's Spacecraft as the comparison sees it. Null where an old save did not keep it. */
export interface Yours {
  massKg: number | null;
  power: Exclude<RealPower, 'solar'> | null;
  /** Days its Power kept it going, whether that covered the whole Mission, or null when it never reached orbit. */
  worked: { days: number; whole: boolean } | null;
}

/** One row of the table: what is compared, the player's value and the real one's. */
export interface RealRow {
  label: string;
  yours: string;
  real: string;
}

/** What the "Like the real one" section shows at the end of a Mission Report (ticket 36). */
export interface RealComparison {
  craft: RealCraft;
  name: string;
  /** In Free Play the real one is a different mission of the same kind. */
  sameMission: boolean;
  rows: RealRow[];
  /** One plain line comparing them. */
  line: string;
}

/** Read the flown Spacecraft from its report. */
export function yoursFrom(report: MissionReport): Yours {
  const orbit = report.findings.find((f) => f.kind === 'orbit');
  const massKg = orbit?.massKg ?? (report.design ? spacecraftMass(report.design) : null);
  const option = report.design?.power ?? null;
  const power = option === 'batteriesOnly' ? 'batteries' : option === 'solarCells' || option === 'foldOutPanels' ? 'solarAndBatteries' : null;
  let worked: Yours['worked'] = null;
  // Reached orbit: the rest of the flight happened (missionReport.ts reachedOrbit; not imported, to avoid a cycle).
  if (report.findings.some((f) => f.kind === 'orbit' && f.ok)) {
    const p = report.findings.find((f) => f.kind === 'power');
    if (p && p.kind === 'power') {
      const whole = p.lastsDays === null || p.lastsDays >= p.needDays;
      worked = { days: whole ? p.needDays : Math.floor(p.lastsDays!), whole };
    }
  }
  return { massKg, power, worked };
}

const kg = (n: number) => (Number.isInteger(n) ? formatNumber(n) : formatDecimal(n, 2));

function workedText(w: RealWorked): string {
  return 'days' in w ? t('report.real.worked.days', { days: formatNumber(w.days) }) : t('report.real.worked.until', { date: formatRealDate(w.until) });
}

function yourWorkedText(y: Yours): string {
  if (!y.worked) return t('report.real.worked.notFlown');
  const days = formatNumber(y.worked.days);
  return t(y.worked.whole ? 'report.real.worked.whole' : 'report.real.worked.ranOut', { days });
}

/** Mass, then Power, then how long the real one worked: each part only when both sides are known. */
export function comparisonLine(y: Yours, craft: RealCraft, name: string, explorer = false): string {
  const parts: string[] = [];
  // Explorer shows no kilograms.
  if (!explorer && y.massKg !== null && craft.massKg) {
    const diff = y.massKg - craft.massKg.value;
    // Within half a kilogram or 5% reads as the same: Part Marks move the mass a little from flight to flight.
    const same = Math.abs(diff) < Math.max(0.5, craft.massKg.value * 0.05);
    const amount = Math.abs(diff) < 10 ? formatDecimal(Math.abs(diff)) : formatNumber(Math.round(Math.abs(diff)));
    parts.push(same ? t('report.real.sameMass') : t(diff < 0 ? 'report.real.lighter' : 'report.real.heavier', { kg: amount }));
  }
  const real = craft.power?.value;
  if (real) {
    const batteries = real === 'batteries';
    const same = y.power !== null && (y.power === 'batteries') === batteries;
    if (batteries) parts.push(t(same ? 'report.real.alsoBatteries' : 'report.real.onlyBatteries', { name }));
    else parts.push(t(same ? 'report.real.alsoSolar' : 'report.real.usedSolar', { name }));
  }
  const w = craft.worked?.value;
  if (w) {
    if ('days' in w) parts.push(t('report.real.lastedDays', { days: formatNumber(w.days) }));
    else parts.push(t(real === 'batteries' ? 'report.real.batteriesUntil' : 'report.real.lastedUntil', { date: formatRealDate(w.until) }));
  }
  return parts.join(' ');
}

/** The real Spacecraft beside the player's, with only the figures that have a source. */
export function likeTheRealOne(report: MissionReport, explorer = false): RealComparison | null {
  const craft = realCraftFor(report.contract);
  if (!craft) return null;
  const name = t(`real.${craft.id}.name`);
  const y = yoursFrom(report);
  const unknown = t('report.real.unknown');
  const rows: RealRow[] = [];
  if (craft.massKg) {
    rows.push({
      label: t('report.real.mass'),
      yours: y.massKg === null ? unknown : t('report.real.kg', { kg: formatDecimal(y.massKg) }),
      real: t('report.real.kg', { kg: kg(craft.massKg.value) }),
    });
  }
  if (craft.power) {
    rows.push({
      label: t('report.real.power'),
      yours: y.power ? t(`report.real.power.${y.power}`) : unknown,
      real: t(`report.real.power.${craft.power.value}`),
    });
  }
  if (craft.worked) rows.push({ label: t('report.real.worked'), yours: yourWorkedText(y), real: workedText(craft.worked.value) });
  return { craft, name, sameMission: !contractIsGenerated(report), rows, line: comparisonLine(y, craft, name, explorer) };
}

function contractIsGenerated(report: MissionReport): boolean {
  return contractById(report.contract).kind === 'generated';
}
