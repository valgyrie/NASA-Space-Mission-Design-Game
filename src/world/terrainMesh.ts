import * as THREE from 'three';
import type { Terrain } from '../site/site';

/** Height of one terrain step in world units. A tile is 1 × 1. */
export const STEP = 0.5;
/** Bottom of the cliffs at the very edge of the drawn land. */
export const BASE = -3;
export const WATER_Y = -0.12;
export const WATER = 0x4aa3d8;

const TERRAIN_COLOUR: Record<Terrain, number> = {
  water: 0x3b6e8f,
  sand: 0xe3cf94,
  grass: 0x8cc66d,
  hills: 0x6c9e55,
  mountain: 0x9b958e,
};
const SNOW = 0xf1f4f8;
const SOIL = 0x7d5a3c;

/** Soft shadow in corners: how bright a top corner is with 0–3 higher neighbours around it. */
const CORNER_LIGHT = [1, 0.84, 0.72, 0.6];
/** Cliff faces get darker toward their foot. */
const CLIFF_TOP = 0.74;
const CLIFF_FOOT = 0.5;

export interface Cell {
  terrain: Terrain;
  level: number;
  /** Optional colour to blend into the top, e.g. a Deposit, with how much of it (0–1). */
  tint?: { colour: number; amount: number };
}

export interface TerrainGrid {
  /** Cells run from `from` (included) to `to` (excluded) on both axes. */
  from: number;
  to: number;
  /** Tiles per cell side: 1 for full detail, more for far-away scenery. */
  cellSize: number;
  /** World x/z of tile 0's corner, so the Site sits centred on the origin. */
  origin: number;
  /** The cell to draw, or undefined to leave a hole (something else is drawn there). */
  cellAt(ix: number, iz: number): Cell | undefined;
  /** Height of a neighbouring cell, for cliffs and corner shadows. Undefined drops a cliff to the base. */
  levelAt(ix: number, iz: number): number | undefined;
  /** 0 = true colours; higher fades colours toward `hazeColour`, for scenery. */
  haze?: number;
  hazeColour?: number;
}

/** Cheap, repeatable 0–1 number per cell, for a little colour variety. */
function jitter(ix: number, iz: number): number {
  let h = Math.imul(ix, 73856093) ^ Math.imul(iz, 19349663);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Terraced low-poly land: flat-topped cells with cliffs between levels and soft corner shadows. */
export function buildTerrainGeometry(grid: TerrainGrid): THREE.BufferGeometry {
  const positions: number[] = [];
  const colours: number[] = [];
  const haze = new THREE.Color(grid.hazeColour ?? 0xffffff);
  const cs = grid.cellSize;

  const push = (p: readonly number[], c: THREE.Color) => {
    positions.push(p[0]!, p[1]!, p[2]!);
    colours.push(c.r, c.g, c.b);
  };
  /** Two triangles a-b-c and a-c-d, each corner with its own colour. */
  const quad = (pts: readonly (readonly number[])[], cols: THREE.Color[]) => {
    for (const k of [0, 1, 2, 0, 2, 3]) push(pts[k]!, cols[k]!);
  };
  const shaded = (base: THREE.Color, f: number) => base.clone().multiplyScalar(f);

  const higher = (level: number, ix: number, iz: number) => {
    const n = grid.levelAt(ix, iz);
    return n !== undefined && n > level;
  };

  for (let iz = grid.from; iz < grid.to; iz++) {
    for (let ix = grid.from; ix < grid.to; ix++) {
      const cell = grid.cellAt(ix, iz);
      if (!cell) continue;
      const x0 = grid.origin + ix * cs;
      const x1 = x0 + cs;
      const z0 = grid.origin + iz * cs;
      const z1 = z0 + cs;
      const y = cell.level * STEP;

      const top = new THREE.Color(cell.terrain === 'mountain' && cell.level >= 9 ? SNOW : TERRAIN_COLOUR[cell.terrain]);
      if (cell.tint) top.lerp(new THREE.Color(cell.tint.colour), cell.tint.amount);
      top.offsetHSL(0, 0, (jitter(ix, iz) - 0.5) * 0.04);
      if (grid.haze) top.lerp(haze, grid.haze);

      // Corner shadows: count higher neighbours around each corner (two sides and the diagonal).
      const corner = (sx: number, sz: number) => {
        const a = higher(cell.level, ix + sx, iz);
        const b = higher(cell.level, ix, iz + sz);
        const d = higher(cell.level, ix + sx, iz + sz);
        return shaded(top, CORNER_LIGHT[a && b ? 3 : Number(a) + Number(b) + Number(d)]!);
      };
      quad(
        [[x0, y, z0], [x0, y, z1], [x1, y, z1], [x1, y, z0]],
        [corner(-1, -1), corner(-1, 1), corner(1, 1), corner(1, -1)],
      );

      // Cliffs wherever the neighbour is lower, darker toward the foot.
      const sides: [number, number, number[], number[]][] = [
        [1, 0, [x1, z1], [x1, z0]],
        [-1, 0, [x0, z0], [x0, z1]],
        [0, 1, [x0, z1], [x1, z1]],
        [0, -1, [x1, z0], [x0, z0]],
      ];
      for (const [dx, dz, [px, pz], [qx, qz]] of sides) {
        const next = grid.levelAt(ix + dx, iz + dz);
        const bottom = next === undefined ? BASE : next * STEP;
        if (bottom >= y) continue;
        const face = new THREE.Color(next === undefined && cell.level <= 0 ? SOIL : TERRAIN_COLOUR[cell.terrain]);
        if (grid.haze) face.lerp(haze, grid.haze);
        const hi = shaded(face, CLIFF_TOP);
        const lo = shaded(face, CLIFF_FOOT);
        quad([[px!, y, pz!], [px!, bottom, pz!], [qx!, bottom, qz!], [qx!, y, qz!]], [hi, lo, lo, hi]);
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
  geometry.computeVertexNormals();
  return geometry;
}

export function terrainMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 });
}
