/** Prepared from the team's originals; approved cuts and measurements: docs/audio/. */
export const TRACK_IDS = ['menu-theme', 'site-calm-a', 'site-calm-b', 'designer-focus', 'launch', 'flight-orbit', 'anomaly', 'stinger-success', 'stinger-failure', 'era-history'] as const;
export type TrackId = (typeof TRACK_IDS)[number];
export const MUSIC = {
  menu: ['menu-theme'], site: ['site-calm-a', 'site-calm-b'], designer: ['designer-focus'],
  launch: ['launch'], orbit: ['flight-orbit'], anomaly: ['anomaly'],
  success: ['stinger-success'], failure: ['stinger-failure'], history: ['era-history'],
} as const satisfies Record<string, readonly TrackId[]>;
export type MusicScene = keyof typeof MUSIC;
export const loops = (scene: MusicScene) => ['site', 'designer', 'orbit', 'anomaly'].includes(scene);
export const LOOP_FADE = 3;
export const AUDIO_KEY = 'leap.audio';
export const DEFAULT_VOLUME = { music: .5, effects: .7 };
/**
 * Bus gains under the volume sliders. Tracks are mastered at −16 LUFS, so music at the default 50% plays at about
 * −22 LUFS: clear background music. (It was 0.6, about −26 LUFS, too quiet to hear on laptop speakers.)
 */
export const MUSIC_GAIN = 1;
export const EFFECTS_GAIN = .5;
export type Volume = typeof DEFAULT_VOLUME;
export function volumeFrom(raw: string | null): Volume {
  try {
    const value = JSON.parse(raw ?? '{}') as Partial<Volume> | null;
    const level = (kind: keyof Volume) => typeof value?.[kind] === 'number' && Number.isFinite(value[kind])
      ? Math.min(1, Math.max(0, value[kind]!)) : DEFAULT_VOLUME[kind];
    return { music: level('music'), effects: level('effects') };
  } catch { return { ...DEFAULT_VOLUME }; }
}
