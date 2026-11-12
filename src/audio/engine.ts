import { type Volumes, gainFor, loadVolumes, saveVolumes } from './settings';

/**
 * The one AudioContext and its two volume buses, music and effects. Browsers only allow sound after the
 * player clicks or presses a key, so the context starts on the first one; until then nothing plays.
 */
export interface AudioBuses {
  context: AudioContext;
  music: GainNode;
  effects: GainNode;
}

let buses: AudioBuses | null = null;
let volumes: Volumes = loadVolumes(storage());
const waiting: ((b: AudioBuses) => void)[] = [];

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

/** The buses, if sound has started. */
export function audioBuses(): AudioBuses | null {
  return buses && buses.context.state === 'running' ? buses : null;
}

/** Run `fn` once sound has started (now, if it has). */
export function whenAudioStarts(fn: (b: AudioBuses) => void): void {
  const b = audioBuses();
  if (b) fn(b);
  else waiting.push(fn);
}

export function getVolumes(): Volumes {
  return { ...volumes };
}

export function setVolumes(next: Partial<Volumes>): void {
  volumes = { ...volumes, ...next };
  saveVolumes(storage(), volumes);
  if (!buses) return;
  const now = buses.context.currentTime;
  buses.music.gain.setTargetAtTime(gainFor(volumes.music), now, 0.05);
  buses.effects.gain.setTargetAtTime(gainFor(volumes.effects), now, 0.05);
}

/** Start sound on the first click, tap or key. Call once at startup. */
export function installAudioUnlock(): void {
  if (typeof window === 'undefined' || typeof AudioContext === 'undefined') return;
  const start = () => {
    if (!buses) {
      const context = new AudioContext();
      const music = context.createGain();
      const effects = context.createGain();
      music.gain.value = gainFor(volumes.music);
      effects.gain.value = gainFor(volumes.effects);
      music.connect(context.destination);
      effects.connect(context.destination);
      buses = { context, music, effects };
    }
    void buses.context.resume().then(() => {
      if (buses?.context.state !== 'running') return;
      for (const fn of waiting.splice(0)) fn(buses);
    });
  };
  // A suspended context (the tab was hidden on some phones) restarts on the next gesture too.
  for (const type of ['pointerdown', 'keydown'] as const) window.addEventListener(type, start, { capture: true });
}
