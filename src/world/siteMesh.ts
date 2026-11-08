import * as THREE from 'three';
import type { RawMaterial } from '../economy/rawMaterial';
import { hashText, makeRng } from '../site/random';
import { type Site, type Terrain, tileAt } from '../site/site';

/** Height of one terrain step in world units. A tile is 1 × 1. */
export const STEP = 0.5;
const BASE = -3;
const WATER_Y = -0.12;

const TERRAIN_COLOUR: Record<Terrain, number> = {
  water: 0x3b6e8f,
  sand: 0xe3cf94,
  grass: 0x8cc66d,
  hills: 0x6c9e55,
  mountain: 0x9b958e,
};
const SNOW = 0xf1f4f8;
const SOIL = 0x7d5a3c;
const WATER = 0x4aa3d8;

export const DEPOSIT_COLOUR: Record<RawMaterial, number> = {
  aluminium: 0xdfe6ee,
  copper: 0xd8763a,
  silicon: 0x7b83eb,
};

/** World position of the centre of tile (x, z). */
export function tileCentre(site: Site, x: number, z: number): { x: number; z: number } {
  return { x: x - site.size / 2 + 0.5, z: z - site.size / 2 + 0.5 };
}

function topY(level: number): number {
  return level * STEP;
}

/** Low-poly 3D model of a Site: terraced land, water and deposit rocks. */
export function buildSiteMesh(site: Site): THREE.Group {
  const group = new THREE.Group();
  group.name = 'site';
  group.add(terrainMesh(site), waterMesh(site), depositMesh(site));
  return group;
}

function terrainMesh(site: Site): THREE.Mesh {
  const positions: number[] = [];
  const colours: number[] = [];
  const rng = makeRng(hashText(site.seed + ':colour'));
  const c = new THREE.Color();

  const quad = (pts: number[][], colour: THREE.Color) => {
    const [a, b, d, e] = pts as [number[], number[], number[], number[]];
    for (const p of [a, b, d, a, d, e]) {
      positions.push(p[0]!, p[1]!, p[2]!);
      colours.push(colour.r, colour.g, colour.b);
    }
  };

  for (let z = 0; z < site.size; z++) {
    for (let x = 0; x < site.size; x++) {
      const tile = tileAt(site, x, z)!;
      const { x: cx, z: cz } = tileCentre(site, x, z);
      const x0 = cx - 0.5;
      const x1 = cx + 0.5;
      const z0 = cz - 0.5;
      const z1 = cz + 0.5;
      const y = topY(tile.level);

      // Top: terrain colour, tinted toward the Raw Material on a deposit, with a little jitter.
      c.setHex(tile.terrain === 'mountain' && tile.level >= 9 ? SNOW : TERRAIN_COLOUR[tile.terrain]);
      if (tile.deposit) c.lerp(new THREE.Color(DEPOSIT_COLOUR[tile.deposit]), 0.55);
      c.offsetHSL(0, 0, (rng() - 0.5) * 0.04);
      quad([[x0, y, z0], [x0, y, z1], [x1, y, z1], [x1, y, z0]], c);

      // Sides, wherever the neighbour is lower (or off the edge of the Site).
      const sides: [number, number, number[][]][] = [
        [1, 0, [[x1, 0, z1], [x1, 0, z0]]],
        [-1, 0, [[x0, 0, z0], [x0, 0, z1]]],
        [0, 1, [[x0, 0, z1], [x1, 0, z1]]],
        [0, -1, [[x1, 0, z0], [x0, 0, z0]]],
      ];
      for (const [dx, dz, [p, q]] of sides) {
        const next = tileAt(site, x + dx, z + dz);
        const bottom = next ? topY(next.level) : BASE;
        if (bottom >= y) continue;
        const side = new THREE.Color(next ? TERRAIN_COLOUR[tile.terrain] : SOIL).multiplyScalar(next ? 0.72 : 1);
        quad([[p![0]!, y, p![2]!], [p![0]!, bottom, p![2]!], [q![0]!, bottom, q![2]!], [q![0]!, y, q![2]!]], side);
        // Water at the edge of the Site gets a blue face so the sea doesn't look cut open.
        if (!next && tile.terrain === 'water') {
          const blue = new THREE.Color(WATER).multiplyScalar(0.8);
          quad([[p![0]!, WATER_Y, p![2]!], [p![0]!, y, p![2]!], [q![0]!, y, q![2]!], [q![0]!, WATER_Y, q![2]!]], blue);
        }
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 }),
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function waterMesh(site: Site): THREE.Mesh {
  const geometry = new THREE.PlaneGeometry(site.size, site.size);
  geometry.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({ color: WATER, roughness: 0.3, metalness: 0.1, transparent: true, opacity: 0.85 }),
  );
  mesh.position.y = WATER_Y;
  mesh.receiveShadow = true;
  mesh.visible = site.tiles.some((t) => t.terrain === 'water');
  return mesh;
}

/** Two or three small rocks on each deposit tile, coloured by Raw Material. */
function depositMesh(site: Site): THREE.InstancedMesh {
  const rng = makeRng(hashText(site.seed + ':rocks'));
  const rocks: { x: number; y: number; z: number; s: number; r: number; colour: number }[] = [];
  site.tiles.forEach((tile, i) => {
    if (!tile.deposit) return;
    const { x, z } = tileCentre(site, i % site.size, Math.floor(i / site.size));
    const count = 2 + Math.floor(rng() * 2);
    for (let k = 0; k < count; k++) {
      rocks.push({
        x: x + (rng() - 0.5) * 0.6,
        y: topY(tile.level),
        z: z + (rng() - 0.5) * 0.6,
        s: 0.2 + rng() * 0.12,
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
  mesh.castShadow = true;
  return mesh;
}
