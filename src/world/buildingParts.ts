import * as THREE from 'three';
import type { FactoryKind } from '../economy/part';
import { FOOTPRINT } from '../game/siteState';
import { useFoundation, useModel } from './buildingModels';

/**
 * Shared pieces for the low-poly building models. Every model is drawn about 0.9 × 0.9 and then scaled
 * up by `BUILDING_SCALE` to fill its building's tiles (`FOOTPRINT` in siteState.ts).
 *
 * Moving parts are found by name and turned by `World.animateBuildings` while the building works:
 * - "spin": turns around its own z axis (wheels)
 * - "spinY": turns around the vertical axis (dishes, fans)
 * - "swing": rocks around the vertical axis (a sun-tracking panel)
 * - "shuttle": drives back and forth along x by `userData.range` (a forklift)
 * - "smoke": its children rise, grow and start again (chimney smoke)
 */

export const mat = (color: number, extra: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.85, ...extra });

/** One palette for every building, so the Site looks like one place. */
export const M = {
  concrete: mat(0xa39e94),
  foundation: mat(0x8a857c),
  asphalt: mat(0x55575c),
  wall: mat(0xf3eee4),
  white: mat(0xf7f8fa, { roughness: 0.6 }),
  dish: mat(0xf7f8fa, { roughness: 0.6, side: THREE.DoubleSide }),
  brick: mat(0xa4503a),
  corrugated: mat(0x7d8a99, { metalness: 0.3, roughness: 0.6 }),
  roof: mat(0xd9583a),
  darkRoof: mat(0x4a525e),
  door: mat(0x6b4a33),
  shutter: mat(0xc9ccd1, { metalness: 0.3 }),
  glass: mat(0x9fd3ff, { roughness: 0.2, metalness: 0.3 }),
  steel: mat(0x46505f, { metalness: 0.4, roughness: 0.6 }),
  dark: mat(0x23272e),
  rail: mat(0x7d838c, { metalness: 0.6, roughness: 0.4 }),
  wood: mat(0x8a6542),
  yellow: mat(0xf2b632),
  gold: mat(0xffc93c, { metalness: 0.2, roughness: 0.4, emissive: 0xb07800, emissiveIntensity: 0.6 }),
  stripe: mat(0x2a2a2a),
  tank: mat(0xe9edf0, { metalness: 0.3, roughness: 0.4 }),
  pipe: mat(0xb8bec6, { metalness: 0.6, roughness: 0.35 }),
  bulb: mat(0xffe08a, { emissive: 0xffd36b, emissiveIntensity: 0.8 }),
  fire: mat(0xff7a2a, { emissive: 0xff5a10, emissiveIntensity: 1.4 }),
  smoke: mat(0xd6d8dc, { roughness: 1, transparent: true, opacity: 0.75 }),
};

/** The colour of what each Factory makes, shown on its model and next to its Parts in menus. */
export const PRODUCT_COLOUR: Record<FactoryKind, number> = {
  metalWorks: 0xc8d0d9, // bare aluminium structure
  electronicsLab: 0x2e9a5a, // circuit-board green
  solarFab: 0x2b4fb3, // solar-cell blue
  batteryPlant: 0xf2c230, // battery-cell yellow
};

const colourMaterials = new Map<number, THREE.Material>();
/** A shared material of one colour (Raw Material or product colours). */
export function colourMat(color: number, extra: THREE.MeshStandardMaterialParameters = {}): THREE.Material {
  let m = colourMaterials.get(color);
  if (!m) colourMaterials.set(color, (m = mat(color, { roughness: 0.7, ...extra })));
  return m;
}

export const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);

/** A gable roof: a triangle pushed out into a prism, centred, ridge along x. */
export function gableRoof(width: number, height: number, length: number): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, 0);
  shape.lineTo(width / 2, 0);
  shape.lineTo(0, height);
  shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, { depth: length, bevelEnabled: false });
  g.translate(0, 0, -length / 2);
  g.rotateY(Math.PI / 2);
  return g;
}

export const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/** Helpers that add shadowed meshes to one building group. */
export function parts(g: THREE.Group) {
  const add = (
    geometry: THREE.BufferGeometry,
    m: THREE.Material,
    x: number,
    y: number,
    z: number,
    parent: THREE.Object3D = g,
  ): THREE.Mesh => {
    const mesh = new THREE.Mesh(geometry, m);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  /** A thin bar from point a to point b. */
  const bar = (a: THREE.Vector3, b: THREE.Vector3, thick: number, m: THREE.Material, parent: THREE.Object3D = g) => {
    const mesh = add(box(thick, a.distanceTo(b), thick), m, 0, 0, 0, parent);
    mesh.position.copy(a).add(b).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(v(0, 1, 0), b.clone().sub(a).normalize());
    return mesh;
  };
  /** An upright cylinder standing on height `y`. */
  const cyl = (r: number, h: number, m: THREE.Material, x: number, y: number, z: number, sides = 10, parent: THREE.Object3D = g) =>
    add(new THREE.CylinderGeometry(r, r, h, sides), m, x, y + h / 2, z, parent);
  /** A lamp post with a glowing bulb. */
  const lamp = (x: number, z: number, height = 0.42) => {
    add(new THREE.CylinderGeometry(0.012, 0.016, height, 5), M.dark, x, 0.05 + height / 2, z);
    add(new THREE.SphereGeometry(0.03, 6, 4), M.bulb, x, 0.07 + height, z);
  };
  /** A named empty group for a moving part. */
  const mover = (name: string, x: number, y: number, z: number, parent: THREE.Object3D = g) => {
    const o = new THREE.Group();
    o.name = name;
    o.position.set(x, y, z);
    parent.add(o);
    return o;
  };
  return { add, bar, cyl, lamp, mover };
}

/** How much the models are scaled up: a 0.9-wide model then just fills its building's tiles. */
export const BUILDING_SCALE = FOOTPRINT * 1.1;

/** How far the foundation reaches down, in model units: past the lowest ground a building can stand over. */
const FOUNDATION_DEPTH = 1.7;

/**
 * A new building group at full size, on a foundation block that reaches down into the ground. On flat
 * land the block is hidden; on a slope it fills the gap under the building.
 */
export function buildingGroup(name: string): THREE.Group {
  const g = new THREE.Group();
  g.name = name;
  g.scale.setScalar(BUILDING_SCALE);
  parts(g).add(box(0.9, FOUNDATION_DEPTH, 0.9), M.foundation, 0, -FOUNDATION_DEPTH / 2, 0).name = 'foundation';
  useFoundation(g);
  return g;
}

/** Smoke puffs that rise from (x, y, z): a "smoke" group whose children the World animates. */
export function addSmoke(g: THREE.Group, x: number, y: number, z: number, puffs = 4): void {
  const smoke = new THREE.Group();
  smoke.name = 'smoke';
  smoke.position.set(x, y, z);
  for (let i = 0; i < puffs; i++) {
    const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(0.05, 0), M.smoke);
    puff.userData.phase = i / puffs;
    smoke.add(puff);
  }
  g.add(smoke);
}

/**
 * A small sign at the front-left corner of a building: one gold star per level. Named "level" so the World
 * can replace it when the level changes.
 */
export function buildLevelSign(level: number): THREE.Group {
  const g = new THREE.Group();
  g.name = 'level';
  const p = parts(g);
  const height = 0.1 + level * 0.09;
  p.add(new THREE.CylinderGeometry(0.009, 0.009, height, 5), M.dark, 0, 0.05 + height / 2, 0);
  for (let i = 0; i < level; i++) p.add(new THREE.IcosahedronGeometry(0.04, 0), M.gold, 0, 0.15 + i * 0.09, 0);
  return g;
}

/** A yellow tower crane with a turning jib ("craneJib"), shown while a building is upgraded. */
export function buildCrane(): THREE.Group {
  const g = new THREE.Group();
  g.name = 'crane';
  const p = parts(g);
  p.add(box(0.1, 0.03, 0.1), M.concrete, 0, 0.065, 0);
  // Lattice mast: four corner posts with cross bars.
  for (const [x, z] of [
    [-0.025, -0.025],
    [0.025, -0.025],
    [-0.025, 0.025],
    [0.025, 0.025],
  ] as const) {
    p.bar(v(x, 0.08, z), v(x, 1.0, z), 0.008, M.yellow);
  }
  for (let y = 0.15; y < 1; y += 0.12) {
    p.bar(v(-0.025, y, 0.025), v(0.025, y + 0.1, 0.025), 0.005, M.yellow);
    p.bar(v(0.025, y, -0.025), v(-0.025, y + 0.1, -0.025), 0.005, M.yellow);
  }
  const jib = p.mover('craneJib', 0, 1.0, 0);
  jib.userData.speed = 0.35;
  p.add(box(0.05, 0.06, 0.05), M.dark, 0, 0.02, 0, jib);
  p.add(box(0.75, 0.03, 0.035), M.yellow, 0.2, 0.06, 0, jib);
  p.add(box(0.08, 0.06, 0.06), M.concrete, -0.17, 0.04, 0, jib);
  p.bar(v(0.45, 0.05, 0), v(0.45, -0.35, 0), 0.004, M.dark, jib);
  p.add(box(0.06, 0.06, 0.06), M.wood, 0.45, -0.38, 0, jib);
  useModel(g, 'crane');
  return g;
}
