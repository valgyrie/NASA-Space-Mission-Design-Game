import * as THREE from 'three';
import { MapControls } from 'three/examples/jsm/controls/MapControls.js';
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

/** Side length of the square Site, in tiles (1 tile = 1 world unit). */
export const SITE_SIZE = 64;

const COLOURS = {
  sky: 0x1b2433,
  grass: 0x8cc66d,
  soil: 0x8a6545,
  grid: 0x7ab35d,
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
    this.addGround();

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

  /** A flat grass slab with soil sides, like a cozy board-game tile, plus a faint tile grid. */
  private addGround(): void {
    const depth = 3;
    const grass = new THREE.MeshStandardMaterial({ color: COLOURS.grass, roughness: 1, flatShading: true });
    const soil = new THREE.MeshStandardMaterial({ color: COLOURS.soil, roughness: 1, flatShading: true });
    // Box faces: +x, -x, +y, -y, +z, -z.
    const slab = new THREE.Mesh(new THREE.BoxGeometry(SITE_SIZE, depth, SITE_SIZE), [
      soil,
      soil,
      grass,
      soil,
      soil,
      soil,
    ]);
    slab.position.y = -depth / 2;
    slab.receiveShadow = true;
    this.scene.add(slab);

    const grid = new THREE.GridHelper(SITE_SIZE, SITE_SIZE / 4, COLOURS.grid, COLOURS.grid);
    grid.position.y = 0.01;
    const mat = grid.material as THREE.Material;
    mat.transparent = true;
    mat.opacity = 0.5;
    this.scene.add(grid);
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
    this.renderer.setAnimationLoop(() => {
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    });
  }
}
