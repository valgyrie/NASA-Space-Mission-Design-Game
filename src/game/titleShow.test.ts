import { describe, expect, it } from 'vitest';
import { showLength } from './ascent';
import { LAUNCH_VEHICLE_IDS } from './launchVehicles';
import { TITLE_COUNTDOWN_S, pickRocket, titleShow } from './titleShow';

describe('the Launch behind the main menu', () => {
  it('never picks the same rocket twice in a row', () => {
    for (const previous of LAUNCH_VEHICLE_IDS) {
      for (const r of [0, 0.3, 0.6, 0.999]) expect(pickRocket(previous, () => r)).not.toBe(previous);
    }
  });

  it('can pick each of the five rockets', () => {
    const seen = new Set([0, 0.25, 0.5, 0.75].map((r) => pickRocket(null, () => r)));
    seen.add(pickRocket(null, () => 0.99));
    expect(seen.size).toBe(LAUNCH_VEHICLE_IDS.length);
  });

  it('waits on the pad, climbs and fires every stage, and stops before orbit', () => {
    for (const id of LAUNCH_VEHICLE_IDS) {
      const show = titleShow(id);
      expect(show[0]).toMatchObject({ phase: 'countdown', from: -TITLE_COUNTDOWN_S, to: 0 });
      expect(show.map((s) => s.phase)).not.toContain('orbit');
      expect(show.at(-1)!.phase).toBe('burn');
      expect(showLength(show)).toBeLessThan(60);
    }
  });
});
