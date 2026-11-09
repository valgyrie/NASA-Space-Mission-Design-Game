import * as THREE from 'three';
import { EARTH_MAP_ROWS } from './earthMap';

/**
 * The real Earth for the Mission Designer's sky: continents, deserts, forests and ice from Natural Earth
 * (public domain), drawn as a low-poly globe with one flat colour per triangle and a glowing atmosphere.
 */

export const SURFACES = ['.', 'f', 'r', 'b', 't', 's', 'm', 'd', 'i'] as const;
export type Surface = (typeof SURFACES)[number];

/** The map unpacked: 180 rows (90°N to 90°S) of 360 cells (180°W eastwards). */
const GRID: string[] = EARTH_MAP_ROWS.map((row) =>
  [...row.matchAll(/([a-z.])(\d*)/g)].map(([, c, n]) => c!.repeat(n ? Number(n) : 1)).join(''),
);

/** What covers the Earth at a latitude and longitude, in degrees (north and east positive). */
export function surfaceAt(lat: number, lon: number): Surface {
  const row = Math.min(179, Math.max(0, Math.floor(90 - lat)));
  const col = (((Math.floor(lon + 180) % 360) + 360) % 360);
  return GRID[row]![col] as Surface;
}

function isLandNear(lat: number, lon: number): boolean {
  for (const [dl, dn] of [[1.5, 0], [-1.5, 0], [0, 1.5], [0, -1.5]] as const) {
    if (surfaceAt(lat + dl, lon + dn) !== '.') return true;
  }
  return false;
}

const COLOUR: Record<Surface, number> = {
  '.': 0x1a4c96, // deep ocean
  f: 0x4c8a42, // temperate forest and farmland
  r: 0x2c7236, // rainforest
  b: 0x3a6447, // boreal forest
  t: 0x8e9a7c, // tundra
  s: 0xa3ad5e, // grassland and steppe
  m: 0x8a7a66, // mountains
  d: 0xdcc184, // desert
  i: 0xf1f5fa, // ice
};
const SHALLOW = new THREE.Color(0x2f7fc8);

/** Latitude and longitude, in degrees, of a direction from the centre. Longitude 0 faces +z, east is +x. */
export function latLonOf(p: THREE.Vector3): { lat: number; lon: number } {
  const n = p.clone().normalize();
  return { lat: THREE.MathUtils.radToDeg(Math.asin(n.y)), lon: THREE.MathUtils.radToDeg(Math.atan2(n.x, n.z)) };
}

/** A small fixed brightness change per triangle, so flat areas still show their facets. */
function jitter(i: number): number {
  const x = Math.sin(i * 12.9898) * 43758.5453;
  return 0.93 + (x - Math.floor(x)) * 0.12;
}

/** The globe: one flat-coloured triangle per patch of surface. */
function buildPlanet(radius: number, detail: number): THREE.Mesh {
  const geometry = new THREE.IcosahedronGeometry(radius, detail).toNonIndexed();
  const pos = geometry.getAttribute('position');
  const colours = new Float32Array(pos.count * 3);
  const centre = new THREE.Vector3();
  const v = new THREE.Vector3();
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i += 3) {
    centre.set(0, 0, 0);
    for (let k = 0; k < 3; k++) centre.add(v.fromBufferAttribute(pos, i + k));
    const { lat, lon } = latLonOf(centre);
    const surface = surfaceAt(lat, lon);
    if (surface === '.' && isLandNear(lat, lon)) c.copy(SHALLOW);
    else c.setHex(COLOUR[surface]);
    c.multiplyScalar(jitter(i / 3));
    for (let k = 0; k < 3; k++) c.toArray(colours, (i + k) * 3);
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colours, 3));
  const planet = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.85 }));
  planet.name = 'planet';
  return planet;
}

/** Thin clouds: a loose shell of soft white triangles, mostly where real weather is busiest (tropics, storm belts). */
function buildClouds(radius: number, detail: number): THREE.Mesh {
  const source = new THREE.IcosahedronGeometry(radius, detail).toNonIndexed();
  const pos = source.getAttribute('position');
  const kept: number[] = [];
  const centre = new THREE.Vector3();
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i += 3) {
    centre.set(0, 0, 0);
    for (let k = 0; k < 3; k++) centre.add(v.fromBufferAttribute(pos, i + k));
    const { lat, lon } = latLonOf(centre);
    const belt = Math.max(Math.exp(-((lat / 9) ** 2)), Math.exp(-(((Math.abs(lat) - 52) / 10) ** 2)));
    const swirl = Math.sin(lon * 0.11 + lat * 0.23) + Math.sin(lon * 0.05 - lat * 0.31) * 0.8;
    if (swirl + belt * 1.1 > 1.6) {
      for (let k = 0; k < 3; k++) kept.push(pos.getX(i + k), pos.getY(i + k), pos.getZ(i + k));
    }
  }
  source.dispose();
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(kept, 3));
  geometry.computeVertexNormals();
  const clouds = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true, transparent: true, opacity: 0.32, depthWrite: false }),
  );
  clouds.name = 'clouds';
  return clouds;
}

/** A blue glow round the edge of the planet, brightest at the rim like a real atmosphere seen from orbit. */
function buildAtmosphere(radius: number): THREE.Mesh {
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { colour: { value: new THREE.Color(0x5fb0ff) } },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vNormal = normalize(mat3(modelMatrix) * normal);
        vView = normalize(cameraPosition - world.xyz);
        gl_Position = projectionMatrix * viewMatrix * world;
      }`,
    fragmentShader: `
      uniform vec3 colour;
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        float rim = pow(clamp(1.0 + dot(vNormal, vView) * 1.6, 0.0, 1.0), 2.5);
        gl_FragColor = vec4(colour * rim, rim);
      }`,
  });
  const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.045, 64, 32), material);
  atmosphere.name = 'atmosphere';
  return atmosphere;
}

/**
 * The whole Earth, centred on its own origin, with the north pole along +y.
 * `spin` turns the surface and clouds (cloud layer drifts a little faster).
 */
export function buildEarth(radius: number): { earth: THREE.Group; spin(radians: number): void } {
  const surface = new THREE.Group();
  surface.add(buildPlanet(radius, 48));
  const clouds = buildClouds(radius * 1.012, 26);
  const earth = new THREE.Group();
  earth.add(surface, clouds, buildAtmosphere(radius));
  earth.name = 'earth';
  return {
    earth,
    spin(radians) {
      surface.rotation.y += radians;
      clouds.rotation.y += radians * 1.15;
    },
  };
}
