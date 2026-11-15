import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { type CompanyLogo, DEFAULT_LOGO } from '../company/logo';
import type { LaunchSiteId, LaunchVehicleId } from '../game/launchVehicles';
import type { Design } from '../game/spacecraft';
import { METRE, useModel } from './buildingModels';
import { type SkyEnvironment, createSkyEnvironment } from './environment';
import { type LaunchGround, buildLaunchGround } from './launchGround';
import { type LaunchPad, buildLaunchPad } from './launchPad';
import { LaunchSmoke, type SmokeLight } from './launchSmoke';
import { type RocketModel, buildRocket, disposeRocket } from './rocketMesh';

/**
 * The Launch planner's 3D view: the chosen Launch Vehicle with the player's Spacecraft on top, standing on its pad
 * at the chosen Launch Site, in the same sky and light as the Launch show. Drag to turn, wheel to zoom. Each step
 * of the planner eases the camera to what it is about (`frame`). It stops drawing by itself once its canvas is
 * hidden, so the planner only has to call `start` when it is shown. The view fills the planner behind its text;
 * `setSafeArea` says how much of the top and bottom the text covers, and the subject is framed in the space between.
 * It also renders small pictures of each Launch Vehicle for the planner's tiles (`vehicleThumbnail`).
 */

/** What a planner step looks at. */
export type PlannerShot = 'overview' | 'spacecraft' | 'ground' | 'vehicle' | 'site' | 'sky';

/** Toward the sun: a morning sun behind the watching camera, as in the Launch show. */
const SUN = new THREE.Vector3(-0.32, 0.62, 0.72).normalize();
const EXPOSURE = 0.34;
const SUN_INTENSITY = 12;
const SKY_LIGHT = 0.62;
/** The rocket stands on the launch stand, this far above the ground (as in the Launch show). */
const STAND = 1.8;
/** Seconds after the player lets go before the camera starts drifting round again. */
const IDLE_SECONDS = 5;
/** Seconds the camera takes to ease to a step's view. */
const EASE_SECONDS = 1.4;
/** Where the ground-station dish stands, north-west of the pad, off to the side of the usual view. Metres. */
const DISH_AT = new THREE.Vector3(-95, 0, -20);
/** Wallops Island's pads stand right by the beach: the site moves this far east, towards the sea. */
const SITE_EAST: Record<LaunchSiteId, number> = { capeCanaveral: 0, wallops: 170 };
/** The camera's usual heading: from the west-south-west, like the Launch show's pad camera. */
const HEADING = Math.atan2(-42, 34);
/** Size of a Launch Vehicle tile picture, in CSS pixels. */
const THUMB = 128;
/** The tiles' backdrop behind a rocket picture (linear colour, under this exposure). */
const THUMB_BACKGROUND = 0x2a4a75;

interface View {
  target: THREE.Vector3;
  radius: number;
  /** Round the vertical axis, from +z. */
  theta: number;
  /** Down from straight up. */
  phi: number;
}

const smooth = (x: number) => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
};

export class PlannerView {
  readonly canvas = document.createElement('canvas');
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(35, 1, 0.3, 300_000);
  private readonly controls: OrbitControls;
  private readonly sky: SkyEnvironment;
  private readonly ground: LaunchGround;
  private readonly pad: LaunchPad;
  private readonly sun: THREE.DirectionalLight;
  private readonly smoke = new LaunchSmoke(240);
  private readonly smokeLight: SmokeLight = { sunDirection: SUN.clone(), sun: new THREE.Color(), sky: new THREE.Color(0.7, 0.8, 1.0) };
  /** The pad, the rocket and the dish: moved as one to stand at the Launch Site. */
  private readonly site = new THREE.Group();
  private rocket: RocketModel | null = null;
  /** The Ground Station's turning mount, once its model has loaded. */
  private dishMount: THREE.Object3D | null = null;
  private rocketKey = '';
  private rocketHeight = 21;
  private rocketRadius = 0.9;
  private launchSite: LaunchSiteId = 'capeCanaveral';
  private shot: PlannerShot = 'vehicle';
  private ease: { from: View; to: View; t: number } | null = null;
  private running = false;
  private disposed = false;
  private last = 0;
  private idle = 0;
  /** The player has turned or zoomed since the last step change: resizing then keeps their view. */
  private moved = false;
  private readonly resize = new ResizeObserver(() => this.fit());
  /** CSS pixels of the view covered by the planner's title (top) and its tiles, cards and buttons (bottom). */
  private safe = { top: 0, bottom: 0 };
  /** Rocket pictures for the tiles: made one per frame while drawing, kept by design and vehicle. */
  private readonly thumbs = new Map<string, Promise<string>>();
  private readonly thumbQueue: { vehicle: LaunchVehicleId; design: Design; logo: CompanyLogo; done(url: string): void }[] = [];
  private readonly thumbScene = new THREE.Scene();
  private readonly thumbCamera = new THREE.PerspectiveCamera(24, 1, 0.5, 600);

  constructor() {
    // Throws where WebGL is missing; the planner then goes without its view.
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = EXPOSURE;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    this.scene.fog = new THREE.Fog(0x9cc8ee, 3_000, 60_000);
    this.sky = createSkyEnvironment(this.renderer, this.scene, { sunDirection: SUN });
    this.ground = buildLaunchGround(this.sky.uniforms);
    this.pad = buildLaunchPad(31);
    this.site.add(this.pad.group);
    this.scene.add(this.ground.mesh, this.site, this.smoke.mesh);
    this.scene.environmentIntensity = SKY_LIGHT / Math.max(this.sky.skyLight, 0.05);
    this.smokeLight.sun.copy(this.sky.sunColour).multiplyScalar(3.4);
    const sun = new THREE.DirectionalLight(this.sky.sunColour, SUN_INTENSITY);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.bias = -0.0003;
    sun.shadow.normalBias = 0.03;
    const sc = sun.shadow.camera;
    sc.left = sc.bottom = -80;
    sc.right = sc.top = 80;
    sc.near = 1;
    sc.far = 400;
    this.sun = sun;
    this.scene.add(sun, sun.target);
    // The tiles' little studio: the same sky light and sun, a plain backdrop.
    this.thumbScene.environment = this.scene.environment;
    this.thumbScene.environmentIntensity = this.scene.environmentIntensity;
    this.thumbScene.background = new THREE.Color(THUMB_BACKGROUND);
    const thumbSun = new THREE.DirectionalLight(this.sky.sunColour, SUN_INTENSITY);
    thumbSun.position.copy(SUN).multiplyScalar(100);
    this.thumbScene.add(thumbSun);

    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enablePan = false;
    this.controls.enableDamping = true;
    this.controls.minDistance = 2.5;
    this.controls.maxDistance = 320;
    this.controls.maxPolarAngle = Math.PI * 0.68;
    this.controls.autoRotateSpeed = 0.5;
    this.controls.addEventListener('start', () => {
      this.idle = -Infinity;
      this.ease = null;
      this.moved = true;
    });
    this.controls.addEventListener('end', () => (this.idle = 0));
    this.place(this.goal());
    this.resize.observe(this.canvas);
    this.addStation();
  }

  /** Stand this design on this Launch Vehicle. Rebuilds only when either changed. */
  show(design: Design, vehicle: LaunchVehicleId, logo: CompanyLogo = DEFAULT_LOGO): void {
    const key = `${vehicle}|${JSON.stringify(design)}|${JSON.stringify(logo)}`;
    if (key === this.rocketKey) return;
    const first = !this.rocket;
    this.rocketKey = key;
    if (this.rocket) {
      this.rocket.root.removeFromParent();
      disposeRocket(this.rocket.root);
    }
    this.pad.setVehicle(vehicle);
    const rocket = buildRocket(design, vehicle, logo);
    rocket.root.position.y = STAND;
    rocket.root.traverse((o) => {
      if (o instanceof THREE.Mesh && !(o.material as THREE.Material).transparent) o.castShadow = o.receiveShadow = true;
    });
    this.site.add(rocket.root);
    this.rocket = rocket;
    const box = new THREE.Box3().setFromObject(rocket.root);
    const size = box.getSize(new THREE.Vector3());
    this.rocketHeight = size.y;
    this.rocketRadius = Math.max(size.x, size.z) / 2;
    this.smoke.clear();
    // A new rocket is framed again (a taller one needs the camera further back).
    if (first) this.place(this.goal());
    else this.frame(this.shot, true);
  }

  /** Move to this Launch Site. Wallops Island stands nearer the sea. */
  setSite(site: LaunchSiteId): void {
    if (site === this.launchSite) return;
    this.launchSite = site;
    this.site.position.x = SITE_EAST[site];
    this.smoke.clear();
    this.frame(this.shot, true);
  }

  /** How much of the view the planner's text covers at the top and bottom (CSS pixels): the subject is framed between. */
  setSafeArea(top: number, bottom: number): void {
    const next = { top: Math.max(0, Math.round(top)), bottom: Math.max(0, Math.round(bottom)) };
    if (Math.abs(next.top - this.safe.top) < 2 && Math.abs(next.bottom - this.safe.bottom) < 2) return;
    this.safe = next;
    this.offset();
    this.reframe();
  }

  /**
   * A picture of this Launch Vehicle with this design on top, for a tile (a data URL). Made while the view draws,
   * one per frame, and kept, so asking again is free.
   */
  vehicleThumbnail(vehicle: LaunchVehicleId, design: Design, logo: CompanyLogo = DEFAULT_LOGO): Promise<string> {
    const key = `${vehicle}|${JSON.stringify(design)}|${JSON.stringify(logo)}`;
    let made = this.thumbs.get(key);
    if (!made) {
      made = new Promise<string>((done) => this.thumbQueue.push({ vehicle, design: { ...design }, logo, done }));
      this.thumbs.set(key, made);
    }
    return made;
  }

  /** Ease the camera to what a planner step is about. */
  frame(shot: PlannerShot, force = false): void {
    if (shot === this.shot && !force) return;
    this.shot = shot;
    this.ease = { from: this.current(), to: this.goal(), t: 0 };
    this.idle = 0;
    this.moved = false;
  }

  /** Start drawing (when the planner is shown). Stops by itself once the canvas is hidden. */
  start(): void {
    if (this.running || this.disposed) return;
    this.running = true;
    this.fit();
    this.last = performance.now();
    const frame = (now: number) => {
      if (!this.running) return;
      if (!this.canvas.isConnected || !this.canvas.checkVisibility()) {
        this.running = false;
        return;
      }
      const seconds = Math.min((now - this.last) / 1000, 0.1);
      this.last = now;
      this.draw(seconds);
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  stop(): void {
    this.running = false;
  }

  /** Release the view, including its WebGL context and resize listener. */
  dispose(): void {
    this.stop();
    this.disposed = true;
    this.resize.disconnect();
    this.controls.dispose();
    if (this.rocket) disposeRocket(this.rocket.root);
    this.pad.dispose();
    this.sky.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }

  private draw(seconds: number): void {
    this.fit();
    const thumb = this.thumbQueue.shift();
    if (thumb) thumb.done(this.renderThumbnail(thumb.vehicle, thumb.design, thumb.logo));
    this.idle += seconds;
    if (this.ease) {
      this.ease.t += seconds / EASE_SECONDS;
      const k = smooth(this.ease.t);
      const { from, to } = this.ease;
      // Turn the short way round.
      let dTheta = to.theta - from.theta;
      dTheta = Math.atan2(Math.sin(dTheta), Math.cos(dTheta));
      this.place({
        target: from.target.clone().lerp(to.target, k),
        radius: from.radius + (to.radius - from.radius) * k,
        theta: from.theta + dTheta * k,
        phi: from.phi + (to.phi - from.phi) * k,
      });
      if (this.ease.t >= 1) this.ease = null;
    }
    this.controls.autoRotate = !this.ease && this.idle > IDLE_SECONDS;
    this.controls.update(seconds);
    // Never under the ground.
    if (this.camera.position.y < 1.2) {
      this.camera.position.y = 1.2;
      this.camera.lookAt(this.controls.target);
    }
    if (this.dishMount) this.dishMount.rotation.y += seconds * 0.12;
    this.vent(seconds);
    this.ground.animate(seconds);
    this.camera.updateMatrixWorld();
    this.smoke.update(seconds, this.camera, this.smokeLight);
    this.sky.update(this.camera, seconds);
    // Sharp shadows round the pad, wherever it stands.
    this.sun.target.position.set(this.site.position.x, 10, 0);
    this.sun.position.copy(SUN).multiplyScalar(200).add(this.sun.target.position);
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Draw one rocket into a corner of the canvas and copy it out before the frame is drawn over it (the drawing
   * buffer can still be read in the same task).
   */
  private renderThumbnail(vehicle: LaunchVehicleId, design: Design, logo: CompanyLogo): string {
    const ratio = this.renderer.getPixelRatio();
    const css = Math.min(THUMB, this.canvas.clientWidth, this.canvas.clientHeight);
    const px = Math.floor(css * ratio);
    if (px < 16) return '';
    const rocket = buildRocket(design, vehicle, logo);
    this.thumbScene.add(rocket.root);
    const box = new THREE.Box3().setFromObject(rocket.root);
    const centre = box.getCenter(new THREE.Vector3());
    const height = box.getSize(new THREE.Vector3()).y;
    const distance = (height * 0.56) / Math.tan(THREE.MathUtils.degToRad(this.thumbCamera.fov / 2));
    const up = THREE.MathUtils.degToRad(8);
    this.thumbCamera.position.set(
      centre.x + Math.sin(HEADING) * Math.cos(up) * distance,
      centre.y + Math.sin(up) * distance,
      centre.z + Math.cos(HEADING) * Math.cos(up) * distance,
    );
    this.thumbCamera.lookAt(centre);
    const size = this.renderer.getSize(new THREE.Vector2());
    this.renderer.setScissorTest(true);
    this.renderer.setScissor(0, 0, css, css);
    this.renderer.setViewport(0, 0, css, css);
    this.renderer.render(this.thumbScene, this.thumbCamera);
    const out = document.createElement('canvas');
    out.width = out.height = px;
    out.getContext('2d')?.drawImage(this.canvas, 0, this.canvas.height - px, px, px, 0, 0, px, px);
    this.renderer.setScissorTest(false);
    this.renderer.setViewport(0, 0, size.x, size.y);
    rocket.root.removeFromParent();
    disposeRocket(rocket.root);
    return out.toDataURL('image/webp', 0.85);
  }

  /** Cold oxygen vapour drifting off the fuelled rocket, as on a real pad before liftoff. */
  private vent(seconds: number): void {
    if (!this.rocket || Math.random() > seconds * 8) return;
    const a = Math.random() * Math.PI * 2;
    const r = this.rocketRadius * 1.3;
    const y = STAND + this.rocketHeight * (0.3 + Math.random() * 0.25);
    const at = new THREE.Vector3(this.site.position.x + Math.sin(a) * r, y, Math.cos(a) * r);
    this.smoke.emit(at, new THREE.Vector3(Math.sin(a) * 1.0 + 0.5, -0.7, Math.cos(a) * 1.0), 3.5, 0.5, 2.6, { opacity: 0.45, drag: 0.4 });
  }

  /** Where the camera should be for the current step. */
  private goal(): View {
    const x = this.site.position.x;
    const h = this.rocketHeight;
    const half = THREE.MathUtils.degToRad(this.camera.fov / 2);
    // The share of the view's height left between the planner's title and its tiles.
    const viewHeight = Math.max(1, this.canvas.clientHeight);
    const free = Math.max(0.3, (viewHeight - this.safe.top - this.safe.bottom) / viewHeight);
    // Far enough back that this height fills the free space.
    const fitting = (height: number) => height / 2 / Math.tan(half) / free;
    switch (this.shot) {
      case 'vehicle':
        return { target: new THREE.Vector3(x, STAND + h * 0.5, 0), radius: fitting(h * 1.25), theta: HEADING, phi: THREE.MathUtils.degToRad(84) };
      case 'spacecraft': {
        const box = this.rocket ? new THREE.Box3().setFromObject(this.rocket.spacecraft) : null;
        const centre = box && !box.isEmpty() ? box.getCenter(new THREE.Vector3()) : new THREE.Vector3(x, STAND + h - 1, 0);
        const size = box && !box.isEmpty() ? box.getSize(new THREE.Vector3()).length() : 1.5;
        return { target: centre, radius: Math.max(3, fitting(size * 1.3)), theta: HEADING + 0.35, phi: THREE.MathUtils.degToRad(80) };
      }
      case 'ground': {
        const dish = DISH_AT.clone().setX(DISH_AT.x + x);
        const target = dish.clone().lerp(new THREE.Vector3(x, 0, 0), 0.35).setY(9);
        return { target, radius: 90, theta: HEADING, phi: THREE.MathUtils.degToRad(76) };
      }
      case 'site':
        return { target: new THREE.Vector3(x + 25, 6, 0), radius: 210, theta: HEADING - 0.15, phi: THREE.MathUtils.degToRad(66) };
      case 'sky':
        return { target: new THREE.Vector3(x, STAND + h * 0.95, 0), radius: h * 2.4 + 20, theta: HEADING + 0.2, phi: THREE.MathUtils.degToRad(100) };
      case 'overview':
        return { target: new THREE.Vector3(x, STAND + h * 0.42, 0), radius: fitting(h * 1.7), theta: HEADING + 0.5, phi: THREE.MathUtils.degToRad(80) };
    }
  }

  private current(): View {
    const offset = this.camera.position.clone().sub(this.controls.target);
    const s = new THREE.Spherical().setFromVector3(offset);
    return { target: this.controls.target.clone(), radius: s.radius, theta: s.theta, phi: s.phi };
  }

  private place(view: View): void {
    this.controls.target.copy(view.target);
    this.camera.position.setFromSpherical(new THREE.Spherical(view.radius, view.phi, view.theta)).add(view.target);
    this.camera.lookAt(view.target);
  }

  /**
   * The Ground step's tracking station: the Site's Ground Station model (made in Blender, scripts/blender/models_campus.py,
   * already loaded for the Site), at full size beside the pad. Until the models load, the Ground step shows the pad.
   */
  private addStation(): void {
    const station = new THREE.Group();
    station.name = 'ground-station';
    station.position.copy(DISH_AT);
    station.scale.setScalar(1 / METRE);
    useModel(station, 'groundStation', {}, [], (g) => {
      g.traverse((o) => {
        if (o instanceof THREE.Mesh) o.castShadow = o.receiveShadow = true;
      });
      this.dishMount = g.getObjectByName('spinY') ?? null;
    });
    this.site.add(station);
  }

  private fit(): void {
    const { clientWidth: w, clientHeight: h } = this.canvas;
    if (w === 0 || h === 0) return;
    const size = this.renderer.getSize(new THREE.Vector2());
    if (size.x === w && size.y === h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.offset();
    this.reframe();
  }

  /** Shift the picture so the middle of the view sits in the middle of the free space. */
  private offset(): void {
    const { clientWidth: w, clientHeight: h } = this.canvas;
    if (w === 0 || h === 0) return;
    this.camera.setViewOffset(w, h, 0, (this.safe.bottom - this.safe.top) / 2, w, h);
  }

  /** The distance that frames a step depends on the view's shape; keep the player's own view if they moved it. */
  private reframe(): void {
    if (this.moved) return;
    if (this.ease) this.ease.to = this.goal();
    else this.place(this.goal());
  }
}
