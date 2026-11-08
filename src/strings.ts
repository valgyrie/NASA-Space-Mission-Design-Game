/**
 * Every piece of text the player can see lives here, so the game can be translated later.
 * Use `{name}` placeholders for values and fill them with `t()`.
 */
export const STRINGS = {
  'game.title': 'LEAP',
  /** Language and region used to format dates and numbers. */
  'format.locale': 'en-GB',
  /** Money uses US number style ("$1.5M"); the game's money is US dollars. */
  'format.moneyLocale': 'en-US',
  'format.money': '${amount}',
  'format.kg': '{amount} kg',
  'format.perDay': '+{amount}/day',

  'newCompany.heading': 'Start your Company',
  'newCompany.label': 'Company name',
  'newCompany.placeholder': 'e.g. Comet Works',
  'newCompany.note': "Make up a name. Don't use your real full name.",
  'newCompany.seedLabel': 'Seed',
  'newCompany.seedNote': 'The same Seed always makes the same land. Share it with friends.',
  'newCompany.reroll': 'New random Seed',
  'newCompany.rerollIcon': '🎲',
  'newCompany.start': 'Start',
  'newCompany.error.empty': 'Your Company needs a name.',
  'newCompany.error.tooShort': 'Use at least {min} letters.',
  'newCompany.error.tooLong': 'Keep it to {max} characters or fewer.',
  'newCompany.error.badWord': "Let's pick a friendlier name.",
  'newCompany.error.seedInvalid': 'A Seed is letters and numbers only, up to {max}.',
  'newCompany.error.seedBadWord': "Let's pick a different Seed.",

  'hud.company': '{name}',
  'hud.menuIcon': '☰',
  'hud.menu': 'Menu (Esc)',

  'menu.heading': 'Paused',
  'menu.seed': 'Seed',
  'menu.seedNote': 'Share it and friends can play on the same land.',
  'menu.copy': 'Copy',
  'menu.copied': 'Copied',
  'menu.copySeed': 'Copy the Seed to share it',
  'menu.resume': 'Resume',

  'topBar.money': 'Money',
  'topBar.date': 'Date',
  'speed.label': 'Speed',
  'speed.0': '❚❚',
  'speed.0.name': 'Pause (Space)',
  'speed.1': '1×',
  'speed.1.name': 'Normal speed',
  'speed.2': '2×',
  'speed.2.name': 'Double speed',
  'speed.4': '4×',
  'speed.4.name': 'Four times speed',

  'build.mine': 'Mine',
  'build.mineHint': 'Digs up the Raw Material of the Deposit it sits on.',
  'build.placing': 'Click a Deposit to build a Mine. Esc to stop.',
  'build.problem.noDeposit': 'Mines go on a Deposit (the coloured rocks).',
  'build.problem.occupied': "There's already a Mine here.",
  'build.problem.money': 'Not enough money.',

  'material.aluminium': 'Aluminium',
  'material.copper': 'Copper',
  'material.silicon': 'Silicon',
} as const;

export type StringKey = keyof typeof STRINGS;

/** Text for `key`, with each `{placeholder}` replaced by the matching value. */
export function t(key: StringKey, values: Record<string, string | number> = {}): string {
  return STRINGS[key].replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in values ? String(values[name]) : whole,
  );
}
