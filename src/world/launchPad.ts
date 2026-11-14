import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { latheGeometry } from './rocketLathe';
import { paint } from './rocketPaint';

/**
 * The launch complex round the rocket, in metres, built in code: a steel launch stand over the flame trench and
 * deflector, the umbilical mast beside the rocket with its swing arms, the big service gantry rolled back on its
 * rails, lightning masts, the domed blockhouse, propellant tanks, lamp posts. Steel members are merged into one
 * mesh per material, so the whole complex is a handful of draw calls. Modelled on the 1950s–60s Cape Canaveral
 * pads in general (no particular complex).
 */

const M = {
  redSteel: paint(0xa2452e, { roughness: 0.62, metalness: 0.35, grime: 0.9 }),
  greySteel: paint(0x8a8f94, { roughness: 0.5, metalness: 0.75, grime: 0.7 }),
  galvanised: paint(0x80858a, { roughness: 0.55, metalness: 0.8, grime: 0.8 }),
  grating: paint(0x5a5e62, { roughness: 0.7, metalness: 0.6, grime: 0.9 }),
  concrete: paint(0x6b6862, { roughness: 0.92, grime: 1, rings: 1.2 }),
  sooty: paint(0x3b3732, { roughness: 0.95, grime: 1, soot: 1, sootTop: 3 }),
  white: paint(0xd9d7d0, { roughness: 0.5, grime: 0.8, rings: 1.5, seams: 12 }),
  dark: paint(0x2b2d30, { roughness: 0.6, metalness: 0.3, grime: 0.4 }),
  glass: new THREE.MeshStandardMaterial({ color: 0x1b2a33, roughness: 0.08, metalness: 0.6 }),
  trenchFloor: new THREE.MeshStandardMaterial({ color: 0x24211e, roughness: 0.95 }),
  lamp: new THREE.MeshStandardMaterial({ color: 0xfff3d6, emissive: 0xfff0c8, emissiveIntensity: 0.6, roughness: 0.4 }),
};

const UP = new THREE.Vector3(0, 1, 0);

/** A box-section member from a to b, `w` metres thick. */
function member(a: THREE.Vector3, b: THREE.Vector3, w: number): THREE.BufferGeometry {
  const dir = b.clone().sub(a);
  const len = dir.length();
  const g = new THREE.BoxGeometry(w, len, w);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, dir.normalize()));
  g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
  return g;
}

/** Collects geometry per material and merges it into one mesh each. */
class Kit {
  private readonly parts = new Map<THREE.Material, THREE.BufferGeometry[]>();
  add(material: THREE.Material, g: THREE.BufferGeometry): void {
    // Merging needs the same attributes everywhere: drop what only some builders make.
    for (const name of Object.keys(g.attributes)) if (name !== 'position' && name !== 'normal' && name !== 'uv') g.deleteAttribute(name);
    const geometry = g.index ? g.toNonIndexed() : g;
    if (geometry !== g) g.dispose();
    if (!this.parts.has(material)) this.parts.set(material, []);
    this.parts.get(material)!.push(geometry);
  }
  beam(material: THREE.Material, a: THREE.Vector3, b: THREE.Vector3, w: number): void {
    this.add(material, member(a, b, w));
  }
  box(material: THREE.Material, w: number, h: number, d: number, x: number, y: number, z: number, turn = 0): void {
    const g = new THREE.BoxGeometry(w, h, d);
    if (turn) g.rotateY(turn);
    g.translate(x, y, z);
    this.add(material, g);
  }
  build(into: THREE.Group, shadows = true): void {
    for (const [material, geometries] of this.parts) {
      const merged = mergeGeometries(geometries, false);
      for (const g of geometries) g.dispose();
      if (!merged) continue;
      const mesh = new THREE.Mesh(merged, material);
      mesh.castShadow = shadows;
      mesh.receiveShadow = true;
      into.add(mesh);
    }
    this.parts.clear();
  }
}

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/**
 * A square lattice tower: four corner posts, a frame every `bay` metres and X bracing on each face, from (x, z)
 * up to `height`, `w` metres on a side (corner at x, z).
 */
function latticeTower(kit: Kit, material: THREE.Material, x: number, z: number, w: number, d: number, height: number, bay: number, post: number, brace: number): void {
  const corners = [v(x, 0, z), v(x + w, 0, z), v(x + w, 0, z + d), v(x, 0, z + d)];
  for (const c of corners) kit.beam(material, c, c.clone().setY(height), post);
  for (let y = 0; y < height - 0.01; y += bay) {
    const top = Math.min(height, y + bay);
    for (let i = 0; i < 4; i++) {
      const a = corners[i]!;
      const b = corners[(i + 1) % 4]!;
      kit.beam(material, a.clone().setY(top), b.clone().setY(top), brace * 1.2);
      kit.beam(material, a.clone().setY(y), b.clone().setY(top), brace);
      kit.beam(material, b.clone().setY(y), a.clone().setY(top), brace);
    }
  }
}

/** A grated platform with a handrail round it. */
function platform(kit: Kit, x: number, y: number, z: number, w: number, d: number): void {
  kit.box(M.grating, w, 0.12, d, x + w / 2, y, z + d / 2);
  const rail = 1.05;
  const corners = [v(x, y, z), v(x + w, y, z), v(x + w, y, z + d), v(x, y, z + d)];
  for (let i = 0; i < 4; i++) {
    const a = corners[i]!;
    const b = corners[(i + 1) % 4]!;
    kit.beam(M.galvanised, a.clone().setY(y + rail), b.clone().setY(y + rail), 0.05);
    kit.beam(M.galvanised, a.clone().setY(y + rail / 2), b.clone().setY(y + rail / 2), 0.035);
    kit.beam(M.galvanised, a, a.clone().setY(y + rail), 0.05);
  }
}

/** The launch stand: a steel table on four legs over the trench, with the rocket's hold-down ring on top. */
function launchStand(kit: Kit): void {
  const h = 1.75;
  for (const [x, z] of [[-2.2, -2.2], [2.2, -2.2], [2.2, 2.2], [-2.2, 2.2]] as const) {
    kit.box(M.greySteel, 0.45, h, 0.45, x, h / 2, z);
    kit.beam(M.greySteel, v(x, 0.2, z), v(x * 0.45, h - 0.2, z * 0.45), 0.16);
  }
  // Table: a square frame of deep girders round an open middle.
  for (const s of [-1, 1]) {
    kit.box(M.greySteel, 5, 0.45, 0.5, 0, h - 0.22, s * 2.2);
    kit.box(M.greySteel, 0.5, 0.45, 5, s * 2.2, h - 0.22, 0);
    kit.box(M.greySteel, 3.2, 0.25, 0.3, 0, h - 0.12, s * 1.45);
    kit.box(M.greySteel, 0.3, 0.25, 3.2, s * 1.45, h - 0.12, 0);
  }
}

/** The flame trench running north–south under the stand, its walls, and the steel deflector wedge. */
function trench(kit: Kit, into: THREE.Group): void {
  for (const s of [-1, 1]) kit.box(M.concrete, 1.2, 1.1, 34, s * 3.6, 0.55, 0);
  // Low blast walls at both open ends.
  for (const s of [-1, 1]) {
    kit.box(M.concrete, 1.0, 0.8, 0.8, -3.6, 0.4, s * 17.4);
    kit.box(M.concrete, 1.0, 0.8, 0.8, 3.6, 0.4, s * 17.4);
  }
  // Blackened trench floor and the deflector: a ridge splitting the exhaust north and south.
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(6, 34), M.trenchFloor);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.03;
  floor.receiveShadow = true;
  into.add(floor);
  const wedge = new THREE.Shape();
  wedge.moveTo(-4.5, 0);
  wedge.quadraticCurveTo(-0.6, 0.15, 0, 1.3);
  wedge.quadraticCurveTo(0.6, 0.15, 4.5, 0);
  wedge.closePath();
  const g = new THREE.ExtrudeGeometry(wedge, { depth: 5.6, bevelEnabled: false, curveSegments: 10 });
  g.translate(0, 0, -2.8);
  g.rotateY(Math.PI / 2);
  kit.add(M.sooty, g);
}

/** The umbilical mast beside the rocket, with swing arms reaching to it. */
function umbilicalMast(kit: Kit, rocketTop: number): void {
  const x0 = -8.6;
  const z0 = -1.3;
  const h = Math.max(24, rocketTop - 2);
  latticeTower(kit, M.redSteel, x0, z0, 2.6, 2.6, h, 2.6, 0.24, 0.09);
  kit.box(M.redSteel, 3.2, 0.3, 3.2, x0 + 1.3, h + 0.15, z0 + 1.3);
  // Swing arms: a small truss each, reaching to the rocket, with a hose hanging under it.
  for (const y of [h * 0.35, h * 0.62, h * 0.86]) {
    const from = x0 + 2.6;
    const to = -1.6;
    for (const dz of [0, 0.9]) {
      kit.beam(M.redSteel, v(from, y, z0 + 0.85 + dz), v(to, y, z0 + 0.85 + dz), 0.12);
      kit.beam(M.redSteel, v(from, y - 0.8, z0 + 0.85 + dz), v(to + 1.2, y - 0.2, z0 + 0.85 + dz), 0.08);
    }
    for (let x = from; x > to; x -= 1.1) kit.beam(M.redSteel, v(x, y, z0 + 0.85), v(x - 1.1, y, z0 + 1.75), 0.06);
    kit.beam(M.dark, v(to + 0.3, y, z0 + 1.3), v(-0.95, y - 0.9, z0 + 1.4), 0.11);
  }
  // Ladder cage and small platforms.
  for (let y = 2.6; y < h; y += 5.2) platform(kit, x0 - 0.6, y, z0 - 0.6, 3.8, 3.8);
}

/** The mobile service gantry, rolled back along its rails for the launch. */
function gantry(kit: Kit, into: THREE.Group): void {
  const x0 = -52;
  const z0 = -66;
  const w = 12;
  const d = 10;
  const h = 40;
  latticeTower(kit, M.redSteel, x0, z0, w, d, h, 4, 0.5, 0.18);
  // Inner frame on the open side (where the rocket stood) and the work platforms.
  for (let y = 8; y < h; y += 8) platform(kit, x0 - 1, y, z0 - 1, w + 2, d + 2);
  kit.box(M.redSteel, w + 2, 2, d + 2, x0 + w / 2, h + 1, z0 + d / 2);
  // Cab on top and a crane jib.
  kit.box(M.white, 4, 3, 4, x0 + w / 2, h + 3.5, z0 + d / 2);
  kit.beam(M.redSteel, v(x0 + w / 2, h + 5, z0 + d / 2), v(x0 + w / 2 + 14, h + 6, z0 + d / 2), 0.4);
  // Bogies and the two rails it runs on, back to the pad.
  for (const x of [x0, x0 + w]) {
    for (const z of [z0, z0 + d]) kit.box(M.dark, 1.6, 1.2, 2.4, x, 0.6, z);
  }
  for (const x of [x0 + 0.5, x0 + w - 0.5]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.18, 74), M.galvanised);
    rail.position.set(x, 0.09, z0 + 37);
    rail.receiveShadow = true;
    into.add(rail);
  }
}

/** A tall lightning mast: a tapering steel pole with a spike. */
function lightningMast(kit: Kit, x: number, z: number, h: number): void {
  kit.add(M.galvanised, latheGeometry([[0, 0], [0.5, 0], [0.45, 0.3], [0.18, h], [0.04, h + 3], [0, h + 3.05]], 12).translate(x, 0, z));
  kit.box(M.concrete, 1.6, 0.5, 1.6, x, 0.25, z);
}

/** The blockhouse: a low domed bunker, with its entrance, antennas and periscopes. */
function blockhouse(kit: Kit, x: number, z: number): void {
  const profile: [number, number][] = [[0, 0], [12.5, 0]];
  for (let k = 0; k <= 12; k++) {
    const a = (k / 12) * (Math.PI / 2);
    profile.push([12 * Math.cos(a) + 0.5 * (1 - k / 12), 0.6 + 6.5 * Math.sin(a)]);
  }
  kit.add(M.concrete, latheGeometry(profile, 64, 50).translate(x, 0, z));
  kit.box(M.concrete, 5, 3.4, 6, x + 11.5, 1.7, z - 2);
  kit.box(M.dark, 2.2, 2.4, 0.2, x + 14, 1.2, z - 2);
  kit.beam(M.galvanised, v(x - 3, 6.9, z + 2), v(x - 3, 13, z + 2), 0.12);
  kit.beam(M.galvanised, v(x + 2, 6.9, z - 3), v(x + 2, 9, z - 3), 0.25);
}

/** A propellant storage tank: a sphere on legs (liquid oxygen) or a horizontal cylinder (fuel). */
function tanks(kit: Kit): void {
  const sphere = new THREE.SphereGeometry(5, 40, 20);
  sphere.translate(58, 9, -38);
  kit.add(M.white, sphere);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    kit.beam(M.greySteel, v(58 + Math.cos(a) * 4.4, 0, -38 + Math.sin(a) * 4.4), v(58 + Math.cos(a) * 4.2, 8, -38 + Math.sin(a) * 4.2), 0.35);
  }
  for (const z of [26, 33]) {
    const tank = latheGeometry([[0, -9], [1.8, -9], [2.6, -8.2], [2.6, 8.2], [1.8, 9], [0, 9]], 32);
    tank.rotateZ(Math.PI / 2);
    tank.translate(52, 3.3, z);
    kit.add(M.white, tank);
    for (const x of [46, 58]) kit.box(M.concrete, 1, 1.4, 4, x, 0.7, z);
  }
}

/** Floodlight poles round the pad. */
function lamps(kit: Kit): void {
  for (const [x, z] of [[-26, -26], [26, -26], [26, 26], [-38, -8]] as const) {
    kit.beam(M.galvanised, v(x, 0, z), v(x, 16, z), 0.28);
    kit.box(M.dark, 2.4, 0.9, 0.6, x, 16.2, z, Math.atan2(x, z));
  }
}

export interface LaunchPad {
  group: THREE.Group;
  dispose(): void;
}

/** The whole launch complex. `rocketTop` is the tallest rocket's height, so the umbilical mast fits. */
export function buildLaunchPad(rocketTop = 30): LaunchPad {
  const group = new THREE.Group();
  group.name = 'launch-pad';
  const kit = new Kit();
  launchStand(kit);
  trench(kit, group);
  umbilicalMast(kit, rocketTop);
  gantry(kit, group);
  for (const [x, z, h] of [[-36, -30, 46], [36, -30, 46], [30, 36, 46]] as const) lightningMast(kit, x, z, h);
  blockhouse(kit, -166, 46);
  tanks(kit);
  lamps(kit);
  kit.build(group);
  return {
    group,
    dispose() {
      group.traverse((o) => {
        if (o instanceof THREE.Mesh) o.geometry.dispose();
      });
    },
  };
}
