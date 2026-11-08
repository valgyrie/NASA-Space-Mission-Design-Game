import { START_DATE_UTC } from '../game/balance';
import { t } from '../strings';

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
