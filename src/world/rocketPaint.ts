import * as THREE from 'three';

/**
 * Painted and bare metal for rockets: a MeshStandardMaterial with the wear of a real vehicle added in the shader,
 * from the mesh's own coordinates (metres along and round the body): faint panel seams and weld rings, rain and
 * frost streaks running down, blotchy roughness, and soot round the tail. Nothing to load, so it works at once.
 */

export interface PaintOptions {
  roughness?: number;
  metalness?: number;
  /** Metres between weld rings along the body (0: none). */
  rings?: number;
  /** Panel seams round the body (0: none). */
  seams?: number;
  /** Streaks and blotches, 0–1. */
  grime?: number;
  /** Soot near the bottom (y < `sootTop` metres), 0–1. */
  soot?: number;
  sootTop?: number;
  /** Faint brushed / machined lines along the body (bare metal). */
  brushed?: boolean;
  /** How much each skin panel bulges between its seams and weld rings (catches the light), 0–1. */
  relief?: number;
  side?: THREE.Side;
}

const PARS = /* glsl */ `
  varying vec3 vPaint;
  uniform vec4 uPaintA; // rings, seams, grime, soot
  uniform vec2 uPaintB; // sootTop, brushed
  uniform float uRelief;
  float pHash(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }
  float pNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(pHash(i), pHash(i + vec2(1.0, 0.0)), u.x), mix(pHash(i + vec2(0.0, 1.0)), pHash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
`;

/** A rocket material. Its colour is sRGB hex, like other materials. */
export function paint(colour: number, o: PaintOptions = {}): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({
    color: colour,
    roughness: o.roughness ?? 0.5,
    metalness: o.metalness ?? 0,
    side: o.side ?? THREE.FrontSide,
  });
  const uniforms = {
    uPaintA: { value: new THREE.Vector4(o.rings ?? 0, o.seams ?? 0, o.grime ?? 0.5, o.soot ?? 0) },
    uPaintB: { value: new THREE.Vector2(o.sootTop ?? 2.5, o.brushed ? 1 : 0) },
    uRelief: { value: o.relief ?? 0.6 },
  };
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vPaint;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvPaint = position;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${PARS}`)
      .replace(
        '#include <map_fragment>',
        /* glsl */ `
        #include <map_fragment>
        float pr = max(length(vPaint.xz), 0.05);
        float pa = atan(vPaint.x, vPaint.z);
        float arc = pa * pr;
        float py = vPaint.y;
        // How big one pixel is on the body: fine detail fades before it would shimmer; seam lines keep their share
        // of the pixel, so they stay as faint lines far away instead of vanishing.
        float px = max(fwidth(py), fwidth(arc));
        float sharp = 1.0 - smoothstep(0.008, 0.03, px);
        float seam = 0.0;
        float panelId = 0.0;
        float pillow = 1.0;
        if (uPaintA.x > 0.0) {
          float u = py / uPaintA.x;
          float d = abs(fract(u + 0.5) - 0.5) * uPaintA.x;
          float aa = max(px * 1.5, 0.014);
          seam = max(seam, (1.0 - smoothstep(0.0, aa, d)) * 0.014 / aa);
          panelId += floor(u) * 7.13;
          pillow *= sin(3.14159 * fract(u));
        }
        if (uPaintA.y > 0.0) {
          float pStep = 6.2831853 / uPaintA.y;
          float u = pa / pStep;
          float d = abs(fract(u + 0.5) - 0.5) * pStep * pr;
          float aa = max(px * 1.5, 0.01);
          seam = max(seam, (1.0 - smoothstep(0.0, aa, d)) * 0.01 / aa * 0.8);
          panelId += floor(u) * 3.71;
          pillow *= sin(3.14159 * fract(u));
        }
        if (uPaintA.x <= 0.0 || uPaintA.y <= 0.0) pillow = 0.0;
        // Each skin panel a shade different, as on a real vehicle.
        float panel = pHash(vec2(panelId, panelId * 0.37 + 1.3)) - 0.5;
        diffuseColor.rgb *= (1.0 - seam * 0.5) * (1.0 + panel * 0.07);
        // Relief for the light: panels bulge slightly between seams (fades out where a panel is only a few pixels).
        float pRelief = uRelief * 0.012 * pillow * (1.0 - smoothstep(0.02, 0.12, px));
        // Streaks running down the body, and broad blotches.
        float streak = pNoise(vec2(arc * 7.0, py * 0.35)) * pNoise(vec2(arc * 2.3 + 4.0, py * 0.12));
        float blotch = pNoise(vec2(arc * 0.9, py * 0.9) + 11.0);
        float grime = uPaintA.z * (streak * 0.22 + (blotch - 0.5) * 0.08);
        diffuseColor.rgb *= 1.0 - grime;
        // Soot and scorch from the engine round the tail.
        float soot = uPaintA.w * (1.0 - smoothstep(0.0, uPaintB.x, py)) * (0.55 + 0.45 * pNoise(vec2(arc * 3.0, py * 2.0)));
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.05, 0.045, 0.04), clamp(soot, 0.0, 0.85));
        // Brushed metal: fine lines along the body.
        float brush = uPaintB.y * (pNoise(vec2(arc * 160.0, py * 0.8)) - 0.5) * sharp;
        diffuseColor.rgb *= 1.0 + brush * 0.12;
        float pRough = (blotch - 0.5) * 0.18 + streak * 0.12 + seam * 0.2 + brush * 0.1 + panel * 0.12;
        `,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        '#include <roughnessmap_fragment>\nroughnessFactor = clamp(roughnessFactor + pRough, 0.04, 1.0);',
      )
      .replace(
        '#include <normal_fragment_maps>',
        /* glsl */ `
        #include <normal_fragment_maps>
        if (pRelief != 0.0) {
          // Bump the normal by the panels' bulge (derivatives of the relief, as three's bump map does).
          vec2 dh = vec2(dFdx(pRelief), dFdy(pRelief));
          vec3 sx = dFdx(-vViewPosition);
          vec3 sy = dFdy(-vViewPosition);
          vec3 r1 = cross(sy, normal);
          vec3 r2 = cross(normal, sx);
          float det = dot(sx, r1) * faceDirection;
          normal = normalize(abs(det) * normal - sign(det) * (dh.x * r1 + dh.y * r2));
        }
        `,
      );
  };
  material.customProgramCacheKey = () => 'rocket-paint-2';
  return material;
}
