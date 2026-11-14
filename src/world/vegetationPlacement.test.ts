import { describe, expect, it } from 'vitest';
import { generateSite, landOf, tileAt } from '../site/site';
import { WATER_Y, buildGround, padFor } from './ground';
import { TREE_KINDS, treeGeometries, triangleCount } from './treeModels';
import { DEPOSIT_CLEAR, MAX_SLOPE, placeVegetation } from './vegetationPlacement';

const site = generateSite('trees-test', { dryness: 0.25, water: 'coast', relief: 0.3 });
const ground = buildGround(site, landOf(site), [padFor(site, 20, 20)]);
const spots = placeVegetation(ground, site);
const half = site.size / 2;

describe('vegetation placement', () => {
  it('is the same every time for the same Seed', () => {
    const again = placeVegetation(buildGround(site, landOf(site), [padFor(site, 20, 20)]), site);
    expect(again.length).toBe(spots.length);
    expect(again.slice(0, 50)).toEqual(spots.slice(0, 50));
  });

  it('grows a fair amount, within the triangle budget', () => {
    expect(spots.length).toBeGreaterThan(1500);
    const tris = spots.reduce((sum, s) => sum + triangleCount(treeGeometries(s.kind, s.lod)[s.variant]!), 0);
    expect(tris).toBeLessThan(1_500_000);
  });

  it('keeps clear of water, steep rock, Deposits and building pads', () => {
    for (const s of spots) {
      expect(ground.heightAt(s.x, s.z)).toBeGreaterThan(WATER_Y);
      expect(ground.slopeAt(s.x, s.z)).toBeLessThanOrEqual(MAX_SLOPE);
      expect(ground.onPad(s.x, s.z)).toBe(false);
      for (const [dx, dz] of [[0, 0], [DEPOSIT_CLEAR, 0], [-DEPOSIT_CLEAR, 0], [0, DEPOSIT_CLEAR], [0, -DEPOSIT_CLEAR]] as const)
        expect(ground.depositAt(s.x + dx, s.z + dz)).toBeNull();
    }
  });

  it('leaves the Site more open than the land around it', () => {
    const on = spots.filter((s) => tileAt(site, Math.floor(s.x + half), Math.floor(s.z + half))).length;
    const perTileOn = on / (site.size * site.size);
    const around = spots.filter((s) => Math.max(Math.abs(s.x), Math.abs(s.z)) < half + 40 && !tileAt(site, Math.floor(s.x + half), Math.floor(s.z + half)));
    const perTileAround = around.length / ((site.size + 80) ** 2 - site.size ** 2);
    expect(perTileOn).toBeLessThan(perTileAround * 0.5);
  });

  it('gives a desert scrub, palms and few trees, and a snowy land conifers', () => {
    const desert = generateSite('trees-desert', { dryness: 0.9, water: 'coast', relief: 0 });
    const d = placeVegetation(buildGround(desert, landOf(desert)), desert);
    expect(d.filter((s) => s.kind === 'broadleaf' || s.kind === 'conifer').length).toBe(0);
    expect(d.length).toBeLessThan(spots.length / 2);
    const snowy = generateSite('trees-snow', { dryness: 0.2, water: 'inland', relief: 0.4, snow: 0.9 });
    const n = placeVegetation(buildGround(snowy, landOf(snowy)), snowy);
    const conifers = n.filter((s) => s.kind === 'conifer' || s.kind === 'pine').length;
    const broad = n.filter((s) => s.kind === 'broadleaf' || s.kind === 'oak').length;
    expect(conifers).toBeGreaterThan(broad);
  });

  it('grows cacti among the scrub of hot deserts only', () => {
    const desert = generateSite('trees-desert', { dryness: 0.9, water: 'inland', relief: 0.1 });
    const d = placeVegetation(buildGround(desert, landOf(desert)), desert);
    const cacti = d.filter((s) => s.kind === 'cactus').length;
    const scrub = d.filter((s) => s.kind === 'scrub').length;
    expect(cacti).toBeGreaterThan(0);
    expect(cacti).toBeLessThan(scrub);
    expect(spots.filter((s) => s.kind === 'cactus').length).toBe(0);
  });

  it('has shapes for every kind at both levels of detail', () => {
    for (const kind of TREE_KINDS)
      for (const lod of [0, 1] as const) {
        const g = treeGeometries(kind, lod)[0]!;
        expect(triangleCount(g)).toBeGreaterThanOrEqual(6);
        expect(g.attributes.wind!.count).toBe(g.attributes.position!.count);
      }
  });
});
