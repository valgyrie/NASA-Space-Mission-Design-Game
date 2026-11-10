import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { buildEarth, latLonOf } from './earthMesh';

const RADIUS = 1;
/** A press that moves less than this many pixels is a click, not a turn of the globe. */
const CLICK_SLOP = 5;

/** A point on the globe's surface (lifted by `lift` × radius) for a latitude and longitude in degrees. */
function surfacePoint(lat: number, lon: number, lift = 1): THREE.Vector3 {
  const la = THREE.MathUtils.degToRad(lat);
  const lo = THREE.MathUtils.degToRad(lon);
  return new THREE.Vector3(Math.cos(la) * Math.sin(lo), Math.sin(la), Math.cos(la) * Math.cos(lo)).multiplyScalar(RADIUS * lift);
}

/**
 * The New game globe: the real Earth to turn with the mouse, a red pin on the start, and a click to pick a spot.
 * It draws only while it is on screen.
 */
export class GlobePicker {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
  private readonly controls: OrbitControls;
  private readonly earth = buildEarth(RADIUS);
  private readonly pin = new THREE.Group();
  private readonly ball: THREE.Mesh;
  private readonly resize: ResizeObserver;
  private frame = 0;
  private down: { x: number; y: number } | null = null;
  /** Called with the spot the player clicked. */
  onPick: (lat: number, lon: number) => void = () => {};

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.scene.add(this.earth.earth);
    this.scene.add(new THREE.HemisphereLight(0xcfe3ff, 0x2a2f3a, 1.4));
    // The Sun sits behind the camera, so the side you look at is always lit.
    const sun = new THREE.DirectionalLight(0xfff2dc, 2.2);
    sun.position.set(1, 1.5, 3);
    this.camera.add(sun);
    this.scene.add(this.camera);

    const red = new THREE.MeshStandardMaterial({ color: 0xe0322b, emissive: 0x5a0d0a, roughness: 0.4 });
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.12, 8), new THREE.MeshStandardMaterial({ color: 0xf2f2f2 }));
    stick.position.y = 0.06;
    this.ball = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 12), red);
    this.ball.position.y = 0.13;
    this.pin.add(stick, this.ball);
    this.pin.visible = false;
    this.scene.add(this.pin);

    this.camera.position.set(0, 0, 3.1);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enablePan = false;
    this.controls.enableDamping = true;
    this.controls.rotateSpeed = 0.6;
    this.controls.minDistance = 1.8;
    this.controls.maxDistance = 5;

    canvas.addEventListener('pointerdown', (e) => (this.down = { x: e.clientX, y: e.clientY }));
    canvas.addEventListener('pointerup', (e) => {
      const from = this.down;
      this.down = null;
      if (!from || Math.hypot(e.clientX - from.x, e.clientY - from.y) > CLICK_SLOP) return;
      const hit = this.pick(e.clientX, e.clientY);
      if (hit) this.onPick(hit.lat, hit.lon);
    });
    this.resize = new ResizeObserver(() => this.fit());
    this.resize.observe(canvas);
    this.fit();
  }

  /** The latitude and longitude under a screen point, or null off the globe. */
  private pick(clientX: number, clientY: number): { lat: number; lon: number } | null {
    const rect = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, this.camera);
    const point = ray.ray.intersectSphere(new THREE.Sphere(new THREE.Vector3(), RADIUS), new THREE.Vector3());
    return point ? latLonOf(point) : null;
  }

  private fit(): void {
    const w = this.canvas.clientWidth || 1;
    const h = this.canvas.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  /** Put the pin on a spot. `turn` also swings the camera round to face it. */
  setPin(lat: number, lon: number, turn: boolean): void {
    const up = surfacePoint(lat, lon).normalize();
    this.pin.position.copy(up.clone().multiplyScalar(RADIUS));
    this.pin.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), up);
    this.pin.visible = true;
    if (turn) this.camera.position.copy(surfacePoint(lat, lon, this.camera.position.length()));
  }

  start(): void {
    if (this.frame) return;
    const loop = () => {
      this.frame = requestAnimationFrame(loop);
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    };
    loop();
  }

  dispose(): void {
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.resize.disconnect();
    this.controls.dispose();
    this.renderer.dispose();
  }
}
