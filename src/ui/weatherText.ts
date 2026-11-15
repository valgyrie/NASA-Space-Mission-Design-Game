import { LAUNCH_WEATHER } from '../game/balance';
import type { LaunchSiteId } from '../game/launchVehicles';
import { type LaunchAdvice, type Weather, weatherOn } from '../game/places';
import { t, textFor } from '../strings';
import { formatDecimal, formatGameDate } from './format';

/** "Wind" and Go / Scrub verdict, for one day's weather. */
export function verdictText(w: Weather): string {
  return w.scrub ? t(`weather.scrub.${w.scrub}`) : t('weather.go');
}

/** "12 Feb 1958: wind up to 6.1 m/s, 0.4 mm of rain, 22 °C. Go for Launch." */
export function weatherText(site: LaunchSiteId, day: number, explorer = false): string {
  const w = weatherOn(site, day);
  return textFor('weather.day', explorer, {
    date: formatGameDate(day),
    wind: formatDecimal(w.windMs),
    rain: formatDecimal(w.rainMm),
    hot: Math.round(w.hotC),
    verdict: verdictText(w),
  });
}

/** The Launch Window advisor's line: the day it suggests and why. */
export function adviceText(advice: LaunchAdvice | null, explorer = false): string {
  if (!advice) return textFor('advice.none', explorer, { days: LAUNCH_WEATHER.adviseDays });
  return textFor(`advice.${advice.reason}`, explorer, { date: formatGameDate(advice.day), wind: formatDecimal(advice.weather.windMs) });
}

/** Why the Launch was Scrubbed today, in one or two plain sentences. */
export function scrubText(site: LaunchSiteId, w: Weather): string {
  const name = t(`launchSite.${site}.short`);
  return w.scrub === 'lightning'
    ? t('scrub.lightning', { site: name, rain: formatDecimal(w.rainMm) })
    : t('scrub.wind', { site: name, wind: formatDecimal(w.windMs), limit: LAUNCH_WEATHER.windLimitMs });
}
