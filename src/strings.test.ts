import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { t } from './strings';

describe('strings', () => {
  it('fills placeholders', () => {
    expect(t('newCompany.error.tooLong', { max: 24 })).toBe('Keep it to 24 characters or fewer.');
  });

  it('leaves unknown placeholders visible so they are easy to spot', () => {
    expect(t('newCompany.error.tooLong')).toContain('{max}');
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
