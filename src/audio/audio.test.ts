import { readFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { DEFAULT_VOLUME, MUSIC, TRACK_IDS, loops, volumeFrom } from './tracks';

describe('audio', () => {
  it('keeps safe defaults for missing or malformed settings, clamps levels and preserves mute', () => {
    for (const raw of [null, '{broken', 'null', '42']) expect(volumeFrom(raw)).toEqual(DEFAULT_VOLUME);
    expect(volumeFrom('{"music":0,"effects":1}')).toEqual({ music: 0, effects: 1 });
    expect(volumeFrom('{"music":-3,"effects":9}')).toEqual({ music: 0, effects: 1 });
    expect(volumeFrom('{"music":"loud","effects":0.4}')).toEqual({ music: .5, effects: .4 });
  });

  it('uses each received track, alternates the Site pair and keeps stingers and history as one-shots', () => {
    expect([...new Set(Object.values(MUSIC).flat())].sort()).toEqual([...TRACK_IDS].sort());
    expect(MUSIC.site).toEqual(['site-calm-a', 'site-calm-b']);
    for (const scene of ['site', 'designer', 'orbit', 'anomaly'] as const) expect(loops(scene)).toBe(true);
    for (const scene of ['menu', 'launch', 'success', 'failure', 'history'] as const) expect(loops(scene)).toBe(false);
  });

  it('ships the measured web files at the target loudness and peak, with a complete credit ledger', () => {
    const measured = JSON.parse(readFileSync('docs/audio/levels.json', 'utf8')) as Record<string, { lufs: number; truePeakDb: number; bytes: number; sha256: string }>;
    const credits = readFileSync('docs/audio/README.md', 'utf8');
    expect(Object.keys(measured).sort()).toEqual([...TRACK_IDS].sort());
    // MP3 data under a neutral extension, so download managers do not intercept the game's requests.
    expect(readdirSync('public/audio/music').sort()).toEqual(TRACK_IDS.map((id) => id + '.music').sort());
    let total = 0;
    for (const id of TRACK_IDS) {
      const path = 'public/audio/music/' + id + '.music';
      expect(readFileSync(path).subarray(0, 3).toString('latin1'), id).toBe('ID3');
      const info = measured[id]!;
      expect(Math.abs(info.lufs + 16), id).toBeLessThanOrEqual(.2);
      expect(info.truePeakDb, id).toBeLessThanOrEqual(-1);
      expect(statSync(path).size, id).toBe(info.bytes);
      expect(createHash('sha256').update(readFileSync(path)).digest('hex'), id).toBe(info.sha256);
      expect(credits).toContain(path);
      total += info.bytes;
    }
    expect(total).toBeLessThan(17 * 1024 * 1024);
  });

  it('retains the approved loop windows and short stinger lengths', () => {
    const measured = JSON.parse(readFileSync('docs/audio/levels.json', 'utf8'));
    for (const [id, from, to] of [['site-calm-a', 0, 165], ['site-calm-b', 5, 153], ['designer-focus', 0, 115], ['flight-orbit', 2, 155], ['anomaly', 10, 55]] as const) {
      expect(measured[id].sourceStart).toBe(from);
      expect(measured[id].sourceEnd).toBe(to);
      expect(measured[id].seconds).toBeCloseTo(to - from, 0);
    }
    expect(measured['stinger-success'].seconds).toBeCloseTo(10.6, 0);
    expect(measured['stinger-failure'].seconds).toBeCloseTo(8.5, 0);
  });
});
