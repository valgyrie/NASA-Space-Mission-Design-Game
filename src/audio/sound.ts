import { AUDIO_KEY, DEFAULT_VOLUME, LOOP_FADE, MUSIC, type MusicScene, TITLE_TRACK_KEY, type TitleTrack, type TrackId, type Volume, loops, titleTrackFrom, volumeFrom } from './tracks';

export type Effect = 'click' | 'build' | 'launch' | 'alarm' | 'reward' | 'countdown';

/** Short original effects. No samples, external recordings or repeating alarms. */
export function synth(context: BaseAudioContext, output: AudioNode, kind: Effect): void {
  const now = context.currentTime;
  if (kind === 'launch') {
    const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * 1.5), context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const source = context.createBufferSource();
    source.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 220;
    const gain = context.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(.5, now + .15);
    gain.gain.linearRampToValueAtTime(0, now + 1.5);
    source.connect(filter).connect(gain).connect(output);
    source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
    source.start(now); source.stop(now + 1.5);
    return;
  }
  const notes: Record<Exclude<Effect, 'launch'>, number[]> = {
    click: [720], build: [140, 210], alarm: [440, 330], reward: [523.25, 659.25, 783.99], countdown: [880],
  };
  const duration = kind === 'click' ? .045 : .13;
  notes[kind].forEach((frequency, i) => {
    const start = now + i * duration;
    const oscillator = context.createOscillator();
    oscillator.type = kind === 'build' ? 'triangle' : 'sine';
    oscillator.frequency.value = frequency;
    const gain = context.createGain();
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(.2, start + .008);
    gain.gain.exponentialRampToValueAtTime(.001, start + duration);
    oscillator.connect(gain).connect(output);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    oscillator.start(start); oscillator.stop(start + duration + .01);
  });
}

/** One page-wide mixer; overlay owners restore the music underneath when they close. */
class Sound {
  private context: AudioContext | null = null;
  private musicBus: GainNode | null = null;
  private effectsBus: GainNode | null = null;
  private scenes = new Map<string, MusicScene>();
  private scene: MusicScene | null = null;
  private buffers = new Map<TrackId, Promise<AudioBuffer>>();
  /** Tracks that failed once stay silent until reload, so a blocked file is never requested again and again. */
  private failed = new Set<TrackId>();
  private voices = new Set<{ source: AudioBufferSourceNode; gain: GainNode }>();
  private timer = 0;
  private generation = 0;
  private installed = false;
  private begun = false;
  private volume = { ...DEFAULT_VOLUME };
  private title: TitleTrack = 'menu-theme';
  get settings(): Volume { return { ...this.volume }; }
  /** The track the title screen plays; the player picks it in Music & Sounds. */
  get titleTrack(): TitleTrack { return this.title; }
  setTitleTrack(id: TitleTrack): void {
    if (id === this.title) return;
    this.title = id;
    try { localStorage.setItem(TITLE_TRACK_KEY, id); } catch { /* still plays for this page */ }
    if (this.scene === 'menu') this.playScene();
  }

  init(): void {
    if (this.installed) return;
    this.installed = true;
    try {
      this.volume = volumeFrom(localStorage.getItem(AUDIO_KEY));
      this.title = titleTrackFrom(localStorage.getItem(TITLE_TRACK_KEY));
    } catch { /* private storage */ }
    const unlock = () => { void this.unlock(); };
    document.addEventListener('pointerdown', unlock, true);
    document.addEventListener('keydown', unlock, true);
    document.addEventListener('click', (event) => {
      if (event.target instanceof Element && event.target.closest('button:not(:disabled)')) this.effect('click');
    }, true);
    document.addEventListener('visibilitychange', () => {
      if (!this.context) return;
      if (document.hidden) {
        this.stop();
        void this.context.suspend().catch(() => {});
      } else void this.unlock();
    });
  }

  private async unlock(): Promise<void> {
    if (document.hidden) return;
    try {
      if (!this.context) {
        this.context = new AudioContext();
        this.musicBus = this.context.createGain();
        this.effectsBus = this.context.createGain();
        this.musicBus.connect(this.context.destination);
        this.effectsBus.connect(this.context.destination);
        this.applyVolume();
      }
      if (this.context.state !== 'running') await this.context.resume();
      // A suspended page restarts the current cue; it never builds a backlog while hidden.
      if (!this.begun) this.playScene();
    } catch { /* Audio support or autoplay denial must never stop the game. */ }
  }

  setVolume(kind: keyof Volume, level: number): void {
    const wasMuted = this.volume.music === 0;
    if (!Number.isFinite(level)) return;
    this.volume[kind] = Math.min(1, Math.max(0, level));
    try { localStorage.setItem(AUDIO_KEY, JSON.stringify(this.volume)); } catch { /* settings still work for this page */ }
    this.applyVolume();
    if (this.volume.music === 0) this.stop();
    else if (wasMuted) this.playScene();
  }
  private applyVolume(): void {
    if (!this.context) return;
    this.musicBus?.gain.setTargetAtTime(this.volume.music * .6, this.context.currentTime, .02);
    this.effectsBus?.gain.setTargetAtTime(this.volume.effects * .5, this.context.currentTime, .02);
  }
  effect(kind: Effect): void {
    if (this.context?.state === 'running' && this.effectsBus && this.volume.effects > 0 && !document.hidden) synth(this.context, this.effectsBus, kind);
  }
  setScene(owner: string, scene: MusicScene | null): void {
    if (this.scenes.get(owner) === scene || (!scene && !this.scenes.has(owner))) return;
    this.scenes.delete(owner);
    if (scene) this.scenes.set(owner, scene);
    const next = [...this.scenes.values()].at(-1) ?? null;
    if (next === this.scene) return;
    this.scene = next;
    this.playScene();
  }
  private load(id: TrackId): Promise<AudioBuffer> {
    if (this.failed.has(id)) return Promise.reject(new Error('Audio unavailable'));
    let buffer = this.buffers.get(id);
    if (!buffer) {
      // MP3 data under a neutral extension: download managers grab ".mp3" requests and the game gets nothing.
      buffer = fetch(import.meta.env.BASE_URL + 'audio/music/' + id + '.music')
        .then((response) => { if (!response.ok) throw new Error('Audio unavailable'); return response.arrayBuffer(); })
        .then((bytes) => this.context!.decodeAudioData(bytes));
      this.buffers.set(id, buffer);
      void buffer.catch(() => { this.failed.add(id); if (this.buffers.get(id) === buffer) this.buffers.delete(id); });
    }
    return buffer;
  }
  private fadeOut(seconds: number): void {
    if (!this.context) return;
    const now = this.context.currentTime;
    for (const voice of this.voices) {
      const gain = voice.gain.gain;
      if (typeof gain.cancelAndHoldAtTime === 'function') gain.cancelAndHoldAtTime(now);
      else {
        const level = gain.value;
        gain.cancelScheduledValues(now);
        gain.setValueAtTime(level, now);
      }
      gain.linearRampToValueAtTime(0, now + seconds);
      voice.source.stop(now + seconds + .01);
    }
  }
  private stop(): void {
    this.begun = false;
    this.generation++;
    window.clearTimeout(this.timer);
    this.timer = 0;
    this.fadeOut(.04);
  }
  private playScene(): void {
    this.begun = false;
    const token = ++this.generation;
    window.clearTimeout(this.timer);
    this.timer = 0;
    const scene = this.scene;
    if (!scene || this.volume.music === 0 || this.context?.state !== 'running') { this.fadeOut(.1); return; }
    this.begun = true;
    const ids: readonly TrackId[] = scene === 'menu' ? [this.title] : MUSIC[scene];
    // Keep only this screen's decoded tracks; the browser's HTTP cache handles repeat visits.
    for (const id of this.buffers.keys()) if (!ids.includes(id)) this.buffers.delete(id);
    const start = async (index: number, at?: number): Promise<void> => {
      try {
        const buffer = await this.load(ids[index % ids.length]!);
        if (token !== this.generation || this.context?.state !== 'running' || document.hidden) return;
        const time = Math.max(at ?? 0, this.context.currentTime + .03);
        const loop = loops(scene);
        const fade = loop ? LOOP_FADE : .4;
        if (at === undefined) this.fadeOut(fade);
        const source = this.context.createBufferSource();
        source.buffer = buffer;
        const gain = this.context.createGain();
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(1, time + fade);
        if (loop) {
          gain.gain.setValueAtTime(1, time + buffer.duration - fade);
          gain.gain.linearRampToValueAtTime(0, time + buffer.duration);
        }
        source.connect(gain).connect(this.musicBus!);
        const voice = { source, gain };
        this.voices.add(voice);
        source.onended = () => { this.voices.delete(voice); source.disconnect(); gain.disconnect(); };
        source.start(time);
        source.stop(time + buffer.duration);
        if (loop) {
          const next = time + buffer.duration - fade;
          // Fetch the alternate Site track now, schedule the seam before it reaches the audio clock.
          void this.load(ids[(index + 1) % ids.length]!).catch(() => {});
          this.timer = window.setTimeout(() => { this.timer = 0; void start(index + 1, next); }, Math.max(0, (next - this.context.currentTime - 3) * 1000));
        }
      } catch {
        // Failed or stale requests must neither keep the previous screen playing nor interrupt a newer one.
        if (token === this.generation) this.fadeOut(.4);
      }
    };
    void start(0);
  }
}
export const audio = new Sound();
