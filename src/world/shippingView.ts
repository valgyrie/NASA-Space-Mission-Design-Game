import * as THREE from 'three';
import type { Design } from '../game/spacecraft';
import { M, box, colourMat, parts, v } from './buildingParts';
import { type ShippingRoute, truckPosition } from './shippingRoute';
import { buildSpacecraft } from './spacecraftMesh';

/**
 * The Mission on the Site, so the player can watch it leave: while the Spacecraft is assembled it
 * stands on the truck at a loading dock inside a yellow scaffold, with a crane swinging over it; when
 * Shipping starts a crate closes over it and the truck drives off the Site along its route.
 */

export interface ShippingScene {
  route: ShippingRoute;
  design: Design;
  stage: 'assembling' | 'shipping' | 'ready';
  /** 0–1 through the stage. */
  fraction: number;
}

const CAB = colourMat(0xd9583a);
const TYRE = new THREE.MeshStandardMaterial({ color: 0x1d1f23, flatShading: true, roughness: 0.95 });

/** A flatbed truck about one tile long, facing +x. Cargo sits on the bed in a group named "cargo". */
function buildTruck(): THREE.Group {
  const g = new THREE.Group();
  g.name = 'truck';
  const p = parts(g);
  // Chassis and bed.
  p.add(box(0.86, 0.05, 0.22), M.dark, 0, 0.11, 0);
  p.add(box(0.6, 0.03, 0.32), M.wood, -0.12, 0.15, 0);
  for (const z of [-0.155, 0.155]) p.add(box(0.6, 0.04, 0.012), M.steel, -0.12, 0.17, z);
  p.add(box(0.012, 0.05, 0.32), M.steel, -0.42, 0.17, 0);
  // Cab with windscreen, side windows, roof light, grille, bumper and headlights.
  p.add(box(0.2, 0.2, 0.3), CAB, 0.31, 0.24, 0);
  p.add(box(0.06, 0.1, 0.3), CAB, 0.44, 0.19, 0);
  p.add(box(0.012, 0.08, 0.24), M.glass, 0.416, 0.29, 0);
  for (const z of [-0.151, 0.151]) p.add(box(0.1, 0.07, 0.012), M.glass, 0.33, 0.29, z);
  p.add(box(0.04, 0.02, 0.1), M.yellow, 0.3, 0.35, 0);
  p.add(box(0.012, 0.06, 0.18), M.steel, 0.472, 0.18, 0);
  p.add(box(0.03, 0.03, 0.32), M.steel, 0.48, 0.12, 0);
  for (const z of [-0.11, 0.11]) p.add(box(0.012, 0.03, 0.04), M.bulb, 0.478, 0.2, z);
  // Exhaust stack behind the cab.
  p.cyl(0.012, 0.16, M.pipe, 0.19, 0.18, 0.13, 6);
  // Wheels: each a group that turns about the axle (z); the hub plate shows the turning.
  for (const x of [0.33, -0.15, -0.32]) {
    for (const z of [-0.15, 0.15]) {
      const wheel = new THREE.Group();
      wheel.name = 'wheel';
      wheel.position.set(x, 0.065, z);
      const tyre = p.add(new THREE.CylinderGeometry(0.065, 0.065, 0.05, 10), TYRE, 0, 0, 0, wheel);
      tyre.rotation.x = Math.PI / 2;
      p.add(box(0.05, 0.016, 0.054), M.pipe, 0, 0, 0, wheel);
      g.add(wheel);
    }
  }
  const cargo = new THREE.Group();
  cargo.name = 'cargo';
  cargo.position.set(-0.12, 0.165, 0);
  g.add(cargo);
  return g;
}

/** The Spacecraft, its scaffold and the shipping crate, sized for the bed. */
function buildCargo(cargo: THREE.Group, design: Design): void {
  const p = parts(cargo);
  const craft = buildSpacecraft(design);
  const size = new THREE.Box3().setFromObject(craft).getSize(new THREE.Vector3());
  craft.scale.setScalar(0.26 / Math.max(size.y, size.x, size.z, 1e-6));
  craft.position.y = 0.15;
  craft.name = 'spacecraft';
  craft.traverse((o) => {
    if (o instanceof THREE.Mesh) o.castShadow = true;
  });
  cargo.add(craft);

  const scaffold = new THREE.Group();
  scaffold.name = 'scaffold';
  const s = 0.16;
  for (const [x, z] of [[-s, -s], [s, -s], [s, s], [-s, s]] as const) {
    p.bar(v(x, 0, z), v(x, 0.34, z), 0.012, M.yellow, scaffold);
  }
  for (const y of [0.12, 0.33]) {
    p.bar(v(-s, y, -s), v(s, y, -s), 0.01, M.yellow, scaffold);
    p.bar(v(-s, y, s), v(s, y, s), 0.01, M.yellow, scaffold);
    p.bar(v(-s, y, -s), v(-s, y, s), 0.01, M.yellow, scaffold);
    p.bar(v(s, y, -s), v(s, y, s), 0.01, M.yellow, scaffold);
  }
  cargo.add(scaffold);

  const crate = new THREE.Group();
  crate.name = 'crate';
  p.add(box(0.4, 0.3, 0.3), M.wood, 0, 0.15, 0, crate);
  for (const x of [-0.13, 0.13]) p.add(box(0.02, 0.305, 0.305), M.stripe, x, 0.15, 0, crate);
  p.add(box(0.405, 0.03, 0.305), M.wood, 0, 0.02, 0, crate);
  p.add(box(0.12, 0.05, 0.006), M.white, 0, 0.18, 0.153, crate);
  crate.visible = false;
  cargo.add(crate);
}

/** A concrete loading pad with a swinging crane and two lamps, on the dock tile. */
function buildDock(): THREE.Group {
  const g = new THREE.Group();
  g.name = 'dock';
  const p = parts(g);
  p.add(box(0.98, 0.04, 0.98), M.concrete, 0, 0.02, 0);
  for (const x of [-0.45, 0.45]) p.add(box(0.03, 0.045, 0.98), M.yellow, x, 0.025, 0);
  p.cyl(0.03, 0.62, M.yellow, 0.05, 0.04, 0.36, 8);
  const jib = p.mover('crane', 0.05, 0.66, 0.36);
  p.add(box(0.5, 0.035, 0.035), M.yellow, -0.12, 0, 0, jib);
  p.add(box(0.1, 0.07, 0.07), M.concrete, 0.17, 0, 0, jib);
  p.add(box(0.004, 0.3, 0.004), M.dark, -0.33, -0.15, 0, jib);
  p.add(box(0.03, 0.02, 0.03), M.steel, -0.33, -0.31, 0, jib);
  p.lamp(-0.4, -0.4);
  p.lamp(0.4, -0.4);
  return g;
}

export class ShippingView {
  readonly group = new THREE.Group();
  private truck: THREE.Group | null = null;
  private dock: THREE.Group | null = null;
  private scene: ShippingScene | null = null;
  private key = '';
  private clock = 0;
  private lastPos: { x: number; z: number } | null = null;

  /** `ground` gives the height of the land at a world point. */
  constructor(private readonly ground: (x: number, z: number) => number) {
    this.group.name = 'shipping';
  }

  /** Show the Mission as it is now, or nothing. Cheap to call every frame: models are built only when the Mission changes. */
  show(scene: ShippingScene | null): void {
    const key = scene ? `${scene.route.from.x},${scene.route.from.z},${JSON.stringify(scene.design)}` : '';
    if (key !== this.key) {
      this.clear();
      this.key = key;
      if (scene) this.build(scene);
    }
    this.scene = scene;
    if (!scene || !this.truck || !this.dock) return;
    const cargo = this.truck.getObjectByName('cargo')!;
    const packed = scene.stage !== 'assembling';
    cargo.getObjectByName('scaffold')!.visible = !packed;
    cargo.getObjectByName('crate')!.visible = packed;
    cargo.getObjectByName('spacecraft')!.visible = !packed;
    // Gone once it has driven out of sight; the Spacecraft is at the Launch Site.
    this.truck.visible = scene.stage === 'assembling' || (scene.stage === 'shipping' && scene.fraction < 0.98);
    this.dock.visible = scene.stage !== 'ready';
    const pos = truckPosition(scene.route, scene.stage === 'shipping' ? scene.fraction : 0);
    this.truck.position.x = pos.x;
    this.truck.position.z = pos.z;
  }

  /** Move the crane, turn the wheels as the truck rolls, and let it ride smoothly over steps in the land. */
  animate(gameSeconds: number, realSeconds: number): void {
    if (!this.truck || !this.scene) return;
    this.clock += gameSeconds;
    const crane = this.dock?.getObjectByName('crane');
    if (crane && this.scene.stage === 'assembling') crane.rotation.y = Math.sin(this.clock * 0.6) * 0.9;
    const { x, z } = this.truck.position;
    const target = this.ground(x, z) + 0.04; // on the dock's pad, and just clear of the land
    this.truck.position.y += (target - this.truck.position.y) * Math.min(1, realSeconds * 6);
    const moved = this.lastPos ? Math.hypot(x - this.lastPos.x, z - this.lastPos.z) : 0;
    this.lastPos = { x, z };
    if (moved > 0 && moved < 2) this.truck.traverse((o) => o.name === 'wheel' && (o.rotation.z -= moved / 0.065));
  }

  /** Where the truck is, for a camera that follows it; null when it isn't on screen. */
  get truckWorldPosition(): THREE.Vector3 | null {
    return this.truck?.visible ? this.truck.position.clone() : null;
  }

  private build(scene: ShippingScene): void {
    const { route } = scene;
    this.dock = buildDock();
    this.dock.position.set(route.from.x, this.ground(route.from.x, route.from.z), route.from.z);
    this.dock.rotation.y = Math.atan2(-route.dir.z, route.dir.x);
    this.truck = buildTruck();
    buildCargo(this.truck.getObjectByName('cargo') as THREE.Group, scene.design);
    this.truck.scale.setScalar(1.1);
    this.truck.rotation.y = Math.atan2(-route.dir.z, route.dir.x);
    this.truck.position.set(route.from.x, this.ground(route.from.x, route.from.z) + 0.04, route.from.z);
    this.lastPos = null;
    this.group.add(this.dock, this.truck);
  }

  private clear(): void {
    for (const o of [this.truck, this.dock]) {
      if (!o) continue;
      this.group.remove(o);
      // Materials are shared with the rest of the world; only the shapes belong to these models.
      o.traverse((m) => m instanceof THREE.Mesh && m.geometry.dispose());
    }
    this.truck = this.dock = null;
    this.scene = null;
  }

  /** Remove everything (a new Site is shown). */
  reset(): void {
    this.clear();
    this.key = '';
  }
}
