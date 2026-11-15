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
    // The card's shape: a soft, wispy billow from the texture (one of four variants, turned with the card).
    vec2 cell = vec2(step(0.5, vSeed), step(0.25, fract(vSeed * 2.0))) * 0.5;
    vec4 tex = texture2D(uPuff, cell + vUv * 0.5);
    float density = tex.a;
    float alpha = density * vData.y;
    if (alpha < 0.003) discard;
    // Light as part of one big cloud rather than as a ball: a gentle gradient toward the sun across the card, the
    // texture's own relief, and the thick middle a little darker (light scatters out before it gets through).
    vec2 relief = (tex.rg - 0.5) * 1.6;
    float toward = dot(p * 0.45 + relief, uSunView.xy) + uSunView.z * 0.35;
    float sun = clamp(0.62 + 0.5 * toward, 0.0, 1.0) * (0.72 + 0.28 * tex.b);
    float under = clamp(0.5 - p.y * 0.35 - relief.y * 0.3, 0.0, 1.0);
    vec3 colour = uSun * sun + mix(uSky, uGround, under * 0.55);
    colour *= 0.86;
    // Close to the flame it glows.
    colour += vec3(4.0, 1.7, 0.5) * vData.w * (0.4 + density);
    gl_FragColor = vec4(colour, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`;

/** A 2×2 atlas of soft billows: alpha = density, rg = its slope (for light), b = how thin it is. Made once on first use. */
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
  for (let cell = 0; cell < 4; cell++) {
    const ox = (cell % 2) * half;
    const oy = Math.floor(cell / 2) * half;
    const dens = new Float32Array(half * half);
    for (let y = 0; y < half; y++) {
      for (let x = 0; x < half; x++) {
        const px = (x / (half - 1)) * 2 - 1;
        const py = (y / (half - 1)) * 2 - 1;
        dens[y * half + x] = billow(px, py, cell * 17.3);
      }
    }
    for (let y = 0; y < half; y++) {
      for (let x = 0; x < half; x++) {
        const at = (yy: number, xx: number) => dens[Math.min(half - 1, Math.max(0, yy)) * half + Math.min(half - 1, Math.max(0, xx))]!;
        const d = at(y, x);
        const dx = at(y, x + 3) - at(y, x - 3);
        const dy = at(y + 3, x) - at(y - 3, x);
        const i = ((oy + y) * size + ox + x) * 4;
        img.data[i] = Math.round(Math.min(1, Math.max(0, 0.5 - dx * 1.5)) * 255);
        img.data[i + 1] = Math.round(Math.min(1, Math.max(0, 0.5 + dy * 1.5)) * 255);
        img.data[i + 2] = Math.round(Math.min(1, 0.35 + 0.65 * (1 - d)) * 255);
        img.data[i + 3] = Math.round(Math.min(1, d) * 255);
      }
    }
  }
  g.putImageData(img, 0, 0);
  atlas = new THREE.CanvasTexture(c);
  atlas.colorSpace = THREE.NoColorSpace;
  return atlas;
}

function hash2(x: number, y: number): number {
  const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return h - Math.floor(h);
}

function valueNoise(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy);
  const b = hash2(ix + 1, iy);
  const c = hash2(ix, iy + 1);
  const d = hash2(ix + 1, iy + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

/**
 * Density of one billow at (x, y) in [-1, 1]²: a soft round falloff eaten into by fractal noise, so its edge is
 * wispy and its face lumpy, and nothing reaches the card's border. 0–1.
 */
export function billow(x: number, y: number, seed = 0): number {
  let n = 0;
  let amp = 0.5;
  let f = 2.2;
  for (let o = 0; o < 5; o++) {
    n += amp * valueNoise(x * f + seed, y * f - seed * 0.7);
    amp *= 0.5;
    f *= 2.03;
  }
  n /= 0.97;
  const r2 = x * x + y * y;
  const falloff = Math.max(0, 1 - r2) ** 1.6;
  return Math.min(1, Math.max(0, (falloff * (0.55 + 0.9 * n) - 0.12) * 1.5));
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
  /** The wind, in m/s: every puff drifts with it, the more the older it is (fresh exhaust is still fast). */
  readonly wind = new THREE.Vector3();

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
      // Stronger wind higher up shears the trail.
      p.pos.addScaledVector(this.wind, dt * Math.min(1, p.age / 2) * (1 + Math.max(0, p.pos.y) / 3_000));
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
