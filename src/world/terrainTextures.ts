import * as THREE from 'three';

/** The ground kinds the terrain shader blends, in the order of its texture slots. */
export const GROUND_KINDS = ['grass', 'sand', 'dirt', 'rock', 'snow'] as const;
export type GroundKind = (typeof GROUND_KINDS)[number];

export interface GroundTextures {
  /** Colour maps (sRGB). */
  albedo: Record<GroundKind, THREE.Texture>;
  /** Normal maps: red and green hold the normal (OpenGL style), blue the roughness. */
  normal: Record<GroundKind, THREE.Texture>;
  water: THREE.Texture;
  /** Resolves when every image has loaded. */
  ready: Promise<void>;
}

let cache: GroundTextures | null = null;

/** The photographic ground textures (Poly Haven, CC0), loaded once on first use. */
export function groundTextures(): GroundTextures {
  if (cache) return cache;
  const loader = new THREE.TextureLoader();
  const base = `${import.meta.env.BASE_URL}textures/terrain/`;
  const loads: Promise<unknown>[] = [];
  const load = (file: string, colour: boolean): THREE.Texture => {
    let done: () => void = () => {};
    loads.push(new Promise<void>((resolve) => (done = resolve)));
    const t = loader.load(base + file, () => done(), undefined, () => done());
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = colour ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.anisotropy = 8;
    return t;
  };
  const albedo = {} as Record<GroundKind, THREE.Texture>;
  const normal = {} as Record<GroundKind, THREE.Texture>;
  for (const kind of GROUND_KINDS) {
    albedo[kind] = load(`${kind}_albedo.jpg`, true);
    normal[kind] = load(`${kind}_normal.jpg`, false);
  }
  const water = load('water_normal.jpg', false);
  cache = { albedo, normal, water, ready: Promise.all(loads).then(() => undefined) };
  return cache;
}
