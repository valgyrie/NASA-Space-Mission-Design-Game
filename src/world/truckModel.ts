import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { FOOTPRINT } from '../game/siteState';
import type { Design } from '../game/spacecraft';
import { buildSpacecraft } from './spacecraftMesh';

/**
 * The Shipping rig, its load and the loading dock, made in code: a 1960s-style conventional tractor with a flatbed
 * semi-trailer, built in metres (x forward, y up, origin on the ground in the middle of the rig), PBR paint, chrome,
 * rubber and glass that reflect the sky. The dock is built in world units (tiles).
 */

const std = (color: number, roughness: number, metalness = 0, extra: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });

/** Shared by every rig and dock; never disposed (only the shapes are). */
const MAT = {
  paint: std(0xb8432c, 0.32, 0.15),
  paintWing: std(0xb8432c, 0.32, 0.15, { side: THREE.DoubleSide }),
  paintDark: std(0x2f3237, 0.45, 0.3),
  chrome: std(0xe2e4e6, 0.16, 1),
  steel: std(0x6c7075, 0.5, 0.75),
  chassis: std(0x232427, 0.6, 0.45),
  rubber: std(0x18191b, 0.92),
  rim: std(0xc9ccd0, 0.35, 0.85),
  glass: std(0x16212b, 0.04, 0.3),
  deck: std(0x5e4b38, 0.85),
  lampAmber: std(0xffb347, 0.3, 0, { emissive: 0xff9a2a, emissiveIntensity: 0.6 }),
  lampWhite: std(0xf4f1e6, 0.2, 0, { emissive: 0xfff4d8, emissiveIntensity: 0.5 }),
  lampRed: std(0xb0201c, 0.3, 0, { emissive: 0xb0201c, emissiveIntensity: 0.5 }),
  tarp: std(0x45503f, 0.95),
  strap: std(0xd29a24, 0.7),
  galv: std(0xa9aeb3, 0.45, 0.7),
  board: std(0x8a6a44, 0.9),
  concrete: std(0x9f9b92, 0.95),
  joint: std(0x6e6a63, 0.95),
  kerb: std(0xd2ac3a, 0.6),
  crane: std(0xd9a830, 0.5, 0.25),
  foundation: std(0x8a857c, 0.95),
};

function mesh(g: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0, parent?: THREE.Object3D): THREE.Mesh {
  const o = new THREE.Mesh(g, m);
  o.position.set(x, y, z);
  o.castShadow = true;
  o.receiveShadow = true;
  parent?.add(o);
  return o;
}

const rbox = (w: number, h: number, d: number, r: number) => new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2, h / 2, d / 2));
const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
/** A cylinder along z (axles, lamps facing sideways are turned afterwards). */
function cylZ(r: number, length: number, segs = 20): THREE.BufferGeometry {
  return new THREE.CylinderGeometry(r, r, length, segs).rotateX(Math.PI / 2);
}
function cylX(r: number, length: number, segs = 20): THREE.BufferGeometry {
  return new THREE.CylinderGeometry(r, r, length, segs).rotateZ(Math.PI / 2);
}

/** A tyre (rounded, with sidewalls) and its rim; axle along z. `width` 0.3 single, 0.6 for twin tyres. */
function wheel(radius: number, width: number): THREE.Group {
  const g = new THREE.Group();
  g.name = 'wheel';
  const r0 = radius * 0.58;
  const w = width / 2;
  const profile: THREE.Vector2[] = [];
  // Cross-section of the tyre from the inner bead round the tread and back (lathe about y, then turned to z).
  for (let i = 0; i <= 12; i++) {
    const a = -Math.PI / 2 + (i / 12) * Math.PI;
    profile.push(new THREE.Vector2(radius - 0.08 + Math.cos(a) * 0.08, Math.sin(a) * w));
  }
  profile.unshift(new THREE.Vector2(r0, -w * 0.9));
  profile.push(new THREE.Vector2(r0, w * 0.9));
  const tyre = new THREE.LatheGeometry(profile, 28).rotateX(Math.PI / 2);
  mesh(tyre, MAT.rubber, 0, 0, 0, g);
  mesh(cylZ(r0, width * 0.86, 20), MAT.rim, 0, 0, 0, g);
  // Hub and studs show the wheel turning.
  mesh(cylZ(r0 * 0.38, width * 0.95, 10), MAT.chassis, 0, 0, 0, g);
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    for (const side of [-1, 1]) mesh(cylZ(0.025, 0.04, 6), MAT.chrome, Math.cos(a) * r0 * 0.6, Math.sin(a) * r0 * 0.6, side * width * 0.45, g);
  }
  return g;
}

/** Wheel radius of the rig, metres. */
export const WHEEL_RADIUS = 0.52;
/** Half the rig's length, metres. */
export const RIG_HALF_LENGTH = 8.3;
/** Height of the trailer's deck, metres: the load stands on it. */
const DECK = 1.5;

/**
 * A tractor and flatbed semi-trailer, about 16.5 m long, facing +x, in metres. Wheels are groups named "wheel"
 * turning about z; the load goes in the group named "cargo" on the deck.
 */
export function buildRig(): THREE.Group {
  const g = new THREE.Group();
  g.name = 'truck';
  // --- Tractor ---
  for (const z of [-0.45, 0.45]) mesh(box(9.2, 0.28, 0.12), MAT.chassis, 3.4, 0.88, z, g);
  mesh(rbox(1.0, 0.3, 2.45, 0.08), MAT.chrome, 8.05, 0.75, 0, g); // bumper
  mesh(rbox(2.6, 0.95, 2.1, 0.22), MAT.paint, 6.75, 1.5, 0, g); // bonnet
  mesh(rbox(0.12, 0.85, 1.3, 0.04), MAT.chrome, 8.06, 1.45, 0, g); // grille surround
  for (let i = 0; i < 7; i++) mesh(box(0.05, 0.7, 0.04), MAT.chassis, 8.1, 1.45, -0.5 + (i * 1) / 6, g);
  for (const z of [-0.82, 0.82]) {
    mesh(cylX(0.13, 0.1, 16), MAT.lampWhite, 8.12, 1.62, z, g);
    mesh(cylX(0.06, 0.06, 10), MAT.lampAmber, 8.12, 1.25, z * 1.1, g);
    // Front wings over the wheels.
    const wing = mesh(new THREE.CylinderGeometry(0.66, 0.66, 0.42, 20, 1, true, Math.PI / 2, Math.PI), MAT.paintWing, 6.9, 0.55, z * 1.27, g);
    wing.rotation.x = Math.PI / 2;
  }
  mesh(rbox(2.0, 2.0, 2.45, 0.2), MAT.paint, 4.55, 2.15, 0, g); // cab
  mesh(rbox(0.06, 0.8, 2.1, 0.03), MAT.glass, 5.56, 2.6, 0, g).rotation.z = -0.18; // windscreen
  for (const z of [-1.23, 1.23]) {
    mesh(box(1.1, 0.7, 0.04), MAT.glass, 4.75, 2.6, z, g);
    mesh(box(0.05, 0.45, 0.25), MAT.chassis, 5.6, 2.55, z * 1.08, g); // mirror
    mesh(box(0.7, 0.12, 0.4), MAT.chrome, 4.1, 1.05, z * 0.9, g); // step
    mesh(cylX(0.32, 1.3, 18), MAT.chrome, 2.9, 1.05, z * 0.82, g); // fuel tank
  }
  for (const x of [4.1, 4.4, 4.7, 5.0]) mesh(cylX(0.05, 0.06, 8), MAT.lampAmber, x, 3.18, 0, g).rotation.z = 0; // cab roof lights
  for (const z of [-1.0, 1.0]) mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.3, 12), MAT.chrome, 3.5, 2.75, z, g); // exhaust stacks
  mesh(box(1.4, 0.12, 2.3), MAT.paintDark, 1.6, 1.12, 0, g); // fifth wheel plate
  // --- Trailer ---
  mesh(box(10.9, 0.18, 2.5), MAT.deck, -2.85, DECK - 0.09, 0, g);
  for (const z of [-1.25, 1.25]) mesh(box(10.9, 0.24, 0.06), MAT.steel, -2.85, DECK - 0.12, z, g); // side rails
  for (const z of [-0.5, 0.5]) mesh(box(10.6, 0.42, 0.14), MAT.chassis, -2.9, DECK - 0.4, z, g); // main beams
  for (let i = 0; i < 9; i++) for (const z of [-1.24, 1.24]) mesh(box(0.08, 0.1, 0.05), MAT.chassis, 2.2 - i * 1.25, DECK - 0.05, z * 1.01, g); // stake pockets
  for (const z of [-0.85, 0.85]) {
    mesh(box(0.12, 1.0, 0.12), MAT.steel, -0.6, 0.6, z, g); // landing legs
    mesh(box(0.35, 0.05, 0.3), MAT.steel, -0.6, 0.08, z, g);
  }
  mesh(box(0.1, 0.25, 2.45), MAT.chassis, -8.3, DECK - 0.35, 0, g); // rear bar
  for (const z of [-1.05, 1.05]) mesh(box(0.04, 0.12, 0.25), MAT.lampRed, -8.36, DECK - 0.3, z, g);
  // Mudflaps.
  for (const x of [1.1, -8.0]) for (const z of [-0.9, 0.9]) mesh(box(0.03, 0.55, 0.5), MAT.rubber, x, 0.5, z, g);
  // --- Wheels: steer axle, tractor tandem, trailer tandem ---
  for (const [x, w] of [
    [6.9, 0.32],
    [2.25, 0.62],
    [0.95, 0.62],
    [-5.9, 0.62],
    [-7.2, 0.62],
  ] as const) {
    for (const z of [-1, 1]) {
      const wh = wheel(WHEEL_RADIUS, w);
      wh.position.set(x, WHEEL_RADIUS, z * (1.25 - w / 2 + 0.06));
      g.add(wh);
    }
    mesh(cylZ(0.07, 1.9, 8), MAT.chassis, x, WHEEL_RADIUS, 0, g);
  }
  const cargo = new THREE.Group();
  cargo.name = 'cargo';
  cargo.position.set(-3.0, DECK, 0);
  g.add(cargo);
  return g;
}

/** A tube from a to b (scaffold poles). */
function pole(a: THREE.Vector3, b: THREE.Vector3, r: number, m: THREE.Material, parent: THREE.Object3D): void {
  const d = b.clone().sub(a);
  const o = mesh(new THREE.CylinderGeometry(r, r, d.length(), 8), m, 0, 0, 0, parent);
  o.position.copy(a).addScaledVector(d, 0.5);
  o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
}

/** The Spacecraft on the deck inside a scaffold while it is assembled, and its covered load for the drive. In metres. */
export function buildLoad(cargo: THREE.Group, design: Design): void {
  const craft = buildSpacecraft(design);
  const size = new THREE.Box3().setFromObject(craft).getSize(new THREE.Vector3());
  craft.scale.setScalar(3.6 / Math.max(size.y, size.x, size.z, 1e-6));
  craft.position.y = 0.55;
  craft.name = 'spacecraft';
  craft.traverse((o) => {
    if (o instanceof THREE.Mesh) o.castShadow = true;
  });
  cargo.add(craft);
  // A cradle it stands on.
  mesh(box(2.4, 0.5, 2.2), MAT.steel, 0, 0.25, 0, cargo);

  const scaffold = new THREE.Group();
  scaffold.name = 'scaffold';
  const s = 1.6;
  const top = 5.2;
  const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  for (const [x, z] of [
    [-s, -s],
    [s, -s],
    [s, s],
    [-s, s],
  ] as const)
    pole(V(x, 0, z), V(x, top, z), 0.045, MAT.galv, scaffold);
  for (const y of [1.6, 3.4, top]) {
    pole(V(-s, y, -s), V(s, y, -s), 0.035, MAT.galv, scaffold);
    pole(V(-s, y, s), V(s, y, s), 0.035, MAT.galv, scaffold);
    pole(V(-s, y, -s), V(-s, y, s), 0.035, MAT.galv, scaffold);
    pole(V(s, y, -s), V(s, y, s), 0.035, MAT.galv, scaffold);
  }
  // Diagonal braces and a working platform with toe boards.
  pole(V(-s, 0, -s), V(s, 1.6, -s), 0.03, MAT.galv, scaffold);
  pole(V(s, 1.6, s), V(-s, 3.4, s), 0.03, MAT.galv, scaffold);
  for (const z of [-s, s]) mesh(box(2 * s, 0.05, 0.5), MAT.board, 0, 3.4, z * 0.82, scaffold);
  cargo.add(scaffold);

  const crate = new THREE.Group();
  crate.name = 'crate';
  mesh(rbox(5.4, 4.3, 2.6, 0.35), MAT.tarp, 0, 2.15, 0, crate);
  for (const x of [-2.0, -0.7, 0.7, 2.0]) mesh(box(0.08, 4.36, 2.66), MAT.strap, x, 2.17, 0, crate);
  crate.visible = false;
  cargo.add(crate);
}

/** Thickness of the dock's slab above the ground, world units. */
export const DOCK_SLAB = 0.03;

/**
 * The loading dock, as big as a building (world units): a concrete apron with sawn joints and yellow kerbs, a slewing
 * jib crane (its jib is the part named "crane") and two floodlights, on a base reaching into the ground.
 */
export function buildDock(): THREE.Group {
  const g = new THREE.Group();
  g.name = 'dock';
  const f = FOOTPRINT;
  mesh(box(f - 0.04, DOCK_SLAB + 0.02, f - 0.04), MAT.concrete, 0, DOCK_SLAB / 2 - 0.01, 0, g);
  mesh(box(f - 0.1, 1.7, f - 0.1), MAT.foundation, 0, -0.85, 0, g).castShadow = false;
  for (let i = 1; i < 5; i++) {
    const p = -f / 2 + (i * f) / 5;
    mesh(box(0.012, 0.004, f - 0.06), MAT.joint, p, DOCK_SLAB + 0.001, 0, g).castShadow = false;
    mesh(box(f - 0.06, 0.004, 0.012), MAT.joint, 0, DOCK_SLAB + 0.001, p, g).castShadow = false;
  }
  for (const z of [-1, 1]) mesh(box(f - 0.04, 0.03, 0.06), MAT.kerb, 0, DOCK_SLAB + 0.015, z * (f / 2 - 0.05), g);
  // Crane: a steel pillar on a plinth beside the road, an I-beam jib with a trolley and hook.
  const cx = 0.25;
  const cz = 1.15;
  mesh(box(0.22, 0.08, 0.22), MAT.concrete, cx, DOCK_SLAB + 0.04, cz, g);
  mesh(new THREE.CylinderGeometry(0.028, 0.04, 0.95, 14), MAT.crane, cx, DOCK_SLAB + 0.5, cz, g);
  const jib = new THREE.Group();
  jib.name = 'crane';
  jib.position.set(cx, DOCK_SLAB + 0.98, cz);
  g.add(jib);
  mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.06, 14), MAT.crane, 0, 0, 0, jib);
  mesh(box(0.035, 0.05, 1.45), MAT.crane, 0, 0.0, -0.62, jib); // jib beam
  mesh(box(0.025, 0.12, 0.025), MAT.crane, 0, 0.07, 0.12, jib); // counterweight post
  mesh(box(0.14, 0.1, 0.18), MAT.concrete, 0, 0.0, 0.18, jib); // counterweight
  mesh(box(0.1, 0.05, 0.08), MAT.chassis, 0, -0.06, -1.05, jib); // trolley
  mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.45, 4), MAT.chassis, 0, -0.3, -1.05, jib); // cable
  mesh(box(0.05, 0.05, 0.05), MAT.steel, 0, -0.54, -1.05, jib); // hook block
  // Floodlights on masts at two corners.
  for (const x of [-1, 1]) {
    const px = x * (f / 2 - 0.15);
    const pz = -(f / 2 - 0.15);
    mesh(new THREE.CylinderGeometry(0.018, 0.026, 1.1, 8), MAT.steel, px, DOCK_SLAB + 0.55, pz, g);
    const head = mesh(box(0.12, 0.06, 0.08), MAT.lampWhite, px, DOCK_SLAB + 1.1, pz + 0.04, g);
    head.rotation.x = 0.5;
  }
  return g;
}

/** The dock's slab seen from above (world units): its centre, half its side, and the height where its fill starts. */
export interface DockSquare {
  x: number;
  z: number;
  half: number;
  top: number;
}

/** How steeply the fill round the dock falls away to the land (height per unit across), like a graded pad's edge. */
export const BERM_GRADE = 0.6;
/** The fill reaches at most this far out; past it, it drops straight to the land. */
const BERM_REACH = 3;

/** Height of the dock's fill at (x, z): level with the slab's edge, falling away at `BERM_GRADE` all round. */
export function bermHeight(d: DockSquare, x: number, z: number): number {
  const dx = Math.max(Math.abs(x - d.x) - d.half, 0);
  const dz = Math.max(Math.abs(z - d.z) - d.half, 0);
  return d.top - BERM_GRADE * Math.hypot(dx, dz);
}

/** The land with the dock's fill on it: what the road and the truck ride on. */
export function withBerm(d: DockSquare, ground: (x: number, z: number) => number): (x: number, z: number) => number {
  return (x, z) => Math.max(ground(x, z), bermHeight(d, x, z));
}

/**
 * Where the fill meets the land going out from (x, z) along (ux, uz): the distance, or `BERM_REACH` if the land
 * falls away faster than the fill all the way.
 */
export function bermReach(d: DockSquare, ground: (x: number, z: number) => number, x: number, z: number, ux: number, uz: number): number {
  const step = 0.05;
  let before = d.top - ground(x, z);
  if (before <= 0) return 0;
  for (let t = step; t <= BERM_REACH; t += step) {
    const gap = d.top - BERM_GRADE * t - ground(x + ux * t, z + uz * t);
    if (gap <= 0) return t - step * (gap / (gap - before));
    before = gap;
  }
  return BERM_REACH;
}

/**
 * The dock's outline, going round: points on the slab's edge with the way out from it. Straight sides every
 * `spacing`, and a fan of ways out at each corner so the fill rounds it.
 */
export function dockOutline(half: number, spacing = 0.12, fan = 4): { x: number; z: number; ux: number; uz: number }[] {
  const corners = [[1, 1], [-1, 1], [-1, -1], [1, -1]] as const;
  const out: { x: number; z: number; ux: number; uz: number }[] = [];
  const along = Math.max(2, Math.ceil((2 * half) / spacing));
  for (let c = 0; c < 4; c++) {
    const [sx, sz] = corners[c];
    const [nx, nz] = corners[(c + 1) % 4];
    for (let k = 0; k <= fan; k++) {
      const a = (Math.PI / 2) * (c + k / fan);
      out.push({ x: sx * half, z: sz * half, ux: Math.cos(a), uz: Math.sin(a) });
    }
    const a = (Math.PI / 2) * (c + 1);
    for (let k = 1; k < along; k++) {
      const t = k / along;
      out.push({ x: (sx + (nx - sx) * t) * half, z: (sz + (nz - sz) * t) * half, ux: Math.cos(a), uz: Math.sin(a) });
    }
  }
  return out;
}

/** Crushed-stone fill, a little darker and dustier towards its foot. */
const BERM_TOP = new THREE.Color(0xf4f1ea);
const BERM_FOOT = new THREE.Color(0xc4baa8);

let gravelTexture: THREE.Texture | null = null;

/** Crushed stone: grey and brown grit with a few larger pebbles; made once in a canvas. */
function gravel(): THREE.Texture | null {
  if (gravelTexture || typeof document === 'undefined') return gravelTexture;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d')!;
  x.fillStyle = '#8c877e';
  x.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 3200; i++) {
    const v = 95 + Math.floor(Math.random() * 90);
    const warm = Math.random() * 14;
    x.fillStyle = `rgb(${v + warm},${v + warm * 0.5},${v - 4})`;
    const r = Math.random() < 0.08 ? 2.5 : 1.2;
    x.fillRect(Math.random() * 128, Math.random() * 128, r, r);
  }
  gravelTexture = new THREE.CanvasTexture(c);
  gravelTexture.colorSpace = THREE.SRGBColorSpace;
  gravelTexture.wrapS = gravelTexture.wrapT = THREE.RepeatWrapping;
  gravelTexture.anisotropy = 8;
  return gravelTexture;
}

/**
 * The fill round the dock, so on sloping land it sits in a graded bank like a building's pad instead of standing
 * up as a wall: from just under the slab's edge down to where it meets the land (world units).
 */
export function buildBerm(d: DockSquare, ground: (x: number, z: number) => number): THREE.Mesh {
  const outline = dockOutline(d.half);
  const rows = 6;
  const pos: number[] = [];
  const col: number[] = [];
  const uv: number[] = [];
  const c = new THREE.Color();
  for (const p of outline) {
    const x0 = d.x + p.x;
    const z0 = d.z + p.z;
    const reach = bermReach(d, ground, x0, z0, p.ux, p.uz);
    for (let k = 0; k <= rows; k++) {
      const t = (reach * k) / rows;
      const x = x0 + p.ux * t;
      const z = z0 + p.uz * t;
      // The last row tucks under the land so no gap shows; the rest follow the bank (never under the land).
      const y = k === rows ? ground(x, z) - 0.04 : Math.max(d.top - BERM_GRADE * t, ground(x, z) + 0.004);
      pos.push(x, y, z);
      uv.push(x * 1.5, z * 1.5);
      const n = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
      c.copy(BERM_TOP).lerp(BERM_FOOT, (k / rows) ** 1.5).multiplyScalar(0.92 + 0.16 * (n - Math.floor(n)));
      col.push(c.r, c.g, c.b);
    }
  }
  const index: number[] = [];
  const per = rows + 1;
  for (let i = 0; i < outline.length; i++) {
    const a = i * per;
    const b = ((i + 1) % outline.length) * per;
    for (let k = 0; k < rows; k++) index.push(a + k, a + k + 1, b + k, b + k, a + k + 1, b + k + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(index);
  g.computeVertexNormals();
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, map: gravel(), roughness: 1, side: THREE.DoubleSide });
  const berm = new THREE.Mesh(g, m);
  berm.name = 'berm';
  berm.receiveShadow = true;
  return berm;
}

/** Width of the road, world units. */
export const ROAD_WIDTH = 0.75;

let roadTexture: THREE.Texture | null = null;

/** Asphalt with worn edge lines and a dashed centre line, one dash period long; made once in a canvas. */
function asphalt(): THREE.Texture | null {
  if (roadTexture || typeof document === 'undefined') return roadTexture;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 256;
  const x = c.getContext('2d')!;
  x.fillStyle = '#4a4b4d';
  x.fillRect(0, 0, 128, 256);
  // Aggregate speckle and patched, darker wheel tracks.
  for (let i = 0; i < 2600; i++) {
    const v = 50 + Math.floor(Math.random() * 40);
    x.fillStyle = `rgb(${v},${v},${v + 2})`;
    x.fillRect(Math.random() * 128, Math.random() * 256, 1.5, 1.5);
  }
  x.fillStyle = 'rgba(25,25,28,0.18)';
  for (const t of [30, 98]) x.fillRect(t - 10, 0, 20, 256);
  x.fillStyle = 'rgba(225,222,210,0.8)';
  for (const t of [6, 118]) x.fillRect(t, 0, 4, 256);
  x.fillStyle = 'rgba(230,190,70,0.85)';
  x.fillRect(62, 0, 4, 128);
  roadTexture = new THREE.CanvasTexture(c);
  roadTexture.colorSpace = THREE.SRGBColorSpace;
  roadTexture.wrapS = THREE.ClampToEdgeWrapping;
  roadTexture.wrapT = THREE.RepeatWrapping;
  roadTexture.anisotropy = 8;
  return roadTexture;
}

/**
 * A paved road from `a` to `b` (world x/z), draped on the ground (`ground` gives its height), with a soft gravel
 * shoulder. One mesh, drawn just above the ground. Pieces where `skip` is true (a building stands there) are left out.
 */
export function buildRoad(
  a: { x: number; z: number },
  b: { x: number; z: number },
  ground: (x: number, z: number) => number,
  skip: (x: number, z: number) => boolean = () => false,
): THREE.Mesh {
  const length = Math.hypot(b.x - a.x, b.z - a.z);
  const dx = (b.x - a.x) / length;
  const dz = (b.z - a.z) / length;
  const steps = Math.max(2, Math.ceil(length / 0.25));
  const across = [-0.5, -0.25, 0, 0.25, 0.5];
  const pos: number[] = [];
  const uv: number[] = [];
  const index: number[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * length;
    for (const s of across) {
      const x = a.x + dx * t - dz * s * ROAD_WIDTH;
      const z = a.z + dz * t + dx * s * ROAD_WIDTH;
      pos.push(x, ground(x, z) + 0.03, z);
      uv.push(s + 0.5, t / 1.2);
    }
  }
  const n = across.length;
  for (let i = 0; i < steps; i++)
    for (let k = 0; k < n - 1; k++) {
      const p = i * n + k;
      const mx = (pos[p * 3] + pos[(p + n + 1) * 3]) / 2;
      const mz = (pos[p * 3 + 2] + pos[(p + n + 1) * 3 + 2]) / 2;
      if (skip(mx, mz)) continue;
      index.push(p, p + 1, p + n, p + 1, p + n + 1, p + n);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(index);
  g.computeVertexNormals();
  const m = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: asphalt(),
    roughness: 0.92,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  const road = new THREE.Mesh(g, m);
  road.name = 'road';
  road.receiveShadow = true;
  return road;
}
