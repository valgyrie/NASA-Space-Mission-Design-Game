import { describe, expect, it } from 'vitest';
import { billow, puffOpacity } from './launchSmoke';

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

describe('billow', () => {
  it('is dense in the middle and nothing at the edge of the card', () => {
    let middle = 0;
    for (let i = 0; i < 4; i++) middle += billow(0.05 * i, -0.04 * i, i * 17.3);
    expect(middle / 4).toBeGreaterThan(0.5);
    for (const [x, y] of [[1, 0], [0, -1], [0.75, 0.7], [-0.72, -0.72]] as const) expect(billow(x, y, 3)).toBe(0);
  });

  it('stays between 0 and 1', () => {
    for (let y = -1; y <= 1; y += 0.1) for (let x = -1; x <= 1; x += 0.1) {
      const d = billow(x, y, 5);
      expect(d).toBeGreaterThanOrEqual(0);
      expect(d).toBeLessThanOrEqual(1);
    }
  });
});
