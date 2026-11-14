import * as THREE from 'three';
import { SEA, cloudPixels, earthPixels } from './earthTexture';

/**
 * The real Earth, seen from space. Photographs from NASA GIBS (Blue Marble: Next Generation for the colours,
 * one real day of VIIRS clouds, OpenStreetMap water for the Sun's glint, VIIRS Black Marble city lights; see
 * scripts/build_earth_textures.py) load in the background. Until they arrive, or if they fail, the globe uses
 * the pictures baked from the 1° game map (earthTexture.ts), so it is never blank.
 *
 * Lit by the scene's first DirectionalLight (the Sun): a soft day/night line, glint only on water, clouds with
 * shadows, city lights on the night side and a thin blue atmosphere at the rim.
 */

export { SURFACES, type Surface, surfaceAt } from './earthTexture';

/** Latitude and longitude, in degrees, of a direction from the centre. Longitude 0 faces +z, east is +x. */
export function latLonOf(p: THREE.Vector3): { lat: number; lon: number } {
  const n = p.clone().normalize();
  return { lat: THREE.MathUtils.radToDeg(Math.asin(n.y)), lon: THREE.MathUtils.radToDeg(Math.atan2(n.x, n.z)) };
}

/** Size of the baked fallback picture: about 5 pixels per cell of the map, enough for smooth coasts. */
const SURFACE_SIZE = { width: 2048, height: 1024 };
const CLOUD_SIZE = { width: 768, height: 384 };
/** Height of the cloud shell and the top of the atmosphere, as a share of the radius. */
const CLOUD_HEIGHT = 0.008;
const ATMOSPHERE_HEIGHT = 0.028;

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

/**
 * Pictures and switches shared by every Earth in the game (the same uniform objects sit in every material,
 * so when a photograph arrives all globes change at once).
 */
interface Shared {
  colour: THREE.IUniform<THREE.Texture>;
  clouds: THREE.IUniform<THREE.Texture>;
  water: THREE.IUniform<THREE.Texture>;
  lights: THREE.IUniform<THREE.Texture>;
  /** 1 once the colour photograph and water mask are in. */
  photo: THREE.IUniform<number>;
  /** 1 once the cloud photograph is in. */
  photoClouds: THREE.IUniform<number>;
  /** 1 once the city lights are in. */
  photoLights: THREE.IUniform<number>;
}
let shared: Shared | null = null;

function loadPhoto(file: string, colour: boolean, done: (t: THREE.Texture) => void): void {
  const url = `${import.meta.env.BASE_URL}textures/earth/${file}`;
  new THREE.TextureLoader().load(
    url,
    (texture) => {
      texture.colorSpace = colour ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      texture.wrapS = THREE.RepeatWrapping;
      texture.anisotropy = 8;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.generateMipmaps = true;
      texture.needsUpdate = true;
      done(texture);
    },
    undefined,
    () => {
      // Keep the baked picture: the game still works without the photographs.
    },
  );
}

function earthShared(): Shared {
  if (shared) return shared;
  const surface = picture(earthPixels(SURFACE_SIZE.width, SURFACE_SIZE.height), SURFACE_SIZE, true);
  const clouds = picture(cloudPixels(CLOUD_SIZE.width, CLOUD_SIZE.height), CLOUD_SIZE, false);
  const s: Shared = {
    colour: { value: surface },
    clouds: { value: clouds },
    water: { value: surface },
    lights: { value: clouds },
    photo: { value: 0 },
    photoClouds: { value: 0 },
    photoLights: { value: 0 },
  };
  shared = s;
  if (typeof document !== 'undefined') {
    let colour: THREE.Texture | null = null;
    let water: THREE.Texture | null = null;
    const both = () => {
      if (!colour || !water) return;
      s.colour.value = colour;
      s.water.value = water;
      s.photo.value = 1;
    };
    loadPhoto('colour.jpg', true, (t) => ((colour = t), both()));
    loadPhoto('water.png', false, (t) => ((water = t), both()));
    loadPhoto('clouds.jpg', false, (t) => {
      s.clouds.value = t;
      s.photoClouds.value = 1;
    });
    loadPhoto('lights.jpg', false, (t) => {
      s.lights.value = t;
      s.photoLights.value = 1;
    });
  }
  return s;
}

/** Per-mesh uniforms: where the Sun and the eye are in the mesh's own frame, and how bright to draw. */
interface View {
  sun: THREE.IUniform<THREE.Vector3>;
  eye: THREE.IUniform<THREE.Vector3>;
  power: THREE.IUniform<number>;
}

const scratch = { a: new THREE.Vector3(), b: new THREE.Vector3(), m: new THREE.Matrix4() };

/** The Sun of a scene: its first DirectionalLight, cached on the scene. */
function sunOf(scene: THREE.Scene): THREE.DirectionalLight | null {
  const cached = scene.userData.earthSun as THREE.DirectionalLight | undefined;
  if (cached && cached.parent) return cached;
  let found: THREE.DirectionalLight | null = null;
  scene.traverse((o) => {
    if (!found && o instanceof THREE.DirectionalLight) found = o;
  });
  scene.userData.earthSun = found ?? undefined;
  return found;
}

/** Before each draw, work out the Sun's and the camera's direction in the mesh's frame. */
function track(mesh: THREE.Mesh, view: View, fixedSun: { dir: THREE.Vector3 | null }): void {
  mesh.onBeforeRender = (renderer, scene, camera) => {
    const inverse = scratch.m.copy(mesh.matrixWorld).invert();
    if (fixedSun.dir) {
      view.sun.value.copy(fixedSun.dir).transformDirection(inverse);
    } else {
      const sun = sunOf(scene);
      if (sun) {
        sun.getWorldPosition(scratch.a);
        sun.target.getWorldPosition(scratch.b);
        view.sun.value.copy(scratch.a.sub(scratch.b)).transformDirection(inverse);
      } else {
        // No Sun in the scene: light the side facing the camera.
        view.sun.value.copy(camera.getWorldPosition(scratch.a)).applyMatrix4(inverse).normalize();
      }
    }
    view.eye.value.copy(camera.getWorldPosition(scratch.a)).applyMatrix4(inverse);
    view.power.value = renderer.toneMapping === THREE.NoToneMapping ? 1.25 : 2.4;
  };
}

const VERTEX = `
  varying vec2 vUv;
  varying vec3 vPoint;
  void main() {
    vUv = uv;
    vPoint = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`;

/** East and north on the unit sphere, to move a picture coordinate along the ground. */
const GEO = `
  vec2 groundShift(vec3 n, vec3 dir) {
    vec3 east = normalize(vec3(n.z, 0.0, -n.x) + vec3(1e-5, 0.0, 0.0));
    vec3 north = cross(n, east);
    float cosLat = max(length(n.xz), 0.05);
    return vec2(dot(dir, east) / (6.2831853 * cosLat), dot(dir, north) / 3.1415927);
  }`;

/** Rayleigh blue of the sky seen edge on, and the warm light along the day/night line. */
const RAYLEIGH = 'vec3(0.28, 0.55, 1.0)';

function planetMaterial(radius: number, s: Shared, view: View, cloudShift: THREE.IUniform<number>): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      colourMap: s.colour,
      cloudMap: s.clouds,
      waterMap: s.water,
      lightsMap: s.lights,
      photo: s.photo,
      photoClouds: s.photoClouds,
      photoLights: s.photoLights,
      sun: view.sun,
      eye: view.eye,
      power: view.power,
      radius: { value: radius },
      cloudShift,
      seaDeep: { value: new THREE.Color(SEA.deep) },
      seaShallow: { value: new THREE.Color(SEA.shallow) },
    },
    vertexShader: VERTEX,
    fragmentShader: `
      uniform sampler2D colourMap;
      uniform sampler2D cloudMap;
      uniform sampler2D waterMap;
      uniform sampler2D lightsMap;
      uniform float photo;
      uniform float photoClouds;
      uniform float photoLights;
      uniform vec3 sun;
      uniform vec3 eye;
      uniform float power;
      uniform float radius;
      uniform float cloudShift;
      uniform vec3 seaDeep;
      uniform vec3 seaShallow;
      varying vec2 vUv;
      varying vec3 vPoint;
      ${GEO}
      float cloudAt(vec2 uv) {
        // The photographs start at 180°W, the sphere's seam is at 90°W: a quarter turn.
        if (photoClouds > 0.5) return texture2D(cloudMap, uv + vec2(0.25, 0.0)).r;
        return smoothstep(0.47, 0.7, texture2D(cloudMap, uv).g) * 0.8;
      }
      void main() {
        vec3 n = normalize(vPoint);
        vec3 l = normalize(sun);
        vec3 v = normalize(eye - vPoint);
        float ndl = dot(n, l);
        float ndv = max(dot(n, v), 0.0);

        vec3 albedo;
        float water;
        if (photo > 0.5) {
          vec2 uv = vUv + vec2(0.25, 0.0);
          albedo = texture2D(colourMap, uv).rgb;
          water = texture2D(waterMap, uv).r;
          // Blue Marble's open sea is nearly black-blue; lift it a touch towards the real deep-ocean colour.
          albedo = mix(albedo, albedo * vec3(0.9, 1.05, 1.25) + vec3(0.0, 0.004, 0.012), water);
        } else {
          vec4 texel = texture2D(colourMap, vUv);
          float edge = clamp(fwidth(texel.a), 0.004, 0.2);
          float land = smoothstep(0.5 - edge, 0.5 + edge, texel.a);
          vec3 sea = mix(seaDeep, seaShallow, smoothstep(0.06, 0.5, texel.a)) * 0.35;
          albedo = mix(sea, texel.rgb * 0.8, land);
          water = 1.0 - land;
        }

        // Cloud shadows: the cloud a little towards the Sun from here.
        vec3 toward = l - n * ndl;
        vec2 shadowUv = vUv + vec2(-cloudShift, 0.0) + groundShift(n, toward) * ${CLOUD_HEIGHT.toFixed(4)} / max(ndl, 0.15);
        float shade = 1.0 - 0.55 * cloudAt(shadowUv);
        float overhead = cloudAt(vUv + vec2(-cloudShift, 0.0));

        // Soft day/night line, reddened where the light skims through the atmosphere.
        float lit = smoothstep(-0.06, 0.12, ndl) * clamp(ndl * 0.9 + 0.1, 0.0, 1.0);
        vec3 sunColour = mix(vec3(1.0, 0.55, 0.32), vec3(1.0, 0.97, 0.92), smoothstep(0.0, 0.35, ndl));
        vec3 colour = albedo * sunColour * lit * shade * power;

        // Glint: the Sun mirrored in the sea, only on water and not under cloud.
        vec3 h = normalize(l + v);
        float nh = max(dot(n, h), 0.0);
        float fresnel = 0.02 + 0.98 * pow(1.0 - max(dot(h, v), 0.0), 5.0);
        float glint = (pow(nh, 900.0) * 2.5 + pow(nh, 90.0) * 0.12) * (0.3 + fresnel * 3.0);
        colour += vec3(1.0, 0.93, 0.8) * glint * water * (1.0 - overhead) * smoothstep(0.0, 0.1, ndl) * power * 0.3;

        // Air seen at a slant: blue haze growing towards the rim on the day side.
        float slant = pow(1.0 - ndv, 2.5);
        float dayAir = smoothstep(-0.2, 0.4, ndl);
        colour = mix(colour, ${RAYLEIGH} * 0.5 * power * dayAir, slant * 0.55);
        colour += ${RAYLEIGH} * 0.025 * power * dayAir;

        // City lights where it is dark.
        if (photoLights > 0.5) {
          float city = texture2D(lightsMap, vUv + vec2(0.25, 0.0)).r;
          float night = 1.0 - smoothstep(-0.12, 0.06, ndl);
          colour += vec3(1.0, 0.72, 0.42) * pow(city, 1.6) * night * (1.0 - overhead * 0.7) * 1.4;
        }

        gl_FragColor = vec4(colour, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
}

function cloudMaterial(s: Shared, view: View): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: { cloudMap: s.clouds, photoClouds: s.photoClouds, sun: view.sun, eye: view.eye, power: view.power },
    transparent: true,
    depthWrite: false,
    vertexShader: VERTEX,
    fragmentShader: `
      uniform sampler2D cloudMap;
      uniform float photoClouds;
      uniform vec3 sun;
      uniform vec3 eye;
      uniform float power;
      varying vec2 vUv;
      varying vec3 vPoint;
      void main() {
        float cover;
        if (photoClouds > 0.5) {
          cover = texture2D(cloudMap, vUv + vec2(0.25, 0.0)).r;
          cover = smoothstep(0.04, 1.0, cover) * 0.95;
        } else {
          cover = smoothstep(0.47, 0.7, texture2D(cloudMap, vUv).g) * 0.8;
        }
        vec3 n = normalize(vPoint);
        vec3 l = normalize(sun);
        vec3 v = normalize(eye - vPoint);
        float ndl = dot(n, l);
        float lit = smoothstep(-0.08, 0.15, ndl) * clamp(ndl * 0.8 + 0.2, 0.0, 1.0);
        vec3 sunColour = mix(vec3(1.0, 0.6, 0.38), vec3(1.0, 0.98, 0.95), smoothstep(0.0, 0.3, ndl));
        // Thin clouds are greyer, thick ones bright white; a little blue sky light in the shade.
        vec3 colour = vec3(0.92) * mix(0.75, 1.0, cover) * sunColour * lit * power + vec3(0.02, 0.03, 0.05) * power;
        // Seen edge-on near the rim, clouds look thicker.
        float ndv = max(dot(n, v), 0.0);
        float alpha = clamp(cover * (1.0 + (1.0 - ndv) * 0.6), 0.0, 1.0) * mix(0.35, 1.0, smoothstep(-0.2, 0.05, ndl));
        gl_FragColor = vec4(colour, alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
}

/**
 * The atmosphere: a shell drawn from inside, so only the part beyond the planet's edge shows. For each pixel the
 * shader finds how close the line of sight passes to the ground and adds Rayleigh blue that thins out with height,
 * bright on the day side and gone on the night side, so the rim is a thin blue line fading into black.
 */
function atmosphereMaterial(radius: number, view: View): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: { sun: view.sun, eye: view.eye, power: view.power, radius: { value: radius }, top: { value: radius * (1 + ATMOSPHERE_HEIGHT) } },
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: VERTEX,
    fragmentShader: `
      uniform vec3 sun;
      uniform vec3 eye;
      uniform float power;
      uniform float radius;
      uniform float top;
      varying vec3 vPoint;
      void main() {
        vec3 dir = normalize(vPoint - eye);
        float along = -dot(eye, dir);
        vec3 closest = eye + dir * max(along, 0.0);
        float height = (length(closest) - radius) / (top - radius);
        if (height > 1.0) discard;
        // Density falls off with height; the path through the shell is longest just above the ground.
        float density = exp(-max(height, 0.0) * 4.5) * smoothstep(1.0, 0.6, height);
        vec3 l = normalize(sun);
        float day = smoothstep(-0.25, 0.35, dot(normalize(closest), l));
        // Brighter towards the Sun (forward scattering) and a little warm at the terminator.
        float forward = pow(max(dot(dir, l), 0.0), 6.0);
        vec3 tint = mix(vec3(1.0, 0.6, 0.35), ${RAYLEIGH}, smoothstep(-0.1, 0.25, dot(normalize(closest), l)));
        vec3 colour = tint * density * day * (0.55 + forward * 1.5) * power * 0.6;
        gl_FragColor = vec4(colour, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
}

function newView(): View {
  return { sun: { value: new THREE.Vector3(1, 0, 0) }, eye: { value: new THREE.Vector3(0, 0, 10) }, power: { value: 2.4 } };
}

/**
 * The whole Earth, centred on its own origin, with the north pole along +y.
 * `spin` turns the surface and clouds (the cloud layer drifts a little faster).
 * `setSun` fixes the Sun's direction in world space for this Earth (null: use the scene's first DirectionalLight).
 */
export function buildEarth(radius: number): {
  earth: THREE.Group;
  spin(radians: number): void;
  setSun(direction: THREE.Vector3 | null): void;
} {
  const s = earthShared();
  const fixedSun: { dir: THREE.Vector3 | null } = { dir: null };
  const cloudShift: THREE.IUniform<number> = { value: 0 };

  const surface = new THREE.Group();
  const planetView = newView();
  const planet = new THREE.Mesh(new THREE.SphereGeometry(radius, 192, 96), planetMaterial(radius, s, planetView, cloudShift));
  planet.name = 'planet';
  track(planet, planetView, fixedSun);
  surface.add(planet);

  const cloudView = newView();
  const clouds = new THREE.Mesh(new THREE.SphereGeometry(radius * (1 + CLOUD_HEIGHT), 160, 80), cloudMaterial(s, cloudView));
  clouds.name = 'clouds';
  clouds.renderOrder = 1;
  track(clouds, cloudView, fixedSun);
  surface.add(clouds);

  const airView = newView();
  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(radius * (1 + ATMOSPHERE_HEIGHT), 160, 80),
    atmosphereMaterial(radius, airView),
  );
  atmosphere.name = 'atmosphere';
  atmosphere.renderOrder = 2;
  track(atmosphere, airView, fixedSun);

  const earth = new THREE.Group();
  earth.add(surface, atmosphere);
  earth.name = 'earth';
  return {
    earth,
    spin(radians) {
      surface.rotation.y += radians;
      clouds.rotation.y += radians * 0.15;
      cloudShift.value = clouds.rotation.y / (Math.PI * 2);
    },
    setSun(direction) {
      fixedSun.dir = direction ? direction.clone().normalize() : null;
    },
  };
}
