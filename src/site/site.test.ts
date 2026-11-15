import { describe, expect, it } from 'vitest';
import { RAW_MATERIALS } from '../economy/rawMaterial';
import { type Site, type WaterKind, generateSite, landOf } from './site';
import { checkSeed, normalizeSeed, randomSeed } from './seed';
import { makeRng } from './random';

const seeds = Array.from({ length: 60 }, (_, i) => randomSeed(makeRng(i + 1)));

function share(a: Site, b: Site): number {
  const same = a.tiles.filter((t, i) => t.terrain === b.tiles[i]!.terrain && t.level === b.tiles[i]!.level);
  return same.length / a.tiles.length;
}

describe('Site from a Seed', () => {
  it('gives an identical Site for the same Seed', () => {
    expect(generateSite('K7QXM2')).toEqual(generateSite('K7QXM2'));
  });

  it('gives clearly different Sites for different Seeds', () => {
    for (let i = 1; i < 20; i++) {
      expect(share(generateSite(seeds[0]!), generateSite(seeds[i]!))).toBeLessThan(0.6);
    }
  });

  it('always has Aluminium, Copper and Silicon deposits', () => {
    for (const seed of seeds) {
      const site = generateSite(seed);
      for (const material of RAW_MATERIALS) {
        const tiles = site.tiles.filter((t) => t.deposit === material).length;
        expect(tiles, `${seed} ${material}`).toBeGreaterThanOrEqual(4);
      }
    }
  });

  it('never puts a deposit in water', () => {
    for (const seed of seeds.slice(0, 10)) {
      expect(generateSite(seed).tiles.some((t) => t.deposit && t.terrain === 'water')).toBe(false);
    }
  });

  it('can have a coast, a lake, a river or no water, and the water is really there', () => {
    const kinds = new Set<WaterKind>();
    for (const seed of seeds) {
      const site = generateSite(seed);
      kinds.add(site.water);
      const water = site.tiles.filter((t) => t.terrain === 'water').length;
      if (site.water !== 'none') expect(water, `${seed} ${site.water}`).toBeGreaterThan(30);
    }
    expect(kinds).toEqual(new Set(['coast', 'lake', 'river', 'none']));
  });

  it('is mostly dry, buildable land', () => {
    for (const seed of seeds.slice(0, 20)) {
      const site = generateSite(seed);
      const flat = site.tiles.filter((t) => t.terrain === 'grass' || t.terrain === 'sand').length;
      expect(flat / site.tiles.length, seed).toBeGreaterThan(0.4);
    }
  });
});

describe('land around the Site', () => {
  it('matches the Site exactly where they overlap', () => {
    const site = generateSite('K7QXM2');
    const land = landOf(site);
    site.tiles.forEach((tile, i) => {
      const ground = land.groundAt(i % site.size, Math.floor(i / site.size));
      expect(ground).toEqual({ terrain: tile.terrain, level: tile.level });
    });
  });

  it('carries the coast and the river on past the edge', () => {
    for (const seed of seeds) {
      const site = generateSite(seed);
      if (site.water !== 'coast' && site.water !== 'river') continue;
      const land = landOf(site);
      let outsideWater = 0;
      for (let i = -40; i < site.size + 40; i++) {
        for (const [x, z] of [[i, -20], [i, site.size + 20], [-20, i], [site.size + 20, i]] as const) {
          if (land.groundAt(x, z).terrain === 'water') outsideWater++;
        }
      }
      expect(outsideWater, `${seed} ${site.water}`).toBeGreaterThan(0);
    }
    // Builds the Land round many Sites: slow when the machine is busy (the pre-commit hook), so a longer timeout.
  }, 30_000);
});

describe('Seeds', () => {
  it('are short codes without vowels', () => {
    for (const seed of seeds) expect(seed).toMatch(/^[B-DF-HJ-NP-TV-Z2-9]{6}$/);
  });

  it('ignore case, spaces and dashes', () => {
    expect(normalizeSeed(' k7qx-m2 ')).toBe('K7QXM2');
    expect(checkSeed('k7qx-m2')).toEqual({ ok: true, seed: 'K7QXM2' });
  });

  it('reject odd characters, very long codes and bad words', () => {
    expect(checkSeed('hi!')).toEqual({ ok: false, problem: 'seedInvalid' });
    expect(checkSeed('')).toEqual({ ok: false, problem: 'seedInvalid' });
    expect(checkSeed('A'.repeat(13))).toEqual({ ok: false, problem: 'seedInvalid' });
    expect(checkSeed('SH1T')).toEqual({ ok: false, problem: 'badWord' });
  });
});
