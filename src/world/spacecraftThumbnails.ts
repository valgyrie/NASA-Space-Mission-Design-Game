import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { Design, Slot } from '../game/spacecraft';
import { buildSpacecraft, disposeSpacecraft } from './spacecraftMesh';

/** Pixels per side of a thumbnail (shown at about half that, so it stays sharp on high-density screens). */
const SIZE = 192;
/** Cached pictures kept before the oldest is dropped. */
const KEEP = 160;

/**
 * Small still pictures of a design, for the Mission Designer's option tiles. One hidden renderer, made on first
 * use and shared; every picture is cached by its design, so each is drawn once.
 */
class Thumbnails {
  private renderer: THREE.WebGLRenderer | null = null;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(30, 1, 0.05, 50);
  private readonly cache = new Map<string, string>();

  private setUp(): THREE.WebGLRenderer {
    const canvas = document.createElement('canvas');
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setSize(SIZE, SIZE, false);
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    const pmrem = new THREE.PMREMGenerator(renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.6;
    pmrem.dispose();
    // The same lights as the big view: warm Sun, blue Earth-shine, cool rim.
    const sun = new THREE.DirectionalLight(0xfff4e6, 3.2);
    sun.position.set(-3, 4, 3);
    const rim = new THREE.DirectionalLight(0x9cc4ff, 1.4);
    rim.position.set(3, 1, -4);
    this.scene.add(sun, rim, new THREE.HemisphereLight(0x1a2233, 0x4f79b8, 0.9));
    return renderer;
  }

  /**
   * A PNG data URL of the design, seen from the front and a little above. With `focus`, that slot's Part fills
   * the square (the rest of the Spacecraft round it); without, or when the Part has nothing to show, the whole Spacecraft.
   */
  picture(design: Design, focus?: Slot): string {
    const key = `${focus ?? ''}|${JSON.stringify(design)}`;
    const hit = this.cache.get(key);
    if (hit) return hit;
    this.renderer ??= this.setUp();
    const model = buildSpacecraft(design);
    this.scene.add(model);
    model.updateMatrixWorld(true);
    let part: THREE.Object3D | null = null;
    if (focus) model.traverse((o) => (part ??= o.userData.slot === focus ? o : null));
    const sphere = new THREE.Box3().setFromObject(part ?? model).getBoundingSphere(new THREE.Sphere());
    sphere.radius = Math.max(sphere.radius, 0.3);
    const distance = (sphere.radius / Math.sin(THREE.MathUtils.degToRad(this.camera.fov / 2))) * (part ? 1.05 : 0.92);
    this.camera.position.copy(sphere.center).add(new THREE.Vector3(0.62, 0.32, 0.72).normalize().multiplyScalar(distance));
    this.camera.lookAt(sphere.center);
    this.renderer.render(this.scene, this.camera);
    const url = this.renderer.domElement.toDataURL('image/png');
    this.scene.remove(model);
    disposeSpacecraft(model);
    if (this.cache.size >= KEEP) this.cache.delete(this.cache.keys().next().value!);
    this.cache.set(key, url);
    return url;
  }
}

let shared: Thumbnails | null = null;

/** A small picture of a design (see `Thumbnails.picture`). */
export function spacecraftPicture(design: Design, focus?: Slot): string {
  shared ??= new Thumbnails();
  return shared.picture(design, focus);
}
