import * as THREE from 'three';

/**
 * The realistic building models made in Blender (scripts/blender/build_buildings.py → public/models/buildings.glb).
 * Builders stay synchronous: they return the old code-built model, and `useModel` swaps it for a copy of the
 * Blender model once the file has loaded (at once if it already has: main.ts preloads it before the title Site).
 * If the file fails to load, the code-built model simply stays.
 *
 * The GLB is in metres and Draco-compressed (decoder in public/models/draco/); a 30 m footprint fills the 0.9-unit
 * model box, so copies are scaled by METRE. Nodes carry their moving-part role in glTF extras (`userData.role`),
 * renamed here to the names the World animates.
 */
export const METRE = 0.9 / 30;

/** Tints for materials named 'product*' and 'ore' (Factory product colour, Raw Material colour). */
export interface ModelTint {
  product?: number;
  productMetal?: number;
  productPV?: number;
  ore?: number;
}

let templates: Map<string, THREE.Object3D> | null = null;
let loading: Promise<Map<string, THREE.Object3D> | null> | null = null;

function load(): Promise<Map<string, THREE.Object3D> | null> {
  if (loading) return loading;
  loading = Promise.all([
    import('three/examples/jsm/loaders/GLTFLoader.js'),
    import('three/examples/jsm/loaders/DRACOLoader.js'),
  ])
    .then(async ([{ GLTFLoader }, { DRACOLoader }]) => {
      const draco = new DRACOLoader().setDecoderPath(import.meta.env.BASE_URL + 'models/draco/');
      try {
        return await new GLTFLoader().setDRACOLoader(draco).loadAsync(import.meta.env.BASE_URL + 'models/buildings.glb');
      } finally {
        draco.dispose();
      }
    })
    .then((gltf) => {
      const map = new Map<string, THREE.Object3D>();
      for (const node of [...gltf.scene.children]) {
        node.traverse((o) => {
          const role = o.userData.role as string | undefined;
          if (role) o.name = role;
          if (o instanceof THREE.Mesh) {
            // See-through wire mesh (fences) would cast solid shadows.
            o.castShadow = !(o.material as THREE.Material).transparent;
            o.receiveShadow = true;
          }
        });
        map.set(node.name, node);
      }
      templates = map;
      return map;
    })
    .catch((e: unknown) => {
      console.warn('Building models could not be loaded; keeping the simple ones.', e);
      return null;
    });
  return loading;
}

/**
 * Start loading the models and resolve when they are ready, failed, or `timeout` ms have passed, whichever is
 * first (so a slow connection never holds the game up; late models still swap in when they arrive).
 */
export function preloadBuildingModels(timeout = 5000): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  return Promise.race([load().then(() => undefined), new Promise<void>((r) => setTimeout(r, timeout))]);
}

/** Children added by the World or by code that a model swap keeps. */
const KEEP = ['foundation', 'level', 'crane', 'smoke'];

/**
 * The colour ore heaps take for a Deposit colour: the same hue, but muted and darkened like crushed rock
 * (the Deposit colours are bright map colours, and the ore texture adds its own grain on top).
 */
export function oreTint(hex: number): number {
  const hsl = { h: 0, s: 0, l: 0 };
  new THREE.Color(hex).getHSL(hsl);
  return new THREE.Color().setHSL(hsl.h, hsl.s * 0.45, Math.min(0.5, 0.25 + hsl.l * 0.25)).getHex();
}

const tinted = new Map<string, THREE.Material>();
function tintOf(m: THREE.Material, tint: ModelTint): THREE.Material {
  const key = m.name as keyof ModelTint;
  let hex = tint[key] ?? (key.startsWith('product') ? tint.product : undefined);
  if (hex === undefined || !(m instanceof THREE.MeshStandardMaterial)) return m;
  if (key === 'ore') hex = oreTint(hex);
  const id = `${m.uuid}:${hex}`;
  let t = tinted.get(id);
  if (!t) {
    const c = m.clone();
    c.color.setHex(hex);
    tinted.set(id, (t = c));
  }
  return t;
}

/** A copy of model `key` in model units, tinted; null if the models are not loaded. */
function copyOf(key: string, tint: ModelTint): THREE.Object3D | null {
  const template = templates?.get(key);
  if (!template) return null;
  const copy = template.clone(true);
  copy.name = `${key}-model`;
  copy.scale.setScalar(METRE);
  copy.traverse((o) => {
    if (o instanceof THREE.Mesh) o.material = tintOf(o.material as THREE.Material, tint);
  });
  return copy;
}

/** Metres in the Blender model (x, up, game z) → model units. */
export const at = (x: number, y: number, z: number) => new THREE.Vector3(x * METRE, y * METRE, z * METRE);

/**
 * Swap the code-built parts of group `g` for model `key` when the models are ready. Children whose name is in
 * `keep` stay (smoke, logos); `place` may move them to fit the model. Does nothing in Node (tests) or if loading fails.
 */
export function useModel(
  g: THREE.Group,
  key: string,
  tint: ModelTint = {},
  keep: string[] = [],
  place?: (g: THREE.Group) => void,
): void {
  if (typeof window === 'undefined') return;
  const swap = () => {
    const copy = copyOf(key, tint);
    if (!copy) return;
    for (const child of [...g.children]) {
      if (!KEEP.includes(child.name) && !keep.includes(child.name)) g.remove(child);
    }
    g.add(copy);
    place?.(g);
  };
  if (templates) swap();
  else void load().then(swap);
}

/** Swap a building's plain foundation block for the concrete one from the models, when they are ready. */
export function useFoundation(g: THREE.Group): void {
  if (typeof window === 'undefined') return;
  const swap = () => {
    const copy = copyOf('foundation', {});
    const old = g.getObjectByName('foundation');
    if (!copy || !old) return;
    g.remove(old);
    copy.name = 'foundation';
    g.add(copy);
  };
  if (templates) swap();
  else void load().then(swap);
}
