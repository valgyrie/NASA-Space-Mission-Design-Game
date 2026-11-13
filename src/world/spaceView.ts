import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EARTH_KM, type Satellite, orbitMinutes, orbitPosition } from '../game/space';
import { buildEarth } from './earthMesh';
import { buildSpacecraft, disposeSpacecraft } from './spacecraftMesh';
import { makeStars } from './spacecraftView';
import { outsideSphere } from './spaceCamera';
import { COMPANION, type ReferenceTrajectoryId, radiusRange, referenceBurns, referenceMinutes, referencePoints, referencePositionAt } from './referenceTrajectory';
import type { ReferencePathKey } from './referencePaths';

/**
 * The Space view in 3D: Earth with every Spacecraft the Company has in orbit, each on its real orbit
 * (size, shape and tilt to the equator), moving as Kepler says. Time runs `SPEEDUP` times faster than real,
 * and Earth turns at the same pace. Click a Spacecraft to follow it; drag to turn, wheel to zoom.
 */

/** How much faster than real time things move here. */
export const SPEEDUP = 300;
/** Minutes for Earth to turn once against the stars (a sidereal day, 23 h 56 min). */
const SIDEREAL_DAY_MIN = 1_436;
const EARTH_RADIUS = 30;
const KM = EARTH_RADIUS / EARTH_KM;
/** The camera stays this far from Earth's centre: just above the atmosphere's glow, below every orbit the game flies. */
const CAMERA_FLOOR = EARTH_RADIUS * 1.05;
/** Height of a Spacecraft model, in view units (much larger than life, or it couldn't be seen). */
const MODEL_SIZE = 0.6;
/** How close a click must be: an invisible ball this size round each Spacecraft. */
const PICK_RADIUS = 2.6;
const COLOUR = { working: 0x4fa3ff, silent: 0x7b8798, done: 0xa9c4e6 } as const;
/** Reference Trajectories are drawn thin, dashed and warm, so they never look like the Company's own (blue) Spacecraft. */
const REFERENCE_COLOUR = 0xffb454;
const MOON_COLOUR = 0xb8bcc4;
/** The Moon's real radius, km. */
const MOON_KM = 1_737;
/** The farthest the camera may see, in view units: past the Moon (about 2,000 units out). */
const FAR = 30_000;

/** A Reference Trajectory (or the Moon's own path) drawn in the view, with a dot moving along it on time. */
interface ShownPath {
  key: ReferencePathKey;
  group: THREE.Group;
  marker: THREE.Object3D;
  minutes: number;
}

/** GMAT's frame (x to the March equinox, z to the north pole, km) in this view (y up is north). */
function toView(p: { x: number; y: number; z: number }): THREE.Vector3 {
  return new THREE.Vector3(p.x * KM, p.z * KM, -p.y * KM);
}

interface Shown {
  sat: Satellite;
  plane: THREE.Group;
  body: THREE.Group;
  model: THREE.Group;
  glow: THREE.Sprite;
  pick: THREE.Mesh;
  line: THREE.Line;
  lapMinutes: number;
  /** Where on its orbit it starts, so two Spacecraft don't sit on top of each other. */
  start: number;
  /** Share of a lap it has gone now. */
  share: number;
}

export class SpaceView {
  readonly canvas = document.createElement('canvas');
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(40, 1, 0.05, FAR);
  private readonly controls: OrbitControls;
  private readonly earth = buildEarth(EARTH_RADIUS);
  private readonly glowMap = glowTexture();
  private shown: Shown[] = [];
  private readonly stars = makeStars(1_500);
  private readonly references = new Map<ReferenceTrajectoryId, { paths: ShownPath[]; started: number }>();
  private following: Shown | null = null;
  private readonly lastTarget = new THREE.Vector3();
  /** Which way the followed Spacecraft faced last frame, so the camera turns with it round the orbit. */
  private readonly lastFrame = new THREE.Quaternion();
  private minutes = 0;
  private running = false;
  private last = 0;
  private down: { x: number; y: number } | null = null;
  private readonly raycaster = new THREE.Raycaster();
  /** Called when the player clicks a Spacecraft (its id) or empty space (null). */
  onPick: (id: number | null) => void = () => {};

  constructor() {
    // Throws where WebGL is missing; the Space view then shows only its list.
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.scene.background = new THREE.Color(0x02050c);
    // The stars travel with the camera and are drawn first, so they stay behind everything even far out past the Moon.
    this.stars.renderOrder = -1;
    (this.stars.material as THREE.PointsMaterial).depthWrite = false;
    this.scene.add(this.stars, this.earth.earth);
    this.earth.spin(THREE.MathUtils.degToRad(80));
    this.scene.add(new THREE.HemisphereLight(0xcfe3ff, 0x0a0f18, 0.5));
    const sun = new THREE.DirectionalLight(0xfff2dc, 2.8);
    sun.position.set(60, 20, 50);
    this.scene.add(sun);

    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enablePan = false;
    this.controls.enableDamping = true;
    this.overview();

    this.canvas.addEventListener('pointerdown', (e) => (this.down = { x: e.clientX, y: e.clientY }));
    this.canvas.addEventListener('pointerup', (e) => {
      if (!this.down || Math.hypot(e.clientX - this.down.x, e.clientY - this.down.y) > 6) return;
      const hit = this.pickAt(e.clientX, e.clientY);
      if (hit) this.onPick(hit.sat.id);
    });
    this.canvas.addEventListener('pointermove', (e) => {
      this.canvas.style.cursor = this.pickAt(e.clientX, e.clientY) ? 'pointer' : '';
    });
  }

  /** Show these Spacecraft (replacing any shown before). */
  load(sats: Satellite[]): void {
    for (const s of this.shown) {
      s.plane.removeFromParent();
      disposeSpacecraft(s.model);
      s.line.geometry.dispose();
      s.pick.geometry.dispose();
    }
    this.shown = sats.map((sat, i) => this.add(sat, i));
    this.following = null;
    this.overview();
  }

  /** Follow one Spacecraft close up, or null to see the whole Earth. */
  follow(id: number | null): void {
    const next = this.shown.find((s) => s.sat.id === id) ?? null;
    if (!next) {
      this.following = null;
      this.overview();
      return;
    }
    this.following = next;
    this.place();
    const { at, frame } = this.frameOf(next);
    // Behind it, a little above and to the side, looking along its path with Earth below.
    const offset = new THREE.Vector3(-2.2, 0.9, 0.9).applyQuaternion(frame);
    this.camera.position.copy(at).add(offset);
    this.controls.target.copy(at);
    this.lastTarget.copy(at);
    this.lastFrame.copy(frame);
    this.controls.minDistance = 0.8;
    this.controls.maxDistance = 40;
    this.controls.update();
    this.keepOutsideEarth();
  }

  /** Show or hide a Reference Trajectory. It starts from its beginning each time it is switched on. */
  showReference(id: ReferenceTrajectoryId, on: boolean): void {
    const was = this.references.get(id);
    if (was && !on) {
      for (const p of was.paths) disposeGroup(p.group);
      this.references.delete(id);
    }
    if (on && !was) {
      const keys: ReferencePathKey[] = [id];
      const companion = COMPANION[id];
      if (companion) keys.push(companion);
      this.references.set(id, { paths: keys.map((key) => this.addPath(key)), started: this.minutes });
      this.placeReferences();
    }
    if (!this.following) this.overview();
  }

  /** Screen positions of each Spacecraft, for name tags; hidden when behind Earth or off screen. */
  tags(): { id: number; x: number; y: number; visible: boolean }[] {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    return this.shown.map((s) => {
      const at = s.body.getWorldPosition(new THREE.Vector3());
      const p = at.clone().project(this.camera);
      const visible = p.z < 1 && Math.abs(p.x) <= 1 && Math.abs(p.y) <= 1 && !this.behindEarth(at);
      return { id: s.sat.id, x: ((p.x + 1) / 2) * w, y: ((1 - p.y) / 2) * h, visible };
    });
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    const frame = (now: number) => {
      if (!this.running) return;
      const seconds = Math.min((now - this.last) / 1000, 0.1);
      this.last = now;
      this.minutes += (seconds * SPEEDUP) / 60;
      this.earth.spin(((seconds * SPEEDUP) / 60 / SIDEREAL_DAY_MIN) * Math.PI * 2);
      this.place();
      this.placeReferences();
      this.stars.position.copy(this.camera.position);
      if (this.following) {
        // Keep the camera in step with the Spacecraft it follows, turning with it round the orbit
        // (and keeping any turn or zoom the player made).
        const { at, frame } = this.frameOf(this.following);
        const offset = this.camera.position.clone().sub(this.lastTarget);
        offset.applyQuaternion(this.lastFrame.clone().invert()).applyQuaternion(frame);
        this.camera.position.copy(at).add(offset);
        this.controls.target.copy(at);
        this.lastTarget.copy(at);
        this.lastFrame.copy(frame);
      }
      this.controls.update(seconds);
      this.keepOutsideEarth();
      this.stars.position.copy(this.camera.position);
      this.fitNear();
      this.fit();
      this.renderer.render(this.scene, this.camera);
      this.onFrame();
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  stop(): void {
    this.running = false;
  }

  /** Called after every drawn frame (the screen moves its name tags). */
  onFrame: () => void = () => {};

  private add(sat: Satellite, i: number): Shown {
    // The orbit's tilt to the equator is real; which way it faces and where it starts are for looks.
    const plane = new THREE.Group();
    plane.rotation.order = 'YXZ';
    plane.rotation.y = 0.6 + i * 1.3;
    plane.rotation.x = THREE.MathUtils.degToRad(sat.inclinationDeg);
    const points: THREE.Vector3[] = [];
    for (let k = 0; k <= 240; k++) {
      const p = orbitPosition(sat.orbitKm, k / 240);
      points.push(new THREE.Vector3(p.x * KM, 0, -p.y * KM));
    }
    const colour = COLOUR[sat.status.kind];
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(points),
      new THREE.LineBasicMaterial({ color: colour, transparent: true, opacity: 0.55 }),
    );
    const body = new THREE.Group();
    const model = buildSpacecraft(sat.report.design ?? FALLBACK_DESIGN);
    const box = new THREE.Box3().setFromObject(model);
    model.scale.setScalar(MODEL_SIZE / Math.max(box.getSize(new THREE.Vector3()).y, 0.01));
    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: this.glowMap, color: colour, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }),
    );
    glow.scale.setScalar(2.2);
    const pick = new THREE.Mesh(new THREE.SphereGeometry(PICK_RADIUS, 8, 6), new THREE.MeshBasicMaterial({ visible: false }));
    body.add(model, glow, pick);
    plane.add(line, body);
    this.scene.add(plane);
    return { sat, plane, body, model, glow, pick, line, lapMinutes: orbitMinutes(sat.orbitKm), start: i * 0.37, share: 0 };
  }

  private addPath(key: ReferencePathKey): ShownPath {
    const moon = key === 'moon';
    const group = new THREE.Group();
    // Dashes in step with the path's size, so they read the same on the transfer and on the flight to the Moon.
    const dash = radiusRange(key).max * KM * 0.012;
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(referencePoints(key).map(toView)),
      new THREE.LineDashedMaterial({ color: moon ? MOON_COLOUR : REFERENCE_COLOUR, dashSize: dash, gapSize: dash * 0.7, transparent: true, opacity: moon ? 0.5 : 0.85 }),
    );
    line.computeLineDistances();
    group.add(line);
    // Where an engine fires: a small bright ring that keeps its size on screen.
    for (const burn of referenceBurns(key)) {
      const dot = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: this.glowMap, color: 0xffffff, sizeAttenuation: false, depthWrite: false, transparent: true }),
      );
      dot.scale.setScalar(0.035);
      dot.position.copy(toView(burn));
      group.add(dot);
    }
    let marker: THREE.Object3D;
    if (moon) {
      marker = new THREE.Mesh(new THREE.SphereGeometry(MOON_KM * KM, 32, 16), new THREE.MeshStandardMaterial({ color: MOON_COLOUR, roughness: 1 }));
      const glow = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: this.glowMap, color: MOON_COLOUR, sizeAttenuation: false, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }),
      );
      glow.scale.setScalar(0.05);
      marker.add(glow);
    } else {
      marker = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: this.glowMap, color: REFERENCE_COLOUR, sizeAttenuation: false, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }),
      );
      marker.scale.setScalar(0.045);
    }
    group.add(marker);
    this.scene.add(group);
    return { key, group, marker, minutes: referenceMinutes(key) };
  }

  /** Move each Reference Trajectory's dot (and the Moon) to where it is now; each starts over when it ends. */
  private placeReferences(): void {
    for (const { paths, started } of this.references.values()) {
      // The paths shown together share one clock, set by the first (the Moon's covers the same days).
      const lap = paths[0].minutes;
      const now = (this.minutes - started) % lap;
      for (const p of paths) p.marker.position.copy(toView(referencePositionAt(p.key, now)));
    }
  }

  /** Far out the near limit can grow, so the depth stays sharp from the Moon down to a Spacecraft. */
  private fitNear(): void {
    const near = Math.max(0.05, this.camera.position.length() / 600);
    if (Math.abs(near - this.camera.near) / this.camera.near < 0.05) return;
    this.camera.near = near;
    this.camera.updateProjectionMatrix();
  }

  /** Where a Spacecraft is and which way it faces: x along its path, y away from Earth. */
  private frameOf(s: Shown): { at: THREE.Vector3; frame: THREE.Quaternion } {
    const at = s.body.getWorldPosition(new THREE.Vector3());
    const p = orbitPosition(s.sat.orbitKm, s.share + 0.001);
    const ahead = s.plane.localToWorld(new THREE.Vector3(p.x * KM, 0, -p.y * KM));
    const out = at.clone().normalize();
    const along = ahead.sub(at);
    along.addScaledVector(out, -along.dot(out)).normalize();
    const side = new THREE.Vector3().crossVectors(along, out);
    const frame = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(along, out, side));
    return { at, frame };
  }

  /** Move every Spacecraft to where it is now on its orbit. */
  private place(): void {
    for (const s of this.shown) {
      s.share = s.start + this.minutes / s.lapMinutes;
      const p = orbitPosition(s.sat.orbitKm, s.share);
      s.body.position.set(p.x * KM, 0, -p.y * KM);
      // A spinning Spacecraft turns about its long axis.
      if (s.sat.report.design?.pointing === 'spin') s.model.rotation.y = this.minutes * 2;
      // The glow is for finding it from far away; close up the model speaks for itself.
      const near = this.following === s;
      s.glow.visible = !near;
    }
  }

  private overview(): void {
    // Far enough back to see the highest orbit: a geostationary one is over six times Earth's size.
    const highest = Math.max(
      0,
      ...this.shown.map((s) => (EARTH_KM + s.sat.orbitKm.high) * KM),
      ...[...this.references.values()].flatMap((r) => r.paths.map((p) => radiusRange(p.key).max * KM)),
    );
    const k = Math.max(1, (highest * 2.6) / 126);
    this.camera.position.set(70 * k, 45 * k, 95 * k);
    this.controls.target.set(0, 0, 0);
    this.controls.minDistance = 45;
    this.controls.maxDistance = Math.max(400, 190 * k);
    this.controls.update();
  }

  private pickAt(clientX: number, clientY: number): Shown | null {
    const rect = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const hits = this.raycaster.intersectObjects(this.shown.map((s) => s.pick), false);
    const earthHit = this.raycaster.ray.intersectSphere(new THREE.Sphere(new THREE.Vector3(), EARTH_RADIUS), new THREE.Vector3());
    for (const hit of hits) {
      if (earthHit && earthHit.distanceTo(this.camera.position) < hit.distance) break;
      const s = this.shown.find((x) => x.pick === hit.object);
      if (s && s !== this.following) return s;
    }
    return null;
  }

  /** Turning or zooming round a Spacecraft low over Earth can't take the camera inside the globe (QA 2026-11-11). */
  private keepOutsideEarth(): void {
    const p = outsideSphere(this.camera.position, CAMERA_FLOOR);
    if (p.x === this.camera.position.x && p.y === this.camera.position.y && p.z === this.camera.position.z) return;
    this.camera.position.set(p.x, p.y, p.z);
    this.camera.lookAt(this.controls.target);
  }

  private behindEarth(at: THREE.Vector3): boolean {
    const from = this.camera.position;
    const dir = at.clone().sub(from);
    const length = dir.length();
    const ray = new THREE.Ray(from, dir.normalize());
    const hit = ray.intersectSphere(new THREE.Sphere(new THREE.Vector3(), EARTH_RADIUS), new THREE.Vector3());
    return !!hit && hit.distanceTo(from) < length;
  }

  private fit(): void {
    const { clientWidth: w, clientHeight: h } = this.canvas;
    if (w === 0 || h === 0) return;
    const size = this.renderer.getSize(new THREE.Vector2());
    if (size.x === w && size.y === h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }
}

/** Old saves didn't keep the design: show a plain small Spacecraft instead. */
const FALLBACK_DESIGN = {
  bus: 'smallBus',
  power: 'batteriesOnly',
  battery: 'largeBattery',
  comms: 'simpleAntenna',
  pointing: 'spin',
  propulsion: 'noEngine',
  payload: null,
} as const;

function disposeGroup(group: THREE.Group): void {
  group.removeFromParent();
  group.traverse((o) => {
    if (o instanceof THREE.Mesh || o instanceof THREE.Line) o.geometry.dispose();
    if (o instanceof THREE.Mesh || o instanceof THREE.Line || o instanceof THREE.Sprite) (o.material as THREE.Material).dispose();
  });
}

/** A soft round glow for each Spacecraft's dot. */
function glowTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  if (g) {
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.3, 'rgba(255,255,255,0.5)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
  }
  return new THREE.CanvasTexture(c);
}
