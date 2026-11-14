import * as THREE from 'three';
import { hashText, makeRng } from '../site/random';
import { type PlotRef, SITE_SIZE, type Site, landOf, ownsPlot, plotKey, plotTiles, sitePlots, tileAt } from '../site/site';
import type { SkyUniforms } from './environment';
import { DEPOSIT_COLOUR, Ground, type Pad, buildGround } from './ground';
import { boulderGeometry, oreStone, rockMaterial } from './rocks';
import { groundTextures } from './terrainTextures';
import { type LatticeBuffers, latticeBuffers, latticeGeometry, terrainMaterial, updateLatticeBuffers } from './terrainMesh';
import { type WaterSurface, buildWater } from './water';

export { STEP } from './ground';
export { DEPOSIT_COLOUR } from './ground';

/** World position of the centre of tile (x, z). */
export function tileCentre(site: Site, x: number, z: number): { x: number; z: number } {
  return { x: x - site.size / 2 + 0.5, z: z - site.size / 2 + 0.5 };
}

/** Tiles from `min` (included) to `max` (excluded) on each axis that hold every Plot of the Site. */
export function siteBounds(site: Site): { minX: number; maxX: number; minZ: number; maxZ: number } {
  const plots = sitePlots(site);
  const px = plots.map((p) => p.px);
  const pz = plots.map((p) => p.pz);
  return {
    minX: Math.min(...px) * SITE_SIZE,
    maxX: (Math.max(...px) + 1) * SITE_SIZE,
    minZ: Math.min(...pz) * SITE_SIZE,
    maxZ: (Math.max(...pz) + 1) * SITE_SIZE,
  };
}

/** What the drawn land of a Site keeps, so it can change after it is built (pads) and move (water). */
interface SiteLand {
  ground: Ground;
  near: LatticeBuffers;
  water: WaterSurface;
}

function siteLand(group: THREE.Object3D): SiteLand | undefined {
  return group.userData.siteLand as SiteLand | undefined;
}

/** The drawn ground of a group made by `buildSiteMesh`. */
export function groundOf(group: THREE.Object3D): Ground | undefined {
  return siteLand(group)?.ground;
}

/**
 * 3D model of a Site and the land around it out to the horizon: smooth ground with photographic materials, water,
 * Deposit rocks and the Site's border. Only the Site itself (named "terrain") can be clicked and built on; the
 * full-detail land around it is "scenery-near". Building pads in `pads` are pressed into the ground.
 */
export function buildSiteMesh(site: Site, sky: SkyUniforms, pads: readonly Pad[] = []): THREE.Group {
  const land = landOf(site);
  const ground = buildGround(site, land, pads);
  const material = terrainMaterial(sky, { climate: land.climate, beach: land.water !== 'none' });

  const near = latticeBuffers(ground.near, ground.nearLook, true);
  const half = site.size / 2;
  const l = ground.near;
  const cellTile = (i: number, j: number) => ({
    x: Math.floor(l.x0 + (i + 0.5) * l.step + half),
    z: Math.floor(l.z0 + (j + 0.5) * l.step + half),
  });
  const onSite = (i: number, j: number) => {
    const t = cellTile(i, j);
    return tileAt(site, t.x, t.z) !== undefined;
  };
  const terrain = landMesh(latticeGeometry(near, onSite, false), material, 'terrain');
  terrain.raycast = groundRaycast(ground, (x, z) => tileAt(site, x, z) !== undefined);
  const ring = landMesh(latticeGeometry(near, (i, j) => !onSite(i, j), true), material, 'scenery-near');
  ring.raycast = groundRaycast(ground, (x, z) => tileAt(site, x, z) === undefined);

  const far = latticeBuffers(ground.far, ground.farLook, false);
  const f = ground.far;
  const inNear = (i: number, j: number) => {
    const x = f.x0 + (i + 0.5) * f.step;
    const z = f.z0 + (j + 0.5) * f.step;
    return x > ground.nearMin && x < ground.nearMax && z > ground.nearMin && z < ground.nearMax;
  };
  const farMesh = landMesh(latticeGeometry(far, (i, j) => !inNear(i, j), false), material, 'scenery-far');
  farMesh.castShadow = false;

  const water = buildWater(ground, sky, land.water);
  const group = new THREE.Group();
  group.name = 'site';
  // Trees, boulders and other scenery go here (World.addScenery); they are freed with the rest of the group.
  const scenery = new THREE.Group();
  scenery.name = 'scenery';
  group.add(terrain, ring, farMesh, water.mesh, depositMesh(site, ground), siteBorder(site, ground), scenery);
  group.userData.siteLand = { ground, near, water } satisfies SiteLand;
  return group;
}

function landMesh(geometry: THREE.BufferGeometry, material: THREE.Material, name: string): THREE.Mesh {
  const m = new THREE.Mesh(geometry, material);
  m.name = name;
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/** The group a Site's scenery (trees, boulders, props) is added to, inside a group made by `buildSiteMesh`. */
export function sceneryOf(group: THREE.Object3D): THREE.Group | undefined {
  return group.getObjectByName('scenery') as THREE.Group | undefined;
}

/** Press a building pad into the drawn ground of a Site (flattening it under the building). */
export function pressPad(group: THREE.Object3D, pad: Pad): void {
  const s = siteLand(group);
  if (!s) return;
  const changed = s.ground.addPad(pad);
  if (!changed) return;
  updateLatticeBuffers(s.near, changed.i0, changed.i1, changed.j0, changed.j1);
  s.water.refresh();
  // Rocks next to the pad follow the new ground.
  const rocks = group.getObjectByName('deposits') as THREE.InstancedMesh | undefined;
  if (rocks) settleRocks(rocks, s.ground);
}

/** Let the water move. */
export function animateSite(group: THREE.Object3D, seconds: number): void {
  siteLand(group)?.water.animate(seconds);
}

/**
 * Picking on the smooth ground without testing every triangle: march along the ray over the height function and
 * refine the first crossing on land that `accept` takes (tile x, z). Other crossings (a hill in front) are passed
 * through, like a mesh that isn't there.
 */
function groundRaycast(ground: Ground, accept: (x: number, z: number) => boolean): THREE.Mesh['raycast'] {
  const half = ground.site.size / 2;
  return function (this: THREE.Mesh, raycaster, hits) {
    const { origin: o, direction: d } = raycaster.ray;
    let t0 = raycaster.near;
    let t1 = Math.min(raycaster.far, 1e5);
    const clip = (p: number, v: number, lo: number, hi: number) => {
      if (Math.abs(v) < 1e-9) {
        if (p < lo || p > hi) t1 = -1;
        return;
      }
      const a = (lo - p) / v;
      const b = (hi - p) / v;
      t0 = Math.max(t0, Math.min(a, b));
      t1 = Math.min(t1, Math.max(a, b));
    };
    clip(o.x, d.x, ground.nearMin, ground.nearMax);
    clip(o.z, d.z, ground.nearMin, ground.nearMax);
    clip(o.y, d.y, -4, 8);
    if (t1 <= t0) return;
    const f = (t: number) => o.y + d.y * t - ground.heightAt(o.x + d.x * t, o.z + d.z * t);
    const dt = Math.min(0.25 / Math.max(Math.hypot(d.x, d.z), 1e-3), 0.25 / Math.max(Math.abs(d.y), 1e-3));
    let a = t0;
    let fa = f(a);
    while (a < t1) {
      const b = Math.min(t1, a + dt);
      const fb = f(b);
      if (fa > 0 && fb <= 0) {
        let lo = a;
        let hi = b;
        for (let k = 0; k < 16; k++) {
          const m = (lo + hi) / 2;
          if (f(m) > 0) lo = m;
          else hi = m;
        }
        const point = raycaster.ray.at(hi, new THREE.Vector3());
        if (accept(Math.floor(point.x + half), Math.floor(point.z + half))) {
          const n = ground.normalAt(point.x, point.z);
          hits.push({
            distance: hi,
            point,
            object: this,
            face: { a: 0, b: 0, c: 0, normal: new THREE.Vector3(n.x, n.y, n.z), materialIndex: 0 },
            faceIndex: 0,
          });
          return;
        }
      }
      a = b;
      fa = fb;
    }
  };
}

/** Points along the outside edges of a set of Plots, every half tile, as segments [ax, az, bx, bz, …] in world x/z. */
function outline(plots: PlotRef[], inSet: (px: number, pz: number) => boolean): number[] {
  const segs: number[] = [];
  const o = -SITE_SIZE / 2;
  const n = SITE_SIZE;
  for (const { px, pz } of plots) {
    const x0 = px * n + o;
    const z0 = pz * n + o;
    const sides: [boolean, number, number, number, number][] = [
      [!inSet(px, pz - 1), x0, z0, 1, 0],
      [!inSet(px + 1, pz), x0 + n, z0, 0, 1],
      [!inSet(px, pz + 1), x0, z0 + n, 1, 0],
      [!inSet(px - 1, pz), x0, z0, 0, 1],
    ];
    for (const [open, sx, sz, dx, dz] of sides) {
      if (!open) continue;
      for (let i = 0; i < n * 2; i++) {
        const a = i / 2;
        const b = (i + 1) / 2;
        segs.push(sx + dx * a, sz + dz * a, sx + dx * b, sz + dz * b);
      }
    }
  }
  return segs;
}

/** A flat ribbon `width` wide along each segment, draped on the ground `lift` above it. */
function ribbon(ground: Ground, segs: number[], width: number, lift: number): THREE.BufferGeometry {
  const pos: number[] = [];
  const y = (x: number, z: number) => ground.heightAt(x, z) + lift;
  for (let k = 0; k < segs.length; k += 4) {
    const [ax, az, bx, bz] = segs.slice(k, k + 4) as [number, number, number, number];
    const len = Math.hypot(bx - ax, bz - az) || 1;
    const nx = (-(bz - az) / len) * (width / 2);
    const nz = ((bx - ax) / len) * (width / 2);
    // Overlap the ends a little so corners close.
    const ex = ((bx - ax) / len) * (width / 2);
    const ez = ((bz - az) / len) * (width / 2);
    const p1 = [ax - ex + nx, az - ez + nz];
    const p2 = [ax - ex - nx, az - ez - nz];
    const p3 = [bx + ex - nx, bz + ez - nz];
    const p4 = [bx + ex + nx, bz + ez + nz];
    const v = (p: number[]) => [p[0]!, y(p[0]!, p[1]!), p[1]!];
    pos.push(...v(p1), ...v(p2), ...v(p3), ...v(p1), ...v(p3), ...v(p4));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  return g;
}

function overlayMaterial(colour: number, opacity: number): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color: colour,
    transparent: true,
    opacity,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
}

/** A thin white line around the Site's edge, lying on the ground: you can build inside it. */
function siteBorder(site: Site, ground: Ground): THREE.Mesh {
  const m = new THREE.Mesh(ribbon(ground, outline(sitePlots(site), (px, pz) => ownsPlot(site, px, pz)), 0.16, 0.03), overlayMaterial(0xffffff, 0.75));
  m.name = 'site-border';
  m.renderOrder = 3;
  return m;
}

/**
 * A highlight for a Plot next door under the pointer: a see-through tint over its land, with a line and a low fence
 * around it, green if it can be bought, grey if not.
 */
export function buildPlotMarker(ground: Ground, plot: PlotRef, buyable: boolean): THREE.Group {
  const colour = buyable ? 0x5dff8a : 0xb8c2cc;
  const segs = outline([plot], (px, pz) => px === plot.px && pz === plot.pz);
  const fence: number[] = [];
  const height = 1.2;
  for (let k = 0; k < segs.length; k += 4) {
    const [ax, az, bx, bz] = segs.slice(k, k + 4) as [number, number, number, number];
    const ay = ground.heightAt(ax, az);
    const by = ground.heightAt(bx, bz);
    fence.push(ax, ay, az, bx, by, bz, bx, by + height, bz, ax, ay, az, bx, by + height, bz, ax, ay + height, az);
  }
  // A see-through sheet over the Plot, following the ground every half tile.
  const o = -SITE_SIZE / 2;
  const n = SITE_SIZE * 2;
  const sheet = new THREE.PlaneGeometry(SITE_SIZE, SITE_SIZE, n, n);
  sheet.rotateX(-Math.PI / 2);
  sheet.translate(plot.px * SITE_SIZE + o + SITE_SIZE / 2, 0, plot.pz * SITE_SIZE + o + SITE_SIZE / 2);
  const sp = sheet.attributes.position as THREE.BufferAttribute;
  for (let k = 0; k < sp.count; k++) sp.setY(k, Math.max(ground.heightAt(sp.getX(k), sp.getZ(k)), -0.12) + 0.04);
  const fenceGeometry = new THREE.BufferGeometry();
  fenceGeometry.setAttribute('position', new THREE.Float32BufferAttribute(fence, 3));
  const line = new THREE.Mesh(ribbon(ground, segs, 0.22, 0.05), overlayMaterial(colour, 1));
  line.name = 'plot-line';
  const group = new THREE.Group();
  group.name = 'plot-marker';
  const parts = [line, new THREE.Mesh(fenceGeometry, overlayMaterial(colour, 0.4)), new THREE.Mesh(sheet, overlayMaterial(colour, buyable ? 0.3 : 0.2))];
  parts.forEach((p) => (p.renderOrder = 3));
  group.add(...parts);
  return group;
}

/** A small heap of ore boulders and stones on each Deposit tile, coloured by Raw Material. */
function depositMesh(site: Site, ground: Ground): THREE.InstancedMesh {
  const rocks: { tile: string; x: number; z: number; s: number; r: number; colour: number; shade: number }[] = [];
  for (const { px, pz } of sitePlots(site)) {
    // Each Plot has its own random numbers, so buying one never moves the Home Site's rocks.
    const rng = makeRng(hashText(site.seed + (px === 0 && pz === 0 ? ':rocks' : `:rocks:${px},${pz}`)));
    plotTiles(site, px, pz).forEach((tile, i) => {
      if (!tile.deposit) return;
      const tx = px * SITE_SIZE + (i % SITE_SIZE);
      const tz = pz * SITE_SIZE + Math.floor(i / SITE_SIZE);
      const { x, z } = tileCentre(site, tx, tz);
      // An outcrop: two or three big blocks of ore close together, and smaller stones scattered around them.
      const count = 8 + Math.floor(rng() * 4);
      const bigOnes = 2 + Math.floor(rng() * 2);
      const cx = x + (rng() - 0.5) * 0.35;
      const cz = z + (rng() - 0.5) * 0.35;
      for (let k = 0; k < count; k++) {
        const big = k < bigOnes;
        const a = rng() * Math.PI * 2;
        const d = big ? 0.05 + rng() * 0.2 : 0.2 + rng() * 0.32;
        rocks.push({
          tile: plotKey(tx, tz),
          x: cx + Math.cos(a) * d,
          z: cz + Math.sin(a) * d,
          s: big ? 0.2 + rng() * 0.14 : 0.05 + rng() * 0.08,
          r: rng() * Math.PI * 2,
          colour: DEPOSIT_COLOUR[tile.deposit],
          shade: 0.75 + rng() * 0.4,
        });
      }
    });
  }
  const mesh = new THREE.InstancedMesh(boulderGeometry(3), rockMaterial(groundTextures().albedo.rock), rocks.length);
  rocks.forEach((rock, i) => mesh.setColorAt(i, oreStone(rock.colour).multiplyScalar(rock.shade)));
  mesh.name = 'deposits';
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.rocks = rocks;
  // Which rocks sit on which tile, so a Mine can clear them away.
  const byTile = new Map<string, number[]>();
  rocks.forEach((rock, i) => byTile.set(rock.tile, [...(byTile.get(rock.tile) ?? []), i]));
  mesh.userData.rocksByTile = byTile;
  mesh.userData.cleared = new Set<number>();
  settleRocks(mesh, ground);
  return mesh;
}

/** Put every Deposit boulder that is not cleared on the ground under it, slightly sunk in. */
function settleRocks(mesh: THREE.InstancedMesh, ground: Ground): void {
  const rocks = mesh.userData.rocks as { x: number; z: number; s: number; r: number }[];
  const cleared = mesh.userData.cleared as Set<number>;
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const hidden = new THREE.Matrix4().makeScale(0, 0, 0);
  rocks.forEach((rock, i) => {
    if (cleared.has(i)) {
      mesh.setMatrixAt(i, hidden);
      return;
    }
    q.setFromEuler(e.set((rock.r % 0.3) - 0.15, rock.r, ((rock.r * 3) % 0.3) - 0.15));
    const y = ground.heightAt(rock.x, rock.z) - rock.s * 0.25;
    m.compose(new THREE.Vector3(rock.x, y, rock.z), q, new THREE.Vector3(rock.s * (1 + (rock.r % 0.4)), rock.s * 0.9, rock.s));
    mesh.setMatrixAt(i, m);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
}

/** Hide the Deposit rocks on one tile (a Mine is built there). */
export function clearRocks(group: THREE.Group, x: number, z: number): void {
  const mesh = group.getObjectByName('deposits') as THREE.InstancedMesh | undefined;
  const rocks = (mesh?.userData.rocksByTile as Map<string, number[]> | undefined)?.get(plotKey(x, z));
  if (!mesh || !rocks) return;
  const hidden = new THREE.Matrix4().makeScale(0, 0, 0);
  const cleared = mesh.userData.cleared as Set<number>;
  for (const i of rocks) {
    cleared.add(i);
    mesh.setMatrixAt(i, hidden);
  }
  mesh.instanceMatrix.needsUpdate = true;
}
