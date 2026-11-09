import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Design } from '../game/spacecraft';
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
    const r = 40;
    positions.push(r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta));
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  return new THREE.Points(geometry, new THREE.PointsMaterial({ color: 0xcfd9ff, size: 0.12, sizeAttenuation: true }));
}

/** A low-poly Earth far below: blue sea, green and sandy land, white poles and a thin blue haze. */
function makeEarth(): THREE.Group {
  const geometry = new THREE.IcosahedronGeometry(14, 4).toNonIndexed();
  const pos = geometry.getAttribute('position');
  const colours: number[] = [];
  const sea = new THREE.Color(0x1f5fa8);
  const land = new THREE.Color(0x4f8f45);
  const sand = new THREE.Color(0xc9b27a);
  const ice = new THREE.Color(0xeef3f8);
  const p = new THREE.Vector3();
  for (let i = 0; i < pos.count; i += 3) {
    // One colour per triangle, from its centre, so the faces stay crisp.
    p.set(0, 0, 0);
    for (let k = 0; k < 3; k++) p.add(new THREE.Vector3().fromBufferAttribute(pos, i + k));
    p.divideScalar(3).normalize();
    const n = Math.sin(p.x * 5.1 + p.z * 2.3) + Math.sin(p.y * 4.7 - p.x * 3.1) + Math.sin(p.z * 6.3 + p.y * 1.7);
    const c = Math.abs(p.y) > 0.9 ? ice : n > 1.1 ? sand : n > 0.35 ? land : sea;
    for (let k = 0; k < 3; k++) colours.push(c.r, c.g, c.b);
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3));
  const planet = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.9 }));
  const haze = new THREE.Mesh(
    new THREE.SphereGeometry(14.5, 48, 24),
    new THREE.MeshBasicMaterial({ color: 0x6fb6ff, transparent: true, opacity: 0.16, side: THREE.BackSide, depthWrite: false }),
  );
  planet.name = 'planet';
  const earth = new THREE.Group();
  earth.add(planet, haze);
  // Far below and behind, tilted so the camera sees the oceans and land, not the pole.
  earth.position.set(-8, -24, -22);
  earth.rotation.set(1.1, 0, 0.35);
  earth.name = 'earth';
  return earth;
}

/** The Mission Designer's 3D view: the Spacecraft against the stars. Drag to turn, wheel to zoom. */
export class SpacecraftView {
  readonly canvas = document.createElement('canvas');
  private readonly renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: false });
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  private readonly controls: OrbitControls;
  private model: THREE.Group | null = null;
  private readonly earth = makeEarth();
  private spinning = false;
  private running = false;
  private last = 0;
  private idle = IDLE_SECONDS;
  private readonly resize = new ResizeObserver(() => this.fit());

  constructor() {
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.scene.background = new THREE.Color(0x0a1220);
    this.scene.add(makeStars(), this.earth);
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
      this.earth.getObjectByName('planet')!.rotation.y += seconds * 0.02;
      if (this.model && this.spinning) this.model.rotation.y += seconds * SPIN_TURNS_PER_SECOND * Math.PI * 2;
      this.controls.update(seconds);
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
