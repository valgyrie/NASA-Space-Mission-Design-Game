import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { latheGeometry } from './rocketLathe';
import { paint } from './rocketPaint';
import type { LaunchVehicleId } from '../game/launchVehicles';
import { type LaunchModels, copyLaunchModel, launchModelsNow, loadLaunchModels } from './launchModels';
import { ML_DECK, MOON_ROCKET_SCALE } from './rocketMoon';

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
  /** Show the pad that suits this Launch Vehicle (Falcon 9 gets the modern one) and fit the hold-down ring to it. */
  setVehicle(vehicle: LaunchVehicleId): void;
  dispose(): void;
}

/** Which pad a Launch Vehicle flies from: Falcon 9 from a modern one, the others from a late-1950s one. */
export type PadKind = 'classic' | 'modern' | 'lc39a' | 'lc39b';

/** Which pad a rocket stands on: Saturn V on LC-39A, SLS on LC-39B (Mobile Launchers, code-built), Falcon 9 on the modern pad. */
export function padKind(vehicle: LaunchVehicleId): PadKind {
  if (vehicle === 'saturnV') return 'lc39a';
  if (vehicle === 'sls') return 'lc39b';
  return vehicle === 'falcon9' ? 'modern' : 'classic';
}

/**
 * The hold-down ring under a rocket's base: its inner and outer radius (clear of the engine bells, under the
 * skirt), and the directions of the arms that carry it (radians round from +z, as rocketMesh.ts places parts).
 * Delta D's three arms run between its Castor boosters.
 */
export function holdDown(vehicle: LaunchVehicleId): { inner: number; outer: number; arms: number[] } {
  const four = [1, 3, 5, 7].map((k) => (k * Math.PI) / 4);
  switch (vehicle) {
    case 'juno1':
      return { inner: 0.56, outer: 0.92, arms: four };
    case 'falcon9':
      return { inner: 0.66, outer: 0.84, arms: four };
    case 'deltaD':
      return { inner: 0.74, outer: 1.16, arms: [0.5, 7 / 6, 11 / 6].map((k) => k * Math.PI) };
    default:
      return { inner: 0.74, outer: 1.16, arms: four };
  }
}

/** How far an arm at angle `a` (from +z) reaches before it meets the rectangle |x| = halfX, |z| = halfZ. */
export function armReach(a: number, halfX: number, halfZ: number): number {
  const sx = Math.abs(Math.sin(a));
  const cz = Math.abs(Math.cos(a));
  return Math.min(sx > 1e-6 ? halfX / sx : Infinity, cz > 1e-6 ? halfZ / cz : Infinity);
}

const RING_TOP = 1.8;

/** The hold-down ring and its arms out to the stand's girders (classic) or the launch table's opening (modern). */
function holdDownRing(vehicle: LaunchVehicleId): THREE.Group {
  const g = new THREE.Group();
  g.name = 'hold-down';
  const { inner, outer, arms } = holdDown(vehicle);
  const ring = new THREE.Mesh(
    latheGeometry([[inner, RING_TOP - 0.26], [outer, RING_TOP - 0.26], [outer, RING_TOP - 0.02], [outer - 0.02, RING_TOP], [inner, RING_TOP], [inner, RING_TOP - 0.26]], 48),
    M.greySteel,
  );
  g.add(ring);
  const modern = padKind(vehicle) === 'modern';
  for (const a of arms) {
    const reach = modern ? armReach(a, 1.62, 1.62) : armReach(a, 2.1, 2.6);
    const length = reach - outer + 0.15;
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.3, length), M.greySteel);
    arm.position.set(Math.sin(a) * (outer + length / 2 - 0.05), RING_TOP - 0.17, Math.cos(a) * (outer + length / 2 - 0.05));
    arm.rotation.y = a;
    g.add(arm);
    // A clamp on the ring under the rocket's skirt.
    const clamp = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.3), M.dark);
    clamp.position.set(Math.sin(a) * (outer - 0.12), RING_TOP + 0.08, Math.cos(a) * (outer - 0.12));
    clamp.rotation.y = a;
    g.add(clamp);
  }
  g.traverse((o) => {
    if (o instanceof THREE.Mesh) o.castShadow = o.receiveShadow = true;
  });
  return g;
}

/**
 * Kennedy's Launch Complex 39 for the Moon rockets, built in code at the Moon rockets' scale (rocketMoon.ts):
 *  - Saturn V on LC-39A: the Mobile Launcher (a 49 x 41 m steel deck, 7.6 m high, over the exhaust hole) with the
 *    red Launch Umbilical Tower beside the rocket, its nine swing arms reaching across (the top one is the crew's
 *    access arm to the Command Module) and the hammerhead crane on top.
 *  - SLS on LC-39B: Mobile Launcher 1, a grey 12 m-square tower about 108 m tall on the same kind of deck, with the
 *    crew access arm to Orion, the umbilical arms, and the two tail service masts at the base.
 * Merged per material like the rest of the pad. Not exact: tower heights and arm levels from NASA's fact sheets.
 */
function kennedyPad(vehicle: 'saturnV' | 'sls'): THREE.Group {
  const k = MOON_ROCKET_SCALE;
  const kit = new Kit();
  const g = new THREE.Group();
  g.name = vehicle === 'saturnV' ? 'lc39a' : 'lc39b';
  const deck = ML_DECK * k;
  // The Mobile Launcher's deck: four blocks round the square exhaust hole, on six pedestals.
  const hole = 13.7 * k;
  const w = 49 * k;
  const d = 41 * k;
  const side = (w - hole) / 2;
  kit.box(M.greySteel, side, deck, d, -(hole / 2 + side / 2), deck / 2, 0);
  kit.box(M.greySteel, side, deck, d, hole / 2 + side / 2, deck / 2, 0);
  kit.box(M.greySteel, hole, deck, (d - hole) / 2, 0, deck / 2, -(hole / 2 + (d - hole) / 4));
  kit.box(M.greySteel, hole, deck, (d - hole) / 2, 0, deck / 2, hole / 2 + (d - hole) / 4);
  for (const x of [-w / 2 + 2, w / 2 - 2]) for (const z of [-d / 2 + 2, 0, d / 2 - 2]) kit.box(M.concrete, 2.4, 1.2, 2.4, x, 0.6, z);
  // Hold-down posts round the hole and a grated rim.
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    kit.box(M.dark, 0.7, 0.9, 0.7, Math.sin(a) * hole * 0.42, deck + 0.45, Math.cos(a) * hole * 0.42);
  }
  // The tower on the north side (-z), its near face this far from the rocket's axis.
  const tw = 12.2 * k;
  const tz = -(vehicle === 'saturnV' ? 14 : 12.5) * k - tw / 2;
  const red = vehicle === 'saturnV';
  const steel = red ? M.redSteel : M.greySteel;
  const towerTop = (red ? 120 : 108) * k;
  const tower = new Kit();
  latticeTower(tower, steel, -tw / 2, tz - tw / 2, tw, tw, towerTop, 4.2 * k * 2, 0.75 * k * 2, 0.35 * k * 2);
  tower.build(g);
  g.children.at(-1)!.position.y = deck;
  // Floors every few levels, an elevator shaft, the crane or lightning mast on top.
  for (let y = 0; y < towerTop; y += 12 * k) platform(kit, -tw / 2 - 0.3, deck + y, tz - tw / 2 - 0.3, tw + 0.6, tw + 0.6);
  kit.box(M.white, tw * 0.25, towerTop, tw * 0.25, 0, deck + towerTop / 2, tz);
  if (red) {
    kit.box(steel, tw * 1.1, 2.5 * k, tw * 1.1, 0, deck + towerTop + 1.2 * k, tz);
    kit.beam(steel, v(0, deck + towerTop + 3 * k, tz - tw * 0.4), v(0, deck + towerTop + 3 * k, tz + tw * 1.4), 1.6 * k);
    kit.beam(steel, v(0, deck + towerTop + 2.5 * k, tz), v(0, deck + towerTop + 9 * k, tz), 1.2 * k);
  } else {
    kit.beam(M.galvanised, v(0, deck + towerTop, tz), v(0, deck + towerTop + 14 * k, tz), 0.5 * k);
  }
  // Arms across to the rocket: [height above the deck (real m), reach to the rocket's skin (real m), crew arm].
  const arms: [number, number, boolean][] = red
    ? [[23, 5.05, false], [40, 5.05, false], [48, 5.05, false], [58, 5.05, false], [66, 5.05, false], [72, 3.3, false], [86, 3.3, false], [96, 1.96, false], [103, 1.96, true]]
    : [[12, 4.2, false], [55, 4.2, false], [76, 2.6, false], [82, 2.62, false], [89, 2.55, true]];
  const near = tz + tw / 2;
  for (const [y, skin, crew] of arms) {
    const at = deck + y * k;
    const end = -(skin + 0.4) * k;
    const aw = (crew ? 2.4 : 1.6) * k;
    // A box truss: four chords and a deck; the crew arm has a closed white room at its end.
    for (const [dx, dy] of [[-aw / 2, 0], [aw / 2, 0], [-aw / 2, aw], [aw / 2, aw]] as const) kit.beam(steel, v(dx, at + dy, near), v(dx, at + dy, end), 0.22 * k * 2);
    for (let z = near; z < end - 0.01; z += 2.2 * k) kit.beam(steel, v(-aw / 2, at, z), v(aw / 2, at + aw, z + 2.2 * k), 0.12 * k * 2);
    kit.box(M.grating, aw, 0.1, end - near, 0, at + 0.05, (near + end) / 2);
    if (crew) kit.box(M.white, aw * 1.4, aw * 1.2, 3.2 * k, 0, at + aw * 0.6, end - 1.4 * k);
  }
  if (!red) {
    // Tail service masts either side of the core's base, and the Orion umbilical.
    for (const s of [-1, 1]) kit.box(M.greySteel, 2.2 * k, 9.8 * k, 2.2 * k, s * 7.2 * k, deck + 4.9 * k, -4.6 * k);
    kit.box(M.white, 4 * k, 2 * k, 3 * k, 0, deck + 80 * k, near + 1.5 * k);
  }
  kit.build(g);
  return g;
}

/**
 * The whole launch complex. `rocketTop` is the tallest rocket's height, so the code-built umbilical mast fits.
 * The code-built pad shows at once; the Blender models (launchModels.ts) replace it when they have loaded, and then
 * `group.userData.trench` tells the ground (launchGround.ts) to open over the sunken flame trench.
 */
export function buildLaunchPad(rocketTop = 30): LaunchPad {
  const group = new THREE.Group();
  group.name = 'launch-pad';
  const fallback = new THREE.Group();
  fallback.name = 'launch-pad-simple';
  const kit = new Kit();
  launchStand(kit);
  trench(kit, fallback);
  umbilicalMast(kit, rocketTop);
  gantry(kit, fallback);
  for (const [x, z, h] of [[-36, -30, 46], [36, -30, 46], [30, 36, 46]] as const) lightningMast(kit, x, z, h);
  blockhouse(kit, -166, 46);
  tanks(kit);
  lamps(kit);
  kit.build(fallback);
  group.add(fallback);

  let vehicle: LaunchVehicleId = 'thorDelta';
  let ring = holdDownRing(vehicle);
  group.add(ring);
  let parts: Record<'common' | 'classic' | 'modern', THREE.Object3D> | null = null;
  let disposed = false;
  const kennedy: Partial<Record<'lc39a' | 'lc39b', THREE.Group>> = {};

  const show = () => {
    const kind = padKind(vehicle);
    group.userData.kind = kind;
    // The Moon rockets stand on a Mobile Launcher: no hold-down ring of the older pads, no gantry.
    const ml = kind === 'lc39a' || kind === 'lc39b';
    ring.visible = !ml;
    if (ml && !kennedy[kind]) group.add((kennedy[kind] = kennedyPad(kind === 'lc39a' ? 'saturnV' : 'sls')));
    for (const id of ['lc39a', 'lc39b'] as const) if (kennedy[id]) kennedy[id].visible = kind === id;
    fallback.visible = !ml;
    if (!parts) return;
    parts.classic.visible = kind === 'classic';
    parts.modern.visible = kind === 'modern';
  };
  const useModels = (models: LaunchModels | null) => {
    if (!models || disposed || parts) return;
    parts = { common: copyLaunchModel(models, 'common'), classic: copyLaunchModel(models, 'classic'), modern: copyLaunchModel(models, 'modern') };
    group.remove(fallback);
    disposeOwn(fallback);
    group.add(parts.common, parts.classic, parts.modern);
    group.userData.trench = true;
    group.userData.version = ((group.userData.version as number | undefined) ?? 0) + 1;
    show();
  };
  const ready = launchModelsNow();
  if (ready) useModels(ready);
  else void loadLaunchModels().then(useModels);

  return {
    group,
    setVehicle(next) {
      if (next !== vehicle) {
        vehicle = next;
        group.remove(ring);
        disposeOwn(ring);
        ring = holdDownRing(vehicle);
        group.add(ring);
        group.userData.version = ((group.userData.version as number | undefined) ?? 0) + 1;
      }
      show();
    },
    dispose() {
      disposed = true;
      disposeOwn(group);
    },
  };
}

/** Free the code-built geometry under `root`; the Blender models' geometry is shared and kept. */
function disposeOwn(root: THREE.Object3D): void {
  root.traverse((o) => {
    if (o.userData.shared) return;
    if (o instanceof THREE.Mesh && !isShared(o)) o.geometry.dispose();
  });
}

function isShared(o: THREE.Object3D): boolean {
  for (let p: THREE.Object3D | null = o; p; p = p.parent) if (p.userData.shared) return true;
  return false;
}
