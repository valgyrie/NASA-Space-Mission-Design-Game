import * as THREE from 'three';
import type { RawMaterial } from '../economy/rawMaterial';
import { hashText, makeRng } from '../site/random';
import {
  type Land,
  type PlotRef,
  SITE_SIZE,
  type Site,
  type Terrain,
  type Tile,
  landOf,
  ownsPlot,
  plotKey,
  plotOf,
  plotTiles,
  sitePlots,
  tileAt,
} from '../site/site';
import { STEP, WATER, WATER_Y, buildTerrainGeometry, terrainMaterial } from './terrainMesh';

export { STEP } from './terrainMesh';

export const DEPOSIT_COLOUR: Record<RawMaterial, number> = {
  aluminium: 0xdfe6ee,
  copper: 0xd8763a,
  silicon: 0x7b83eb,
};

/** Full-detail scenery reaches this many tiles past each edge of the Site: one Plot on every side. */
const NEAR_REACH = 64;
/** Coarse scenery (4 × 4 tiles per block) reaches this far, out to where the haze hides it. */
const FAR_REACH = 224;
const FAR_BLOCK = 4;

/** World position of the centre of tile (x, z). */
export function tileCentre(site: Site, x: number, z: number): { x: number; z: number } {
  return { x: x - site.size / 2 + 0.5, z: z - site.size / 2 + 0.5 };
}

function topY(level: number): number {
  return level * STEP;
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

/** The same as a square, for drawing land: `from` to `to` on both axes. */
function squareBounds(site: Site): { from: number; to: number } {
  const b = siteBounds(site);
  return { from: Math.min(b.minX, b.minZ), to: Math.max(b.maxX, b.maxZ) };
}

/**
 * Low-poly 3D model of a Site and the land around it out to the horizon.
 * Only the Site itself (named "terrain") can be clicked and built on.
 */
export function buildSiteMesh(site: Site, hazeColour: number): THREE.Group {
  const land = landOf(site);
  const group = new THREE.Group();
  group.name = 'site';
  group.add(
    siteTerrain(site, land),
    nearScenery(site, land, hazeColour),
    farScenery(site, land, hazeColour),
    waterMesh(site, land),
    depositMesh(site),
    siteBorder(site, land),
  );
  return group;
}

function mesh(geometry: THREE.BufferGeometry, name: string, castShadow: boolean): THREE.Mesh {
  const m = new THREE.Mesh(geometry, terrainMaterial());
  m.name = name;
  m.castShadow = castShadow;
  m.receiveShadow = true;
  return m;
}

/** Snow over a cold Site's land (ticket 16): the colder the real place, the whiter. */
function snowTint(land: Land, terrain: Terrain): { colour: number; amount: number } | undefined {
  const snow = land.climate.snow ?? 0;
  if (snow <= 0 || terrain === 'water') return undefined;
  return { colour: 0xf1f4f8, amount: Math.min(0.9, snow * (terrain === 'mountain' ? 1 : 0.85)) };
}

function siteTerrain(site: Site, land: Land): THREE.Mesh {
  const { from, to } = squareBounds(site);
  const geometry = buildTerrainGeometry({
    from,
    to,
    cellSize: 1,
    origin: -site.size / 2,
    cellAt: (x, z) => {
      const tile = tileAt(site, x, z);
      if (!tile) return undefined;
      const tint = tile.deposit ? { colour: DEPOSIT_COLOUR[tile.deposit], amount: 0.55 } : snowTint(land, tile.terrain);
      return { terrain: tile.terrain, level: tile.level, tint };
    },
    levelAt: (x, z) => land.groundAt(x, z).level,
  });
  return mesh(geometry, 'terrain', true);
}

/**
 * Full-detail land in a ring around the Site, a little hazy so the Site stands out. The Deposits of the Plots next
 * door show faintly, so the player can see what buying one would bring.
 */
function nearScenery(site: Site, land: Land, hazeColour: number): THREE.Mesh {
  const bounds = squareBounds(site);
  const from = bounds.from - NEAR_REACH;
  const to = bounds.to + NEAR_REACH;
  const nextDoor = new Map<string, Tile[]>();
  const depositAt = (x: number, z: number) => {
    const { px, pz } = plotOf(x, z);
    const key = plotKey(px, pz);
    let tiles = nextDoor.get(key);
    if (!tiles) nextDoor.set(key, (tiles = touchesOwned(site, px, pz) ? plotTiles(site, px, pz, land) : []));
    return tiles[(z - pz * SITE_SIZE) * SITE_SIZE + (x - px * SITE_SIZE)]?.deposit ?? null;
  };
  const geometry = buildTerrainGeometry({
    from,
    to,
    cellSize: 1,
    origin: -site.size / 2,
    cellAt: (x, z) => {
      if (tileAt(site, x, z)) return undefined;
      const ground = land.groundAt(x, z);
      const deposit = depositAt(x, z);
      const tint = deposit ? { colour: DEPOSIT_COLOUR[deposit], amount: 0.4 } : snowTint(land, ground.terrain);
      return { ...ground, tint };
    },
    levelAt: (x, z) => (x >= from && z >= from && x < to && z < to ? land.groundAt(x, z).level : undefined),
    haze: 0.12,
    hazeColour,
  });
  return mesh(geometry, 'scenery-near', true);
}

/** Coarse land beyond that, out to the horizon. It sits behind the haze, so detail doesn't matter. */
function farScenery(site: Site, land: Land, hazeColour: number): THREE.Mesh {
  const bounds = squareBounds(site);
  const from = (bounds.from - FAR_REACH) / FAR_BLOCK;
  const to = (bounds.to + FAR_REACH) / FAR_BLOCK;
  const holeFrom = (bounds.from - NEAR_REACH) / FAR_BLOCK;
  const holeTo = (bounds.to + NEAR_REACH) / FAR_BLOCK;
  const inHole = (bx: number, bz: number) => bx >= holeFrom && bz >= holeFrom && bx < holeTo && bz < holeTo;
  const blockGround = (bx: number, bz: number) =>
    land.groundAt(bx * FAR_BLOCK + FAR_BLOCK / 2, bz * FAR_BLOCK + FAR_BLOCK / 2);
  const geometry = buildTerrainGeometry({
    from,
    to,
    cellSize: FAR_BLOCK,
    origin: -site.size / 2,
    cellAt: (bx, bz) => {
      if (inHole(bx, bz)) return undefined;
      const ground = blockGround(bx, bz);
      return { ...ground, tint: snowTint(land, ground.terrain) };
    },
    levelAt: (bx, bz) => (bx >= from && bz >= from && bx < to && bz < to ? blockGround(bx, bz).level : undefined),
    haze: 0.22,
    hazeColour,
  });
  return mesh(geometry, 'scenery-far', false);
}

function waterMesh(site: Site, land: Land): THREE.Mesh {
  const { from, to } = squareBounds(site);
  const size = (to - from + FAR_REACH) * 2 + 400;
  const geometry = new THREE.PlaneGeometry(size, size);
  geometry.rotateX(-Math.PI / 2);
  const middle = (from + to) / 2 - site.size / 2;
  geometry.translate(middle, 0, middle);
  const m = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({ color: WATER, roughness: 0.25, metalness: 0.1, transparent: true, opacity: 0.88 }),
  );
  m.name = 'water';
  m.position.y = WATER_Y;
  m.receiveShadow = true;
  m.visible = land.water !== 'none';
  return m;
}

/** Does the Plot touch a Plot of the Site (sides and corners count)? */
function touchesOwned(site: Site, px: number, pz: number): boolean {
  if (ownsPlot(site, px, pz)) return false;
  for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) if (ownsPlot(site, px + dx, pz + dz)) return true;
  return false;
}

/**
 * Line segments [ax, y, az, bx, y, bz, …] around the outside of a set of Plots, following the steps of the land.
 * `inSet` says whether a Plot is in the set; `levelAt` gives a tile's height step.
 */
function outline(
  plots: PlotRef[],
  inSet: (px: number, pz: number) => boolean,
  levelAt: (x: number, z: number) => number,
  lift: number,
): number[] {
  const pts: number[] = [];
  const o = -SITE_SIZE / 2;
  const n = SITE_SIZE;
  const yAt = (x: number, z: number) => Math.max(topY(levelAt(x, z)), 0) + lift;
  for (const { px, pz } of plots) {
    const x0 = px * n;
    const z0 = pz * n;
    // Each side with no Plot of the set beyond it: the tile along it at step i, and the corner line it runs on.
    const sides: { open: boolean; tile: (i: number) => [number, number]; line: (i: number) => [number, number] }[] = [
      { open: !inSet(px, pz - 1), tile: (i) => [x0 + i, z0], line: (i) => [x0 + i, z0] },
      { open: !inSet(px + 1, pz), tile: (i) => [x0 + n - 1, z0 + i], line: (i) => [x0 + n, z0 + i] },
      { open: !inSet(px, pz + 1), tile: (i) => [x0 + i, z0 + n - 1], line: (i) => [x0 + i, z0 + n] },
      { open: !inSet(px - 1, pz), tile: (i) => [x0, z0 + i], line: (i) => [x0, z0 + i] },
    ];
    for (const side of sides) {
      if (!side.open) continue;
      for (let i = 0; i < n; i++) {
        const y = yAt(...side.tile(i));
        const [ax, az] = side.line(i);
        const [bx, bz] = side.line(i + 1);
        pts.push(ax + o, y, az + o, bx + o, y, bz + o);
        if (i + 1 < n) {
          const y2 = yAt(...side.tile(i + 1));
          if (y2 !== y) pts.push(bx + o, y, bz + o, bx + o, y2, bz + o);
        }
      }
    }
  }
  return pts;
}

function lines(pts: number[], colour: number, opacity: number, name: string): THREE.LineSegments {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  const line = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color: colour, transparent: true, opacity }));
  line.name = name;
  return line;
}

/** A thin line around the Site's edge, following the steps of the land: you can build inside it. */
function siteBorder(site: Site, land: Land): THREE.LineSegments {
  const levelAt = (x: number, z: number) => tileAt(site, x, z)?.level ?? land.groundAt(x, z).level;
  return lines(outline(sitePlots(site), (px, pz) => ownsPlot(site, px, pz), levelAt, 0.04), 0xffffff, 0.7, 'site-border');
}

/**
 * A highlight for a Plot next door under the pointer: a see-through tint over its land, with a line and a low fence
 * around it, green if it can be bought, grey if not.
 */
export function buildPlotMarker(land: Land, plot: PlotRef, buyable: boolean): THREE.Group {
  const colour = buyable ? 0x5dff8a : 0xb8c2cc;
  const levelAt = (x: number, z: number) => land.groundAt(x, z).level;
  const pts = outline([plot], (px, pz) => px === plot.px && pz === plot.pz, levelAt, 0.06);
  const fence: number[] = [];
  const height = 1.2;
  for (let i = 0; i < pts.length; i += 6) {
    const [ax, ay, az, bx, by, bz] = pts.slice(i, i + 6) as [number, number, number, number, number, number];
    if (ay !== by) continue; // a step in the land: the line covers it
    fence.push(ax, ay, az, bx, by, bz, bx, by + height, bz, ax, ay, az, bx, by + height, bz, ax, ay + height, az);
  }
  // One flat square on top of each tile.
  const tint: number[] = [];
  const o = -SITE_SIZE / 2;
  for (let z = plot.pz * SITE_SIZE; z < (plot.pz + 1) * SITE_SIZE; z++) {
    for (let x = plot.px * SITE_SIZE; x < (plot.px + 1) * SITE_SIZE; x++) {
      const y = Math.max(topY(levelAt(x, z)), 0) + 0.05;
      const [x0, x1, z0, z1] = [x + o, x + 1 + o, z + o, z + 1 + o];
      tint.push(x0, y, z0, x0, y, z1, x1, y, z1, x0, y, z0, x1, y, z1, x1, y, z0);
    }
  }
  const see = (positions: number[], opacity: number) => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const material = new THREE.MeshBasicMaterial({ color: colour, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false, fog: false });
    const m = new THREE.Mesh(geometry, material);
    m.renderOrder = 1;
    return m;
  };
  const group = new THREE.Group();
  group.name = 'plot-marker';
  group.add(lines(pts, colour, 1, 'plot-line'), see(fence, 0.4), see(tint, buyable ? 0.3 : 0.2));
  return group;
}

/** Two or three small rocks on each deposit tile, coloured by Raw Material. */
function depositMesh(site: Site): THREE.InstancedMesh {
  const rocks: { tile: string; x: number; y: number; z: number; s: number; r: number; colour: number }[] = [];
  for (const { px, pz } of sitePlots(site)) {
    // Each Plot has its own random numbers, so buying one never moves the Home Site's rocks.
    const rng = makeRng(hashText(site.seed + (px === 0 && pz === 0 ? ':rocks' : `:rocks:${px},${pz}`)));
    plotTiles(site, px, pz).forEach((tile, i) => {
      if (!tile.deposit) return;
      const tx = px * SITE_SIZE + (i % SITE_SIZE);
      const tz = pz * SITE_SIZE + Math.floor(i / SITE_SIZE);
      const { x, z } = tileCentre(site, tx, tz);
      const count = 2 + Math.floor(rng() * 2);
      for (let k = 0; k < count; k++) {
        rocks.push({
          tile: plotKey(tx, tz),
          x: x + (rng() - 0.5) * 0.6,
          y: topY(tile.level),
          z: z + (rng() - 0.5) * 0.6,
          s: 0.2 + rng() * 0.12,
          r: rng() * Math.PI,
          colour: DEPOSIT_COLOUR[tile.deposit],
        });
      }
    });
  }

  const mesh = new THREE.InstancedMesh(
    new THREE.DodecahedronGeometry(1, 0),
    new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.6, metalness: 0.2 }),
    rocks.length,
  );
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const colour = new THREE.Color();
  rocks.forEach((rock, i) => {
    q.setFromEuler(new THREE.Euler(rock.r, rock.r * 1.7, 0));
    m.compose(new THREE.Vector3(rock.x, rock.y + rock.s * 0.5, rock.z), q, new THREE.Vector3(rock.s, rock.s * 0.8, rock.s));
    mesh.setMatrixAt(i, m);
    mesh.setColorAt(i, colour.setHex(rock.colour));
  });
  mesh.name = 'deposits';
  mesh.castShadow = true;
  // Which rocks sit on which tile, so a Mine can clear them away.
  const byTile = new Map<string, number[]>();
  rocks.forEach((rock, i) => byTile.set(rock.tile, [...(byTile.get(rock.tile) ?? []), i]));
  mesh.userData.rocksByTile = byTile;
  return mesh;
}

/** Hide the Deposit rocks on one tile (a Mine is built there). */
export function clearRocks(group: THREE.Group, x: number, z: number): void {
  const mesh = group.getObjectByName('deposits') as THREE.InstancedMesh | undefined;
  const rocks = (mesh?.userData.rocksByTile as Map<string, number[]> | undefined)?.get(plotKey(x, z));
  if (!mesh || !rocks) return;
  const hidden = new THREE.Matrix4().makeScale(0, 0, 0);
  for (const i of rocks) mesh.setMatrixAt(i, hidden);
  mesh.instanceMatrix.needsUpdate = true;
}
