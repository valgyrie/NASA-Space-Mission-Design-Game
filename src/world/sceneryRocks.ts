import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { hashText, makeNoise, makeRng } from '../site/random';
import type { Site } from '../site/site';
import { type Ground, WATER_Y, squareBounds } from './ground';
import { canGrow } from './vegetationPlacement';

/**
 * Boulders and loose stones on the land: many on hillsides and mountains, a few in open grass and deserts, none on
 * water, pads, the Site's border band or near Deposits (whose ore rocks must stay easy to spot). A light shape
 * (80 triangles, smooth-shaded), so hundreds cost little.
 */

export interface RockSpot {
  x: number;
  y: number;
  z: number;
  /** Size across (world units) and height compared with it. */
  size: number;
  flat: number;
  yaw: number;
  tilt: number;
  /** Grey-brown shade (0–1, sRGB). */
  shade: [number, number, number];
}

/** How far past the Site's edge boulders lie (tiles). */
export const ROCK_REACH = 40;
/** Clear distance round a Deposit (tiles): its own ore rocks are the only stones there. */
const DEPOSIT_CLEAR = 2.5;

/** Repeatable 0–1 number for a whole-number 3D point. */
function hash3(x: number, y: number, z: number): number {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

let shape: THREE.BufferGeometry | null = null;

/** A weathered boulder about 1 unit across resting on y = 0: a lumpy, faceted ball, flatter underneath, darker low down. */
export function boulderShape(): THREE.BufferGeometry {
  if (shape) return shape;
  const g = new THREE.IcosahedronGeometry(0.5, 1);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  // Shared corners get the same bump: key by rounded position.
  const bump = (p: THREE.Vector3) => 0.78 + hash3(Math.round(p.x * 97), Math.round(p.y * 97), Math.round(p.z * 97)) * 0.32;
  const colour: number[] = [];
  for (let k = 0; k < pos.count; k++) {
    v.fromBufferAttribute(pos, k);
    v.multiplyScalar(bump(v));
    // A broken face on one side and a flattened base.
    if (v.x > 0.32) v.x = 0.32 + (v.x - 0.32) * 0.3;
    v.y = Math.max(v.y * 0.8, -0.18);
    pos.setXYZ(k, v.x, v.y + 0.18, v.z);
    const s = 0.62 + (v.y + 0.18) * 0.7;
    colour.push(s, s, s);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(colour, 3));
  g.deleteAttribute('uv');
  g.deleteAttribute('normal');
  const merged = mergeVertices(g);
  g.dispose();
  merged.computeVertexNormals();
  merged.computeBoundingSphere();
  shape = merged;
  return merged;
}

/** Every boulder of a Site and the land near it; the same for the same Seed. */
export function placeRocks(ground: Ground, site: Site): RockSpot[] {
  const seed = hashText(`${site.seed}:rocks`);
  const clusters = makeNoise(makeRng(seed), 6);
  const half = site.size / 2;
  const sq = squareBounds(site);
  const x0 = sq.from - half;
  const x1 = sq.to - half;
  const outside = (x: number, z: number) => Math.max(x0 - x, x - x1, x0 - z, z - x1, 0);
  const dry = ground.land.climate.dryness;
  const spots: RockSpot[] = [];
  for (let cz = x0 - ROCK_REACH; cz < x1 + ROCK_REACH; cz++)
    for (let cx = x0 - ROCK_REACH; cx < x1 + ROCK_REACH; cx++) {
      const rng = makeRng(seed ^ Math.imul(cx | 0, 73856093) ^ Math.imul(cz | 0, 19349663));
      const x = cx + rng();
      const z = cz + rng();
      const terrain = ground.terrainAt(x, z);
      if (terrain === 'water') continue;
      const slope = ground.slopeAt(x, z);
      const base = terrain === 'mountain' ? 0.35 : terrain === 'hills' ? 0.12 : terrain === 'sand' ? 0.03 + dry * 0.05 : 0.02 + dry * 0.04;
      const chance = base * (0.4 + Math.min(1, slope * 3)) * (0.3 + clusters(x, z) * 1.6) * (outside(x, z) === 0 ? 0.5 : 1);
      if (rng() >= chance) continue;
      if (ground.heightAt(x, z) < WATER_Y + 0.05 || ground.onPad(x, z, 0.3) || slope > 0.6) continue;
      // Like trees, but rocks may sit on steep ground: test the rest with the slope check passed.
      if (slope <= 0.3 ? !canGrow(ground, site, x, z) : false) continue;
      let nearOre = false;
      for (const [dx, dz] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]] as const)
        if (ground.depositAt(x + dx * DEPOSIT_CLEAR, z + dz * DEPOSIT_CLEAR)) nearOre = true;
      if (nearOre) continue;
      const big = rng() < 0.25;
      const size = big ? 0.26 + rng() * 0.26 : 0.1 + rng() * 0.12;
      // A little darker and warmer than the bare rock photo, so they sit in the grass instead of shining like limestone.
      const s = 0.34 + rng() * 0.14;
      const warm = 0.03 + dry * 0.08 + (rng() - 0.5) * 0.05;
      spots.push({
        x,
        y: ground.heightAt(x, z) - size * (0.12 + slope * 0.4),
        z,
        size,
        flat: 0.6 + rng() * 0.5,
        yaw: rng() * Math.PI * 2,
        tilt: (rng() - 0.5) * 0.5,
        shade: [s * (1 + warm), s, s * (1 - warm)],
      });
      // A few stones round a big one.
      if (big)
        for (let k = 0; k < 3; k++) {
          const a = rng() * Math.PI * 2;
          const r = size * (0.7 + rng());
          const sx = x + Math.cos(a) * r;
          const sz = z + Math.sin(a) * r;
          if (ground.heightAt(sx, sz) < WATER_Y + 0.05 || ground.onPad(sx, sz, 0.3)) continue;
          const ss = 0.04 + rng() * 0.05;
          spots.push({ x: sx, y: ground.heightAt(sx, sz) - ss * 0.2, z: sz, size: ss, flat: 0.6 + rng() * 0.4, yaw: rng() * 6.28, tilt: 0, shade: [s, s, s] });
        }
    }
  return spots;
}
