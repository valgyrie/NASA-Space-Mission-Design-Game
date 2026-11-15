import { describe, expect, it } from 'vitest';
import { HISTORY_CARDS } from './history';
import { KIDS_LINK_IDS, KIDS_LINKS, kidsLinkFor, SITE_SOURCES, SOURCES, VEHICLE_SOURCES } from './sources';
import { tipSource } from './tips';

describe('Explorer reading links', () => {
  it('only point at NASA pages for young readers', () => {
    for (const id of KIDS_LINK_IDS) {
      expect(KIDS_LINKS[id]).toMatch(/^https:\/\/(spaceplace\.nasa\.gov\/.+\/en\/|www\.nasa\.gov\/learning-resources\/for-kids-and-students\/.+-grades-k-4\/)$/);
    }
  });

  it('swap rockets, sites, orbits and missions for a kids page on the same topic', () => {
    expect(kidsLinkFor(VEHICLE_SOURCES.juno1)).toBe('rocket');
    expect(kidsLinkFor(VEHICLE_SOURCES.sls)).toBe('sls');
    for (const url of Object.values(SITE_SOURCES)) expect(kidsLinkFor(url)).toBe('launching');
    expect(kidsLinkFor(SOURCES.orbits)).toBe('orbit');
    expect(kidsLinkFor(HISTORY_CARDS.explorer1Before.learnMore)).toBe('satellite');
  });

  it('hide papers and slide decks', () => {
    for (const url of [SOURCES.segments, SOURCES.sixSteps, SOURCES.cml, SOURCES.cubesat101, tipSource('limits'), SOURCES.lcrns, SOURCES.missionViz]) {
      expect(kidsLinkFor(url)).toBeNull();
    }
  });

  it('cover every Real History card', () => {
    for (const card of Object.values(HISTORY_CARDS)) expect(kidsLinkFor(card.learnMore), card.learnMore).not.toBeNull();
  });
});
