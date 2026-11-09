import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Design } from '../game/spacecraft';
import { buildEarth } from './earthMesh';
import { buildSpacecraft, disposeSpacecraft } from './spacecraftMesh';

/** Turns per second of a spin-stabilised Spacecraft on the table (slowed right down from Explorer 1's 750 rpm). */
const SPIN_TURNS_PER_SECOND = 0.6;

/** Seconds after the player lets go before the camera starts drifting round again. */
const IDLE_SECONDS = 4;

function makeStars(): THREE.Points {
  const positions: number[] = [];
  // A fixed pattern, so the sky looks the same every time.
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 600; i++) {
    const theta = rand() * Math.PI * 2;
    const phi = Math.acos(2 * rand() - 1);
    const r = 150;
    positions.push(r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta));
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  return new THREE.Points(geometry, new THREE.PointsMaterial({ color: 0xcfd9ff, size: 1.6, sizeAttenuation: false }));
}

/**
 * Earth at its true apparent size as seen from 13,000 km up: its disc spans about 38° of sky
 * (angular radius asin(6371 / 19371) ≈ 19°), so whole continents fit in the view. Explorer 1 itself
 * flew lower (358–2,550 km), where Earth fills half the sky and only a patch would show.
 * Scaled down with the distance, so it looks the same. Radii in km; see docs/research/earth-map.md.
 */
const EARTH_RADIUS_KM = 6371;
const VIEW_ALTITUDE_KM = 13_000;
const EARTH_RADIUS = 30;
const EARTH_DISTANCE = (EARTH_RADIUS * (EARTH_RADIUS_KM + VIEW_ALTITUDE_KM)) / EARTH_RADIUS_KM;
/** Angle below the middle of the view of Earth's centre: its top edge sits just above the middle. */
const EARTH_BELOW = Math.asin(EARTH_RADIUS_KM / (EARTH_RADIUS_KM + VIEW_ALTITUDE_KM)) - THREE.MathUtils.degToRad(9);
/** North pole tilted away from the camera, so the view centres near 27°N. */
const EARTH_TILT = -0.3;
/** Start over the Americas and the Atlantic: Cape Canaveral, where Explorer 1 launched, is at 80.6°W. */
const START_LONGITUDE = THREE.MathUtils.degToRad(80);
/** Radians per second the surface turns: slow and calm, west to east like the real Earth. */
const EARTH_TURN = 0.012;

/** The Mission Designer's 3D view: the Spacecraft against the stars. Drag to turn, wheel to zoom. */
export class SpacecraftView {
  readonly canvas = document.createElement('canvas');
  private readonly renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: false });
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(35, 1, 0.1, 400);
  private readonly controls: OrbitControls;
  private model: THREE.Group | null = null;
  /** Turns with the camera, so Earth always fills the lower part of the view whichever way it looks (a backdrop, like the stars far away). */
  private readonly earthPivot = new THREE.Group();
  private readonly earth = buildEarth(EARTH_RADIUS);
  private spinning = false;
  private running = false;
  private last = 0;
  private idle = IDLE_SECONDS;
  private readonly resize = new ResizeObserver(() => this.fit());

  constructor() {
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.scene.background = new THREE.Color(0x0a1220);
    const placed = new THREE.Group();
    placed.position.set(0, -EARTH_DISTANCE * Math.sin(EARTH_BELOW), -EARTH_DISTANCE * Math.cos(EARTH_BELOW));
    placed.rotation.x = EARTH_TILT;
    placed.add(this.earth.earth);
    this.earth.spin(START_LONGITUDE);
    this.earthPivot.add(placed);
    this.scene.add(makeStars(), this.earthPivot);
    this.scene.add(new THREE.HemisphereLight(0xcfe3ff, 0x2a2f3a, 1.3));
    const sun = new THREE.DirectionalLight(0xfff2dc, 2.4);
    sun.position.set(-3, 4, 3);
    const rim = new THREE.DirectionalLight(0x7fb2ff, 1.2);
    rim.position.set(3, 1, -4);
    this.scene.add(sun, rim);

    this.camera.position.set(3.6, 1.6, 3.6);
    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enablePan = false;
    this.controls.enableDamping = true;
    this.controls.minDistance = 2;
    this.controls.maxDistance = 9;
    this.controls.autoRotateSpeed = 1.2;
    this.controls.addEventListener('start', () => (this.idle = -Infinity));
    this.controls.addEventListener('end', () => (this.idle = 0));
    this.resize.observe(this.canvas);
  }

  /** Show a design. Called whenever a slot changes. */
  show(design: Design): void {
    if (this.model) {
      this.scene.remove(this.model);
      disposeSpacecraft(this.model);
    }
    this.model = buildSpacecraft(design);
    this.scene.add(this.model);
    this.spinning = design.pointing === 'spin';
  }

  /** Start drawing (when the Mission Designer opens). */
  start(): void {
    if (this.running) return;
    this.running = true;
    this.fit();
    this.last = performance.now();
    const frame = (now: number) => {
      if (!this.running) return;
      const seconds = Math.min((now - this.last) / 1000, 0.1);
      this.last = now;
      this.idle += seconds;
      this.controls.autoRotate = this.idle > IDLE_SECONDS;
      this.earth.spin(seconds * EARTH_TURN);
      if (this.model && this.spinning) this.model.rotation.y += seconds * SPIN_TURNS_PER_SECOND * Math.PI * 2;
      this.controls.update(seconds);
      this.earthPivot.quaternion.copy(this.camera.quaternion);
      this.renderer.render(this.scene, this.camera);
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  /** Stop drawing (when it closes), so it costs nothing in the background. */
  stop(): void {
    this.running = false;
  }

  private fit(): void {
    const { clientWidth: w, clientHeight: h } = this.canvas;
    if (w === 0 || h === 0) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }
}
