import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { sceneFor, type OnScreen } from './scene';
import { DEFAULT_VOLUMES, VOLUME_KEY, gainFor, loadVolumes, saveVolumes } from './settings';
import { CUES, LOOP_FADE_S, TRACKS, type TrackId, handOverAt, nextInCue } from './tracks';

const ids = Object.keys(TRACKS) as TrackId[];

describe('music cues', () => {
  it('alternates the Site tracks for ever', () => {
    const cue = CUES.site;
    expect(nextInCue(cue, 0)).toBe(1);
    expect(nextInCue(cue, 1)).toBe(0);
  });

  it('repeats a single looping track', () => {
    expect(nextInCue(CUES.designer, 0)).toBe(0);
    expect(nextInCue(CUES.anomaly, 0)).toBe(0);
  });

  it('stops after a one-shot track', () => {
    expect(nextInCue(CUES.menu, 0)).toBeNull();
    expect(nextInCue(CUES.success, 0)).toBeNull();
    expect(nextInCue(CUES.history, 0)).toBeNull();
  });

  it('starts the next play so the crossfade ends with the track', () => {
    expect(handOverAt(165.5)).toBe(165.5 - LOOP_FADE_S);
    // Never more than a quarter of a short track.
    expect(handOverAt(8)).toBe(6);
  });

  it('plays every track somewhere', () => {
    const used = new Set<string>(Object.values(CUES).flat());
    expect([...used].sort()).toEqual([...ids].sort());
  });
});

describe('music files', () => {
  const files = readdirSync('public/audio/music').sort();
  const readme = readFileSync('docs/audio/README.md', 'utf8');

  it('has one file per track and no others', () => {
    expect(files).toEqual(ids.map((id) => `${id}.mp3`).sort());
  });

  it('lists every audio file in the audio credits', () => {
    const credits = readme.slice(readme.indexOf('## Credits'));
    for (const dir of readdirSync('public/audio')) {
      for (const file of readdirSync(`public/audio/${dir}`)) expect(credits).toContain(`public/audio/${dir}/${file}`);
    }
  });

  it('loops the tracks the audio plan says loop', () => {
    for (const id of ids) {
      const row = readme.split('\n').find((line) => line.startsWith('| `') && line.includes(`\`${id}\``) && /\| (Yes|No) \|$/.test(line));
      const loops = row?.trim().endsWith('Yes |');
      expect(loops, id).toBe(TRACKS[id].loop);
    }
  });
});

describe('scene music', () => {
  const none: OnScreen = { launch: null, report: null, history: false, designer: false, space: false };

  it('plays the calm Site music when nothing is open', () => {
    expect(sceneFor(none)).toBe('site');
  });

  it('follows the Launch from the climb to the flight and any Anomaly', () => {
    expect(sceneFor({ ...none, launch: 'ascent' })).toBe('launch');
    expect(sceneFor({ ...none, launch: 'flight' })).toBe('flight');
    expect(sceneFor({ ...none, launch: 'anomaly' })).toBe('anomaly');
  });

  it('ends a Mission with its stinger, then the Real History music', () => {
    expect(sceneFor({ ...none, report: 'success' })).toBe('success');
    expect(sceneFor({ ...none, report: 'failure' })).toBe('failure');
    expect(sceneFor({ ...none, history: true })).toBe('history');
  });

  it('plays the designer and orbit music on their screens', () => {
    expect(sceneFor({ ...none, designer: true })).toBe('designer');
    expect(sceneFor({ ...none, space: true })).toBe('flight');
    // A Real History card covers whatever is under it.
    expect(sceneFor({ ...none, designer: true, history: true })).toBe('history');
  });
});

describe('volume settings', () => {
  const store = () => {
    const data = new Map<string, string>();
    return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
  };

  it('starts at the defaults', () => {
    expect(loadVolumes(store())).toEqual(DEFAULT_VOLUMES);
    expect(loadVolumes(null)).toEqual(DEFAULT_VOLUMES);
  });

  it('remembers what was set', () => {
    const s = store();
    saveVolumes(s, { music: 0.25, effects: 0 });
    expect(loadVolumes(s)).toEqual({ music: 0.25, effects: 0 });
  });

  it('ignores broken or out-of-range values', () => {
    const s = store();
    s.setItem(VOLUME_KEY, '{"music": 7, "effects": "loud"}');
    expect(loadVolumes(s)).toEqual({ music: 1, effects: DEFAULT_VOLUMES.effects });
    s.setItem(VOLUME_KEY, 'not json');
    expect(loadVolumes(s)).toEqual(DEFAULT_VOLUMES);
  });

  it('turns the slider into a gain that is silent at zero and full at the top', () => {
    expect(gainFor(0)).toBe(0);
    expect(gainFor(1)).toBe(1);
    expect(gainFor(0.5)).toBe(0.25);
  });
});
