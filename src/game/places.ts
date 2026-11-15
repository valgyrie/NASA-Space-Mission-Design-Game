import { CLIMATE_CHARS, CLIMATE_ROWS, CLIMATE_SCALES, LAUNCH_WEATHER_2025, US_ROWS } from './placeData';
import { LAUNCH_WEATHER, SHIPPING, START_DATE_UTC } from './balance';
import { LAUNCH_SITES, type LaunchSiteId } from './launchVehicles';
import { type Surface, surfaceAt } from '../world/earthTexture';
import type { SiteClimate } from '../site/site';
import { type Rng, hashText, makeRng } from '../site/random';

/**
 * Real places (ticket 16): where the Company starts, the real climate there (NASA POWER, 2025), how that
 * shapes the Site, Shipping by distance, and the weather on Launch day at the Launch Site.
 */

/**
 * How the start was chosen. Campaign: the Historic start (JPL), anywhere in the US, or anywhere on Earth
 * (alternate history). `legacy`: a save from before real places; its Site keeps the old made-up climate.
 */
export const START_KINDS = ['historic', 'us', 'anywhere'] as const;
export type StartKind = (typeof START_KINDS)[number] | 'legacy';

export interface Place {
  /** Degrees, north and east positive. */
  lat: number;
  lon: number;
  start: StartKind;
}

/** JPL, Pasadena, California, where Explorer 1 was built: the Historic start. */
export const JPL: Place = { lat: 34.2, lon: -118.17, start: 'historic' };

/** Yearly averages for 2025 from NASA POWER. */
export interface Climate {
  /** Sunshine reaching the ground, kWh per m² per day. */
  sunKwh: number;
  /** Temperature at 2 m, °C. */
  tempC: number;
  /** Wind at 2 m, m/s. */
  windMs: number;
  /** Rain, mm per day. */
  rainMm: number;
  /** Ground height above sea level, m. */
  heightM: number;
}

const CELL = 2;
const ROWS = 180 / CELL;
const COLS = 360 / CELL;

function cellOf(lat: number, lon: number): { row: number; col: number } {
  const row = Math.min(ROWS - 1, Math.max(0, Math.floor((90 - lat) / CELL)));
  const col = (((Math.floor((lon + 180) / CELL) % COLS) + COLS) % COLS) as number;
  return { row, col };
}

function valueAt(key: keyof typeof CLIMATE_SCALES, row: number, col: number): number | null {
  const c = CLIMATE_ROWS[key][row]?.[col];
  if (!c || c === '.') return null;
  const { low, step } = CLIMATE_SCALES[key];
  return low + step * CLIMATE_CHARS.indexOf(c);
}

/** The 2025 climate at a spot, or null over the sea. Uses the nearest land cell for spots on a coast. */
export function climateAt(lat: number, lon: number): Climate | null {
  const { row, col } = cellOf(lat, lon);
  for (const [dr, dc] of [[0, 0], [0, 1], [0, -1], [1, 0], [-1, 0]] as const) {
    const r = row + dr;
    const c = (col + dc + COLS) % COLS;
    const sun = valueAt('sun', r, c);
    if (sun === null) continue;
    return {
      sunKwh: sun,
      tempC: valueAt('temp', r, c)!,
      windMs: valueAt('wind', r, c)!,
      rainMm: valueAt('rain', r, c)!,
      heightM: valueAt('height', r, c)!,
    };
  }
  return null;
}

/** The land type at a spot (the globe's own map): forest, desert, mountains, ice… or '.' for sea. */
export function landAt(lat: number, lon: number): Surface {
  return surfaceAt(lat, lon);
}

const US_GRID: string[] = US_ROWS.map((row) =>
  [...row.matchAll(/([u.])(\d*)/g)].map(([, c, n]) => c!.repeat(n ? Number(n) : 1)).join(''),
);

export function isInUs(lat: number, lon: number): boolean {
  const row = Math.min(179, Math.max(0, Math.floor(90 - lat)));
  const col = ((Math.floor(lon + 180) % 360) + 360) % 360;
  return US_GRID[row]?.[col] === 'u';
}

/** Why a spot can't be a start, or null if it can. */
export type PlaceProblem = 'sea' | 'notUs' | null;

export function placeProblem(lat: number, lon: number, start: StartKind): PlaceProblem {
  if (landAt(lat, lon) === '.' || !climateAt(lat, lon)) return 'sea';
  if (start === 'us' && !isInUs(lat, lon)) return 'notUs';
  return null;
}

/** Sea within one grid step: the Site has a coast. */
export function isCoastal(lat: number, lon: number): boolean {
  for (let dlat = -1; dlat <= 1; dlat++) {
    for (let dlon = -1; dlon <= 1; dlon++) {
      if (landAt(lat + dlat, lon + dlon) === '.') return true;
    }
  }
  return false;
}

/** A random land spot for a kind of start (the Historic start is always JPL). */
export function randomPlace(start: StartKind, rng: Rng = Math.random): Place {
  if (start === 'historic' || start === 'legacy') return { ...JPL, start };
  for (let tries = 0; tries < 5000; tries++) {
    // Even over the globe's surface: latitude from the sine. Not too near the poles.
    const lat = (Math.asin(rng() * 2 - 1) * 180) / Math.PI;
    const lon = rng() * 360 - 180;
    if (Math.abs(lat) > 72) continue;
    if (placeProblem(lat, lon, start) === null) return { lat: round2(lat), lon: round2(lon), start };
  }
  return { ...JPL, start };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/**
 * How the real place shapes the Site (GDD §4): rain sets how dry the land is, a sea nearby gives a coast,
 * high or mountain land gives more hills (and Copper), cold land is snowy. Game rules on real numbers.
 */
export function siteClimateFor(place: Place): SiteClimate | undefined {
  if (place.start === 'legacy') return undefined;
  const c = climateAt(place.lat, place.lon);
  const land = landAt(place.lat, place.lon);
  const rain = c?.rainMm ?? 2;
  const temp = c?.tempC ?? 12;
  const height = c?.heightM ?? 200;
  let dryness = clamp01(1 - rain / 3);
  if (land === 'd') dryness = Math.max(dryness, 0.85);
  let relief = 0;
  if (land === 'm' || height > 1500) relief = 1;
  else if (height > 600) relief = 0.5;
  else if (land === 's' || land === 'd' || height < 100) relief = -0.4;
  let snow = clamp01((3 - temp) / 10);
  if (land === 'i') snow = 1;
  return {
    dryness: Math.round(dryness * 100) / 100,
    water: isCoastal(place.lat, place.lon) ? 'coast' : 'inland',
    relief,
    snow: Math.round(snow * 100) / 100,
  };
}

/** Great-circle distance between two spots, km. */
export function distanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** What shipping a Spacecraft from the Site to a Launch Site costs, and how many days it takes (balance.ts). */
export function shippingTo(place: Place, site: LaunchSiteId): { km: number; cost: number; days: number } {
  const km = distanceKm(place, LAUNCH_SITES[site]);
  const cost = Math.round((SHIPPING.baseCost + km * SHIPPING.perKm) / 1000) * 1000;
  const days = Math.ceil(km / SHIPPING.kmPerDay) + SHIPPING.loadDays;
  return { km: Math.round(km), cost, days };
}

// ---- Launch weather ----

/** The weather at a Launch Site on a Game day, and whether it Scrubs the Launch. */
export interface Weather {
  /** Strongest wind at 10 m, m/s. */
  windMs: number;
  /** Rain over the day, mm. */
  rainMm: number;
  /** Top temperature, °C. */
  hotC: number;
  /** What Scrubs the Launch, or null when it can go. */
  scrub: 'wind' | 'lightning' | null;
}

/** Day of the year (0–364) of a Game day; 29 February counts as the 28th. The weather repeats 2025's. */
export function dayOfYear(day: number): number {
  const date = new Date(START_DATE_UTC + Math.floor(day) * 86_400_000);
  const start = Date.UTC(date.getUTCFullYear(), 0, 1);
  let n = Math.round((date.getTime() - start) / 86_400_000);
  const leap = new Date(Date.UTC(date.getUTCFullYear(), 1, 29)).getUTCDate() === 29;
  if (leap && n >= 59) n -= 1;
  return Math.min(364, n);
}

/** The weather on a Game day: the real 2025 weather on the same date at that Launch Site (NASA POWER). */
export function weatherOn(site: LaunchSiteId, day: number): Weather {
  const d = dayOfYear(day);
  const data = LAUNCH_WEATHER_2025[LAUNCH_SITES[site].weatherFrom ?? (site as keyof typeof LAUNCH_WEATHER_2025)];
  const windMs = data.wind[d]!;
  const rainMm = data.rain[d]!;
  const hotC = data.hot[d]!;
  const storm = rainMm >= LAUNCH_WEATHER.stormRainMm && hotC >= LAUNCH_WEATHER.stormHotC;
  const scrub = storm ? 'lightning' : windMs > LAUNCH_WEATHER.windLimitMs ? 'wind' : null;
  return { windMs, rainMm, hotC, scrub };
}

/** The Launch Window advisor's pick: the best day to Launch from `fromDay` on, and why. */
export interface LaunchAdvice {
  day: number;
  weather: Weather;
  /** Why this day: calm and dry, or just within the limits. */
  reason: 'calm' | 'withinLimits';
}

/**
 * Look ahead `LAUNCH_WEATHER.adviseDays` days and pick the first calm, dry day (wind under two thirds of the
 * limit, under 2 mm of rain); failing that the first day within the limits; null if every day Scrubs.
 */
export function adviseLaunch(site: LaunchSiteId, fromDay: number): LaunchAdvice | null {
  const from = Math.floor(fromDay);
  let fallback: LaunchAdvice | null = null;
  for (let day = from; day < from + LAUNCH_WEATHER.adviseDays; day++) {
    const weather = weatherOn(site, day);
    if (weather.scrub) continue;
    if (weather.windMs < (LAUNCH_WEATHER.windLimitMs * 2) / 3 && weather.rainMm < 2) return { day, weather, reason: 'calm' };
    fallback ??= { day, weather, reason: 'withinLimits' };
  }
  return fallback;
}

/** A Random start: a new spot drawn from a number, so tests can repeat it. */
export function placeFromNumber(start: StartKind, n: string): Place {
  return randomPlace(start, makeRng(hashText(n)));
}
