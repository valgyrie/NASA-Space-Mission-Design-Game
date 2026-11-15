import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { NOT_SHORT_VARIANTS, STRINGS, type StringKey, shortKey, t, textFor } from './strings';

describe('strings', () => {
  it('fills placeholders', () => {
    expect(t('newCompany.error.tooLong', { max: 24 })).toBe('Keep it to 24 characters or fewer.');
  });

  it('leaves unknown placeholders visible so they are easy to spot', () => {
    expect(t('newCompany.error.tooLong')).toContain('{max}');
  });
});

describe('Explorer wordings (`<key>.short`)', () => {
  const keys = Object.keys(STRINGS);
  const shorts = keys.filter((k) => k.endsWith('.short') && !NOT_SHORT_VARIANTS.includes(k));
  const base = (k: string) => k.slice(0, -'.short'.length);

  it('every `.short` key has a base key', () => {
    expect(shorts.length).toBeGreaterThan(10);
    expect(shorts.filter((k) => !keys.includes(base(k)))).toEqual([]);
  });

  it('the legacy `.short` keys still exist', () => {
    expect(NOT_SHORT_VARIANTS.filter((k) => !keys.includes(k))).toEqual([]);
  });

  it('uses only placeholders its base key fills', () => {
    const holes = (k: string) => [...STRINGS[k as StringKey].matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
    for (const k of shorts) {
      for (const hole of holes(k)) expect(holes(base(k)), k).toContain(hole);
    }
  });

  it('reads the short wording in Explorer, the full one in Mission Director', () => {
    expect(textFor('slot.bus.why', true)).toBe(t('slot.bus.why.short'));
    expect(textFor('slot.bus.why', false)).toBe(t('slot.bus.why'));
    expect(textFor('designer.heading', true)).toBe(t('designer.heading'));
    expect(textFor('planner.step.vehicle', true)).toBe(t('planner.step.vehicle.short'));
  });

  it('never treats a name or a not-met line as an Explorer wording', () => {
    expect(shortKey('launchSite.wallops')).toBeNull();
    expect(textFor('launchSite.wallops', true)).toBe(t('launchSite.wallops'));
  });
});

/** All .ts files under src, except tests and the strings file itself. */
function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    const isSource = path.endsWith('.ts') && !path.endsWith('.test.ts') && !path.endsWith('strings.ts');
    return isSource ? [path] : [];
  });
}

describe('player-facing text', () => {
  it('is never written as a literal outside strings.ts', () => {
    // Text reaches the screen through these DOM properties; their value must come from t().
    const textSink =
      /\.(textContent|innerText|innerHTML|placeholder|title|alt|ariaLabel|value)\s*=\s*['"`]\s*[A-Za-z]/;
    const offenders = sourceFiles('src').flatMap((file) =>
      readFileSync(file, 'utf8')
        .split('\n')
        .map((line, i) => ({ line: line.trim(), where: `${file}:${i + 1}` }))
        .filter(({ line }) => textSink.test(line)),
    );
    expect(offenders).toEqual([]);
  });

  it('keeps index.html free of visible text', () => {
    const html = readFileSync('index.html', 'utf8');
    const body = html.slice(html.indexOf('<body'));
    expect(body.replace(/<[^>]*>/g, '').trim()).toBe('');
  });
});
