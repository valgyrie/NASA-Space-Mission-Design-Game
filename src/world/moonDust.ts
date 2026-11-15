import * as THREE from 'three';

/**
 * Dust blown by a landing engine. With no air on the Moon, the grains don't billow or hang: they shoot out
 * flat and fast in a thin sheet, radially from under the engine, and fly ballistic arcs (lunar gravity, 1.62 m/s²)
 * until they hit the ground. When the engine stops, the sheet is gone within a second or two.
 */

const GRAVITY = 1.62;

export class MoonDust {
  readonly points: THREE.Points;
  private readonly pos: Float32Array;
  private readonly vel: Float32Array;
  private readonly alpha: Float32Array;
  private readonly age: Float32Array;
  private readonly floor: Float32Array;
  private next = 0;
  private carry = 0;

  constructor(private readonly count = 6000, colour = new THREE.Color(0.85, 0.82, 0.78)) {
    this.pos = new Float32Array(count * 3);
    this.vel = new Float32Array(count * 3);
    this.alpha = new Float32Array(count);
    this.age = new Float32Array(count).fill(99);
    this.floor = new Float32Array(count);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('alpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    const material = new THREE.ShaderMaterial({
      uniforms: { colour: { value: colour }, scale: { value: 600 } },
      vertexShader:
        'attribute float alpha; varying float vAlpha; uniform float scale;' +
        'void main(){ vAlpha = alpha; vec4 mv = modelViewMatrix * vec4(position, 1.0);' +
        ' gl_PointSize = clamp(scale * 0.2 / -mv.z, 1.0, 24.0); gl_Position = projectionMatrix * mv; }',
      fragmentShader:
        'varying float vAlpha; uniform vec3 colour;' +
        'void main(){ vec2 d = gl_PointCoord - 0.5; float a = smoothstep(0.5, 0.0, length(d)) * vAlpha;' +
        ' if (a < 0.01) discard; gl_FragColor = vec4(colour, a); }',
      transparent: true,
      depthWrite: false,
    });
    this.points = new THREE.Points(g, material);
    this.points.frustumCulled = false;
    this.points.name = 'moon-dust';
  }

  /** Screen height in pixels, so grains keep their size whatever the window. */
  setScale(pixels: number): void {
    (this.points.material as THREE.ShaderMaterial).uniforms.scale!.value = pixels;
  }

  clear(): void {
    this.age.fill(99);
    this.alpha.fill(0);
    this.carry = 0;
  }

  /**
   * Advance `dt` seconds. `source`: the ground point under the engine (null: engine off). `strength` 0–1: how hard
   * the exhaust hits the ground (stronger as it gets lower). `groundY` gives the ground height for a grain to land on.
   */
  update(dt: number, source: THREE.Vector3 | null, strength: number, groundY: (x: number, z: number) => number): void {
    if (dt <= 0) return;
    if (source && strength > 0) {
      this.carry += dt * 4200 * strength;
      while (this.carry >= 1) {
        this.carry -= 1;
        const i = this.next;
        this.next = (this.next + 1) % this.count;
        const a = Math.random() * Math.PI * 2;
        const r = Math.random() * 2.5 * (0.4 + strength);
        const speed = 5 + Math.random() * 28 * (0.5 + strength);
        const up = 0.008 + Math.random() * 0.035;
        this.pos[i * 3] = source.x + Math.cos(a) * r;
        this.pos[i * 3 + 1] = source.y + 0.05 + Math.random() * 0.2;
        this.pos[i * 3 + 2] = source.z + Math.sin(a) * r;
        this.vel[i * 3] = Math.cos(a) * speed;
        this.vel[i * 3 + 1] = speed * up;
        this.vel[i * 3 + 2] = Math.sin(a) * speed;
        this.age[i] = 0;
        this.floor[i] = source.y - 3;
      }
    }
    for (let i = 0; i < this.count; i++) {
      if (this.age[i]! > 6) {
        this.alpha[i] = 0;
        continue;
      }
      this.age[i]! += dt;
      this.vel[i * 3 + 1]! -= GRAVITY * dt;
      this.pos[i * 3]! += this.vel[i * 3]! * dt;
      this.pos[i * 3 + 1]! += this.vel[i * 3 + 1]! * dt;
      this.pos[i * 3 + 2]! += this.vel[i * 3 + 2]! * dt;
      // Landed: gone (it is regolith again). Checked every few frames per grain, cheaply.
      if ((i & 7) === (this.next & 7) || this.pos[i * 3 + 1]! < this.floor[i]!) {
        const g = groundY(this.pos[i * 3]!, this.pos[i * 3 + 2]!);
        this.floor[i] = g;
        if (this.pos[i * 3 + 1]! < g) this.age[i] = 99;
      }
      const t = this.age[i]!;
      this.alpha[i] = t > 6 ? 0 : 0.32 * Math.min(1, t * 6) * Math.max(0, 1 - t / 5);
    }
    this.points.geometry.attributes.position!.needsUpdate = true;
    this.points.geometry.attributes.alpha!.needsUpdate = true;
  }

  dispose(): void {
    this.points.geometry.dispose();
    (this.points.material as THREE.Material).dispose();
  }
}
