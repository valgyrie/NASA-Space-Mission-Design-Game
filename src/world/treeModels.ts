import * as THREE from 'three';
import { type Rng, makeRng } from '../site/random';

/**
 * Shapes of the trees and bushes, made in code once and shared by every Site: trunk and limbs as tapered tubes, the
 * crown as leaf-cluster cards from the foliage atlas (`scripts/blender/build_nature.py`). Card normals point out of
 * the crown, so it is lit like a soft rounded mass rather than flat cards. World units: 1 = one tile (about 10 m).
 *
 * Every shape has an attribute `wind` (x: how far the wind bends it there, 0 at the foot … 1 at the top; y: 1 on leaf
 * cards, which also flutter) and stands on y = 0, about 1 unit tall (instances scale it).
 */

export type TreeKind = 'broadleaf' | 'oak' | 'conifer' | 'pine' | 'bush' | 'scrub' | 'palm';
export const TREE_KINDS: readonly TreeKind[] = ['broadleaf', 'oak', 'conifer', 'pine', 'bush', 'scrub', 'palm'];

/** 0: full detail (on and near the Site), 1: a few big cards (the land around). */
export type TreeLod = 0 | 1;

/** Regions of the foliage atlas (pixels of the 1024 × 1536 picture, y down), as in build_nature.py. */
const ATLAS = {
  beech: { x0: 0, y0: 0, x1: 512, y1: 512 },
  oak: { x0: 512, y0: 0, x1: 1024, y1: 512 },
  needles: { x0: 0, y0: 556, x1: 1024, y1: 724 },
  bark: { x0: 0, y0: 772, x1: 1024, y1: 1020 },
  spruce: { x0: 2, y0: 1026, x1: 254, y1: 1536 },
  pineTree: { x0: 258, y0: 1026, x1: 510, y1: 1536 },
} as const;
type Region = (typeof ATLAS)[keyof typeof ATLAS];

const u = (r: Region, f: number) => (r.x0 + (r.x1 - r.x0) * f) / 1024;
/** f = 0 at the region's bottom edge, 1 at its top (textures are flipped: v = 1 at the picture's top). */
const v = (r: Region, f: number) => 1 - (r.y1 - (r.y1 - r.y0) * f) / 1536;

type V3 = THREE.Vector3;
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

class Builder {
  readonly pos: number[] = [];
  readonly nor: number[] = [];
  readonly uv: number[] = [];
  readonly wind: number[] = [];
  readonly index: number[] = [];

  private vertex(p: V3, n: V3, uu: number, vv: number, bend: number, leaf: number): number {
    this.pos.push(p.x, p.y, p.z);
    this.nor.push(n.x, n.y, n.z);
    this.uv.push(uu, vv);
    this.wind.push(bend, leaf);
    return this.pos.length / 3 - 1;
  }

  /** A tapered tube through `path` with a radius per point; bark mapped round and along it. */
  tube(path: V3[], radius: number[], sides: number, height: number): void {
    const r = ATLAS.bark;
    const rings: number[][] = [];
    let along = 0;
    for (let i = 0; i < path.length; i++) {
      const p = path[i]!;
      if (i > 0) along += p.distanceTo(path[i - 1]!);
      const dir = path[Math.min(i + 1, path.length - 1)]!.clone().sub(path[Math.max(i - 1, 0)]!).normalize();
      const side = Math.abs(dir.y) < 0.95 ? V(0, 1, 0).cross(dir).normalize() : V(1, 0, 0);
      const up = dir.clone().cross(side).normalize();
      const ring: number[] = [];
      for (let k = 0; k <= sides; k++) {
        const a = (k / sides) * Math.PI * 2;
        const n = side.clone().multiplyScalar(Math.cos(a)).addScaledVector(up, Math.sin(a));
        const at = p.clone().addScaledVector(n, radius[i]!);
        const bend = Math.min(1, Math.max(0, at.y / height)) ** 2;
        ring.push(this.vertex(at, n, u(r, k / sides), v(r, Math.min(1, along / 1.2)), bend, 0));
      }
      rings.push(ring);
    }
    for (let i = 0; i + 1 < rings.length; i++)
      for (let k = 0; k < sides; k++) {
        const a = rings[i]![k]!;
        const b = rings[i]![k + 1]!;
        const c = rings[i + 1]![k]!;
        const d = rings[i + 1]![k + 1]!;
        this.index.push(a, c, b, b, c, d);
      }
  }

  /**
   * A card from `base` towards `up` (its length) and `side` (its width), with the given region; `centre` is the
   * middle of the crown: normals lean away from it so the crown is shaded as a whole.
   */
  card(region: Region, base: V3, up: V3, side: V3, length: number, width: number, centre: V3, height: number, round = 0.75): void {
    const corners = [
      [-0.5, 0],
      [0.5, 0],
      [-0.5, 1],
      [0.5, 1],
    ] as const;
    const face = side.clone().cross(up).normalize();
    const ids = corners.map(([s, t]) => {
      const p = base.clone().addScaledVector(side, s * width).addScaledVector(up, t * length);
      const out = p.clone().sub(centre);
      out.y = out.y * 0.8 + 0.25 * Math.max(out.length(), 1e-3);
      const n = out.normalize().multiplyScalar(round).addScaledVector(face, (1 - round) * Math.sign(face.dot(out) || 1)).normalize();
      const bend = Math.min(1, Math.max(0, p.y / height)) ** 2;
      return this.vertex(p, n, u(region, s + 0.5), v(region, t), bend, 1);
    });
    this.index.push(ids[0]!, ids[1]!, ids[2]!, ids[2]!, ids[1]!, ids[3]!);
  }

  geometry(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('wind', new THREE.Float32BufferAttribute(this.wind, 2));
    g.setIndex(this.index);
    g.computeBoundingSphere();
    g.computeBoundingBox();
    return g;
  }
}

/** A random unit vector. */
function randomDir(rng: Rng): V3 {
  const z = rng() * 2 - 1;
  const a = rng() * Math.PI * 2;
  const r = Math.sqrt(1 - z * z);
  return V(r * Math.cos(a), z, r * Math.sin(a));
}

/** A unit vector at right angles to `d`, otherwise random. */
function across(d: V3, rng: Rng): V3 {
  return randomDir(rng).cross(d).normalize();
}

/**
 * A crown of leaf cards in an ellipsoid round `centre` (radii rx, ry), cards pointing outwards from inside it, so
 * the twigs start in the crown and the leaves make a ragged edge.
 */
function crown(b: Builder, rng: Rng, region: Region, centre: V3, rx: number, ry: number, cards: number, size: number, height: number): void {
  for (let i = 0; i < cards; i++) {
    const d = randomDir(rng);
    // Most cards near the shell, some inside so it doesn't look hollow; fewer underneath.
    if (d.y < -0.4 && rng() < 0.5) d.y *= -0.5;
    const shell = 0.55 + 0.45 * Math.sqrt(rng());
    const p = V(centre.x + d.x * rx * shell, centre.y + d.y * ry * shell, centre.z + d.z * rx * shell);
    const out = p.clone().sub(centre).normalize();
    const up = out.addScaledVector(V(0, 1, 0), 0.35).addScaledVector(randomDir(rng), 0.35).normalize();
    const side = across(up, rng);
    const s = size * (0.75 + rng() * 0.5);
    b.card(region, p.clone().addScaledVector(up, -s * 0.45), up, side, s, s, centre, height);
  }
}

/** A broadleaf tree (beech-like or oak-like): trunk, limbs into a rounded crown. About 1 unit tall. */
function broadleaf(seed: number, lod: TreeLod, oak: boolean): THREE.BufferGeometry {
  const rng = makeRng(seed);
  const b = new Builder();
  const h = 1;
  const trunkTop = oak ? 0.36 : 0.42;
  const lean = V((rng() - 0.5) * 0.04, 0, (rng() - 0.5) * 0.04);
  const trunk = [V(0, -0.05, 0), V(0, trunkTop * 0.5, 0).add(lean.clone().multiplyScalar(0.5)), V(0, trunkTop, 0).add(lean)];
  const r0 = oak ? 0.05 : 0.04;
  b.tube(trunk, [r0 * 1.3, r0 * 0.95, r0 * 0.8], lod === 0 ? 7 : 3, h);
  const centre = V(lean.x, oak ? 0.66 : 0.68, lean.z);
  const rx = oak ? 0.36 : 0.29;
  const ry = oak ? 0.27 : 0.31;
  const limbs = lod === 0 ? (oak ? 6 : 5) : 0;
  for (let i = 0; i < limbs; i++) {
    const a = (i / limbs) * Math.PI * 2 + rng() * 0.8;
    const out = V(Math.cos(a), 0, Math.sin(a));
    const start = trunk[2]!.clone();
    const mid = start.clone().addScaledVector(out, rx * 0.35).add(V(0, ry * 0.45, 0));
    const end = centre.clone().addScaledVector(out, rx * (0.65 + rng() * 0.2)).add(V(0, ry * (0.25 + rng() * 0.4), 0));
    b.tube([start, mid, end], [r0 * 0.6, r0 * 0.38, r0 * 0.12], lod === 0 ? 5 : 3, h);
  }
  const region = oak ? ATLAS.oak : ATLAS.beech;
  if (lod === 0) crown(b, rng, region, centre, rx, ry, oak ? 95 : 85, oak ? 0.28 : 0.26, h);
  else crown(b, rng, region, centre, rx * 0.85, ry * 0.85, 12, oak ? 0.56 : 0.52, h);
  return b.geometry();
}

/** Cards standing through the tree's axis, turned evenly: a whole tree drawn from the side, seen from any way round. */
function crossed(b: Builder, region: Region, cards: number, width: number, height: number, turn: number): void {
  for (let k = 0; k < cards; k++) {
    const a = turn + (k / cards) * Math.PI;
    b.card(region, V(0, -0.02, 0), V(0, 1, 0), V(Math.cos(a), 0, Math.sin(a)), height, width, V(0, height * 0.4, 0), 1, 0.85);
  }
}

/**
 * A conifer: a core of crossed cards with the whole tree on them (dense and the right shape from afar) and, in full
 * detail, drooping needle boughs round it so it has depth close up. `pine`: a narrower, fir-like spire.
 */
function conifer(seed: number, lod: TreeLod, pine: boolean): THREE.BufferGeometry {
  const rng = makeRng(seed);
  const b = new Builder();
  const h = 1;
  const region = ATLAS.spruce;
  // The silhouette is half as wide as tall.
  crossed(b, region, lod === 0 ? 2 : 3, pine ? 0.36 : 0.5, 1, rng() * Math.PI);
  if (lod === 1) return b.geometry();
  b.tube([V(0, -0.05, 0), V(0, 0.5, 0), V(0, 0.9, 0)], [0.025, 0.018, 0.006], 5, h);
  const bottom = pine ? 0.2 : 0.12;
  const tiers = 8;
  const boughs = 5;
  for (let t = 0; t < tiers; t++) {
    const f = t / (tiers - 1);
    const y = bottom + (0.88 - bottom) * f;
    const reach = (pine ? 0.17 : 0.24) * (1 - f) ** 0.95 + 0.03;
    for (let k = 0; k < boughs; k++) {
      const a = ((k + rng() * 0.6 + (t % 2) * 0.5) / boughs) * Math.PI * 2;
      const out = V(Math.cos(a), -(pine ? 0.35 : 0.25) - rng() * 0.12, Math.sin(a)).normalize();
      const length = reach * 1.1 * (0.85 + rng() * 0.3);
      const flat = V(-out.z, 0, out.x).normalize().applyAxisAngle(out, (rng() - 0.5) * 0.8);
      b.card(ATLAS.needles, V(0, y, 0), out, flat, length, length * 0.42, V(0, y + 0.1, 0), h, 0.6);
    }
  }
  return b.geometry();
}

/** A bush: a low dome of leaf cards on a few stems. `scrub`: sparser and wider, for dry land. */
function bush(seed: number, lod: TreeLod, scrub: boolean): THREE.BufferGeometry {
  const rng = makeRng(seed);
  const b = new Builder();
  const h = 1;
  for (let i = 0; i < (lod === 0 ? 3 : 1); i++) {
    const out = V(rng() - 0.5, 0, rng() - 0.5).multiplyScalar(0.5);
    b.tube([V(0, -0.05, 0), out.add(V(0, 0.45, 0))], [0.04, 0.015], 3, h);
  }
  const centre = V(0, 0.5, 0);
  const region = scrub ? ATLAS.oak : ATLAS.beech;
  crown(b, rng, region, centre, scrub ? 0.62 : 0.5, 0.42, lod === 0 ? (scrub ? 22 : 34) : 7, lod === 0 ? 0.5 : 0.85, h);
  return b.geometry();
}

/** A palm: a curved, ringed trunk and a head of drooping fronds (needle boughs). */
function palm(seed: number, lod: TreeLod): THREE.BufferGeometry {
  const rng = makeRng(seed);
  const b = new Builder();
  const h = 1;
  const bend = 0.12 + rng() * 0.1;
  const path = [0, 0.25, 0.5, 0.75, 0.92].map((t) => V(bend * t * t, t * 0.92 - 0.03, 0));
  b.tube(path, [0.035, 0.028, 0.024, 0.022, 0.025], lod === 0 ? 6 : 4, h);
  const head = path[path.length - 1]!;
  const fronds = lod === 0 ? 11 : 6;
  for (let k = 0; k < fronds; k++) {
    const a = (k / fronds) * Math.PI * 2 + rng() * 0.3;
    const out = V(Math.cos(a), 0.35 - rng() * 0.5, Math.sin(a)).normalize();
    const side = V(-out.z, 0, out.x).normalize().applyAxisAngle(out, (rng() - 0.5) * 0.6);
    b.card(ATLAS.needles, head, out, side, 0.36, 0.11, head.clone().add(V(0, -0.05, 0)), h, 0.55);
  }
  return b.geometry();
}

const cache = new Map<string, THREE.BufferGeometry[]>();

/** How many different shapes each kind has (instances pick one). */
export const VARIANTS = 3;

/** The shapes of a kind at a level of detail (built once, then shared). */
export function treeGeometries(kind: TreeKind, lod: TreeLod): THREE.BufferGeometry[] {
  const key = `${kind}:${lod}`;
  let list = cache.get(key);
  if (!list) {
    list = Array.from({ length: VARIANTS }, (_, i) => {
      const seed = 1000 + TREE_KINDS.indexOf(kind) * 97 + i * 13;
      switch (kind) {
        case 'broadleaf':
          return broadleaf(seed, lod, false);
        case 'oak':
          return broadleaf(seed, lod, true);
        case 'conifer':
          return conifer(seed, lod, false);
        case 'pine':
          return conifer(seed, lod, true);
        case 'bush':
          return bush(seed, lod, false);
        case 'scrub':
          return bush(seed, lod, true);
        case 'palm':
          return palm(seed, lod);
      }
    });
    cache.set(key, list);
  }
  return list;
}

/** Triangles of a shape. */
export function triangleCount(g: THREE.BufferGeometry): number {
  return (g.index?.count ?? g.attributes.position!.count) / 3;
}
