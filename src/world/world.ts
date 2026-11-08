import * as THREE from 'three';
import { MapControls } from 'three/examples/jsm/controls/MapControls.js';
import type { RawMaterial } from '../economy/rawMaterial';
import { SITE_SIZE, type Site, tileAt } from '../site/site';
import { buildMine } from './mineMesh';
import { STEP, buildSiteMesh, clearRocks, tileCentre } from './siteMesh';
import {
  ISO_POLAR,
  START_AZIMUTH,
  VIEW_HEIGHT,
  ZOOM_MAX,
  ZOOM_MIN,
  clampToGround,
  frustumFor,
  isoOffset,
} from './isoCamera';

const COLOURS = {
  sky: 0x1b2433,
  skyLight: 0xdfefff,
  groundLight: 0x5a4632,
  sun: 0xfff1d6,
};

/** The empty isometric world: ground, soft light, and a pan / zoom / rotate camera. */
export class World {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.OrthographicCamera;
  readonly controls: MapControls;
  private siteGroup: THREE.Group | null = null;
  private site: Site | null = null;
  private readonly buildings = new THREE.Group();
  private readonly marker: THREE.Mesh;
  private readonly frameCallbacks: ((seconds: number) => void)[] = [];
  private readonly raycaster = new THREE.Raycaster();

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.scene.background = new THREE.Color(COLOURS.sky);

    const f = frustumFor(window.innerWidth / window.innerHeight);
    this.camera = new THREE.OrthographicCamera(f.left, f.right, f.top, f.bottom, 0.1, 1000);
    const o = isoOffset(START_AZIMUTH, 200);
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

  /** Left drag pans, right drag turns, wheel zooms. The tilt stays isometric. */
  private makeControls(canvas: HTMLCanvasElement): MapControls {
    const c = new MapControls(this.camera, canvas);
    c.enableDamping = true;
    c.dampingFactor = 0.12;
    c.minPolarAngle = ISO_POLAR;
    c.maxPolarAngle = ISO_POLAR;
    c.minZoom = ZOOM_MIN;
    c.maxZoom = ZOOM_MAX;
    c.zoomToCursor = true;
    c.rotateSpeed = 0.6;
    c.zoomSpeed = 1.2;
    c.addEventListener('change', () => {
      const { x, z } = clampToGround(c.target.x, c.target.z, SITE_SIZE / 2);
      const dx = x - c.target.x;
      const dz = z - c.target.z;
      if (dx !== 0 || dz !== 0) {
        c.target.set(x, 0, z);
        this.camera.position.x += dx;
        this.camera.position.z += dz;
      }
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    return c;
  }

  private addLights(): void {
    this.scene.add(new THREE.HemisphereLight(COLOURS.skyLight, COLOURS.groundLight, 1.6));

    const sun = new THREE.DirectionalLight(COLOURS.sun, 1.8);
    sun.position.set(30, 50, 20);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.radius = 4;
    const s = sun.shadow.camera;
    s.left = s.bottom = -SITE_SIZE * 0.75;
    s.right = s.top = SITE_SIZE * 0.75;
    s.far = 200;
    this.scene.add(sun);
  }

  /** Show a Site, replacing the one on screen. */
  showSite(site: Site): void {
    if (this.siteGroup) {
      this.scene.remove(this.siteGroup);
      this.siteGroup.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          (o.material as THREE.Material).dispose();
        }
      });
    }
    this.siteGroup = buildSiteMesh(site);
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
    const f = frustumFor(w / h, VIEW_HEIGHT);
    Object.assign(this.camera, f);
    this.camera.updateProjectionMatrix();
  }

  start(): void {
    let last = performance.now();
    this.renderer.setAnimationLoop((now: number) => {
      const seconds = (now - last) / 1000;
      last = now;
      for (const fn of this.frameCallbacks) fn(seconds);
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    });
  }
}
