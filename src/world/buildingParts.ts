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

let smokeTexture: THREE.Texture | null | undefined;
/** A soft, cloudy puff (made once, on first use; null outside a browser). */
function smokeMap(): THREE.Texture | null {
  if (smokeTexture !== undefined) return smokeTexture;
  if (typeof document === 'undefined') return (smokeTexture = null);
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return (smokeTexture = null);
  // Overlapping soft blobs make a cauliflower edge instead of a perfect disc.
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 26; i++) {
    const a = rnd() * Math.PI * 2;
    const d = rnd() * size * 0.2;
    const x = size / 2 + Math.cos(a) * d;
    const y = size / 2 + Math.sin(a) * d;
    const r = size * (0.14 + rnd() * 0.16);
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    const shade = Math.round(205 + rnd() * 40);
    grad.addColorStop(0, `rgba(${shade},${shade},${shade},0.45)`);
    grad.addColorStop(1, `rgba(${shade},${shade},${shade},0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return (smokeTexture = texture);
}

/** How opaque a puff is at `k` (0 when it leaves the chimney, 1 when it is gone): quick fade in, slow fade out. */
export function smokeOpacity(k: number): number {
  const t = Math.min(1, Math.max(0, k));
  return 0.9 * Math.min(1, t * 6) * (1 - t) ** 1.3;
}

/**
 * Smoke puffs that rise from (x, y, z): a "smoke" group whose children the World animates (it sets each puff's
 * position and scale, 0.5 → 2.1 as the puff rises). Each puff holds a soft camera-facing sprite that fades with
 * its scale.
 */
export function addSmoke(g: THREE.Group, x: number, y: number, z: number, puffs = 5): void {
  const smoke = new THREE.Group();
  smoke.name = 'smoke';
  smoke.position.set(x, y, z);
  for (let i = 0; i < puffs; i++) {
    const puff = new THREE.Group();
    puff.userData.phase = i / puffs;
    const material = new THREE.SpriteMaterial({
      map: smokeMap(),
      color: 0xa4a4a0,
      transparent: true,
      depthWrite: false,
      opacity: 0,
      rotation: i * 1.9,
    });
    const sprite = new THREE.Sprite(material);
    sprite.scale.setScalar(0.22);
    sprite.onBeforeRender = () => {
      const k = (puff.scale.x - 0.5) / 1.6;
      material.opacity = smokeOpacity(k);
      material.rotation = i * 1.9 + k * 0.8;
    };
    puff.add(sprite);
    smoke.add(puff);
  }
  g.add(smoke);
}

/** A flat five-pointed star of outer radius r, facing +z. */
function starGeometry(r: number): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.42 : r;
    if (i === 0) shape.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
    else shape.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  shape.closePath();
  return new THREE.ExtrudeGeometry(shape, { depth: 0.002, bevelEnabled: false });
}

const SIGN = {
  board: new THREE.MeshStandardMaterial({ color: 0x1f3a5c, roughness: 0.55, metalness: 0.1 }),
  frame: new THREE.MeshStandardMaterial({ color: 0x8a8f94, roughness: 0.45, metalness: 0.7 }),
  star: new THREE.MeshStandardMaterial({
    color: 0xf0c048,
    roughness: 0.35,
    metalness: 0.6,
    emissive: 0x6a4500,
    emissiveIntensity: 0.5,
  }),
};

/**
 * A small sign board on two posts at the front-left corner of a building, turned to face the start view, with
 * one gold star per level on both faces. Named "level" so the World can replace it when the level changes.
 */
export function buildLevelSign(level: number): THREE.Group {
  const g = new THREE.Group();
  g.name = 'level';
  const p = parts(g);
  const n = Math.max(1, level);
  const step = 0.028;
  const w = 0.03 + n * step;
  const h = 0.042;
  const y = 0.075; // board centre above the pad
  const sign = new THREE.Group();
  sign.rotation.y = Math.PI / 4;
  g.add(sign);
  for (const sx of [-1, 1]) {
    p.add(new THREE.CylinderGeometry(0.0035, 0.0035, y + h / 2, 8), SIGN.frame, (sx * (w - 0.01)) / 2, (y + h / 2) / 2, 0, sign);
  }
  p.add(new THREE.BoxGeometry(w + 0.006, h + 0.006, 0.006), SIGN.frame, 0, y, 0, sign);
  p.add(new THREE.BoxGeometry(w, h, 0.008), SIGN.board, 0, y, 0, sign);
  const star = starGeometry(0.0115);
  for (let i = 0; i < n; i++) {
    const x = (i - (n - 1) / 2) * step;
    p.add(star, SIGN.star, x, y, 0.004, sign);
    p.add(star, SIGN.star, x, y, -0.004, sign).rotation.y = Math.PI;
  }
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
