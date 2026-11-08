import * as THREE from 'three';
import { MapControls } from 'three/examples/jsm/controls/MapControls.js';
import type { RawMaterial } from '../economy/rawMaterial';
import { SITE_SIZE, type Site, tileAt } from '../site/site';
import {
  FOV_DEGREES,
  MAX_DISTANCE,
  MAX_ELEVATION,
  MIN_DISTANCE,
  MIN_ELEVATION,
  START_AZIMUTH,
  START_DISTANCE,
  START_ELEVATION,
  cameraOffset,
  clampToGround,
  hazeFor,
  polarFromElevation,
} from './camera';
import { buildMine } from './mineMesh';
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

/** The 3D world: the Site and the land around it, sky, sunlight, and the camera. */
export class World {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly controls: MapControls;
  private siteGroup: THREE.Group | null = null;
  private site: Site | null = null;
  private readonly buildings = new THREE.Group();
  private readonly marker: THREE.Mesh;
  private readonly sky = makeSky();
  private readonly fog = new THREE.Fog(COLOURS.horizon, 100, 300);
  private readonly frameCallbacks: ((seconds: number) => void)[] = [];
  private readonly raycaster = new THREE.Raycaster();

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
    this.scene.add(this.buildings);
    this.marker = this.makeMarker();
    this.scene.add(this.marker);

    window.addEventListener('resize', () => this.resize());
    this.resize();
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
      const { x, z } = clampToGround(c.target.x, c.target.z, SITE_SIZE / 2);
      const dx = x - c.target.x;
      const dz = z - c.target.z;
      if (dx !== 0 || dz !== 0 || c.target.y !== 0) {
        this.camera.position.x += dx;
        this.camera.position.z += dz;
        c.target.set(x, 0, z);
      }
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
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
    this.buildings.clear();
  }

  /** Put a Mine model on tile (x, z). */
  addMine(x: number, z: number, material: RawMaterial): void {
    if (!this.site) return;
    const mine = buildMine(material);
    const c = tileCentre(this.site, x, z);
    mine.position.set(c.x, (tileAt(this.site, x, z)?.level ?? 0) * STEP, c.z);
    this.buildings.add(mine);
    if (this.siteGroup) clearRocks(this.siteGroup, this.site, x, z);
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
    const hit = this.raycaster.intersectObject(terrain)[0];
    if (!hit?.face) return null;
    // Step slightly into the surface, so a click on a cliff face picks the tile it belongs to.
    const p = hit.point.clone().addScaledVector(hit.face.normal, -0.01);
    const x = Math.floor(p.x + this.site.size / 2);
    const z = Math.floor(p.z + this.site.size / 2);
    return tileAt(this.site, x, z) ? { x, z } : null;
  }

  /** Highlight one tile in green (allowed) or red (not allowed). Pass null to hide it. */
  markTile(tile: { x: number; z: number } | null, allowed = true): void {
    if (!tile || !this.site) {
      this.marker.visible = false;
      return;
    }
    const c = tileCentre(this.site, tile.x, tile.z);
    this.marker.position.set(c.x, (tileAt(this.site, tile.x, tile.z)?.level ?? 0) * STEP + 0.02, c.z);
    (this.marker.material as THREE.MeshBasicMaterial).color.setHex(allowed ? 0x5dff8a : 0xff5d5d);
    this.marker.visible = true;
  }

  /** Run `fn` every frame with the real seconds since the last frame. */
  onFrame(fn: (seconds: number) => void): void {
    this.frameCallbacks.push(fn);
  }

  private makeMarker(): THREE.Mesh {
    const geometry = new THREE.PlaneGeometry(0.96, 0.96);
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
      this.controls.update();
      const { near, far } = hazeFor(this.camera.position.distanceTo(this.controls.target));
      this.fog.near = near;
      this.fog.far = far;
      this.sky.position.copy(this.camera.position);
      this.renderer.render(this.scene, this.camera);
    });
  }
}
