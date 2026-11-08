import { hasBadWord } from '../company/companyName';
import { type Rng } from './random';

/** Letters and digits for random Seeds. No vowels (so no words) and no look-alikes (0/O, 1/I/L). */
const SEED_ALPHABET = 'BCDFGHJKMNPQRSTVWXZ23456789';
export const SEED_LENGTH = 6;
export const SEED_MAX = 12;

/** A fresh random Seed such as "K7QXM2". */
export function randomSeed(rng: Rng = Math.random): string {
  let seed = '';
  for (let i = 0; i < SEED_LENGTH; i++) seed += SEED_ALPHABET[Math.floor(rng() * SEED_ALPHABET.length)];
  return seed;
}

/** Seeds are case-blind and ignore spaces and dashes, so "k7qx-m2" and "K7QXM2" are the same Site. */
export function normalizeSeed(text: string): string {
  return text.toUpperCase().replace(/[\s-]/g, '');
}

export type SeedCheck = { ok: true; seed: string } | { ok: false; problem: 'seedInvalid' | 'badWord' };

/** A typed Seed must be 1–12 letters or digits, and must not spell a bad word (Seeds are shared). */
export function checkSeed(text: string): SeedCheck {
  const seed = normalizeSeed(text);
  if (!/^[A-Z0-9]+$/.test(seed) || seed.length > SEED_MAX) return { ok: false, problem: 'seedInvalid' };
  if (hasBadWord(seed)) return { ok: false, problem: 'badWord' };
  return { ok: true, seed };
}
