import { RegExpMatcher, englishDataset, englishRecommendedTransformers } from 'obscenity';

export const NAME_MIN = 2;
export const NAME_MAX = 24;

export type NameProblem = 'empty' | 'tooShort' | 'tooLong' | 'badWord';

export type NameCheck = { ok: true; name: string } | { ok: false; problem: NameProblem };

const matcher = new RegExpMatcher({ ...englishDataset.build(), ...englishRecommendedTransformers });

/** True if the name hides a bad word, including spelled out ("f.u.c.k") or in leetspeak. */
export function hasBadWord(name: string): boolean {
  const squashed = name.replace(/[^\p{L}\p{N}$@]/gu, '');
  return matcher.hasMatch(name) || matcher.hasMatch(squashed);
}

/** Tidy a Company name the player typed and say whether it can be used. */
export function checkCompanyName(raw: string): NameCheck {
  const name = raw.replace(/\s+/g, ' ').trim();
  if (name === '') return { ok: false, problem: 'empty' };
  if ([...name].length > NAME_MAX) return { ok: false, problem: 'tooLong' };
  if (name.replace(/[^\p{L}\p{N}]/gu, '').length < NAME_MIN) return { ok: false, problem: 'tooShort' };
  if (hasBadWord(name)) return { ok: false, problem: 'badWord' };
  return { ok: true, name };
}
