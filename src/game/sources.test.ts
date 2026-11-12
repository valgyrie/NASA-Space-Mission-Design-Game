import { describe, expect, it } from 'vitest';
import { CONTRACT_IDS } from './contracts';
import { missionSource } from './sources';

describe('Mission reading links', () => {
  it('gives every historical Milestone an official NASA reading source', () => {
    for (const id of CONTRACT_IDS) {
      const href = missionSource(id);
      expect(href).not.toBeNull();
      const url = new URL(href!);
      expect(url.protocol).toBe('https:');
      expect(url.hostname).toMatch(/(^|\.)nasa.gov$/);
    }
  });

  it('does not present generated work as a real historical mission', () => {
    expect(missionSource('free-0')).toBeNull();
    expect(missionSource('free-100')).toBeNull();
  });
});
