/**
 * Every piece of text the player can see lives here, so the game can be translated later.
 * Use `{name}` placeholders for values and fill them with `t()`.
 */
export const STRINGS = {
  'game.title': 'LEAP',

  'newCompany.heading': 'Start your Company',
  'newCompany.label': 'Company name',
  'newCompany.placeholder': 'e.g. Comet Works',
  'newCompany.note': "Make up a name. Don't use your real full name.",
  'newCompany.start': 'Start',
  'newCompany.error.empty': 'Your Company needs a name.',
  'newCompany.error.tooShort': 'Use at least {min} letters.',
  'newCompany.error.tooLong': 'Keep it to {max} characters or fewer.',
  'newCompany.error.badWord': "Let's pick a friendlier name.",

  'hud.company': '{name}',
} as const;

export type StringKey = keyof typeof STRINGS;

/** Text for `key`, with each `{placeholder}` replaced by the matching value. */
export function t(key: StringKey, values: Record<string, string | number> = {}): string {
  return STRINGS[key].replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in values ? String(values[name]) : whole,
  );
}
