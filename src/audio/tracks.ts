/**
 * The game's music: one file per track in public/audio/music, mastered by scripts/master_music.sh.
 * Looping tracks were cut before their fade-out, so the player crossfades each end into the next start.
 * Sources and credits: docs/audio/README.md.
 */
export const TRACKS = {
  'menu-theme': { loop: false },
  'site-calm-a': { loop: true },
  'site-calm-b': { loop: true },
  'designer-focus': { loop: true },
  launch: { loop: false },
  'flight-orbit': { loop: true },
  anomaly: { loop: true },
  'stinger-success': { loop: false },
  'stinger-failure': { loop: false },
  'era-history': { loop: false },
} as const satisfies Record<string, { loop: boolean }>;

export type TrackId = keyof typeof TRACKS;

/** What plays on a screen: tracks in turn, the last one again and again if it loops. */
export type Cue = readonly TrackId[];

/** Screens that play music. The Site alternates its two calm tracks. */
export const CUES = {
  menu: ['menu-theme'],
  site: ['site-calm-a', 'site-calm-b'],
  designer: ['designer-focus'],
  launch: ['launch'],
  flight: ['flight-orbit'],
  anomaly: ['anomaly'],
  success: ['stinger-success'],
  failure: ['stinger-failure'],
  history: ['era-history'],
} as const satisfies Record<string, Cue>;

export type Scene = keyof typeof CUES;

export function trackUrl(id: TrackId): string {
  return `${import.meta.env.BASE_URL}audio/music/${id}.mp3`;
}

/**
 * The track after `index` in a cue, or null when it ends. A cue of looping tracks goes round
 * (the Site's a, b, a, …); one that ends on a one-shot track stops there.
 */
export function nextInCue(cue: Cue, index: number): number | null {
  if (index + 1 < cue.length) return index + 1;
  const last = cue[cue.length - 1];
  if (last && TRACKS[last].loop) return cue.every((id) => TRACKS[id].loop) ? 0 : cue.length - 1;
  return null;
}

/** Seconds of crossfade where a looping track runs into the next one. */
export const LOOP_FADE_S = 3;
/** Seconds of crossfade from one screen's music to another's. */
export const SCENE_FADE_S = 1.2;

/** When (seconds into a track) to start the next one so their crossfade ends as this one ends. */
export function handOverAt(durationS: number, fadeS = LOOP_FADE_S): number {
  return Math.max(0, durationS - Math.min(fadeS, durationS / 4));
}
