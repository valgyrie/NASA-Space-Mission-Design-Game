import { START_DATE_UTC } from '../game/balance';
import { type StringKey, t } from '../strings';
import { contractById, type ContractId, type MilestoneId } from '../game/contracts';

/** One translated name throughout the board, designer, tracker, report, patches and Space view. */
export function contractText(id: ContractId, field: 'name' | 'client' | 'objective' | 'need' = 'name'): string {
  const contract = contractById(id);
  // A question Contract is named after its question and says who asked it.
  if (contract.question && field !== 'objective') return t(`question.${contract.question}.${field}`);
  // Generated Contracts name a kind of person and why they need the Data (ticket 42); Milestones have no need line.
  if (contract.template && contract.need !== undefined && (field === 'client' || field === 'need')) {
    return t(`contract.${contract.template}.need.${contract.need}.${field === 'need' ? 'line' : 'client'}` as StringKey);
  }
  if (field === 'need') return '';
  const key = contract.template ?? id as MilestoneId;
  return t(`contract.${key}.${field}` as StringKey, { n: Number(id.slice(5)) + 1 });
}

const locale = t('format.locale');
const moneyFormat = new Intl.NumberFormat(t('format.moneyLocale'), { notation: 'compact', maximumFractionDigits: 2 });
const kgFormat = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
const dateFormat = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

/** "$1.85M" */
export function formatMoney(dollars: number): string {
  return t('format.money', { amount: moneyFormat.format(dollars) });
}

/** "1,240 kg" (whole kilograms, rounded down so stock never looks bigger than it is) */
export function formatKg(kg: number): string {
  return t('format.kg', { amount: kgFormat.format(Math.floor(kg)) });
}

/** "+20/day" */
export function formatPerDay(kg: number): string {
  return t('format.perDay', { amount: kgFormat.format(kg) });
}

/** The Game date for a number of game days since the start: "12 Mar 1958". */
export function formatGameDate(day: number): string {
  return dateFormat.format(new Date(START_DATE_UTC + Math.floor(day) * 86_400_000));
}

const realDayFormat = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const realMonthFormat = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' });

/** A real calendar date: "23 May 1958" from `1958-05-23`, or "April 1969" from `1969-04` when only the month is known. */
export function formatRealDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(year!, month! - 1, day ?? 1));
  return (day === undefined ? realMonthFormat : realDayFormat).format(date);
}

/** "2,000" */
export function formatNumber(n: number): string {
  return kgFormat.format(n);
}

/** "320 / 500 kg" (used rounded down) */
export function formatStorage(used: number, capacity: number): string {
  return t('format.storage', { used: kgFormat.format(Math.floor(used)), capacity: kgFormat.format(capacity) });
}

/** A colour number as CSS: 0x2b4fb3 → "#2b4fb3". */
export function cssColour(hex: number): string {
  return `#${hex.toString(16).padStart(6, '0')}`;
}

const decimalFormat = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
const preciseFormat = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });

/** "11.5": at most one decimal, or two for Advanced's finer Part labels. */
export function formatDecimal(n: number, digits: 1 | 2 = 1): string {
  return (digits === 2 ? preciseFormat : decimalFormat).format(n);
}

/** "1 day", "12 days" */
export function formatDays(n: number): string {
  return n === 1 ? t('format.day') : t('format.days', { amount: kgFormat.format(n) });
}

/** The year of a Game date: 1958. */
export function gameYear(day: number): number {
  return new Date(START_DATE_UTC + Math.floor(day) * 86_400_000).getUTCFullYear();
}
