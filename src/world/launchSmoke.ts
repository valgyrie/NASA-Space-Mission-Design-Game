import * as THREE from 'three';

/**
 * Launch smoke and steam: soft, sunlit billows drawn as camera-facing cards in one instanced draw call, sorted far
 * to near each frame so they layer properly. Each puff is shaded like a ball of cloud (bright on the sun's side,
 * blue-grey underneath), glows orange while it is close to the flame, then grows, slows and thins out.
 */

export interface SmokeLight {
  /** Toward the sun (world space). */
  sunDirection: THREE.Vector3;
  /** Sunlight reaching the smoke (linear, already scaled for the scene's exposure). */
  sun: THREE.Color;
  /** Light from the sky. */
  sky: THREE.Color;
}

interface Puff {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  age: number;
  life: number;
  from: number;
  to: number;
  rot: number;
  spin: number;
  heat: number;
  opacity: number;
  /** Rise per second (warm steam floats up). */
  lift: number;
  /** How fast the air slows it (per second). */
  drag: number;
  alive: boolean;
}

/** Strength of a puff `age` seconds into its `life`: there at once (a fifth of a second to fade in), then thinning out. */
export function puffOpacity(age: number, life: number): number {
  if (age <= 0 || age >= life) return 0;
  return Math.min(1, age / 0.2) * (1 - age / life) ** 1.4;
}

const VERTEX = /* glsl */ `
  #include <common>
  #include <fog_pars_vertex>
  attribute vec3 iPos;
  attribute vec4 iData; // size, opacity, rotation, heat
  varying vec2 vUv;
  varying vec4 vData;
  varying float vSeed;
  void main() {
    vUv = uv;
    vData = iData;
    vSeed = fract(iPos.x * 0.137 + iPos.z * 0.311);
    vec4 mvPosition = modelViewMatrix * vec4(iPos, 1.0);
    float c = cos(iData.z);
    float s = sin(iData.z);
    vec2 corner = mat2(c, s, -s, c) * position.xy * iData.x;
    mvPosition.xy += corner;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`;

const FRAGMENT = /* glsl */ `
  #include <common>
  #include <fog_pars_fragment>
  uniform sampler2D uPuff;
  uniform vec3 uSunView;
  uniform vec3 uSun;
  uniform vec3 uSky;
  uniform vec3 uGround;
  varying vec2 vUv;
  varying vec4 vData;
  varying float vSeed;
  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    // The card's shape: a lumpy round puff from the texture (one of four variants).
    vec2 cell = vec2(step(0.5, vSeed), step(0.25, fract(vSeed * 2.0))) * 0.5;
    vec4 tex = texture2D(uPuff, cell + vUv * 0.5);
    float density = tex.a;
    if (density * vData.y < 0.004) discard;
    // Shade it like a ball: a normal bent outward by the puff's lumps.
    vec3 n = normalize(vec3(p * 0.9 + (tex.rg - 0.5) * 0.6, max(0.35, 1.0 - dot(p, p))));
    float sun = clamp(dot(n, uSunView) * 0.5 + 0.55, 0.0, 1.0);
    float under = clamp(-n.y * 0.5 + 0.5, 0.0, 1.0);
    vec3 colour = uSun * sun * (0.55 + 0.45 * tex.b) + mix(uSky, uGround, under * 0.6) ;
    colour *= 0.9;
    // Close to the flame it glows.
    colour += vec3(4.0, 1.6, 0.45) * vData.w * (0.5 + density);
    gl_FragColor = vec4(colour, density * vData.y);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

/** A 2×2 atlas of soft lumpy puffs: alpha = density, rg = lump slope, b = self-shadow. Made once on first use. */
let atlas: THREE.Texture | null = null;
function puffAtlas(): THREE.Texture | null {
  if (atlas || typeof document === 'undefined') return atlas;
  const size = 256;
  const half = size / 2;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  if (!g) return null;
  const img = g.createImageData(size, size);
  let seed = 11;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let cell = 0; cell < 4; cell++) {
    const ox = (cell % 2) * half;
    const oy = Math.floor(cell / 2) * half;
    // Each puff is a cluster of soft balls.
    const balls: [number, number, number][] = [[0, 0, 0.62]];
    for (let k = 0; k < 7; k++) {
      const a = rand() * Math.PI * 2;
      const d = 0.2 + rand() * 0.35;
      balls.push([Math.cos(a) * d, Math.sin(a) * d, 0.26 + rand() * 0.18]);
    }
    const dens = new Float32Array(half * half);
    for (let y = 0; y < half; y++) {
      for (let x = 0; x < half; x++) {
        const px = (x / (half - 1)) * 2 - 1;
        const py = (y / (half - 1)) * 2 - 1;
        let d = 0;
        for (const [bx, by, br] of balls) d += Math.exp(-((px - bx) ** 2 + (py - by) ** 2) / (br * br));
        // Wispy edge noise.
        const n = Math.sin(px * 13 + cell) * Math.sin(py * 11 - cell * 2) * 0.08 + Math.sin(px * 31 + py * 27) * 0.04;
        const edge = Math.max(0, 1 - Math.hypot(px, py));
        dens[y * half + x] = Math.max(0, Math.min(1, (1 - Math.exp(-d * 1.4)) + n * 0.6)) * Math.min(1, edge * 4);
      }
    }
    for (let y = 0; y < half; y++) {
      for (let x = 0; x < half; x++) {
        const at = (yy: number, xx: number) => dens[Math.min(half - 1, Math.max(0, yy)) * half + Math.min(half - 1, Math.max(0, xx))]!;
        const d = at(y, x);
        const dx = at(y, x + 2) - at(y, x - 2);
        const dy = at(y + 2, x) - at(y - 2, x);
        const i = ((oy + y) * size + ox + x) * 4;
        img.data[i] = Math.round(Math.min(1, Math.max(0, 0.5 - dx * 2)) * 255);
        img.data[i + 1] = Math.round(Math.min(1, Math.max(0, 0.5 + dy * 2)) * 255);
        img.data[i + 2] = Math.round(Math.min(1, 0.4 + 0.6 * (1 - d)) * 255);
        img.data[i + 3] = Math.round(Math.min(1, d * 1.1) ** 1.15 * 255);
      }
    }
  }
  g.putImageData(img, 0, 0);
  atlas = new THREE.CanvasTexture(c);
  atlas.colorSpace = THREE.NoColorSpace;
  return atlas;
}

export class LaunchSmoke {
  readonly mesh: THREE.Mesh;
  private readonly puffs: Puff[] = [];
  private next = 0;
  private readonly iPos: THREE.InstancedBufferAttribute;
  private readonly iData: THREE.InstancedBufferAttribute;
  private readonly geometry: THREE.InstancedBufferGeometry;
  private readonly material: THREE.ShaderMaterial;
  private readonly order: number[] = [];
  private readonly depth: Float32Array;

  constructor(readonly capacity = 700) {
    const plane = new THREE.PlaneGeometry(1, 1);
    this.geometry = new THREE.InstancedBufferGeometry();
    this.geometry.index = plane.index;
    this.geometry.setAttribute('position', plane.getAttribute('position'));
    this.geometry.setAttribute('uv', plane.getAttribute('uv'));
    this.iPos = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3), 3);
    this.iData = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 4), 4);
    this.iPos.setUsage(THREE.DynamicDrawUsage);
    this.iData.setUsage(THREE.DynamicDrawUsage);
    this.geometry.setAttribute('iPos', this.iPos);
    this.geometry.setAttribute('iData', this.iData);
    this.geometry.instanceCount = 0;
    this.material = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([
        THREE.UniformsLib.fog,
        {
          uPuff: { value: null },
          uSunView: { value: new THREE.Vector3(0, 1, 0) },
          uSun: { value: new THREE.Color(3, 3, 3) },
          uSky: { value: new THREE.Color(0.5, 0.6, 0.8) },
          uGround: { value: new THREE.Color(0.3, 0.28, 0.22) },
        },
      ]),
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      transparent: true,
      depthWrite: false,
      fog: true,
    });
    this.material.uniforms.uPuff!.value = puffAtlas();
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 2;
    this.mesh.name = 'smoke';
    this.depth = new Float32Array(capacity);
    for (let i = 0; i < capacity; i++) {
      this.puffs.push({ pos: new THREE.Vector3(), vel: new THREE.Vector3(), age: 0, life: 1, from: 1, to: 1, rot: 0, spin: 0, heat: 0, opacity: 1, lift: 0, drag: 0.8, alive: false });
    }
  }

  /** Let a puff go at `at`, moving at `velocity` m/s, growing from `from` to `to` metres across over `life` seconds. */
  emit(at: THREE.Vector3, velocity: THREE.Vector3, life: number, from: number, to: number, o: { heat?: number; opacity?: number; lift?: number; drag?: number } = {}): void {
    const p = this.puffs[this.next]!;
    this.next = (this.next + 1) % this.capacity;
    p.pos.copy(at);
    p.vel.copy(velocity);
    p.age = 0;
    p.life = life;
    p.from = from;
    p.to = to;
    p.rot = Math.random() * Math.PI * 2;
    p.spin = (Math.random() - 0.5) * 0.3;
    p.heat = o.heat ?? 0;
    p.opacity = o.opacity ?? 1;
    p.lift = o.lift ?? 0;
    p.drag = o.drag ?? 0.8;
    p.alive = true;
  }

  /** Age the puffs, then sort and upload what the camera sees. */
  update(dt: number, camera: THREE.Camera, light: SmokeLight): void {
    const view = camera.matrixWorldInverse;
    const e = view.elements;
    this.order.length = 0;
    for (let i = 0; i < this.capacity; i++) {
      const p = this.puffs[i]!;
      if (!p.alive) continue;
      p.age += dt;
      if (p.age >= p.life) {
        p.alive = false;
        continue;
      }
      p.pos.addScaledVector(p.vel, dt);
      p.pos.y += p.lift * dt;
      p.vel.multiplyScalar(Math.max(0, 1 - dt * p.drag));
      p.rot += p.spin * dt;
      // Depth along the view (more negative = farther).
      this.depth[i] = e[2]! * p.pos.x + e[6]! * p.pos.y + e[10]! * p.pos.z + e[14]!;
      this.order.push(i);
    }
    this.order.sort((a, b) => this.depth[a]! - this.depth[b]!);
    const pos = this.iPos.array as Float32Array;
    const data = this.iData.array as Float32Array;
    let n = 0;
    for (const i of this.order) {
      const p = this.puffs[i]!;
      const k = p.age / p.life;
      pos[n * 3] = p.pos.x;
      pos[n * 3 + 1] = p.pos.y;
      pos[n * 3 + 2] = p.pos.z;
      data[n * 4] = p.from + (p.to - p.from) * Math.sqrt(k);
      data[n * 4 + 1] = puffOpacity(p.age, p.life) * p.opacity;
      data[n * 4 + 2] = p.rot;
      data[n * 4 + 3] = p.heat * Math.max(0, 1 - p.age / 0.3) ** 2;
      n++;
    }
    this.geometry.instanceCount = n;
    this.iPos.needsUpdate = true;
    this.iData.needsUpdate = true;
    const u = this.material.uniforms;
    (u.uSunView!.value as THREE.Vector3).copy(light.sunDirection).transformDirection(view);
    (u.uSun!.value as THREE.Color).copy(light.sun);
    (u.uSky!.value as THREE.Color).copy(light.sky);
  }

  clear(): void {
    for (const p of this.puffs) p.alive = false;
    this.geometry.instanceCount = 0;
  }
}
