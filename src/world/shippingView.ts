import * as THREE from 'three';
import { FOOTPRINT, footprint } from '../game/siteState';
import type { Design } from '../game/spacecraft';
import { type ShippingRoute, truckPosition } from './shippingRoute';
import {
  DOCK_SLAB,
  type DockSquare,
  RIG_HALF_LENGTH,
  ROAD_WIDTH,
  WHEEL_RADIUS,
  buildBerm,
  buildDock,
  buildLoad,
  buildRig,
  buildRoad,
  withBerm,
} from './truckModel';
import { setVegetationClearing } from './vegetation';

/**
 * The Mission on the Site, so the player can watch it leave: while the Spacecraft is assembled it
 * stands on the trailer at a loading dock inside a scaffold, with a crane swinging over it; when
 * Shipping starts it is covered and strapped down and the rig drives off the Site along a paved road.
 * On sloping land the dock sits in a graded bank of fill; the road is left out where a building stands on it.
 */

export interface ShippingScene {
  route: ShippingRoute;
  design: Design;
  stage: 'assembling' | 'shipping' | 'ready';
  /** 0–1 through the stage. */
  fraction: number;
}

/** World units per metre of the rig (a tile is about 10 m; the rig is drawn a little large so it reads from afar). */
const RIG_SCALE = 0.125;
/** The road goes on this far past where the drive ends (tiles), into the haze. */
const ROAD_BEYOND = 70;
/** The road stops this far short of a building's footprint (world units). */
const ROAD_CLEAR = 0.15;

export class ShippingView {
  readonly group = new THREE.Group();
  private truck: THREE.Group | null = null;
  private dock: THREE.Group | null = null;
  private road: THREE.Mesh | null = null;
  private berm: THREE.Mesh | null = null;
  /** The land with the dock's fill on it (what the road and the truck ride on). */
  private ride: (x: number, z: number) => number;
  /** Which buildings the road was last laid round. */
  private buildingsKey = -1;
  private scene: ShippingScene | null = null;
  private key = '';
  private clock = 0;
  private lastPos: { x: number; z: number } | null = null;

  /** `ground` gives the height of the land at a world point. */
  constructor(private readonly ground: (x: number, z: number) => number) {
    this.group.name = 'shipping';
    this.ride = ground;
  }

  /** Show the Mission as it is now, or nothing. Cheap to call every frame: models are built only when the Mission changes. */
  show(scene: ShippingScene | null): void {
    const key = scene ? `${scene.route.from.x},${scene.route.from.z},${scene.route.to.x},${scene.route.to.z},${JSON.stringify(scene.design)}` : '';
    if (key !== this.key) {
      this.clear();
      this.key = key;
      if (scene) this.build(scene);
    }
    this.scene = scene;
    if (!scene || !this.truck || !this.dock) return;
    // A building put up (or taken down) next to the road: lay the road again round it.
    if (this.buildingsKey !== buildingsKey(this.buildingCentres())) this.layRoad(scene.route);
    const cargo = this.truck.getObjectByName('cargo')!;
    const packed = scene.stage !== 'assembling';
    cargo.getObjectByName('scaffold')!.visible = !packed;
    cargo.getObjectByName('crate')!.visible = packed;
    cargo.getObjectByName('spacecraft')!.visible = !packed;
    // Gone once it has driven out of sight; the Spacecraft is at the Launch Site.
    this.truck.visible = scene.stage === 'assembling' || (scene.stage === 'shipping' && scene.fraction < 0.98);
    this.dock.visible = scene.stage !== 'ready';
    if (this.road) this.road.visible = scene.stage !== 'ready';
    if (this.berm) this.berm.visible = scene.stage !== 'ready';
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
    // It rides on the highest land under its length, and on the dock's slab while it is there.
    const { dir, from } = this.scene.route;
    const reach = RIG_HALF_LENGTH * 0.8 * RIG_SCALE;
    const land = Math.max(...[-reach, 0, reach].map((d) => this.ride(x + dir.x * d, z + dir.z * d)));
    const onDock = this.dock && Math.abs(x - from.x) <= FOOTPRINT / 2 && Math.abs(z - from.z) <= FOOTPRINT / 2;
    const target = (onDock ? Math.max(land, this.dock!.position.y + DOCK_SLAB) : land) + 0.035;
    this.truck.position.y += (target - this.truck.position.y) * Math.min(1, realSeconds * 6);
    const moved = this.lastPos ? Math.hypot(x - this.lastPos.x, z - this.lastPos.z) : 0;
    this.lastPos = { x, z };
    const wheel = WHEEL_RADIUS * RIG_SCALE;
    if (moved > 0 && moved < 2 * FOOTPRINT) this.truck.traverse((o) => o.name === 'wheel' && (o.rotation.z -= moved / wheel));
  }

  /** Where the truck is, for a camera that follows it; null when it isn't on screen. */
  get truckWorldPosition(): THREE.Vector3 | null {
    return this.truck?.visible ? this.truck.position.clone() : null;
  }

  private build(scene: ShippingScene): void {
    const { route } = scene;
    // The dock stands on the highest land under it, like a building, and sits in a bank of fill where the land
    // falls away.
    const half = FOOTPRINT / 2;
    const top = Math.max(...footprint(0, 0).map((t) => this.ground(route.from.x + t.x, route.from.z + t.z)));
    const square: DockSquare = { x: route.from.x, z: route.from.z, half: half - 0.02, top: top + DOCK_SLAB - 0.02 };
    this.ride = withBerm(square, this.ground);
    this.berm = buildBerm(square, this.ground);
    const yaw = Math.atan2(-route.dir.z, route.dir.x);
    this.dock = buildDock();
    this.dock.position.set(route.from.x, top, route.from.z);
    this.dock.rotation.y = yaw;
    this.truck = buildRig();
    buildLoad(this.truck.getObjectByName('cargo') as THREE.Group, scene.design);
    this.truck.scale.setScalar(RIG_SCALE);
    this.truck.rotation.y = yaw;
    this.truck.position.set(route.from.x, top + DOCK_SLAB + 0.035, route.from.z);
    this.lastPos = null;
    this.group.add(this.berm, this.dock, this.truck);
    this.layRoad(route);
    const end = { x: route.to.x + route.dir.x * ROAD_BEYOND, z: route.to.z + route.dir.z * ROAD_BEYOND };
    // No trees on the dock or the road.
    const side = Math.max(FOOTPRINT / 2 + 0.6, ROAD_WIDTH / 2 + 0.9);
    setVegetationClearing({
      x0: Math.min(route.from.x, end.x) - side,
      x1: Math.max(route.from.x, end.x) + side,
      z0: Math.min(route.from.z, end.z) - side,
      z1: Math.max(route.from.z, end.z) + side,
    });
  }

  /**
   * The road from the dock's edge on past the Site, draped over the dock's fill and the land, left out where a
   * building stands on its line (the route itself is the game's; the truck still drives it).
   */
  private layRoad(route: ShippingRoute): void {
    if (this.road) {
      this.group.remove(this.road);
      this.road.geometry.dispose();
      (this.road.material as THREE.Material).dispose();
    }
    const centres = this.buildingCentres();
    this.buildingsKey = buildingsKey(centres);
    const reach = FOOTPRINT / 2 + ROAD_CLEAR;
    const onBuilding = (x: number, z: number) => centres.some((c) => Math.abs(x - c.x) < reach && Math.abs(z - c.z) < reach);
    const start = { x: route.from.x + route.dir.x * (FOOTPRINT / 2), z: route.from.z + route.dir.z * (FOOTPRINT / 2) };
    const end = { x: route.to.x + route.dir.x * ROAD_BEYOND, z: route.to.z + route.dir.z * ROAD_BEYOND };
    this.road = buildRoad(start, end, this.ride, onBuilding);
    this.road.visible = this.scene?.stage !== 'ready';
    this.group.add(this.road);
  }

  /** Centres of the buildings on the Site: the models World tags with `userData.tile`, beside this view's group. */
  private buildingCentres(): { x: number; z: number }[] {
    const out: { x: number; z: number }[] = [];
    for (const group of this.group.parent?.children ?? []) {
      if (group === this.group) continue;
      for (const o of group.children) if (o.userData.tile) out.push({ x: o.position.x, z: o.position.z });
    }
    return out;
  }

  private clear(): void {
    if (this.road) (this.road.material as THREE.Material).dispose();
    if (this.berm) (this.berm.material as THREE.Material).dispose();
    for (const o of [this.truck, this.dock, this.road, this.berm]) {
      if (!o) continue;
      this.group.remove(o);
      // Materials are shared with the rest of the world; only the shapes belong to these models.
      o.traverse((m) => m instanceof THREE.Mesh && m.geometry.dispose());
    }
    if (this.truck || this.dock) setVegetationClearing(null);
    this.truck = this.dock = this.road = this.berm = null;
    this.ride = this.ground;
    this.buildingsKey = -1;
    this.scene = null;
  }

  /** Remove everything (a new Site is shown). */
  reset(): void {
    this.clear();
    this.key = '';
  }
}

/** A number that changes when a building is added, moved or removed. */
function buildingsKey(centres: { x: number; z: number }[]): number {
  let key = centres.length;
  for (const c of centres) key = (key * 31 + Math.round(c.x * 4) * 7 + Math.round(c.z * 4) * 13) % 1_000_000_007;
  return key;
}
