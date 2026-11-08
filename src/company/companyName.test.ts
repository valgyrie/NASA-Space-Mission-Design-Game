import { describe, expect, it } from 'vitest';
import { NAME_MAX, checkCompanyName } from './companyName';

describe('Company name', () => {
  it('accepts a normal name and tidies spaces', () => {
    expect(checkCompanyName('  Comet   Works ')).toEqual({ ok: true, name: 'Comet Works' });
  });

  it('needs a name', () => {
    expect(checkCompanyName('   ')).toEqual({ ok: false, problem: 'empty' });
  });

  it('needs at least two letters or digits', () => {
    expect(checkCompanyName('A')).toEqual({ ok: false, problem: 'tooShort' });
    expect(checkCompanyName('!!!')).toEqual({ ok: false, problem: 'tooShort' });
  });

  it('limits the length', () => {
    expect(checkCompanyName('x'.repeat(NAME_MAX)).ok).toBe(true);
    expect(checkCompanyName('x'.repeat(NAME_MAX + 1))).toEqual({ ok: false, problem: 'tooLong' });
  });

  it.each(['Shit Rockets', 'sh1t corp', 'a$$hole Aerospace', 'f.u.c.k', 'c u n t labs', 'FUUUCK'])(
    'rejects "%s"',
    (name) => expect(checkCompanyName(name)).toEqual({ ok: false, problem: 'badWord' }),
  );

  it.each(['Cassini Aerospace', 'Uranus Mining', 'Massive Rockets', 'Scunthorpe Space', 'Hancock Launch'])(
    'allows real names that only look rude: "%s"',
    (name) => expect(checkCompanyName(name).ok).toBe(true),
  );
});
