import * as THREE from 'three';

/**
 * The whole Moon, from NASA's CGI Moon Kit (Scientific Visualization Studio, public domain): the LRO Camera's
 * colour mosaic and a normal map made from LOLA's elevation (scripts/blender/build_moon.py →
 * public/textures/moon/). No atmosphere, no glow: hard sunlight on grey regolith.
 *
 * Orientation: north pole along +y, 0° longitude (the middle of the near side, which faces Earth) along +x,
 * east towards -z. `moonDirection(lat, lon)` gives the outward direction of a place in that frame.
 * The textures load once and are shared by every globe; never dispose them.
 */

let shared: { colour: THREE.Texture; normal: THREE.Texture } | null = null;

function textures(): { colour: THREE.Texture; normal: THREE.Texture } {
  if (shared) return shared;
  const loader = new THREE.TextureLoader();
  const base = import.meta.env.BASE_URL + 'textures/moon/';
  const colour = loader.load(base + 'colour.jpg');
  colour.colorSpace = THREE.SRGBColorSpace;
  colour.anisotropy = 4;
  const normal = loader.load(base + 'normal.jpg');
  normal.anisotropy = 4;
  shared = { colour, normal };
  return shared;
}

/** A tiling height map of craters (power-law sizes, raised rims), drawn on a canvas once: fine relief for close views. */
let craterTile: THREE.Texture | null = null;
function craterDetail(): THREE.Texture {
  if (craterTile) return craterTile;
  const n = 512;
  const h = new Float32Array(n * n);
  let seed = 5;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let k = 0; k < 1400; k++) {
    const cx = rand() * n;
    const cz = rand() * n;
    const r = 1.5 + rand() ** 4 * 60;
    const depth = r * (0.12 + rand() * 0.12);
    const R = Math.ceil(r * 2.2);
    for (let dz = -R; dz <= R; dz++) {
      for (let dx = -R; dx <= R; dx++) {
        const d = Math.hypot(dx, dz) / r;
        if (d > 2.2) continue;
        const x = (Math.floor(cx) + dx + n * 4) % n;
        const z = (Math.floor(cz) + dz + n * 4) % n;
        const rim = depth * 0.25;
        h[z * n + x]! += d < 1 ? Math.max(rim + depth * (d * d - 1), rim - depth * 0.8) : rim * Math.exp(-(d - 1) * (d - 1) * 8);
      }
    }
  }
  let lo = Infinity;
  let hi = -Infinity;
  for (const v of h) {
    lo = Math.min(lo, v);
    hi = Math.max(hi, v);
  }
  const data = new Uint8Array(n * n * 4);
  for (let i = 0; i < n * n; i++) {
    const v = Math.round(((h[i]! - lo) / (hi - lo || 1)) * 255);
    data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = v;
    data[i * 4 + 3] = 255;
  }
  const t = new THREE.DataTexture(data, n, n);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.needsUpdate = true;
  craterTile = t;
  return t;
}

/**
 * Add small craters on top of the NASA maps for close views from low orbit, where a 4k map is too coarse: a crater
 * height tile projected from three sides in the globe's own frame (no stretching at the poles), at two scales, used
 * as a bump map. `kmPerTile`: size of one tile at the larger scale, in the globe's units.
 */
function addCraterDetail(material: THREE.MeshStandardMaterial, kmPerTile: number): void {
  const tile = craterDetail();
  material.onBeforeCompile = (shader) => {
    shader.uniforms.craterTile = { value: tile };
    shader.uniforms.craterScale = { value: 1 / kmPerTile };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vGlobe;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvGlobe = position;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform sampler2D craterTile;\nuniform float craterScale;\nvarying vec3 vGlobe;\n' +
        'float craterAt(vec3 p, vec3 w) { return texture2D(craterTile, p.yz).r * w.x + texture2D(craterTile, p.xz).r * w.y + texture2D(craterTile, p.xy).r * w.z; }')
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
        {
          vec3 w = pow(abs(normalize(vGlobe)), vec3(4.0));
          w /= w.x + w.y + w.z;
          vec3 p = vGlobe * craterScale;
          float h = craterAt(p, w) + 0.45 * craterAt(p * 4.7 + 0.37, w);
          vec2 dh = vec2(dFdx(h), dFdy(h)) * 1.4;
          vec3 sx = normalize(dFdx(-vViewPosition));
          vec3 sy = normalize(dFdy(-vViewPosition));
          vec3 r1 = cross(sy, normal);
          vec3 r2 = cross(normal, sx);
          float det = dot(sx, r1);
          normal = normalize(abs(det) * normal - sign(det) * (dh.x * r1 + dh.y * r2));
        }`,
      )
      // Regolith scatters light back towards the Sun: Lommel–Seeliger, so the disc stays bright to its edge.
      .replace(
        '#include <lights_fragment_begin>',
        `#include <lights_fragment_begin>
        #if NUM_DIR_LIGHTS > 0
        {
          float mu0 = max(dot(normal, directionalLights[0].direction), 0.0);
          float mu = max(dot(normal, normalize(vViewPosition)), 0.05);
          reflectedLight.directDiffuse *= min(2.0 / (mu0 + mu + 0.1), 4.0) * 0.55;
        }
        #endif`,
      );
  };
  material.customProgramCacheKey = () => 'leap-moon-detail';
}

/** Outward unit vector of a place on the Moon (degrees, east positive) in the globe's own frame. */
export function moonDirection(latDeg: number, lonDeg: number): THREE.Vector3 {
  const lat = THREE.MathUtils.degToRad(latDeg);
  const lon = THREE.MathUtils.degToRad(lonDeg);
  return new THREE.Vector3(Math.cos(lat) * Math.cos(lon), Math.sin(lat), -Math.cos(lat) * Math.sin(lon));
}

/**
 * The Moon, `radius` units, centred on its origin. `segments` round the equator. `detailTile`: add fine craters for
 * close views from low orbit, one tile this many units across (0: none).
 */
export function buildMoon(radius: number, segments = 128, detailTile = 0): THREE.Mesh {
  const { colour, normal } = textures();
  const material = new THREE.MeshStandardMaterial({
    map: colour,
    normalMap: normal,
    // The map's relief is exaggerated four times so 8 bits keep the gentle slopes; about twice the real relief reads
    // well from orbit.
    normalScale: new THREE.Vector2(0.55, 0.55),
    roughness: 1,
    metalness: 0,
  });
  material.name = 'moon';
  if (detailTile > 0) addCraterDetail(material, detailTile);
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, segments, segments / 2), material);
  mesh.name = 'moon';
  return mesh;
}

/** Free a globe's geometry and material (the textures stay shared). */
export function disposeMoon(mesh: THREE.Mesh): void {
  mesh.geometry.dispose();
  (mesh.material as THREE.Material).dispose();
}
