/**
 * Music and effects volume. A setting of this browser, not of the Company, so it lives outside the save
 * and stays the same for every Company and the demos.
 */
export interface Volumes {
  /** 0–1. */
  music: number;
  /** 0–1. */
  effects: number;
}

export const VOLUME_KEY = 'leap.volume';
export const DEFAULT_VOLUMES: Volumes = { music: 0.6, effects: 0.8 };

type Store = Pick<Storage, 'getItem' | 'setItem'>;

const clamp = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : fallback);

export function loadVolumes(store: Store | null): Volumes {
  try {
    const raw = store?.getItem(VOLUME_KEY);
    if (!raw) return { ...DEFAULT_VOLUMES };
    const v = JSON.parse(raw) as Partial<Volumes>;
    return { music: clamp(v.music, DEFAULT_VOLUMES.music), effects: clamp(v.effects, DEFAULT_VOLUMES.effects) };
  } catch {
    return { ...DEFAULT_VOLUMES };
  }
}

export function saveVolumes(store: Store | null, volumes: Volumes): void {
  try {
    store?.setItem(VOLUME_KEY, JSON.stringify({ music: clamp(volumes.music, 0), effects: clamp(volumes.effects, 0) }));
  } catch {
    // Storage full or blocked: the volume still applies for this visit.
  }
}

/** Sliders feel even when the gain follows the square of their position. */
export function gainFor(volume: number): number {
  return volume * volume;
}
