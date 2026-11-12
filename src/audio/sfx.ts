import { audioBuses, getVolumes } from './engine';

/**
 * Sound effects, made in code with Web Audio: no files to load or credit. Each one is a few
 * oscillators or a burst of noise through a filter, kept soft to suit the game's cozy sound.
 * Before the first click or key press there is no sound, so the effects do nothing.
 */
export type Effect = 'click' | 'build' | 'denied' | 'tick' | 'liftoff' | 'stage' | 'alarm' | 'reward';

/** A short note with a quick attack and an exponential fall. */
function tone(out: AudioNode, at: number, { freq, to = freq, dur, gain, type = 'sine' }: { freq: number; to?: number; dur: number; gain: number; type?: OscillatorType }): void {
  const ctx = out.context;
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, at);
  if (to !== freq) osc.frequency.exponentialRampToValueAtTime(to, at + dur);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, at);
  env.gain.exponentialRampToValueAtTime(gain, at + Math.min(0.01, dur / 4));
  env.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  osc.connect(env).connect(out);
  osc.start(at);
  osc.stop(at + dur + 0.02);
}

const noiseBuffers = new WeakMap<BaseAudioContext, AudioBuffer>();

/** Two seconds of brown noise (deep, like a roar), made once per context. */
function brownNoise(ctx: BaseAudioContext): AudioBuffer {
  let buffer = noiseBuffers.get(ctx);
  if (buffer) return buffer;
  buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i++) {
    last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
    data[i] = last * 3.5;
  }
  noiseBuffers.set(ctx, buffer);
  return buffer;
}

/** Noise through a low-pass filter, swelling in over `attack` and dying away over `release`. */
function rumble(out: AudioNode, at: number, { attack, hold, release, gain, cutoff }: { attack: number; hold: number; release: number; gain: number; cutoff: number }): void {
  const ctx = out.context;
  const src = ctx.createBufferSource();
  src.buffer = brownNoise(ctx);
  src.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = cutoff;
  const env = ctx.createGain();
  const end = at + attack + hold + release;
  env.gain.setValueAtTime(0.0001, at);
  env.gain.exponentialRampToValueAtTime(gain, at + attack);
  env.gain.setValueAtTime(gain, at + attack + hold);
  env.gain.exponentialRampToValueAtTime(0.0001, end);
  src.connect(filter).connect(env).connect(out);
  src.start(at);
  src.stop(end + 0.05);
}

const PLAY: Record<Effect, (out: AudioNode, now: number) => void> = {
  // A soft tap for buttons.
  click: (out, now) => tone(out, now, { freq: 1300, to: 900, dur: 0.05, gain: 0.08, type: 'triangle' }),
  // A low thud, then a bright ping: the building is down.
  build: (out, now) => {
    tone(out, now, { freq: 160, to: 70, dur: 0.18, gain: 0.35 });
    rumble(out, now, { attack: 0.005, hold: 0.02, release: 0.15, gain: 0.25, cutoff: 900 });
    tone(out, now + 0.09, { freq: 1047, dur: 0.25, gain: 0.08, type: 'triangle' });
  },
  // Two low notes falling: that can't go there.
  denied: (out, now) => {
    tone(out, now, { freq: 330, dur: 0.12, gain: 0.12, type: 'triangle' });
    tone(out, now + 0.11, { freq: 247, dur: 0.18, gain: 0.12, type: 'triangle' });
  },
  // A countdown beep.
  tick: (out, now) => tone(out, now, { freq: 880, dur: 0.09, gain: 0.1 }),
  // Ignition: a deep roar that swells, holds through the climb and fades out.
  liftoff: (out, now) => {
    tone(out, now, { freq: 1760, dur: 0.35, gain: 0.1 });
    rumble(out, now, { attack: 0.6, hold: 5, release: 4, gain: 0.7, cutoff: 260 });
    rumble(out, now, { attack: 0.3, hold: 2, release: 2.5, gain: 0.2, cutoff: 1400 });
  },
  // A stage drops away and the next engine lights: a thump and a short roar.
  stage: (out, now) => {
    tone(out, now, { freq: 120, to: 50, dur: 0.25, gain: 0.3 });
    rumble(out, now + 0.15, { attack: 0.2, hold: 1.2, release: 2, gain: 0.35, cutoff: 400 });
  },
  // Something's wrong: three rising-falling two-tone calls.
  alarm: (out, now) => {
    for (let i = 0; i < 3; i++) {
      tone(out, now + i * 0.36, { freq: 784, dur: 0.16, gain: 0.12, type: 'triangle' });
      tone(out, now + i * 0.36 + 0.17, { freq: 587, dur: 0.16, gain: 0.12, type: 'triangle' });
    }
  },
  // A rising chime: C, E, G, C.
  reward: (out, now) => {
    [523, 659, 784, 1047].forEach((freq, i) => tone(out, now + i * 0.08, { freq, dur: 0.45 - i * 0.05, gain: 0.1, type: 'triangle' }));
  },
};

/** Play an effect now, if sound has started and effects aren't muted. */
export function playEffect(effect: Effect): void {
  const buses = audioBuses();
  if (!buses || getVolumes().effects <= 0) return;
  try {
    PLAY[effect](buses.effects, buses.context.currentTime + 0.005);
  } catch {
    // An effect never stops the game.
  }
}

/** Every button click plays the click effect, unless the button asks for none (`data-sound="off"`). */
export function installClickSounds(root: HTMLElement | Document = document): void {
  root.addEventListener('click', (e) => {
    const target = e.target instanceof Element ? e.target.closest('button') : null;
    if (target && !target.disabled && target.dataset.sound !== 'off') playEffect('click');
  });
}
