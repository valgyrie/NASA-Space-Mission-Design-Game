import { describe, expect, it } from 'vitest';
import { formatGameDate, formatKg, formatMoney, formatPerDay } from './format';

describe('formatting', () => {
  it('shows money short', () => {
    expect(formatMoney(2_000_000)).toBe('$2M');
    expect(formatMoney(1_850_000)).toBe('$1.85M');
    expect(formatMoney(150_000)).toBe('$150K');
  });

  it('shows whole kilograms, rounded down', () => {
    expect(formatKg(1240.9)).toBe('1,240 kg');
    expect(formatPerDay(20)).toBe('+20/day');
  });

  it('counts the Game date from 1 January 1958', () => {
    expect(formatGameDate(0)).toBe('1 Jan 1958');
    expect(formatGameDate(30.9)).toBe('31 Jan 1958');
    expect(formatGameDate(365)).toBe('1 Jan 1959');
  });
});
