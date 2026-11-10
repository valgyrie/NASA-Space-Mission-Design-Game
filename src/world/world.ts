import * as THREE from 'three';
import { MapControls } from 'three/examples/jsm/controls/MapControls.js';
import { type SiteBuildingKind, isFactory } from '../economy/part';
import type { RawMaterial } from '../economy/rawMaterial';
import { type Land, SITE_SIZE, type Site, landOf, tileAt } from '../site/site';
import {
  FOV_DEGREES,
  MAX_DISTANCE,
  MAX_ELEVATION,
  MIN_DISTANCE,
  MIN_ELEVATION,
  START_AZIMUTH,
  START_DISTANCE,
  START_ELEVATION,
  HOME_SECONDS,
  KEY_SPEED,
  PAN_BEYOND_SITE,
  cameraOffset,
  clampToGround,
  easeInOut,
  nearestIsoAzimuth,
  hazeFor,
  polarFromElevation,
} from './camera';
import { buildAssemblyHall, buildFactory, buildResearchLab, buildWarehouse } from './factoryMesh';
import { FOOTPRINT, covers, footprint, foundationLevel } from '../game/siteState';
import { buildCrane, buildLevelSign } from './buildingParts';
import { buildMine } from './mineMesh';
import type { Design } from '../game/spacecraft';
import { type ShippingRoute, shippingRoute } from './shippingRoute';
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
import { STEP, buildSiteMesh, clearRocks, tileCentre } from './siteMesh';

const COLOURS = {
  /** Pale haze at the horizon; distant land fades into it. */
  horizon: 0xd3e4ee,
  zenith: 0x5b97cf,
  skyLight: 0xd6eaff,
  groundLight: 0x6b5a45,
  sun: 0xfff0d6,
};

/** Direction the sunlight comes from: low and from the side, so shadows are long and easy to see. */
const SUN_DIRECTION = new THREE.Vector3(-0.78, 0.5, 0.36).normalize();

/** A sky dome: pale at the horizon, blue overhead. It follows the camera. */
function makeSky(): THREE.Mesh {
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      horizon: { value: new THREE.Color(COLOURS.horizon) },
      zenith: { value: new THREE.Color(COLOURS.zenith) },
    },
    vertexShader: `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 horizon;
      uniform vec3 zenith;
      varying vec3 vDir;
      void main() {
        float t = pow(clamp(vDir.y, 0.0, 1.0), 0.55);
        gl_FragColor = vec4(mix(horizon, zenith, t), 1.0);
      }`,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(1500, 32, 16), material);
  sky.name = 'sky';
  sky.renderOrder = -1;
  sky.frustumCulled = false;
  return sky;
}

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
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly controls: MapControls;
  private siteGroup: THREE.Group | null = null;
  private site: Site | null = null;
  private land: Land | null = null;
  private readonly buildings = new THREE.Group();
  /** Building models by the key "x,z" of their middle tile. */
  private readonly buildingAt = new Map<string, THREE.Group>();
  private readonly marker: THREE.Mesh;
  private readonly sky = makeSky();
  private readonly fog = new THREE.Fog(COLOURS.horizon, 100, 300);
  private readonly frameCallbacks: ((seconds: number) => void)[] = [];
  private readonly raycaster = new THREE.Raycaster();
  private readonly heldKeys = new Set<string>();
  private home: { from: CameraPose; to: CameraPose; t: number } | null = null;
  private readonly shipping = new ShippingView((x, z) => this.groundY(x, z));
  private route: { id: string; route: ShippingRoute } | null = null;
  private following = false;
  /** Turn off while a menu or dialog is open, so keys don't move the camera behind it. */
  keyboardEnabled = true;
  /** True while a full-screen view (the Mission Designer) covers the Site: frames still run, nothing is drawn. */
  hidden = false;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.scene.background = new THREE.Color(COLOURS.horizon);
    this.scene.fog = this.fog;
    this.scene.add(this.sky);

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
    const { x, z } = clampToGround(p.target.x, p.target.z, SITE_SIZE / 2 + PAN_BEYOND_SITE);
    this.controls.target.set(x, p.target.y, z);
    const offset = new THREE.Vector3().setFromSpherical(new THREE.Spherical(p.distance, p.polar, p.azimuth));
    this.camera.position.copy(this.controls.target).add(offset);
  }

  /** Glide back to the isometric view of the whole Site, keeping the nearest corner you were looking from. */
  goHome(): void {
    this.following = false;
    const from = this.pose();
    this.home = {
      from,
      to: {
        target: new THREE.Vector3(0, this.groundY(0, 0), 0),
        azimuth: nearestIsoAzimuth(from.azimuth),
        polar: polarFromElevation(START_ELEVATION),
        distance: START_DISTANCE,
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
      MAX_DISTANCE,
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
      const { x, z } = clampToGround(c.target.x, c.target.z, SITE_SIZE / 2 + PAN_BEYOND_SITE);
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

  private addLights(): void {
    this.scene.add(new THREE.HemisphereLight(COLOURS.skyLight, COLOURS.groundLight, 1.15));

    const sun = new THREE.DirectionalLight(COLOURS.sun, 2.6);
    sun.position.copy(SUN_DIRECTION).multiplyScalar(120);
    sun.castShadow = true;
    sun.shadow.mapSize.set(4096, 4096);
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.03;
    // The shadow covers the Site and a margin around it; the haze takes over beyond that.
    const s = sun.shadow.camera;
    const reach = SITE_SIZE * 0.85;
    s.left = s.bottom = -reach;
    s.right = s.top = reach;
    s.near = 1;
    s.far = 260;
    s.updateProjectionMatrix();
    this.scene.add(sun, sun.target);
  }

  /** Show a Site, replacing the one on screen. */
  showSite(site: Site): void {
    if (this.siteGroup) {
      this.scene.remove(this.siteGroup);
      this.siteGroup.traverse((o) => {
        if (o instanceof THREE.Mesh || o instanceof THREE.LineSegments) {
          o.geometry.dispose();
          (o.material as THREE.Material).dispose();
        }
      });
    }
    this.siteGroup = buildSiteMesh(site, COLOURS.horizon);
    this.scene.add(this.siteGroup);
    this.site = site;
    this.land = landOf(site);
    this.buildings.clear();
    this.buildingAt.clear();
    this.shipping.reset();
    this.route = null;
    this.following = false;
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
      this.route = { id: state.id, route: shippingRoute(this.site, state.start, occupied) };
    }
    this.shipping.show({ route: this.route.route, design: state.design, stage: state.stage, fraction: state.fraction });
    this.shipping.animate(gameSeconds, realSeconds);
  }

  /** Let the camera ride along with the Shipping truck until the player drags the map or it drives out of sight. */
  followTruck(): void {
    this.home = null;
    this.following = this.shipping.truckWorldPosition !== null;
  }

  get isFollowingTruck(): boolean {
    return this.following;
  }

  /** Height of the ground at world point (x, z), inside the Site or out in the land around it. Water counts as 0. */
  private groundY(x: number, z: number): number {
    if (!this.site || !this.land) return 0;
    const tx = Math.floor(x + this.site.size / 2);
    const tz = Math.floor(z + this.site.size / 2);
    const level = tileAt(this.site, tx, tz)?.level ?? this.land.groundAt(tx, tz).level;
    return Math.max(0, level) * STEP;
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
              : buildWarehouse();
    const c = tileCentre(this.site, x, z);
    model.position.set(c.x, foundationLevel(this.site, x, z) * STEP, c.z);
    model.userData.tile = { x, z };
    this.buildings.add(model);
    this.buildingAt.set(`${x},${z}`, model);
    this.setWorking(x, z, true);
    if (this.siteGroup) for (const t of footprint(x, z)) clearRocks(this.siteGroup, this.site, t.x, t.z);
  }

  /** Start or stop the moving parts of the building on tile (x, z). Factories move only while they make something. */
  setWorking(x: number, z: number, on: boolean): void {
    const model = this.buildingAt.get(`${x},${z}`);
    if (!model || model.userData.working === on) return;
    model.userData.working = on;
    const smoke = model.getObjectByName('smoke');
    if (smoke) smoke.visible = on;
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
    const c = tileCentre(this.site, tile.x, tile.z);
    this.marker.position.set(c.x, foundationLevel(this.site, tile.x, tile.z) * STEP + 0.03, c.z);
    (this.marker.material as THREE.MeshBasicMaterial).color.setHex(allowed ? 0x5dff8a : 0xff5d5d);
    this.marker.visible = true;
  }

  /** Run `fn` every frame with the real seconds since the last frame. */
  onFrame(fn: (seconds: number) => void): void {
    this.frameCallbacks.push(fn);
  }

  private makeMarker(): THREE.Mesh {
    const geometry = new THREE.PlaneGeometry(FOOTPRINT - 0.06, FOOTPRINT - 0.06);
    geometry.rotateX(-Math.PI / 2);
    const marker = new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.6, depthWrite: false }),
    );
    marker.renderOrder = 1;
    marker.visible = false;
    return marker;
  }

  private resize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
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
      const { near, far } = hazeFor(this.camera.position.distanceTo(this.controls.target));
      this.fog.near = near;
      this.fog.far = far;
      this.sky.position.copy(this.camera.position);
      if (!this.hidden) this.renderer.render(this.scene, this.camera);
    });
  }
}
