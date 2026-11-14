import { describe, expect, it } from 'vitest';
import { puffOpacity } from './launchSmoke';

describe('puffOpacity', () => {
  it('is nothing before a puff starts and after it ends', () => {
    expect(puffOpacity(0, 10)).toBe(0);
    expect(puffOpacity(10, 10)).toBe(0);
    expect(puffOpacity(12, 10)).toBe(0);
  });

  it('is nearly full a fifth of a second in, however long the puff lives', () => {
    expect(puffOpacity(0.2, 12)).toBeGreaterThan(0.95);
    expect(puffOpacity(0.2, 3)).toBeGreaterThan(0.85);
  });

  it('thins out steadily toward the end', () => {
    expect(puffOpacity(5, 10)).toBeGreaterThan(puffOpacity(8, 10));
    expect(puffOpacity(9.9, 10)).toBeLessThan(0.01);
  });
});
