import * as THREE from 'three';
import type { RawMaterial } from '../economy/rawMaterial';
import { hashText, makeRng } from '../site/random';
import { type Land, SITE_SIZE, type Site, landOf, tileAt } from '../site/site';
import { STEP, WATER, WATER_Y, buildTerrainGeometry, terrainMaterial } from './terrainMesh';

export { STEP } from './terrainMesh';

export const DEPOSIT_COLOUR: Record<RawMaterial, number> = {
  aluminium: 0xdfe6ee,
  copper: 0xd8763a,
  silicon: 0x7b83eb,
};

/** Full-detail scenery reaches this many tiles past each edge of the Site: one Site-sized plot on every side. */
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
    waterMesh(land),
    depositMesh(site),
    siteBorder(site),
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

function siteTerrain(site: Site, land: Land): THREE.Mesh {
  const geometry = buildTerrainGeometry({
    from: 0,
    to: site.size,
    cellSize: 1,
    origin: -site.size / 2,
    cellAt: (x, z) => {
      const tile = tileAt(site, x, z)!;
      const tint = tile.deposit ? { colour: DEPOSIT_COLOUR[tile.deposit], amount: 0.55 } : undefined;
      return { terrain: tile.terrain, level: tile.level, tint };
    },
    levelAt: (x, z) => land.groundAt(x, z).level,
  });
  return mesh(geometry, 'terrain', true);
}

/** Full-detail land in a ring around the Site, a little hazy so the Site stands out. */
function nearScenery(site: Site, land: Land, hazeColour: number): THREE.Mesh {
  const from = -NEAR_REACH;
  const to = site.size + NEAR_REACH;
  const inSite = (x: number, z: number) => x >= 0 && z >= 0 && x < site.size && z < site.size;
  const geometry = buildTerrainGeometry({
    from,
    to,
    cellSize: 1,
    origin: -site.size / 2,
    cellAt: (x, z) => (inSite(x, z) ? undefined : land.groundAt(x, z)),
    levelAt: (x, z) => (x >= from && z >= from && x < to && z < to ? land.groundAt(x, z).level : undefined),
    haze: 0.12,
    hazeColour,
  });
  return mesh(geometry, 'scenery-near', true);
}

/** Coarse land beyond that, out to the horizon. It sits behind the haze, so detail doesn't matter. */
function farScenery(site: Site, land: Land, hazeColour: number): THREE.Mesh {
  const from = -FAR_REACH / FAR_BLOCK;
  const to = (site.size + FAR_REACH) / FAR_BLOCK;
  const holeFrom = -NEAR_REACH / FAR_BLOCK;
  const holeTo = (site.size + NEAR_REACH) / FAR_BLOCK;
  const inHole = (bx: number, bz: number) => bx >= holeFrom && bz >= holeFrom && bx < holeTo && bz < holeTo;
  const blockGround = (bx: number, bz: number) =>
    land.groundAt(bx * FAR_BLOCK + FAR_BLOCK / 2, bz * FAR_BLOCK + FAR_BLOCK / 2);
  const geometry = buildTerrainGeometry({
    from,
    to,
    cellSize: FAR_BLOCK,
    origin: -site.size / 2,
    cellAt: (bx, bz) => (inHole(bx, bz) ? undefined : blockGround(bx, bz)),
    levelAt: (bx, bz) => (bx >= from && bz >= from && bx < to && bz < to ? blockGround(bx, bz).level : undefined),
    haze: 0.22,
    hazeColour,
  });
  return mesh(geometry, 'scenery-far', false);
}

function waterMesh(land: Land): THREE.Mesh {
  const size = (SITE_SIZE + FAR_REACH) * 2 + 400;
  const geometry = new THREE.PlaneGeometry(size, size);
  geometry.rotateX(-Math.PI / 2);
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

/** A thin line around the Site's edge, following the steps of the land: you can build inside it. */
function siteBorder(site: Site): THREE.LineSegments {
  const pts: number[] = [];
  const lift = 0.04;
  const o = -site.size / 2;
  const n = site.size;
  // Walk each edge; [x, z] of each tile along it and the corner line it runs on.
  const edges: { tile: (i: number) => [number, number]; line: (i: number) => [number, number] }[] = [
    { tile: (i) => [i, 0], line: (i) => [o + i, o] },
    { tile: (i) => [n - 1, i], line: (i) => [o + n, o + i] },
    { tile: (i) => [n - 1 - i, n - 1], line: (i) => [o + n - i, o + n] },
    { tile: (i) => [0, n - 1 - i], line: (i) => [o, o + n - i] },
  ];
  for (const edge of edges) {
    for (let i = 0; i < n; i++) {
      const [tx, tz] = edge.tile(i);
      const y = Math.max(topY(tileAt(site, tx, tz)!.level), 0) + lift;
      const [ax, az] = edge.line(i);
      const [bx, bz] = edge.line(i + 1);
      pts.push(ax, y, az, bx, y, bz);
      if (i + 1 < n) {
        const [ux, uz] = edge.tile(i + 1);
        const y2 = Math.max(topY(tileAt(site, ux, uz)!.level), 0) + lift;
        if (y2 !== y) pts.push(bx, y, bz, bx, y2, bz);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  const line = new THREE.LineSegments(
    geometry,
    new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 }),
  );
  line.name = 'site-border';
  return line;
}

/** Two or three small rocks on each deposit tile, coloured by Raw Material. */
function depositMesh(site: Site): THREE.InstancedMesh {
  const rng = makeRng(hashText(site.seed + ':rocks'));
  const rocks: { tile: number; x: number; y: number; z: number; s: number; r: number; colour: number }[] = [];
  site.tiles.forEach((tile, i) => {
    if (!tile.deposit) return;
    const { x, z } = tileCentre(site, i % site.size, Math.floor(i / site.size));
    const count = 2 + Math.floor(rng() * 2);
    for (let k = 0; k < count; k++) {
      rocks.push({
        tile: i,
        x: x + (rng() - 0.5) * 0.6,
        y: topY(tile.level),
        z: z + (rng() - 0.5) * 0.6,
        s: 0.16 + rng() * 0.1,
        r: rng() * Math.PI,
        colour: DEPOSIT_COLOUR[tile.deposit],
      });
    }
  });

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
  const byTile = new Map<number, number[]>();
  rocks.forEach((rock, i) => byTile.set(rock.tile, [...(byTile.get(rock.tile) ?? []), i]));
  mesh.userData.rocksByTile = byTile;
  return mesh;
}

/** Hide the Deposit rocks on one tile (a Mine is built there). */
export function clearRocks(group: THREE.Group, site: Site, x: number, z: number): void {
  const mesh = group.getObjectByName('deposits') as THREE.InstancedMesh | undefined;
  const rocks = (mesh?.userData.rocksByTile as Map<number, number[]> | undefined)?.get(z * site.size + x);
  if (!mesh || !rocks) return;
  const hidden = new THREE.Matrix4().makeScale(0, 0, 0);
  for (const i of rocks) mesh.setMatrixAt(i, hidden);
  mesh.instanceMatrix.needsUpdate = true;
}
