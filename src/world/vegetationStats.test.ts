import { it } from 'vitest';
import { generateSite, landOf } from '../site/site';
import { buildGround } from './ground';
import { TREE_KINDS, treeGeometries, triangleCount } from './treeModels';
import { placeVegetation } from './vegetationPlacement';
it('stats', () => {
  for (const k of TREE_KINDS) console.log(k, triangleCount(treeGeometries(k, 0)[0]!), triangleCount(treeGeometries(k, 1)[0]!));
  for (const [name, c] of [['temp', { dryness: 0.25, water: 'coast', relief: 0.3 }], ['desert', { dryness: 0.9, water: 'coast', relief: 0 }], ['snow', { dryness: 0.2, water: 'inland', relief: 0.4, snow: 0.9 }]] as const) {
    const site = generateSite('stats-' + name, c as never);
    const t0 = Date.now();
    const s = placeVegetation(buildGround(site, landOf(site)), site);
    const ms = Date.now() - t0;
    const by: Record<string, number> = {};
    let tris = 0;
    for (const p of s) { by[p.kind + p.lod] = (by[p.kind + p.lod] ?? 0) + 1; tris += triangleCount(treeGeometries(p.kind, p.lod)[p.variant]!); }
    console.log(name, s.length, 'tris', tris, ms + 'ms', JSON.stringify(by));
  }
});
import { placeRocks } from './sceneryRocks';
it('rocks', () => {
  for (const [name, c] of [['temp', { dryness: 0.25, water: 'coast', relief: 0.3 }], ['mount', { dryness: 0.3, water: 'inland', relief: 1 }], ['desert', { dryness: 0.9, water: 'coast', relief: 0 }]] as const) {
    const site = generateSite('stats-' + name, c as never);
    const t0 = Date.now();
    const r = placeRocks(buildGround(site, landOf(site)), site);
    console.log('rocks', name, r.length, Date.now() - t0 + 'ms');
  }
});
