import * as THREE from 'three';

/**
 * Rocket exhaust: a glowing plume pointing down from the nozzle, drawn additively so it lights up whatever is
 * behind it. A white-hot core with a faint row of shock diamonds, an orange sheath that widens and fades, and a
 * flicker that runs down the flame. Colours are screen colours (no tone mapping), so it looks the same at any
 * exposure. One shared clock (`advancePlumes`) drives every plume.
 */

const clock = { value: 0 };

/** Move every plume's flicker on. */
export function advancePlumes(seconds: number): void {
  clock.value += seconds;
}

const VERTEX = /* glsl */ `
  varying vec2 vUv;
  varying float vFacing;
  void main() {
    vUv = uv;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vec3 n = normalize(normalMatrix * normal);
    vFacing = abs(dot(n, normalize(-mv.xyz)));
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform vec3 uCore;
  uniform vec3 uSheath;
  uniform float uDiamonds;
  uniform float uSeed;
  uniform float uOpacity;
  varying vec2 vUv;
  varying float vFacing;
  float hash(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  void main() {
    float v = vUv.y; // 0 at the nozzle, 1 at the tail
    // Thick in the middle of the silhouette, thin at its edges, like a glowing volume.
    float body = pow(vFacing, 1.6);
    // Flicker running down the flame, and ragged edges toward the tail.
    float flow = noise(vec2(vUv.x * 9.0 + uSeed, v * 7.0 - uTime * 14.0)) * 0.6 + noise(vec2(vUv.x * 23.0, v * 19.0 - uTime * 31.0)) * 0.4;
    float fade = (1.0 - smoothstep(0.15, 1.0, v + (flow - 0.5) * 0.35)) * smoothstep(0.0, 0.03, v);
    float diamonds = uDiamonds * (0.5 + 0.5 * cos(v * 38.0)) * (1.0 - smoothstep(0.1, 0.55, v));
    vec3 colour = mix(uCore, uSheath, smoothstep(0.05, 0.6, v)) * (0.75 + 0.5 * flow + diamonds);
    float a = body * fade * uOpacity;
    gl_FragColor = vec4(colour * a, 1.0);
  }
`;

/** A plume's look: hot kerosene and alcohol flames are yellow-orange, solid motors a whiter, brighter orange. */
export interface PlumeLook {
  core: THREE.Color;
  sheath: THREE.Color;
  diamonds: number;
}

export const PLUME_LIQUID: PlumeLook = { core: new THREE.Color(1.0, 0.93, 0.72), sheath: new THREE.Color(1.0, 0.45, 0.12), diamonds: 0.6 };
export const PLUME_SOLID: PlumeLook = { core: new THREE.Color(1.0, 0.95, 0.85), sheath: new THREE.Color(1.0, 0.55, 0.2), diamonds: 0.15 };

let glow: THREE.Texture | null = null;

/** A soft round glow, made once on first use. */
function glowTexture(): THREE.Texture | null {
  if (glow || typeof document === 'undefined') return glow;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  if (g) {
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,240,210,1)');
    grad.addColorStop(0.25, 'rgba(255,190,110,0.55)');
    grad.addColorStop(1, 'rgba(255,140,60,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
  }
  glow = new THREE.CanvasTexture(c);
  return glow;
}

function plumeMaterial(look: PlumeLook, opacity: number, seed: number): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: clock,
      uCore: { value: look.core },
      uSheath: { value: look.sheath },
      uDiamonds: { value: look.diamonds },
      uSeed: { value: seed },
      uOpacity: { value: opacity },
    },
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    toneMapped: false,
    fog: false,
  });
}

/** A flame from y = 0 down to y = −length, widening as it goes. Scale its group to flicker or stretch it. */
export function buildPlume(radius: number, length: number, look: PlumeLook = PLUME_LIQUID): THREE.Group {
  const g = new THREE.Group();
  g.name = 'plume';
  const seed = Math.random() * 100;
  // Outer sheath: starts at the nozzle exit and swells.
  const outerPts: THREE.Vector2[] = [];
  const innerPts: THREE.Vector2[] = [];
  for (let k = 0; k <= 12; k++) {
    const t = k / 12;
    outerPts.push(new THREE.Vector2(radius * (1 + 1.3 * Math.sqrt(t)), -length * t));
    innerPts.push(new THREE.Vector2(radius * 0.55 * (1 - 0.6 * t), -length * 0.45 * t));
  }
  const outer = new THREE.Mesh(new THREE.LatheGeometry(outerPts, 24), plumeMaterial(look, 1.0, seed));
  const inner = new THREE.Mesh(new THREE.LatheGeometry(innerPts, 16), plumeMaterial({ ...look, sheath: look.core }, 1.4, seed + 3));
  // UVs: LatheGeometry runs v along the profile (0 at the nozzle), u round.
  for (const m of [outer, inner]) {
    m.renderOrder = 3;
    m.frustumCulled = false;
  }
  g.add(outer, inner);
  const texture = glowTexture();
  if (texture) {
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: texture, color: 0xffd9a0, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false, fog: false }),
    );
    sprite.scale.setScalar(radius * 7);
    sprite.position.y = -radius * 0.6;
    sprite.renderOrder = 3;
    g.add(sprite);
  }
  g.visible = false;
  return g;
}

/** Free a plume's geometry and materials (the glow texture is shared and kept). */
export function disposePlume(plume: THREE.Object3D): void {
  plume.traverse((o) => {
    if (o instanceof THREE.Mesh || o instanceof THREE.Sprite) {
      if (o instanceof THREE.Mesh) o.geometry.dispose();
      (o.material as THREE.Material).dispose();
    }
  });
}
