import * as THREE from 'three';
import type { CompanyLogo } from '../company/logo';
import { logoTexture } from './logoTexture';
import { MapControls } from 'three/examples/jsm/controls/MapControls.js';
import { type SiteBuildingKind, isFactory } from '../economy/part';
import type { RawMaterial } from '../economy/rawMaterial';
import { type PlotRef, SITE_SIZE, type Site, ownsPlot, plotOf, sitePlots, tileAt } from '../site/site';
import {
  FOV_DEGREES,
  MAX_DISTANCE,
  MAX_ELEVATION,
  MIN_DISTANCE,
  MIN_ELEVATION,
  START_AZIMUTH,
  GROUND_CLEARANCE,
  GROUND_REACH,
  wholeSiteView,
  START_DISTANCE,
  START_ELEVATION,
  HOME_SECONDS,
  KEY_SPEED,
  PAN_BEYOND_SITE,
  cameraOffset,
  clampToBox,
  easeInOut,
  nearestIsoAzimuth,
  hazeFor,
  polarFromElevation,
} from './camera';
import { buildAssemblyHall, buildGroundStation, buildHQ, buildFactory, buildResearchLab, buildWarehouse } from './factoryMesh';
import { FOOTPRINT, covers, footprint, foundationLevel } from '../game/siteState';
import { buildCrane, buildLevelSign } from './buildingParts';
import { buildMine } from './mineMesh';
import type { Design } from '../game/spacecraft';
import { type ShippingRoute, extendRoute, shippingRoute } from './shippingRoute';
import { ShippingView } from './shippingView';

/** How close the camera comes when it follows the Shipping truck. */
const FOLLOW_DISTANCE = 26;

/** The Mission as the Site should show it: where it is and what is being shipped. */
export interface ShippingState {
  /** Mission identity: a new value builds a new route and models. */
  id: string;
  /** Tile the truck starts from (the Warehouse, or the middle of the Site). */
  start: { x: number; z: number };
  design: Design;
  stage: 'assembling' | 'shipping' | 'ready';
  fraction: number;
}
import { STEP, animateSite, buildPlotMarker, buildSiteMesh, clearRocks, groundOf, pressPad, sceneryOf, siteBounds, tileCentre } from './siteMesh';
import { type SkyEnvironment, createSkyEnvironment } from './environment';
import { type Ground, type Pad, WATER_Y, padFor } from './ground';

/**
 * Something drawn on the land of every Site (trees, boulders, props), added with `World.addScenery`. The group it
 * fills belongs to the Site's land: it is emptied and its meshes, geometries and materials disposed whenever the
 * land is drawn again (`showSite`, `redrawLand`), so `build` must make fresh objects (or share ones it never lets
 * be disposed, e.g. by keeping them out of this group).
 */
export interface SceneryLayer {
  /** Fill `into` for the land just drawn; `ground` already has every building's pad pressed in. */
  build(into: THREE.Group, ground: Ground, site: Site): void;
  /** A building was placed: take away whatever stands on its pad (`ground.onPad` now includes it). */
  clearPad?(into: THREE.Group, pad: Pad, ground: Ground): void;
}

/** Direction the sunlight comes from: low and from the side, so shadows are long and easy to see. */
const SUN_DIRECTION = new THREE.Vector3(-0.78, 0.5, 0.36).normalize();

/** Brightness of the picture (ACES tone mapping) and of the sun. */
const EXPOSURE = 0.34;
const SUN_INTENSITY = 12;
/** How much the sky lights the scene besides the sun: the luminance its light on level ground should have. */
const SKY_LIGHT = 0.62;
/** Depth of the box the sun's shadows are drawn in. */
const SHADOW_DEPTH = 300;
/** Vertices per tile of the placement marker, so it follows the ground. */
const MARKER_DETAIL = 4;

/** Where the camera looks and from which direction and distance. */
interface CameraPose {
  target: THREE.Vector3;
  azimuth: number;
  polar: number;
  distance: number;
}

/** Keys that move the camera while held. */
const CAMERA_KEYS: Record<string, 'forward' | 'back' | 'left' | 'right' | 'turnLeft' | 'turnRight' | 'tiltUp' | 'tiltDown' | 'zoomIn' | 'zoomOut'> = {
  w: 'forward',
  arrowup: 'forward',
  s: 'back',
  arrowdown: 'back',
  a: 'left',
  arrowleft: 'left',
  d: 'right',
  arrowright: 'right',
  q: 'turnLeft',
  e: 'turnRight',
  r: 'tiltUp',
  f: 'tiltDown',
  '=': 'zoomIn',
  '+': 'zoomIn',
  '-': 'zoomOut',
};

function isTyping(target: EventTarget | null): boolean {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
}

/** The 3D world: the Site and the land around it, sky, sunlight, and the camera. */
export class World {
  private companyTexture: THREE.Texture | null = null;
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly controls: MapControls;
  private siteGroup: THREE.Group | null = null;
  private site: Site | null = null;
  private readonly buildings = new THREE.Group();
  /** Building models by the key "x,z" of their middle tile. */
  private readonly buildingAt = new Map<string, THREE.Group>();
  private readonly marker: THREE.Group;
  private readonly sun = new THREE.DirectionalLight(0xffffff, SUN_INTENSITY);
  /** The Plot next door under the pointer, highlighted (ticket 30). */
  private plotMarker: { key: string; group: THREE.Group } | null = null;
  private readonly sky: SkyEnvironment;
  private readonly fog = new THREE.Fog(0xc8d8e8, 100, 300);
  private readonly frameCallbacks: ((seconds: number) => void)[] = [];
  private readonly sceneryLayers: SceneryLayer[] = [];
  private readonly raycaster = new THREE.Raycaster();
  private readonly heldKeys = new Set<string>();
  private home: { from: CameraPose; to: CameraPose; t: number } | null = null;
  private readonly shipping = new ShippingView((x, z) => this.groundY(x, z));
  private route: { id: string; route: ShippingRoute; inUse: boolean } | null = null;
  private following = false;
  /** Turn off while a menu or dialog is open, so keys don't move the camera behind it. */
  keyboardEnabled = true;
  /** True while a full-screen view (the Mission Designer) covers the Site: frames still run, nothing is drawn. */
  hidden = false;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = EXPOSURE;
    this.scene.fog = this.fog;
    this.sky = createSkyEnvironment(this.renderer, this.scene, { sunDirection: SUN_DIRECTION });

    this.camera = new THREE.PerspectiveCamera(FOV_DEGREES, window.innerWidth / window.innerHeight, 0.5, 4000);
    const o = cameraOffset(START_AZIMUTH, START_ELEVATION, START_DISTANCE);
    this.camera.position.set(o.x, o.y, o.z);
    this.camera.lookAt(0, 0, 0);

    this.controls = this.makeControls(canvas);
    this.addLights();
    this.scene.add(this.buildings, this.shipping.group);
    this.marker = this.makeMarker();
    this.scene.add(this.marker);

    window.addEventListener('resize', () => this.resize());
    this.resize();
    this.listenToKeys();
  }

  /** WASD / arrows move, Q/E turn, R/F tilt, +/- zoom, H goes back to the whole-Site view. */
  private listenToKeys(): void {
    window.addEventListener('keydown', (e) => {
      if (!this.keyboardEnabled || isTyping(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;
      const key = e.key.toLowerCase();
      if (key === 'h' || key === 'home') {
        this.goHome();
        e.preventDefault();
      } else if (key in CAMERA_KEYS) {
        this.heldKeys.add(key);
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', (e) => this.heldKeys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => this.heldKeys.clear());
  }

  private pose(): CameraPose {
    const s = new THREE.Spherical().setFromVector3(this.camera.position.clone().sub(this.controls.target));
    return { target: this.controls.target.clone(), azimuth: s.theta, polar: s.phi, distance: s.radius };
  }

  private setPose(p: CameraPose): void {
    const { x, z } = this.clampTarget(p.target.x, p.target.z);
    this.controls.target.set(x, p.target.y, z);
    const offset = new THREE.Vector3().setFromSpherical(new THREE.Spherical(p.distance, p.polar, p.azimuth));
    this.camera.position.copy(this.controls.target).add(offset);
  }

  /** Keep the camera's look-at point over the Site (every Plot of it) or near it. */
  private clampTarget(x: number, z: number): { x: number; z: number } {
    const b = this.site ? siteBounds(this.site) : { minX: 0, maxX: SITE_SIZE, minZ: 0, maxZ: SITE_SIZE };
    const o = -SITE_SIZE / 2;
    return clampToBox(x, z, {
      minX: b.minX + o - PAN_BEYOND_SITE,
      maxX: b.maxX + o + PAN_BEYOND_SITE,
      minZ: b.minZ + o - PAN_BEYOND_SITE,
      maxZ: b.maxZ + o + PAN_BEYOND_SITE,
    });
  }

  /** The whole-Site view from this corner: every owned Plot on screen (ticket 30). */
  private wholeSite(azimuth: number): { x: number; z: number; distance: number } {
    if (!this.site) return { x: 0, z: 0, distance: START_DISTANCE };
    const o = -SITE_SIZE / 2;
    const corners = sitePlots(this.site).flatMap(({ px, pz }) =>
      [0, 1].flatMap((i) => [0, 1].map((k) => ({ x: (px + i) * SITE_SIZE + o, z: (pz + k) * SITE_SIZE + o }))),
    );
    return wholeSiteView(corners, azimuth, this.camera.aspect);
  }

  /** Let the camera zoom out far enough to see all the owned land, from any corner. */
  private fitZoomOut(): void {
    const widest = Math.max(...[0, 1, 2, 3].map((i) => this.wholeSite(START_AZIMUTH + (i * Math.PI) / 2).distance));
    this.controls.maxDistance = Math.max(MAX_DISTANCE, widest * (MAX_DISTANCE / START_DISTANCE));
  }

  /** Glide back to the isometric view of the whole Site, keeping the nearest corner you were looking from. */
  goHome(): void {
    this.following = false;
    const from = this.pose();
    const azimuth = nearestIsoAzimuth(from.azimuth);
    const view = this.wholeSite(azimuth);
    this.fitZoomOut();
    this.home = {
      from,
      to: {
        target: new THREE.Vector3(view.x, this.groundY(view.x, view.z), view.z),
        azimuth,
        polar: polarFromElevation(START_ELEVATION),
        distance: view.distance,
      },
      t: 0,
    };
  }

  /** Apply held keys and the glide home, once per frame. */
  private moveCamera(seconds: number): void {
    if (this.following) {
      const truck = this.shipping.truckWorldPosition;
      const moving = [...this.heldKeys].some((k) => ['forward', 'back', 'left', 'right'].includes(CAMERA_KEYS[k] as string));
      if (moving) this.following = false;
      else if (!truck) this.goHome(); // it drove out of sight: back to the Site
      else {
        const p = this.pose();
        const k = Math.min(1, seconds * 4);
        p.target.lerp(truck, k);
        p.distance += (Math.min(FOLLOW_DISTANCE, p.distance) - p.distance) * k;
        p.distance = Math.max(p.distance, MIN_DISTANCE);
        this.setPose(p);
      }
    }
    if (this.home) {
      const h = this.home;
      h.t = Math.min(1, h.t + seconds / HOME_SECONDS);
      const k = easeInOut(h.t);
      const mix = (a: number, b: number) => a + (b - a) * k;
      this.controls.enableDamping = false; // no drift from an earlier drag while gliding
      this.setPose({
        target: h.from.target.clone().lerp(h.to.target, k),
        azimuth: mix(h.from.azimuth, h.to.azimuth),
        polar: mix(h.from.polar, h.to.polar),
        distance: mix(h.from.distance, h.to.distance),
      });
      if (h.t >= 1) {
        this.home = null;
        this.controls.enableDamping = true;
      }
      return;
    }
    if (this.heldKeys.size === 0) return;
    seconds = Math.min(seconds, 0.1); // no big jump after a slow frame
    const held = new Set([...this.heldKeys].map((k) => CAMERA_KEYS[k]));
    const p = this.pose();
    const step = (plus: string, minus: string) => Number(held.has(plus as never)) - Number(held.has(minus as never));
    const forward = step('forward', 'back');
    const right = step('right', 'left');
    const move = p.distance * KEY_SPEED.move * seconds;
    // Forward is the way the camera faces, flattened onto the ground.
    p.target.x += (-Math.sin(p.azimuth) * forward + Math.cos(p.azimuth) * right) * move;
    p.target.z += (-Math.cos(p.azimuth) * forward - Math.sin(p.azimuth) * right) * move;
    p.azimuth += step('turnLeft', 'turnRight') * KEY_SPEED.turn * seconds;
    p.polar = Math.min(
      this.controls.maxPolarAngle,
      Math.max(this.controls.minPolarAngle, p.polar - step('tiltUp', 'tiltDown') * KEY_SPEED.tilt * seconds),
    );
    p.distance = Math.min(
      this.controls.maxDistance,
      Math.max(MIN_DISTANCE, p.distance * (1 - step('zoomIn', 'zoomOut') * KEY_SPEED.zoom * seconds)),
    );
    this.setPose(p);
  }

  /** Left drag pans, right drag turns (sideways) and tilts (up and down), wheel zooms. */
  private makeControls(canvas: HTMLCanvasElement): MapControls {
    const c = new MapControls(this.camera, canvas);
    c.enableDamping = true;
    c.dampingFactor = 0.12;
    c.minPolarAngle = polarFromElevation(MAX_ELEVATION);
    c.maxPolarAngle = polarFromElevation(MIN_ELEVATION);
    c.minDistance = MIN_DISTANCE;
    c.maxDistance = MAX_DISTANCE;
    c.zoomToCursor = true;
    c.rotateSpeed = 0.6;
    c.zoomSpeed = 1.2;
    c.addEventListener('change', () => {
      const { x, z } = this.clampTarget(c.target.x, c.target.z);
      const dx = x - c.target.x;
      const dz = z - c.target.z;
      if (dx !== 0 || dz !== 0) {
        this.camera.position.x += dx;
        this.camera.position.z += dz;
        c.target.set(x, c.target.y, z);
      }
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    // Dragging the map takes the camera back from the truck; turning and zooming don't.
    canvas.addEventListener('pointerdown', (e) => {
      if (e.button === 0) this.following = false;
    });
    return c;
  }

  /** Sunlight with soft shadows; the sky itself (`scene.environment`) lights the rest. */
  private addLights(): void {
    const sun = this.sun;
    sun.color.copy(this.sky.sunColour);
    sun.position.copy(SUN_DIRECTION).multiplyScalar(SHADOW_DEPTH / 2);
    sun.castShadow = true;
    sun.shadow.mapSize.set(4096, 4096);
    sun.shadow.bias = -0.00025;
    sun.shadow.normalBias = 0.035;
    sun.shadow.radius = 2.5;
    const s = sun.shadow.camera;
    s.near = 1;
    s.far = SHADOW_DEPTH;
    this.scene.add(sun, sun.target);
    this.scene.environmentIntensity = SKY_LIGHT / Math.max(this.sky.skyLight, 0.05);
  }

  /** Show a Site, replacing the one on screen. */
  showSite(site: Site): void {
    this.site = site;
    this.route = null;
    this.redrawLand();
    // Release the old building models' shapes; their materials are shared with the rest of the world (ticket 26).
    this.buildings.traverse((o) => {
      if (o instanceof THREE.Mesh || o instanceof THREE.LineSegments || o instanceof THREE.Points) o.geometry.dispose();
      if (o instanceof THREE.InstancedMesh) o.dispose();
    });
    this.buildings.clear();
    this.buildingAt.clear();
    this.shipping.reset();
    this.following = false;
  }

  /** Draw the Site's land again, after a Plot joins it (ticket 30). Buildings stay; rocks under them stay cleared. */
  redrawLand(): void {
    if (!this.site) return;
    if (this.siteGroup) {
      this.scene.remove(this.siteGroup);
      disposeAll(this.siteGroup);
    }
    const site = this.site;
    const tiles = [...this.buildingAt.values()].map((model) => model.userData.tile as { x: number; z: number });
    // The buildings keep their pads: the ground is flattened under them again.
    this.siteGroup = buildSiteMesh(site, this.sky.uniforms, tiles.map((t) => padFor(site, t.x, t.z)));
    this.scene.add(this.siteGroup);
    this.fitZoomOut();
    // A Mission on its way keeps its dock; its road now runs on past any land just bought (ticket 30).
    if (this.route) this.route.route = extendRoute(this.site, this.route.route);
    for (const { x, z } of tiles) for (const t of footprint(x, z)) clearRocks(this.siteGroup, t.x, t.z);
    this.buildScenery();
    this.markPlot(null);
  }

  /** Draw a kind of scenery on every Site from now on (see `SceneryLayer`). */
  addScenery(layer: SceneryLayer): void {
    this.sceneryLayers.push(layer);
    const group = this.siteGroup && sceneryOf(this.siteGroup);
    const ground = this.siteGroup && groundOf(this.siteGroup);
    if (group && ground && this.site) layer.build(group, ground, this.site);
  }

  private buildScenery(): void {
    const group = this.siteGroup && sceneryOf(this.siteGroup);
    const ground = this.siteGroup && groundOf(this.siteGroup);
    if (!group || !ground || !this.site) return;
    for (const layer of this.sceneryLayers) layer.build(group, ground, this.site);
  }

  /** The Plot under a point on the screen, on the Site or in the full-detail land around it; null over the far haze. */
  plotAtScreen(clientX: number, clientY: number): PlotRef | null {
    const group = this.siteGroup;
    if (!group || !this.site) return null;
    const land = ['terrain', 'scenery-near'].map((n) => group.getObjectByName(n)).filter((o) => !!o);
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const hit = this.raycaster.intersectObjects(land, false)[0];
    if (!hit?.face) return null;
    const p = hit.point.clone().addScaledVector(hit.face.normal, -0.01);
    return plotOf(Math.floor(p.x + this.site.size / 2), Math.floor(p.z + this.site.size / 2));
  }

  /** Highlight a Plot next door, green if it can be bought. Null, or a Plot of the Site, hides the highlight. */
  markPlot(plot: PlotRef | null, buyable = false): void {
    const key = plot && this.site && !ownsPlot(this.site, plot.px, plot.pz) ? `${plot.px},${plot.pz},${buyable}` : null;
    if (this.plotMarker?.key === key) return;
    if (this.plotMarker) {
      this.scene.remove(this.plotMarker.group);
      disposeAll(this.plotMarker.group);
      this.plotMarker = null;
    }
    const ground = this.siteGroup && groundOf(this.siteGroup);
    if (!key || !plot || !ground) return;
    const group = buildPlotMarker(ground, plot, buyable);
    this.scene.add(group);
    this.plotMarker = { key, group };
  }

  /**
   * Show the Mission on its way: the Spacecraft assembled on a truck at a loading dock, then driven off
   * the Site. Call every frame with the game seconds that passed (0 while paused); null hides it.
   */
  updateShipping(state: ShippingState | null, gameSeconds: number, realSeconds: number): void {
    if (!state || !this.site) {
      this.shipping.show(null);
      this.route = null;
      return;
    }
    if (this.route?.id !== state.id) {
      // The route is fixed when the Mission ships, so a building placed later doesn't move the dock.
      const occupied = (x: number, z: number) =>
        [...this.buildingAt.values()].some((model) => covers(model.userData.tile as { x: number; z: number }, x, z));
      this.route = { id: state.id, route: shippingRoute(this.site, state.start, occupied), inUse: true };
    }
    // The dock is in use until the Spacecraft has left for the Launch Site.
    this.route.inUse = state.stage !== 'ready';
    this.shipping.show({ route: this.route.route, design: state.design, stage: state.stage, fraction: state.fraction });
    this.shipping.animate(gameSeconds, realSeconds);
  }

  /** Would a building centred on tile (x, z) stand on the Shipping dock while it is in use (ticket 08)? */
  onShippingDock(x: number, z: number): boolean {
    const route = this.route;
    if (!route?.inUse) return false;
    return footprint(x, z).some((t) => covers(route.route.dock, t.x, t.z));
  }

  /** Let the camera ride along with the Shipping truck until the player drags the map or it drives out of sight. */
  followTruck(): void {
    this.home = null;
    this.following = this.shipping.truckWorldPosition !== null;
  }

  get isFollowingTruck(): boolean {
    return this.following;
  }

  /** Height of the drawn ground at world point (x, z), inside the Site or out in the land around it; water counts at its surface. */
  private groundY(x: number, z: number): number {
    const ground = this.siteGroup && groundOf(this.siteGroup);
    if (!ground) return 0;
    return Math.max(WATER_Y, ground.heightAt(x, z));
  }

  /** Keep the camera itself out of the hills: lift it above the highest land under and around it (ticket 01). */
  private keepAboveGround(): void {
    const { x, z } = this.camera.position;
    let floor = this.groundY(x, z);
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]] as const) {
      floor = Math.max(floor, this.groundY(x + dx * GROUND_REACH, z + dz * GROUND_REACH));
    }
    floor += GROUND_CLEARANCE;
    if (this.camera.position.y < floor) this.camera.position.y = floor;
  }

  /** Let the point the camera orbits glide up and down with the ground, so hills and plateaus stay in view. */
  private followGround(seconds: number): void {
    const target = this.controls.target;
    const dy = (this.groundY(target.x, target.z) - target.y) * Math.min(1, seconds * 6);
    if (Math.abs(dy) < 1e-4) return;
    target.y += dy;
    this.camera.position.y += dy;
  }

  /** Put a building model centred on tile (x, z). A Mine needs the Raw Material it digs, for its ore piles. */
  addBuilding(kind: SiteBuildingKind, x: number, z: number, material?: RawMaterial): void {
    if (!this.site) return;
    const model =
      kind === 'mine'
        ? buildMine(material ?? 'aluminium')
        : isFactory(kind)
          ? buildFactory(kind)
          : kind === 'researchLab'
            ? buildResearchLab()
            : kind === 'assemblyHall'
              ? buildAssemblyHall()
              : kind === 'hq'
                ? buildHQ()
                : kind === 'groundStation'
                  ? buildGroundStation()
                  : buildWarehouse();
    const c = tileCentre(this.site, x, z);
    model.position.set(c.x, foundationLevel(this.site, x, z) * STEP, c.z);
    model.userData.tile = { x, z };
    this.buildings.add(model);
    this.buildingAt.set(`${x},${z}`, model);
    this.setWorking(x, z, true);
    if (this.siteGroup) {
      const pad = padFor(this.site, x, z);
      pressPad(this.siteGroup, pad);
      for (const t of footprint(x, z)) clearRocks(this.siteGroup, t.x, t.z);
      const group = sceneryOf(this.siteGroup);
      const ground = groundOf(this.siteGroup);
      if (group && ground) for (const layer of this.sceneryLayers) layer.clearPad?.(group, pad, ground);
    }
  }

  /** Start or stop the moving parts of the building on tile (x, z). Factories move only while they make something. */
  setWorking(x: number, z: number, on: boolean): void {
    const model = this.buildingAt.get(`${x},${z}`);
    if (!model || model.userData.working === on) return;
    model.userData.working = on;
    const smoke = model.getObjectByName('smoke');
    if (smoke) smoke.visible = on;
  }

  /** Refresh the HQ's sign and flag together, including after editing the logo. */
  setCompanyLogo(logo: CompanyLogo): void {
    this.companyTexture?.dispose();
    this.companyTexture = logoTexture(logo);
    this.buildings.traverse((o) => {
      if (o.name !== 'company-logo' || !(o instanceof THREE.Mesh)) return;
      const material = o.material as THREE.MeshBasicMaterial;
      material.map = this.companyTexture;
      material.needsUpdate = true;
    });
  }

  /**
   * Show a building's level (a sign with one star per level) and, while it is upgraded, a tower crane beside it.
   * Cheap to call every frame: it only rebuilds when something changed.
   */
  setLevel(x: number, z: number, level: number, upgrading: boolean): void {
    const model = this.buildingAt.get(`${x},${z}`);
    if (!model) return;
    if (model.userData.level !== level) {
      model.userData.level = level;
      const old = model.getObjectByName('level');
      if (old) model.remove(old);
      const sign = buildLevelSign(level);
      sign.position.set(-0.43, 0, 0.43);
      model.add(sign);
    }
    if (model.userData.upgrading !== upgrading) {
      model.userData.upgrading = upgrading;
      const old = model.getObjectByName('crane');
      if (old) model.remove(old);
      if (upgrading) {
        const crane = buildCrane();
        crane.position.set(-0.4, 0, -0.4);
        model.add(crane);
      }
    }
  }

  /** Move the parts of working buildings (see `buildingParts.ts`), by how much game time passed. Cranes always turn. */
  animateBuildings(gameSeconds: number): void {
    if (gameSeconds === 0) return;
    for (const model of this.buildingAt.values()) {
      const crane = model.userData.upgrading ? model.getObjectByName('crane')?.getObjectByName('craneJib') : undefined;
      if (crane) crane.rotation.y += gameSeconds * (crane.userData.speed as number);
      if (!model.userData.working) continue;
      const clock = (model.userData.clock = ((model.userData.clock as number | undefined) ?? 0) + gameSeconds);
      model.traverse((o) => {
        if (o.name === 'spin') o.rotation.z += gameSeconds * 2.5;
        else if (o.name === 'spinY') o.rotation.y += gameSeconds * ((o.userData.speed as number | undefined) ?? 1.5);
        else if (o.name === 'swing') o.rotation.y = Math.sin(clock * 0.5) * 0.8;
        else if (o.name === 'shuttle') o.position.z = o.userData.base + Math.sin(clock * 0.9) * o.userData.range;
        else if (o.name === 'smoke') {
          for (const puff of o.children) {
            const k = (clock * 0.3 + (puff.userData.phase as number)) % 1;
            puff.position.set(k * 0.08, k * 0.4, k * 0.03);
            puff.scale.setScalar(0.5 + k * 1.6);
          }
        }
      });
    }
  }

  /** The tile under a point on the screen, or null if the pointer is off the Site. */
  tileAtScreen(clientX: number, clientY: number): { x: number; z: number } | null {
    const terrain = this.siteGroup?.getObjectByName('terrain');
    if (!terrain || !this.site) return null;
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(ndc, this.camera);
    // A building under the pointer wins over the ground behind it, so tall models are easy to click.
    const onBuilding = this.raycaster.intersectObject(this.buildings, true)[0];
    if (onBuilding) {
      let o: THREE.Object3D | null = onBuilding.object;
      while (o && !o.userData.tile) o = o.parent;
      if (o) return { ...(o.userData.tile as { x: number; z: number }) };
    }
    const hit = this.raycaster.intersectObject(terrain)[0];
    if (!hit?.face) return null;
    // Step slightly into the surface, so a click on a cliff face picks the tile it belongs to.
    const p = hit.point.clone().addScaledVector(hit.face.normal, -0.01);
    const x = Math.floor(p.x + this.site.size / 2);
    const z = Math.floor(p.z + this.site.size / 2);
    return tileAt(this.site, x, z) ? { x, z } : null;
  }

  /** Highlight where a building centred on a tile would stand, in green (allowed) or red (not allowed). Pass null to hide it. */
  markTile(tile: { x: number; z: number } | null, allowed = true): void {
    if (!tile || !this.site) {
      this.marker.visible = false;
      return;
    }
    const site = this.site;
    const c = tileCentre(site, tile.x, tile.z);
    const ground = this.siteGroup && groundOf(this.siteGroup);
    // Hug the ground (where it is already flattened for a building, that is its pad).
    const y = (x: number, z: number) => (ground ? Math.max(ground.heightAt(x, z), WATER_Y) : foundationLevel(site, tile.x, tile.z) * STEP);
    for (const part of this.marker.children as THREE.Mesh[]) {
      const pos = part.geometry.attributes.position as THREE.BufferAttribute;
      const flat = part.geometry.userData.flat as Float32Array;
      for (let k = 0; k < pos.count; k++) {
        const x = c.x + flat[k * 3]!;
        const z = c.z + flat[k * 3 + 2]!;
        pos.setXYZ(k, x, y(x, z) + flat[k * 3 + 1]!, z);
      }
      pos.needsUpdate = true;
      (part.material as THREE.MeshBasicMaterial).color.setHex(allowed ? 0x5dff8a : 0xff5d5d);
    }
    this.marker.visible = true;
  }

  /** Run `fn` every frame with the real seconds since the last frame. */
  onFrame(fn: (seconds: number) => void): void {
    this.frameCallbacks.push(fn);
  }

  /** Where a building would go: a see-through sheet over its 3 × 3 tiles and a bright rim, both lying on the ground. */
  private makeMarker(): THREE.Group {
    const overlay = (opacity: number) =>
      new THREE.MeshBasicMaterial({
        transparent: true,
        opacity,
        depthWrite: false,
        fog: false,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -4,
        polygonOffsetUnits: -4,
      });
    const size = FOOTPRINT - 0.04;
    const steps = FOOTPRINT * MARKER_DETAIL;
    const sheet = new THREE.PlaneGeometry(size, size, steps, steps);
    sheet.rotateX(-Math.PI / 2);
    sheet.translate(0, 0.05, 0);
    // A rim 0.14 wide just inside the edge: a square ring of small quads.
    const rim: number[] = [];
    const h = size / 2;
    const w = 0.14;
    for (let side = 0; side < 4; side++) {
      for (let i = 0; i < steps; i++) {
        const a = -h + (size * i) / steps;
        const b = -h + (size * (i + 1)) / steps;
        const quad = [
          [a, h],
          [a, h - w],
          [b, h - w],
          [b, h],
        ].map(([u, v]) => (side === 0 ? [u!, v!] : side === 1 ? [v!, -u!] : side === 2 ? [-u!, -v!] : [-v!, u!]));
        for (const k of [0, 1, 2, 0, 2, 3]) rim.push(quad[k]![0]!, 0.07, quad[k]![1]!);
      }
    }
    const rimGeometry = new THREE.BufferGeometry();
    rimGeometry.setAttribute('position', new THREE.Float32BufferAttribute(rim, 3));
    const group = new THREE.Group();
    for (const [geometry, opacity] of [
      [sheet, 0.38],
      [rimGeometry, 0.95],
    ] as const) {
      geometry.userData.flat = (geometry.attributes.position!.array as Float32Array).slice();
      const m = new THREE.Mesh(geometry, overlay(opacity));
      m.renderOrder = 4;
      m.frustumCulled = false;
      group.add(m);
    }
    group.visible = false;
    return group;
  }

  private resize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.fitZoomOut();
  }

  /**
   * Keep the sun's shadows over what the camera looks at: a tighter, sharper shadow map close up, a wider one far
   * out. The shadow box moves in whole shadow-map texels, so shadow edges don't shimmer as the camera moves.
   */
  private followSun(): void {
    const target = this.controls.target;
    const distance = this.camera.position.distanceTo(target);
    const reach = Math.min(110, Math.max(14, distance * 0.55));
    const s = this.sun.shadow.camera;
    // Change the size in steps, so it doesn't swim while zooming.
    const size = Math.pow(1.15, Math.ceil(Math.log(reach) / Math.log(1.15)));
    if (s.right !== size) {
      s.left = s.bottom = -size;
      s.right = s.top = size;
      s.updateProjectionMatrix();
    }
    const texel = (2 * size) / this.sun.shadow.mapSize.x;
    // Snap the look-at point to the texel grid in the sun's view.
    const back = SUN_DIRECTION.clone().negate();
    const right = new THREE.Vector3(0, 1, 0).cross(back).normalize();
    const up = back.clone().cross(right);
    const u = Math.round(target.dot(right) / texel) * texel;
    const v = Math.round(target.dot(up) / texel) * texel;
    const at = right.multiplyScalar(u).add(up.multiplyScalar(v)).add(back.multiplyScalar(target.dot(back)));
    this.sun.target.position.copy(at);
    this.sun.position.copy(SUN_DIRECTION).multiplyScalar(SHADOW_DEPTH / 2).add(at);
  }

  start(): void {
    let last = performance.now();
    this.renderer.setAnimationLoop((now: number) => {
      const seconds = (now - last) / 1000;
      last = now;
      for (const fn of this.frameCallbacks) fn(seconds);
      this.moveCamera(seconds);
      this.followGround(seconds);
      this.controls.update();
      this.keepAboveGround();
      this.followSun();
      const { near, far } = hazeFor(this.camera.position.distanceTo(this.controls.target));
      this.fog.near = near;
      this.fog.far = far;
      this.sky.update(this.camera, seconds);
      if (this.siteGroup) animateSite(this.siteGroup, Math.min(seconds, 0.1));
      if (!this.hidden) this.renderer.render(this.scene, this.camera);
    });
  }
}

/** Free the GPU memory of every mesh and line in a group. */
function disposeAll(group: THREE.Object3D): void {
  group.traverse((o) => {
    for (const t of (o.userData.textures as THREE.Texture[] | undefined) ?? []) t.dispose();
    if (o instanceof THREE.Mesh || o instanceof THREE.LineSegments) {
      o.geometry.dispose();
      (o.material as THREE.Material).dispose();
    }
    // Instanced scenery keeps its positions (and colours) in buffers of its own.
    if (o instanceof THREE.InstancedMesh) o.dispose();
  });
}
