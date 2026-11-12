import { type AudioBuses, whenAudioStarts } from './engine';
import { CUES, SCENE_FADE_S, type Scene, handOverAt, nextInCue, trackUrl } from './tracks';

/**
 * Plays each screen's music. Tracks stream from their files, so only the screen's own track loads.
 * A looping track starts its next play a few seconds before it ends and the two crossfade; changing
 * screen crossfades the old music out and the new in.
 */

interface Voice {
  element: HTMLAudioElement;
  source: MediaElementAudioSourceNode;
  gain: GainNode;
  index: number;
  /** The next track has started (or none follows). */
  handedOver: boolean;
}

/** Straight steps in a fade. Ramps, not a value curve, so a new fade can always cut in on one under way. */
const FADE_STEPS = 12;

/** Fade a gain from where it is now to `to` over `seconds`, on an equal-power curve. */
function fade(gain: GainNode, to: number, seconds: number): void {
  const param = gain.gain;
  const now = gain.context.currentTime;
  const from = param.value;
  param.cancelScheduledValues(now);
  param.setValueAtTime(from, now);
  if (seconds <= 0 || from === to) {
    param.setValueAtTime(to, now);
    return;
  }
  for (let i = 1; i <= FADE_STEPS; i++) {
    const x = i / FADE_STEPS;
    // Rising follows sin, falling follows cos: together they keep the loudness level through a crossfade.
    const shape = to > from ? Math.sin((x * Math.PI) / 2) : 1 - Math.cos((x * Math.PI) / 2);
    param.linearRampToValueAtTime(from + (to - from) * shape, now + x * seconds);
  }
}

export class MusicPlayer {
  private scene: Scene | null = null;
  /** Bumped on every scene change, so a late start for an old scene is dropped. */
  private generation = 0;
  private lead: Voice | null = null;
  /** The next track, loading ahead of its hand-over so the crossfade starts on time. */
  private upcoming: { scene: Scene; index: number; element: HTMLAudioElement } | null = null;
  private timer = 0;

  /** The screen whose music should play, or null for silence. Calling it again with the same scene does nothing. */
  play(scene: Scene | null): void {
    if (scene === this.scene) return;
    this.scene = scene;
    const generation = ++this.generation;
    const old = this.lead;
    this.lead = null;
    if (old) this.release(old, SCENE_FADE_S);
    if (this.upcoming) unload(this.upcoming.element);
    this.upcoming = null;
    if (!scene) return;
    whenAudioStarts((buses) => {
      if (generation !== this.generation) return;
      this.lead = this.start(buses, 0, old ? SCENE_FADE_S : 0.4);
      this.watch();
    });
  }

  get playing(): Scene | null {
    return this.scene;
  }

  private start(buses: AudioBuses, index: number, fadeIn: number): Voice | null {
    const scene = this.scene;
    if (!scene) return null;
    const id = CUES[scene][index];
    if (!id) return null;
    const ready = this.upcoming?.scene === scene && this.upcoming.index === index ? this.upcoming.element : null;
    this.upcoming = null;
    const element = ready ?? load(trackUrl(id));
    const source = buses.context.createMediaElementSource(element);
    const gain = buses.context.createGain();
    gain.gain.value = 0;
    source.connect(gain).connect(buses.music);
    const voice: Voice = { element, source, gain, index, handedOver: false };
    element.addEventListener('ended', () => {
      if (voice === this.lead) {
        // A hidden tab can miss the hand-over; start the next track now instead.
        if (!voice.handedOver) this.handOver(voice, 0);
        // A one-shot track that has finished: silence until the screen changes.
        if (voice === this.lead) this.lead = null;
      }
      this.stop(voice);
    });
    element.play().then(
      // The screen may have changed while the file started; then it is already fading out.
      () => {
        if (voice === this.lead) fade(gain, 1, fadeIn);
      },
      () => {},
    );
    return voice;
  }

  /** Start the next track in the cue over the end of this one. */
  private handOver(voice: Voice, fadeS: number): void {
    voice.handedOver = true;
    const scene = this.scene;
    if (!scene) return;
    const next = nextInCue(CUES[scene], voice.index);
    if (next === null) return;
    whenAudioStarts((buses) => {
      if (this.lead !== voice) return;
      this.lead = this.start(buses, next, fadeS);
      this.release(voice, fadeS);
    });
  }

  /** Check the lead track a few times a second, while music plays. */
  private watch(): void {
    if (this.timer) return;
    this.timer = window.setInterval(() => {
      const voice = this.lead;
      if (!voice) {
        window.clearInterval(this.timer);
        this.timer = 0;
        return;
      }
      const { duration, currentTime } = voice.element;
      if (!voice.handedOver && !this.upcoming && this.scene && Number.isFinite(duration) && currentTime >= handOverAt(duration) - PRELOAD_S) {
        const index = nextInCue(CUES[this.scene], voice.index);
        const id = index === null ? undefined : CUES[this.scene][index];
        if (index !== null && id) this.upcoming = { scene: this.scene, index, element: load(trackUrl(id)) };
      }
      if (!voice.handedOver && Number.isFinite(duration) && duration > 0 && currentTime >= handOverAt(duration)) {
        this.handOver(voice, Math.max(0.1, duration - currentTime));
      }
    }, 100);
  }

  private release(voice: Voice, fadeS: number): void {
    fade(voice.gain, 0, fadeS);
    window.setTimeout(() => this.stop(voice), fadeS * 1000 + 200);
  }

  private stop(voice: Voice): void {
    voice.source.disconnect();
    voice.gain.disconnect();
    unload(voice.element);
  }
}

/** Seconds before a hand-over to start loading the next track. */
const PRELOAD_S = 20;

function load(url: string): HTMLAudioElement {
  const element = new Audio(url);
  element.preload = 'auto';
  return element;
}

/** Drop the file, so the browser can free it. */
function unload(element: HTMLAudioElement): void {
  element.pause();
  element.removeAttribute('src');
  element.load();
}

export const music = new MusicPlayer();
