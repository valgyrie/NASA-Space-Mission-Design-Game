import * as THREE from 'three';

/**
 * A fixed star field on a sphere: a few bright stars and many faint ones (brightness falls off like real star
 * counts by magnitude), coloured by temperature from blue-white to orange, more crowded along a faint Milky Way
 * band. No twinkling: in space stars are steady.
 *
 * It stays a THREE.Points with a PointsMaterial, so callers can dim it through `material.color` (the Launch view
 * fades the stars in with altitude); the Milky Way glow is a child that follows that colour.
 */

/** The Milky Way's plane, tilted against the view's equator (about 60°, like the real galactic plane). */
const GALACTIC_POLE = new THREE.Vector3(0.2, 0.87, -0.45).normalize();

/** Star colours by temperature, hot to cool, with how common each is among the stars we can see. */
const STAR_COLOURS: readonly [number, number][] = [
  [0x9bb0ff, 0.12], // O/B: blue-white
  [0xcad7ff, 0.2], // A: white with a blue tint
  [0xf8f7ff, 0.25], // F: white
  [0xfff4e8, 0.2], // G: yellow-white, like the Sun
  [0xffd2a1, 0.15], // K: pale orange
  [0xffb56c, 0.08], // M: orange
];

export function makeStars(radius = 150): THREE.Points {
  let seed = 7;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const count = 4200;
  const positions = new Float32Array(count * 3);
  const colours = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const pole = GALACTIC_POLE;
  const a = new THREE.Vector3(1, 0, 0).cross(pole).normalize();
  const b = pole.clone().cross(a);
  const p = new THREE.Vector3();
  const colour = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const angle = rand() * Math.PI * 2;
    if (i % 5 < 2) {
      // Crowded towards the galactic plane (a narrow bell curve of galactic latitude).
      const g = (rand() + rand() + rand() - 1.5) * 0.28;
      p.copy(a).multiplyScalar(Math.cos(angle) * Math.cos(g)).addScaledVector(b, Math.sin(angle) * Math.cos(g)).addScaledVector(pole, Math.sin(g));
    } else {
      const z = 2 * rand() - 1;
      const r = Math.sqrt(1 - z * z);
      p.set(r * Math.cos(angle), z, r * Math.sin(angle));
    }
    p.normalize().multiplyScalar(radius);
    positions.set([p.x, p.y, p.z], i * 3);
    // Brightness: most stars are near the limit of sight, a handful are bright.
    const bright = Math.pow(rand(), 5.5);
    let pick = rand();
    let hex = STAR_COLOURS[2]![0];
    for (const [c, share] of STAR_COLOURS) {
      if ((pick -= share) < 0) {
        hex = c;
        break;
      }
    }
    colour.setHex(hex).multiplyScalar(0.28 + bright * 1.6);
    colours.set([colour.r, colour.g, colour.b], i * 3);
    sizes[i] = 0.75 + bright * 2.4;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colours, 3));
  geometry.setAttribute('starSize', new THREE.BufferAttribute(sizes, 1));
  const material = new THREE.PointsMaterial({
    color: 0xffffff,
    vertexColors: true,
    size: 2.2,
    sizeAttenuation: false,
    // Added light, but kept in the opaque list (drawn first with a low renderOrder), so the scene covers it.
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float starSize;')
      .replace('gl_PointSize = size;', 'gl_PointSize = size * starSize;');
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <map_particle_fragment>',
      `#include <map_particle_fragment>
      float starEdge = length(gl_PointCoord - 0.5) * 2.0;
      diffuseColor.a *= smoothstep(1.0, 0.15, starEdge);`,
    );
  };
  const stars = new THREE.Points(geometry, material);
  stars.name = 'stars';
  stars.renderOrder = -1;
  stars.add(milkyWay(radius * 0.995, material));
  return stars;
}

/** The faint glow of the Milky Way along the band, with darker dust lanes; dims with the stars' colour. */
function milkyWay(radius: number, stars: THREE.PointsMaterial): THREE.Mesh {
  const material = new THREE.ShaderMaterial({
    uniforms: { pole: { value: GALACTIC_POLE }, strength: { value: 1 } },
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    vertexShader: `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 pole;
      uniform float strength;
      varying vec3 vDir;
      float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
      float noise(vec3 p) {
        vec3 i = floor(p); vec3 f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
                   mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
      }
      void main() {
        float lat = dot(vDir, pole);
        float band = exp(-lat * lat / 0.022);
        float clumps = noise(vDir * 7.0) * 0.6 + noise(vDir * 19.0) * 0.4;
        float dust = smoothstep(0.35, 0.75, noise(vDir * 11.0 + 3.0)) * exp(-lat * lat / 0.004);
        float glow = band * (0.45 + clumps * 0.8) * (1.0 - dust * 0.7);
        vec3 colour = mix(vec3(0.55, 0.6, 0.75), vec3(0.85, 0.78, 0.65), clumps) * glow * 0.05 * strength;
        gl_FragColor = vec4(colour, 1.0);
      }`,
  });
  const band = new THREE.Mesh(new THREE.SphereGeometry(radius, 48, 24), material);
  band.name = 'milky-way';
  band.renderOrder = -2;
  band.frustumCulled = false;
  band.onBeforeRender = () => {
    const c = stars.color;
    material.uniforms.strength!.value = (c.r + c.g + c.b) / 3;
    band.visible = true;
  };
  return band;
}
