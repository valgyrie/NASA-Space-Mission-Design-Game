import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { MINIGAME_SETS, shuffledSet } from './catalogue';
import { BEST_KEY, MinigameRun, readBest, recordBest } from './shell';
import { nextChunk, PLUTO_CORE, PLUTO_SHELL, plutoCatch, plutoNeed, plutoStars, type PlutoBuild } from './pluto';
import { batteryStep, DRILL_TIME, inSand, pickSpots, ROVER_SAMPLES, RoverMission, roverStars } from './rover';
import { PLANET_DIAMETERS_KM, PLANET_RADII, PLANETS, planetHint, planetStars, rightSlot, sizeOrder } from './planets';
import { MINIGAME_LEVELS } from './types';

/** A tiny in-memory Storage. */
function memory(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => { data.set(k, v); },
    data,
  };
}

/** A repeatable 0–1 sequence. */
function sequence(values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length]!;
}

describe('Minigames shell', () => {
  it('shuffles each level so every game comes once', () => {
    for (const level of MINIGAME_LEVELS) {
      for (const random of [() => 0, () => 0.999, sequence([0.1, 0.7, 0.4]), Math.random]) {
        const set = shuffledSet(level, random);
        expect(set).toHaveLength(3);
        expect([...set].sort()).toEqual([...MINIGAME_SETS[level]].sort());
      }
    }
  });

  it('keeps the best stars per game, and only better ones', () => {
    const store = memory();
    expect(readBest(store)).toEqual({});
    expect(recordBest(store, 'pluto', 2)).toEqual({ best: 2, isNew: true });
    expect(recordBest(store, 'pluto', 1)).toEqual({ best: 2, isNew: false });
    expect(recordBest(store, 'pluto', 3)).toEqual({ best: 3, isNew: true });
    expect(recordBest(store, 'rover', 0)).toEqual({ best: 0, isNew: false });
    expect(readBest(store)).toEqual({ pluto: 3, rover: 0 });
    expect(JSON.parse(store.data.get(BEST_KEY)!)).toEqual({ pluto: 3, rover: 0 });
  });

  it('survives broken or blocked storage', () => {
    expect(readBest(memory({ [BEST_KEY]: 'not json' }))).toEqual({});
    expect(readBest(memory({ [BEST_KEY]: '{"pluto":7,"rover":"3","planets":2,"other":3}' }))).toEqual({ planets: 2 });
    expect(readBest(null)).toEqual({});
    const blocked = {
      getItem: () => { throw new Error('blocked'); },
      setItem: () => { throw new Error('blocked'); },
    };
    expect(readBest(blocked)).toEqual({});
    expect(recordBest(blocked, 'planets', 3)).toEqual({ best: 3, isNew: true });
  });

  it('runs through a set, keeping the better try of each game', () => {
    const run = new MinigameRun(['rover', 'pluto', 'planets']);
    expect(run.current).toBe('rover');
    expect(run.number).toBe(1);
    run.record('rover', { won: false, stars: 0 });
    run.record('rover', { won: true, stars: 2 });
    run.record('rover', { won: true, stars: 1 });
    expect(run.result('rover')?.stars).toBe(2);
    expect(run.next()).toBe(true);
    expect(run.next()).toBe(true);
    expect(run.isLast).toBe(true);
    expect(run.next()).toBe(false);
    run.record('planets', { won: true, stars: 3 });
    expect(run.totalStars()).toBe(5);
    expect(run.maxStars()).toBe(9);
  });

  it('writes no player text outside strings.ts in the new files', () => {
    for (const file of ['src/ui/minigames.ts', 'src/minigames/pluto.ts', 'src/minigames/rover.ts', 'src/minigames/planets.ts', 'src/minigames/kit.ts']) {
      const code = readFileSync(file, 'utf8');
      // Canvas text and element text must come from t().
      expect(code.match(/fillText\(\s*['"`][A-Za-z]/g), file).toBeNull();
      expect(code.match(/\bel\('[^']*',\s*'[^']*',\s*['"`][A-Za-z]/g), file).toBeNull();
      expect(code.match(/\bbutton\('[^']*',\s*['"`][A-Za-z]/g), file).toBeNull();
    }
  });
});

describe('Build Pluto', () => {
  it('builds the rocky core first, then the icy shell', () => {
    let b: PlutoBuild = { core: 0, shell: 0 };
    expect(plutoNeed(b)).toBe('rock');
    // Ice slides off until the core is done.
    expect(plutoCatch(b, 'ice').outcome).toBe('coreFirst');
    for (let i = 1; i <= PLUTO_CORE; i++) {
      const res = plutoCatch(b, 'rock');
      b = res.build;
      expect(res.outcome).toBe(i === PLUTO_CORE ? 'coreDone' : 'core');
    }
    expect(plutoNeed(b)).toBe('ice');
    expect(plutoCatch(b, 'rock').outcome).toBe('coreFull');
    for (let i = 1; i <= PLUTO_SHELL; i++) {
      const res = plutoCatch(b, 'ice');
      b = res.build;
      expect(res.outcome).toBe(i === PLUTO_SHELL ? 'built' : 'shell');
    }
    expect(plutoNeed(b)).toBeNull();
  });

  it('gas knocks off a piece, but never breaks a finished core', () => {
    expect(plutoCatch({ core: 3, shell: 0 }, 'gas')).toEqual({ build: { core: 2, shell: 0 }, outcome: 'gas', lost: 'rock' });
    expect(plutoCatch({ core: PLUTO_CORE, shell: 4 }, 'gas')).toEqual({ build: { core: PLUTO_CORE, shell: 3 }, outcome: 'gas', lost: 'ice' });
    expect(plutoCatch({ core: PLUTO_CORE, shell: 0 }, 'gas')).toEqual({ build: { core: PLUTO_CORE, shell: 0 }, outcome: 'gas', lost: null });
    expect(plutoCatch({ core: 0, shell: 0 }, 'gas').lost).toBeNull();
  });

  it('gives stars for dodging gas and catching what was needed', () => {
    expect(plutoStars(0, 0)).toBe(3);
    expect(plutoStars(1, 4)).toBe(3);
    expect(plutoStars(2, 0)).toBe(2);
    expect(plutoStars(3, 9)).toBe(2);
    expect(plutoStars(4, 0)).toBe(1);
    expect(plutoStars(0, 10)).toBe(1);
  });

  it('drops mostly what Pluto needs, and some gas', () => {
    expect(nextChunk('rock', 0.1)).toBe('gas');
    expect(nextChunk('rock', 0.5)).toBe('rock');
    expect(nextChunk('rock', 0.9)).toBe('ice');
    expect(nextChunk('ice', 0.5)).toBe('ice');
    expect(nextChunk('ice', 0.9)).toBe('rock');
  });
});

describe('Rover Rescue', () => {
  it('drills a sample only after Drill is held long enough, and keeps progress', () => {
    const m = new RoverMission();
    expect(m.drill(0, DRILL_TIME / 2)).toBe('drilling');
    expect(m.carried).toBe(0);
    expect(m.drill(0, DRILL_TIME / 2 + 0.01)).toBe('sampled');
    expect(m.carried).toBe(1);
    expect(m.drill(0, 1)).toBe('empty');
    expect(m.drill(9, 1)).toBe('empty');
  });

  it('studies carried samples at the lab and wins with all three', () => {
    const m = new RoverMission();
    m.drill(0, DRILL_TIME);
    m.drill(1, DRILL_TIME);
    expect(m.study()).toBe(2);
    expect(m.carried).toBe(0);
    expect(m.won).toBe(false);
    m.drill(2, DRILL_TIME);
    expect(m.study()).toBe(1);
    expect(m.studied).toBe(ROVER_SAMPLES);
    expect(m.won).toBe(true);
  });

  it('uses the battery to drive and drill, and charges it while parked', () => {
    const drive = batteryStep(1, { driving: 1, sand: false, drilling: false }, 1);
    const sand = batteryStep(1, { driving: 1, sand: true, drilling: false }, 1);
    const drill = batteryStep(1, { driving: 0, sand: false, drilling: true }, 1);
    expect(drive).toBeLessThan(1);
    expect(sand).toBeLessThan(drive);
    expect(drill).toBeLessThan(1);
    expect(batteryStep(0.5, { driving: 0, sand: false, drilling: false }, 1)).toBeGreaterThan(0.5);
    expect(batteryStep(0.01, { driving: 1, sand: true, drilling: false }, 10)).toBe(0);
    expect(batteryStep(0.99, { driving: 0, sand: false, drilling: false }, 10)).toBe(1);
  });

  it('places three glowing rocks apart, off soft sand', () => {
    for (let s = 0; s < 30; s++) {
      const spots = pickSpots(Math.random);
      expect(spots).toHaveLength(ROVER_SAMPLES);
      for (const a of spots) {
        expect(inSand(a.x, a.y)).toBe(false);
        for (const b of spots) if (a !== b) expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(200);
      }
    }
  });

  it('gives stars for time and battery left', () => {
    expect(roverStars(60, 0.5)).toBe(3);
    expect(roverStars(60, 0.1)).toBe(2);
    expect(roverStars(100, 0.9)).toBe(2);
    expect(roverStars(140, 0.9)).toBe(1);
  });
});

describe('Planet Parade', () => {
  it('orders the planets from the Sun as NASA lists them', () => {
    expect([...PLANETS]).toEqual(['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']);
  });

  it('sorts by size to the research note, both ways', () => {
    // docs/research/minigames.md: Mercury, Mars, Venus, Earth, Neptune, Uranus, Saturn, Jupiter.
    const note = readFileSync('docs/research/minigames.md', 'utf8');
    const line = note.match(/Smallest to biggest: ([A-Za-z, ]+)\./)![1]!;
    const fromNote = line.split(',').map((s) => s.trim().toLowerCase());
    expect(sizeOrder('up')).toEqual(fromNote);
    expect(sizeOrder('down')).toEqual([...fromNote].reverse());
    // And the diameters match the note.
    for (const p of PLANETS) {
      const km = note.match(new RegExp(`${p[0]!.toUpperCase()}${p.slice(1)} ([\\d,]+)`))![1]!.replace(/,/g, '');
      expect(PLANET_DIAMETERS_KM[p]).toBe(Number(km));
    }
  });

  it('draws bigger planets bigger', () => {
    const up = sizeOrder('up');
    for (let i = 1; i < up.length; i++) expect(PLANET_RADII[up[i]!]).toBeGreaterThan(PLANET_RADII[up[i - 1]!]);
  });

  it('knows each planet’s right place in both rounds', () => {
    expect(rightSlot(1, 'earth', 'up')).toBe(2);
    expect(rightSlot(2, 'jupiter', 'up')).toBe(7);
    expect(rightSlot(2, 'jupiter', 'down')).toBe(0);
    expect(rightSlot(2, 'mercury', 'down')).toBe(7);
  });

  it('gives a gentle hint after a wrong drop', () => {
    expect(planetHint(1, 'earth', 'up')).toBe('Earth is the 3rd planet from the Sun.');
    expect(planetHint(2, 'mercury', 'up')).toBe('Mercury is the smallest planet.');
    expect(planetHint(2, 'mars', 'up')).toBe('Mars is the 2nd smallest planet.');
    expect(planetHint(2, 'jupiter', 'down')).toBe('Jupiter is the biggest planet.');
    expect(planetHint(2, 'saturn', 'down')).toBe('Saturn is the 2nd biggest planet.');
    expect(planetHint(2, 'saturn', 'up')).toBe('Saturn is the 2nd biggest planet.');
    expect(planetHint(2, 'jupiter', 'up')).toBe('Jupiter is the biggest planet.');
    expect(planetHint(2, 'venus', 'down')).toBe('Venus is the 3rd smallest planet.');
  });

  it('gives stars from mistakes', () => {
    expect(planetStars(0)).toBe(3);
    expect(planetStars(1)).toBe(3);
    expect(planetStars(4)).toBe(2);
    expect(planetStars(5)).toBe(1);
  });
});
