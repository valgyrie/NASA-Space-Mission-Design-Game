import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CONTRACT_IDS } from './contracts';
import { t } from '../strings';
import {
  ART_ASSETS, ART_GROUP_IDS, ART_GROUPS, CHALLENGE, DATASET_IDS, DATASETS, missionSource, SOFTWARE, SOFTWARE_IDS,
} from './sources';

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

describe('Real data list', () => {
  it('names every dataset, says where LEAP uses it, credits it and links to it', () => {
    for (const id of DATASET_IDS) {
      for (const part of ['name', 'use', 'credit'] as const) expect(t(`data.${id}.${part}`)).not.toContain('data.');
      expect(new URL(DATASETS[id]).protocol).toBe('https:');
    }
  });
});

describe('Credits', () => {
  it('names the team and the challenge, and credits every piece of software with a link', () => {
    expect(t('credits.team')).not.toBe('');
    expect(new URL(CHALLENGE).hostname).toBe('www.spaceappschallenge.org');
    for (const id of SOFTWARE_IDS) {
      expect(t(`credits.software.${id}`)).not.toContain('credits.');
      expect(new URL(SOFTWARE[id]).protocol).toBe('https:');
    }
  });

  it('credits every third-party texture and technique once, by name, with a link to its page', () => {
    const ids = ART_GROUP_IDS.flatMap((group) => [...ART_GROUPS[group]]);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.sort()).toEqual(Object.keys(ART_ASSETS).sort());
    for (const group of ART_GROUP_IDS) expect(t(`credits.models.${group}`)).not.toContain('credits.');
    for (const id of ids) {
      expect(t(`credits.asset.${id}`)).not.toContain('credits.');
      expect(new URL(ART_ASSETS[id]).protocol).toBe('https:');
    }
  });

  it('lists every Poly Haven and ambientCG texture named in docs/art', () => {
    const docs = readdirSync('docs/art')
      .filter((file) => /^assets-.*\.md$/.test(file))
      .map((file) => readFileSync(`docs/art/${file}`, 'utf8'))
      .join('\n');
    const pages = new Set(docs.match(/https:\/\/(polyhaven\.com|ambientcg\.com)\/a\/\w+/g) ?? []);
    expect(pages.size).toBeGreaterThan(0);
    const credited = new Set(Object.values(ART_ASSETS));
    for (const page of pages) expect(credited, page).toContain(page);
  });
});
