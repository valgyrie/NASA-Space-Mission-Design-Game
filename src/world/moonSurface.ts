import * as THREE from 'three';
import { boulderGeometry, rockMaterial } from './rocks';
import { type GroundSample, type LunarSite, curveDrop, groundAt } from './moonTerrain';

/**
 * A landing site's ground in 3D (moonTerrain.ts gives its shape): one round mesh centred on the landing spot whose
 * rings grow outwards (fine underfoot, coarse at the horizon, out to 30 km), curving down with the Moon so the
 * horizon is as close as it really is. Sunlight is baked in per vertex with a horizon search over the height field,
 * so crater floors and the far side of ridges lie in black shadow even far away; near the lander the scene's shadow
 * map adds the hardware's shadows. Regolith reflects light back towards the Sun (no limb darkening, flat look), so
 * the shader uses a Lommel–Seeliger term instead of plain Lambert. Boulders and stones are instanced.
 */

const RINGS = 230;
const SEGMENTS = 256;
const INNER = 0.4;
const OUTER = 30_000;

export interface LunarSurface {
  group: THREE.Group;
  /** Ground height under (x, z), with the Moon's curve. */
  heightAt(x: number, z: number): number;
  dispose(): void;
}

/** A small grid of heights for the shadow search: fine near the landing spot, coarse to the horizon. */
class HeightGrid {
  readonly data: Float32Array;
  constructor(readonly site: LunarSite, readonly half: number, readonly n: number, detail: number) {
    this.data = new Float32Array(n * n);
    const s: GroundSample = { height: 0, albedo: 1 };
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const x = -half + (i / (n - 1)) * 2 * half;
        const z = -half + (j / (n - 1)) * 2 * half;
        this.data[j * n + i] = groundAt(site, x, z, detail, s).height - curveDrop(Math.hypot(x, z));
      }
    }
  }
  /** Bilinear height, or NaN outside. */
  at(x: number, z: number): number {
    const f = (this.n - 1) / (2 * this.half);
    const u = (x + this.half) * f;
    const v = (z + this.half) * f;
    if (u < 0 || v < 0 || u >= this.n - 1 || v >= this.n - 1) return NaN;
    const i = Math.floor(u);
    const j = Math.floor(v);
    const fu = u - i;
    const fv = v - j;
    const d = this.data;
    const k = j * this.n + i;
    return (d[k]! * (1 - fu) + d[k + 1]! * fu) * (1 - fv) + (d[k + this.n]! * (1 - fu) + d[k + this.n + 1]! * fu) * fv;
  }
}

/** Fine regolith: a tiling albedo speckle and a normal map of tiny pits and clods, drawn on a canvas once. */
let regolith: { map: THREE.Texture; normal: THREE.Texture } | null = null;
function regolithTextures(): { map: THREE.Texture; normal: THREE.Texture } {
  if (regolith) return regolith;
  const n = 256;
  const h = new Float32Array(n * n);
  let seed = 11;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  // Overlapping soft bumps and little pits, wrapped so the tile repeats seamlessly.
  for (let k = 0; k < 2600; k++) {
    const cx = rand() * n;
    const cz = rand() * n;
    const r = 1 + rand() ** 3 * 9;
    const pit = rand() < 0.35;
    const a = (pit ? -1 : 0.6) * (0.4 + rand());
    const R = Math.ceil(r * 1.6);
    for (let dz = -R; dz <= R; dz++) {
      for (let dx = -R; dx <= R; dx++) {
        const d = Math.hypot(dx, dz) / r;
        if (d > 1.6) continue;
        const x = (Math.floor(cx) + dx + n) % n;
        const z = (Math.floor(cz) + dz + n) % n;
        h[z * n + x]! += pit ? a * (d < 1 ? 1 - d * d : -0.35 * (1.6 - d)) : a * Math.exp(-d * d * 2);
      }
    }
  }
  const colour = document.createElement('canvas');
  const normal = document.createElement('canvas');
  colour.width = colour.height = normal.width = normal.height = n;
  const cg = colour.getContext('2d');
  const ng = normal.getContext('2d');
  if (cg && ng) {
    const ci = cg.createImageData(n, n);
    const ni = ng.createImageData(n, n);
    for (let z = 0; z < n; z++) {
      for (let x = 0; x < n; x++) {
        const k = z * n + x;
        const hx = h[z * n + ((x + 1) % n)]! - h[z * n + ((x - 1 + n) % n)]!;
        const hz = h[((z + 1) % n) * n + x]! - h[((z - 1 + n) % n) * n + x]!;
        const len = Math.hypot(hx * 0.6, hz * 0.6, 1);
        ni.data[k * 4] = (0.5 - (hx * 0.6) / len / 2) * 255;
        ni.data[k * 4 + 1] = (0.5 + (hz * 0.6) / len / 2) * 255;
        ni.data[k * 4 + 2] = (0.5 + 0.5 / len) * 255;
        ni.data[k * 4 + 3] = 255;
        // Speckle: brighter grains on the bumps, darker in the pits, plus salt-and-pepper glassy bits.
        const v = 150 + h[k]! * 18 + (rand() - 0.5) * 34;
        ci.data[k * 4] = ci.data[k * 4 + 1] = ci.data[k * 4 + 2] = Math.max(60, Math.min(230, v));
        ci.data[k * 4 + 3] = 255;
      }
    }
    cg.putImageData(ci, 0, 0);
    ng.putImageData(ni, 0, 0);
  }
  const map = new THREE.CanvasTexture(colour);
  map.colorSpace = THREE.SRGBColorSpace;
  const normalMap = new THREE.CanvasTexture(normal);
  for (const t of [map, normalMap]) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 8;
  }
  regolith = { map, normal: normalMap };
  return regolith;
}

/** Regolith: grey, matt, lit with a Lommel–Seeliger term and the baked sunlight attribute. */
function groundMaterial(tint: THREE.Color): THREE.MeshStandardMaterial {
  const { map, normal } = regolithTextures();
  const material = new THREE.MeshStandardMaterial({ color: tint, map, normalMap: normal, normalScale: new THREE.Vector2(0.9, 0.9), roughness: 1, metalness: 0, vertexColors: true });
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float sunlit;\nvarying float vSunlit;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvSunlit = sunlit;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vSunlit;')
      .replace(
        '#include <lights_fragment_begin>',
        `#include <lights_fragment_begin>
        #if NUM_DIR_LIGHTS > 0
        {
          float mu0 = max(dot(normal, directionalLights[0].direction), 0.0);
          float mu = max(dot(normal, normalize(vViewPosition)), 0.08);
          float ls = min(2.0 / (mu0 + mu + 0.1), 4.0) * 0.55;
          reflectedLight.directDiffuse *= vSunlit * ls;
          reflectedLight.directSpecular *= 0.0;
        }
        #endif`,
      );
  };
  material.customProgramCacheKey = () => 'leap-regolith';
  return material;
}

/** Shadow search: is the Sun (slope `tanE`, direction `sx, sz`) above the local horizon at (x, z)? 0–1. */
function sunlight(fine: HeightGrid, coarse: HeightGrid, x: number, z: number, y0: number, sx: number, sz: number, tanE: number, reach: number): number {
  let worst = -Infinity;
  for (let t = 0.6; t < reach; t *= 1.09) {
    const px = x + sx * t;
    const pz = z + sz * t;
    let y = fine.at(px, pz);
    if (Number.isNaN(y)) y = coarse.at(px, pz);
    if (Number.isNaN(y)) break;
    const a = (y - y0) / t;
    if (a > worst) worst = a;
  }
  // The Sun is half a degree wide: a soft edge.
  return Math.min(1, Math.max(0, (tanE - worst) / 0.009 + 0.5));
}

/**
 * Build the site's ground. `sun`: direction towards the Sun (y up). `tint`: the regolith's colour (mare basalt is
 * darker and a little warm; highland at the pole paler and greyer).
 */
export function buildLunarSurface(site: LunarSite, sun: THREE.Vector3, seed = 1): LunarSurface {
  void seed;
  const group = new THREE.Group();
  group.name = 'lunar-surface';
  const fine = new HeightGrid(site, 1_200, 384, 4);
  const coarse = new HeightGrid(site, 16_000, 320, 60);
  const tanE = sun.y / Math.max(1e-6, Math.hypot(sun.x, sun.z));
  const flat = Math.hypot(sun.x, sun.z) || 1;
  const sx = sun.x / flat;
  const sz = sun.z / flat;

  const count = 1 + RINGS * SEGMENTS;
  const positions = new Float32Array(count * 3);
  const colours = new Float32Array(count * 3);
  const uvs = new Float32Array(count * 2);
  const lit = new Float32Array(count);
  const s: GroundSample = { height: 0, albedo: 1 };
  const grow = Math.pow(OUTER / INNER, 1 / (RINGS - 1));
  const put = (k: number, x: number, z: number, spacing: number) => {
    groundAt(site, x, z, spacing * 2.5, s);
    const d = Math.hypot(x, z);
    const y = s.height - curveDrop(d);
    positions.set([x, y, z], k * 3);
    // Fresh ejecta paler, the far ground a touch darker (seen through no air, only the fine detail fades).
    colours.set([s.albedo, s.albedo, s.albedo], k * 3);
    uvs.set([x / 1.6, z / 1.6], k * 2);
    lit[k] = sunlight(fine, coarse, x, z, y + 0.05 + spacing * 0.15, sx, sz, tanE, site === 'southPole' ? 14_000 : 6_000);
  };
  put(0, 0, 0, INNER);
  for (let i = 0; i < RINGS; i++) {
    const r = INNER * Math.pow(grow, i);
    const spacing = r * (grow - 1);
    for (let j = 0; j < SEGMENTS; j++) {
      // Every other ring turned half a step, so the triangles stay even.
      const a = ((j + (i % 2) * 0.5) / SEGMENTS) * Math.PI * 2;
      put(1 + i * SEGMENTS + j, Math.cos(a) * r, Math.sin(a) * r, spacing);
    }
  }
  const index: number[] = [];
  for (let j = 0; j < SEGMENTS; j++) index.push(0, 1 + ((j + 1) % SEGMENTS), 1 + j);
  for (let i = 0; i < RINGS - 1; i++) {
    const a0 = 1 + i * SEGMENTS;
    const b0 = a0 + SEGMENTS;
    const odd = i % 2 === 1;
    for (let j = 0; j < SEGMENTS; j++) {
      const j1 = (j + 1) % SEGMENTS;
      const a = a0 + j;
      const a1 = a0 + j1;
      const b = b0 + j;
      const b1 = b0 + j1;
      if (odd) index.push(a, a1, b1, a, b1, b);
      else index.push(a, a1, b, a1, b1, b);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colours, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.setAttribute('sunlit', new THREE.BufferAttribute(lit, 1));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  const tint = site === 'tranquility' ? new THREE.Color(0.62, 0.6, 0.57) : new THREE.Color(0.7, 0.7, 0.69);
  const ground = new THREE.Mesh(geometry, groundMaterial(tint));
  ground.receiveShadow = true;
  ground.name = 'ground';
  group.add(ground);

  const heightAt = (x: number, z: number) => groundAt(site, x, z, 0.3, s).height - curveDrop(Math.hypot(x, z));

  // Rocks: a scatter of stones near the landing spot, a few boulders further out (more and bigger at the pole).
  const rocks = new THREE.Group();
  const material = rockMaterial();
  let rs = 97;
  const rand = () => (rs = (rs * 16807) % 2147483647) / 2147483647;
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const sets: [number, number, number, number][] = site === 'tranquility'
    ? [[700, 3, 70, 0.05], [90, 6, 350, 0.25], [12, 9, 700, 0.6]]
    : [[900, 3, 80, 0.07], [220, 6, 500, 0.35], [40, 9, 1200, 1.0]];
  for (const [n, geoSeed, reach, size] of sets) {
    const mesh = new THREE.InstancedMesh(boulderGeometry(geoSeed), material, n);
    const colour = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const r = 6 + reach * Math.sqrt(rand());
      const a = rand() * Math.PI * 2;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const k = size * (0.4 + rand() ** 2 * 1.6);
      e.set(rand() * 0.4, rand() * Math.PI * 2, rand() * 0.4);
      m.compose(new THREE.Vector3(x, heightAt(x, z) - k * 0.35, z), q.setFromEuler(e), new THREE.Vector3(k, k * (0.6 + rand() * 0.4), k));
      mesh.setMatrixAt(i, m);
      const g = 0.32 + rand() * 0.12;
      mesh.setColorAt(i, colour.setRGB(g, g * 0.98, g * 0.95));
    }
    mesh.castShadow = size >= 0.2;
    mesh.receiveShadow = true;
    rocks.add(mesh);
  }
  group.add(rocks);

  return {
    group,
    heightAt,
    dispose() {
      geometry.dispose();
      (ground.material as THREE.Material).dispose();
      rocks.traverse((o) => {
        if (o instanceof THREE.InstancedMesh) o.geometry.dispose();
      });
      material.dispose();
    },
  };
}
