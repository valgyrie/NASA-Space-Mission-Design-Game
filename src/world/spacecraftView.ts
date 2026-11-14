import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { Design } from '../game/spacecraft';
import { buildEarth } from './earthMesh';
import { buildSpacecraft, disposeSpacecraft } from './spacecraftMesh';
import { makeStars } from './stars';

/** Turns per second of a spin-stabilised Spacecraft on the table (slowed right down from Explorer 1's 750 rpm). */
const SPIN_TURNS_PER_SECOND = 0.6;

/** Seconds after the player lets go before the camera starts drifting round again. */
const IDLE_SECONDS = 4;

/** The star field (kept exported from here: the Launch view and Space view import it from this module). */
export { makeStars };

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
/** Where the Sun is for the backdrop Earth, in the camera's frame (x right, y up, z towards the viewer). */
const EARTH_SUN = new THREE.Vector3(-0.75, 0.35, 0.3);

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
    this.scene.background = new THREE.Color(0x010204);
    // A soft studio room reflected in the metal and foil, so they read as metal and not grey plastic.
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.55;
    pmrem.dispose();
    const placed = new THREE.Group();
    placed.position.set(0, -EARTH_DISTANCE * Math.sin(EARTH_BELOW), -EARTH_DISTANCE * Math.cos(EARTH_BELOW));
    placed.rotation.x = EARTH_TILT;
    placed.add(this.earth.earth);
    this.earth.spin(START_LONGITUDE);
    this.earthPivot.add(placed);
    this.scene.add(makeStars(), this.earthPivot);
    // Key light: the Sun, crisp and slightly warm. Fill: blue Earth-shine from below. Rim: a cool edge light.
    const sun = new THREE.DirectionalLight(0xfff4e6, 3.2);
    sun.position.set(-3, 4, 3);
    const earthShine = new THREE.HemisphereLight(0x1a2233, 0x4f79b8, 0.9);
    const rim = new THREE.DirectionalLight(0x9cc4ff, 1.4);
    rim.position.set(3, 1, -4);
    this.scene.add(sun, earthShine, rim);

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
      // The backdrop Earth is lit from the upper left of the view, so the day/night line shows on its right.
      this.earth.setSun(EARTH_SUN.clone().applyQuaternion(this.camera.quaternion));
      this.renderer.render(this.scene, this.camera);
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  /** Stop drawing (when it closes), so it costs nothing in the background. */
  stop(): void {
    this.running = false;
  }

  /** Release a discarded designer, including its WebGL context and resize listener. */
  dispose(): void {
    this.stop();
    this.resize.disconnect();
    this.controls.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }

  private fit(): void {
    const { clientWidth: w, clientHeight: h } = this.canvas;
    if (w === 0 || h === 0) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }
}
