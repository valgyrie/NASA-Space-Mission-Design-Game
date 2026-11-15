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

  it('can pick each of the rockets', () => {
    const n = LAUNCH_VEHICLE_IDS.length;
    const seen = new Set(LAUNCH_VEHICLE_IDS.map((_, i) => pickRocket(null, () => (i + 0.5) / n)));
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
