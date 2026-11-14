import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { t } from '../strings';
import { LOADING_TIPS, TIP_PAGES, type TipId, randomLoadingTip, tipSource } from './tips';

describe('CubeSat 101 tips', () => {
  it('can pick every loading tip, including the first and last, with no unrelated advice', () => {
    expect(randomLoadingTip(() => 0)).toBe(LOADING_TIPS[0]);
    expect(randomLoadingTip(() => 0.999999)).toBe(LOADING_TIPS.at(-1));
    const picked = LOADING_TIPS.map((_, i) => randomLoadingTip(() => (i + 0.5) / LOADING_TIPS.length));
    expect(picked).toEqual(LOADING_TIPS);
  });

  it('links each tip to the page containing its advice in the stored handbook', () => {
    const pages = readFileSync('docs/research/sources/cubesat-101.txt', 'utf8').split('\f');
    const passages: Record<TipId, string> = {
      simple: 'KEEP IT SIMPLE',
      familiar: 'USE FAMILIAR COMPONENTS',
      limits: 'DO NOT DESIGN TO THE LIMITS OF THE ENVELOPE',
      accessible: 'IMPORTANT COMPONENTS SHOULD BE ON THE EXTERIOR',
      schedule: 'pad your build schedule',
      panel: 'DOUBLE UP ON THAT BURN WIRE',
      groundStation: 'Launching with an inadequate ground station is a mission killer.',
      scrub: 'scrubs are common due to weather and other factors.',
    };
    for (const id of Object.keys(TIP_PAGES) as TipId[]) {
      expect(t(`tip.${id}`).length).toBeGreaterThan(20);
      expect(t('tip.source', { page: TIP_PAGES[id] })).toContain(`p. ${TIP_PAGES[id]}`);
      const source = new URL(tipSource(id));
      expect(source.hostname).toMatch(/(^|\.)nasa.gov$/);
      expect(source.hash).toBe(`#page=${TIP_PAGES[id] + 8}`);
      const page = pages[Number(source.hash.slice('#page='.length)) - 1]!;
      expect(page.replace(/\s+/g, ' ')).toContain(passages[id]);
    }
  });
});
