import * as THREE from 'three';
import { SEA, cloudPixels, earthPixels } from './earthTexture';

/**
 * The real Earth, seen from space: continents, deserts, forests and ice from Natural Earth (public domain)
 * on a smooth globe with rounded coastlines, soft clouds and a glowing atmosphere.
 */

export { SURFACES, type Surface, surfaceAt } from './earthTexture';

/** Latitude and longitude, in degrees, of a direction from the centre. Longitude 0 faces +z, east is +x. */
export function latLonOf(p: THREE.Vector3): { lat: number; lon: number } {
  const n = p.clone().normalize();
  return { lat: THREE.MathUtils.radToDeg(Math.asin(n.y)), lon: THREE.MathUtils.radToDeg(Math.atan2(n.x, n.z)) };
}

/** Size of the surface picture: about 5 pixels per cell of the map, enough for smooth coasts. */
const SURFACE_SIZE = { width: 2048, height: 1024 };
const CLOUD_SIZE = { width: 768, height: 384 };

function picture(data: Uint8Array, size: { width: number; height: number }, colour: boolean): THREE.DataTexture {
  const texture = new THREE.DataTexture(data, size.width, size.height, THREE.RGBAFormat);
  if (colour) texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

/** Smooth 0–1 noise on the globe, for the shaders: `earthNoise(point on the unit sphere × how fine)`. */
const NOISE = `
        float earthHash(vec3 p) {
          p = fract(p * 0.3183099 + 0.1);
          p *= 17.0;
          return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
        }
        float earthNoise(vec3 p) {
          vec3 i = floor(p);
          vec3 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(
            mix(mix(earthHash(i), earthHash(i + vec3(1, 0, 0)), f.x), mix(earthHash(i + vec3(0, 1, 0)), earthHash(i + vec3(1, 1, 0)), f.x), f.y),
            mix(mix(earthHash(i + vec3(0, 0, 1)), earthHash(i + vec3(1, 0, 1)), f.x), mix(earthHash(i + vec3(0, 1, 1)), earthHash(i + vec3(1, 1, 1)), f.x), f.y),
            f.z);
        }`;

/** The pictures take a moment to work out, so every Earth in the game shares one set, made when first needed. */
let pictures: { surface: THREE.DataTexture; clouds: THREE.DataTexture } | null = null;
function earthPictures(): { surface: THREE.DataTexture; clouds: THREE.DataTexture } {
  pictures ??= {
    surface: picture(earthPixels(SURFACE_SIZE.width, SURFACE_SIZE.height), SURFACE_SIZE, true),
    clouds: picture(cloudPixels(CLOUD_SIZE.width, CLOUD_SIZE.height), CLOUD_SIZE, false),
  };
  return pictures;
}

/**
 * The globe: a smooth sphere. The picture holds the land's colour and how much land is around each spot;
 * the shader cuts that at one half, so coasts are rounded and stay sharp however close the camera comes.
 * The sea is deep blue, paler on the shelf near land, and shinier than the land so the Sun glints on it.
 */
function buildPlanet(radius: number): THREE.Mesh {
  const material = new THREE.MeshStandardMaterial({ map: earthPictures().surface, roughness: 0.9 });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.seaDeep = { value: new THREE.Color(SEA.deep) };
    shader.uniforms.seaShallow = { value: new THREE.Color(SEA.shallow) };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vEarthPoint;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvEarthPoint = normalize(position);');
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform vec3 seaDeep;
        uniform vec3 seaShallow;
        varying vec3 vEarthPoint;
${NOISE}`,
      )
      .replace(
        '#include <map_fragment>',
        `vec4 earthTexel = texture2D(map, vMapUv);
        float earthEdge = clamp(fwidth(earthTexel.a), 0.004, 0.2);
        float earthLand = smoothstep(0.5 - earthEdge, 0.5 + earthEdge, earthTexel.a);
        vec3 earthSea = mix(seaDeep, seaShallow, smoothstep(0.06, 0.5, earthTexel.a));
        // A little patchiness, so plains and open sea are not one flat colour.
        float earthPatch = earthNoise(vEarthPoint * 24.0) * 0.65 + earthNoise(vEarthPoint * 75.0) * 0.35;
        diffuseColor.rgb *= mix(earthSea, earthTexel.rgb, earthLand) * (0.9 + 0.2 * earthPatch * mix(0.45, 1.0, earthLand));`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        '#include <roughnessmap_fragment>\nroughnessFactor = mix(0.5, roughnessFactor, earthLand);',
      );
  };
  const planet = new THREE.Mesh(new THREE.SphereGeometry(radius, 256, 128), material);
  planet.name = 'planet';
  return planet;
}

/**
 * Thin clouds: a soft white shell just above the surface, see-through where the sky is clear. The shader
 * cuts the cloud picture at its edge value and frays it with fine noise, so clouds keep their shape close up.
 */
function buildClouds(radius: number): THREE.Mesh {
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    alphaMap: earthPictures().clouds,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
    roughness: 1,
  });
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vEarthPoint;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvEarthPoint = normalize(position);');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vEarthPoint;${NOISE}`)
      .replace(
        '#include <alphamap_fragment>',
        `float cloudCover = texture2D(alphaMap, vAlphaMapUv).g
          + (earthNoise(vEarthPoint * 34.0) - 0.5) * 0.16 + (earthNoise(vEarthPoint * 110.0) - 0.5) * 0.07;
        diffuseColor.a *= smoothstep(0.47, 0.7, cloudCover);`,
      );
  };
  const clouds = new THREE.Mesh(new THREE.SphereGeometry(radius, 128, 64), material);
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
  const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.045, 256, 128), material);
  atmosphere.name = 'atmosphere';
  return atmosphere;
}

/**
 * The whole Earth, centred on its own origin, with the north pole along +y.
 * `spin` turns the surface and clouds (cloud layer drifts a little faster).
 */
export function buildEarth(radius: number): { earth: THREE.Group; spin(radians: number): void } {
  const surface = new THREE.Group();
  surface.add(buildPlanet(radius));
  const clouds = buildClouds(radius * 1.012);
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
