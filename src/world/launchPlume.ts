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
  uniform float uCover;
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
    // A glowing volume: thick through the middle of the silhouette, nothing at its edge (no hard outline).
    float body = smoothstep(0.0, 0.85, vFacing);
    body *= body;
    // Turbulence running down the flame, ragged toward the tail.
    float flow = noise(vec2(vUv.x * 9.0 + uSeed, v * 7.0 - uTime * 14.0)) * 0.6 + noise(vec2(vUv.x * 23.0, v * 19.0 - uTime * 31.0)) * 0.4;
    float len = v + (flow - 0.5) * 0.3;
    float fade = (1.0 - smoothstep(0.05, 0.95, len)) * smoothstep(0.0, 0.025, v);
    fade *= fade;
    // White-hot just below the nozzle, yellow then orange further down.
    float hot = 1.0 - smoothstep(0.0, 0.32, v);
    float diamonds = uDiamonds * pow(0.5 + 0.5 * cos(v * 44.0 - 0.8), 8.0) * (1.0 - smoothstep(0.04, 0.45, v));
    vec3 colour = mix(uSheath, uCore, hot * hot) * (0.75 + 0.5 * flow) + uCore * diamonds;
    float a = clamp(body * fade * uOpacity * (0.45 + 0.55 * hot + diamonds), 0.0, 1.0);
    // Premultiplied: the glow adds light, and covers part of what is behind (so it is not lost against the sky).
    gl_FragColor = vec4(colour * a, a * uCover);
  }
`;

/** A plume's look: hot kerosene and alcohol flames are yellow-orange, solid motors a whiter, brighter orange. */
export interface PlumeLook {
  core: THREE.Color;
  sheath: THREE.Color;
  diamonds: number;
}

export const PLUME_LIQUID: PlumeLook = { core: new THREE.Color(1.0, 0.9, 0.62), sheath: new THREE.Color(1.0, 0.42, 0.1), diamonds: 0.7 };
export const PLUME_SOLID: PlumeLook = { core: new THREE.Color(1.0, 0.94, 0.82), sheath: new THREE.Color(1.0, 0.62, 0.28), diamonds: 0.1 };
/** Hydrogen and oxygen (RS-25, J-2, RL10): an almost clear, pale blue-white flame with sharp shock diamonds. */
export const PLUME_HYDROGEN: PlumeLook = { core: new THREE.Color(0.85, 0.9, 1.0), sheath: new THREE.Color(0.35, 0.45, 0.95), diamonds: 1.0 };

let glow: THREE.Texture | null = null;

/** A soft round glow, made once on first use. */
function glowTexture(): THREE.Texture | null {
  if (glow || typeof document === 'undefined') return glow;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  if (g) {
    // A soft falloff (about exp(-4 r²)) with no visible edge.
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    for (let k = 0; k <= 8; k++) {
      const r = k / 8;
      grad.addColorStop(r, `rgba(255,${Math.round(225 - 70 * r)},${Math.round(170 - 110 * r)},${(Math.exp(-5 * r * r) * (1 - r)).toFixed(3)})`);
    }
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
      uCover: { value: 0.55 },
    },
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    transparent: true,
    depthWrite: false,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
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
    outerPts.push(new THREE.Vector2(radius * (0.95 + 1.5 * Math.sqrt(t) - 0.3 * t), -length * t));
    innerPts.push(new THREE.Vector2(radius * 0.7 * (1 - 0.75 * t), -length * 0.32 * t));
  }
  const outer = new THREE.Mesh(new THREE.LatheGeometry(outerPts, 24), plumeMaterial(look, 0.9, seed));
  const inner = new THREE.Mesh(new THREE.LatheGeometry(innerPts, 16), plumeMaterial({ ...look, sheath: look.core }, 1.0, seed + 3));
  // UVs: LatheGeometry runs v along the profile (0 at the nozzle), u round.
  for (const m of [outer, inner]) {
    m.renderOrder = 3;
    m.frustumCulled = false;
  }
  g.add(outer, inner);
  const texture = glowTexture();
  if (texture) {
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: texture, color: 0xffc890, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false, fog: false }),
    );
    sprite.scale.setScalar(radius * 4.5);
    sprite.position.y = -radius * 0.9;
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
