import { checkSeed } from './seed';
import { JPL, isInUs, type Place } from '../game/places';

/** Include location and the legacy climate flag: a raw Seed alone cannot recreate every Site. */
export function shareSeed(seed: string, place: Place): string {
  return `LEAP1:${seed}:${place.lat}:${place.lon}:${place.start}`;
}
export function readSharedSeed(text: string): { seed: string; place?: Place } | null {
  const raw = text.trim();
  if (!raw.toUpperCase().startsWith('LEAP1:')) {
    const checked = checkSeed(raw);
    return checked.ok ? { seed: checked.seed } : null;
  }
  const bits = raw.split(':');
  if (bits.length !== 5 || !bits[2]?.trim() || !bits[3]?.trim()) return null;
  const checked = checkSeed(bits[1]!);
  const lat = Number(bits[2]);
  const lon = Number(bits[3]);
  const start = bits[4]!.toLowerCase();
  if (!checked.ok || !Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180 ||
    !['historic', 'us', 'anywhere', 'legacy'].includes(start)) return null;
  if (start === 'historic' && (lat !== JPL.lat || lon !== JPL.lon)) return null;
  if (start === 'us' && !isInUs(lat, lon)) return null;
  return { seed: checked.seed, place: { lat, lon, start: start as Place['start'] } };
}
