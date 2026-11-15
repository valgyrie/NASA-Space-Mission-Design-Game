import { describe, expect, it } from 'vitest';
import {
  BATTERY_MAX_W,
  GAME_S,
  LOUVER_TOTAL,
  PARTS,
  PART_SPECS,
  type ThermalGame,
  bandShare,
  budgetW,
  downlinkAt,
  heatRate,
  loadW,
  louversOpen,
  moveLouver,
  newThermalGame,
  shadowSpans,
  stepThermal,
  sunlitAt,
  thermalStars,
  toggleHeater,
} from './thermalModel';

function play(g: ThermalGame, plan: (g: ThermalGame) => void = () => {}): ThermalGame {
  for (let i = 0; i < 10000 && g.state === 'playing'; i++) {
    plan(g);
    stepThermal(g, 1 / 30);
  }
  return g;
}

/** A careful operator: heaters on thermostats, louvers opened as a part nears the top of its band. */
function careful(g: ThermalGame, skip: string | null = null): void {
  for (const p of PARTS) {
    if (p === skip) continue;
    const [lo, hi] = PART_SPECS[p].op;
    const t = g.temp[p];
    if (!g.heater[p] && t < lo + 4) toggleHeater(g, p);
    if (g.heater[p] && t > lo + 12) toggleHeater(g, p);
    if (t > hi - 10) moveLouver(g, p, 1);
    if (t < (lo + hi) / 2 - 5 && g.louver[p] > 0) moveLouver(g, p, -1);
  }
}

describe('Too Hot, Too Cold: the model', () => {
  it('lasts four orbits, with the shadow about 37% of each', () => {
    expect(shadowSpans()).toHaveLength(4);
    const shadow = shadowSpans().reduce((s, [a, b]) => s + b - a, 0);
    expect(shadow / GAME_S).toBeGreaterThan(0.3);
    expect(sunlitAt(0)).toBe(true);
    expect(sunlitAt(shadowSpans()[0]![0] + 1)).toBe(false);
  });

  it('gives the battery the narrowest operating band', () => {
    const width = (p: (typeof PARTS)[number]) => PART_SPECS[p].op[1] - PART_SPECS[p].op[0];
    for (const p of PARTS) if (p !== 'battery') expect(width('battery')).toBeLessThan(width(p));
    for (const p of PARTS) {
      expect(PART_SPECS[p].survival[0]).toBeLessThan(PART_SPECS[p].op[0]);
      expect(PART_SPECS[p].survival[1]).toBeGreaterThan(PART_SPECS[p].op[1]);
    }
  });

  it('loses a part with no control at all', () => {
    const g = play(newThermalGame());
    expect(g.state).toBe('lost');
    expect(g.lostTo).not.toBe('flat');
    expect(thermalStars(g)).toBe(0);
  });

  it('freezes the battery in the first shadow without its heater', () => {
    const g = play(newThermalGame(), (g) => careful(g, 'battery'));
    expect(g.lostTo).toBe('battery');
    expect(g.timeS).toBeLessThan(shadowSpans()[0]![1] + 1);
  });

  it('stays in bounds with good control and wins', () => {
    const g = play(newThermalGame(), careful);
    expect(g.state).toBe('won');
    expect(bandShare(g)).toBeGreaterThan(0.8);
    expect(thermalStars(g)).toBeGreaterThanOrEqual(2);
    expect(g.charge).toBeGreaterThan(0.1);
  });

  it('runs the battery flat with every heater left on', () => {
    const g = newThermalGame();
    for (const p of PARTS) toggleHeater(g, p);
    play(g, (g) => {
      for (const p of PARTS) {
        if (!g.heater[p]) toggleHeater(g, p);
        moveLouver(g, p, 1);
      }
    });
    expect(g.state).toBe('lost');
  });

  it('heaters warm, open louvers cool', () => {
    const g = newThermalGame();
    const before = heatRate(g, 'battery');
    toggleHeater(g, 'battery');
    expect(heatRate(g, 'battery')).toBeGreaterThan(before);
    moveLouver(g, 'battery', 1);
    expect(heatRate(g, 'battery')).toBeLessThan(before + PART_SPECS.battery.heaterW / PART_SPECS.battery.capacity);
  });

  it('shares a limited number of louver steps', () => {
    const g = newThermalGame();
    let opened = 0;
    for (const p of PARTS) for (let i = 0; i < 2; i++) if (moveLouver(g, p, 1) === 'moved') opened++;
    expect(opened).toBe(LOUVER_TOTAL);
    expect(louversOpen(g)).toBe(LOUVER_TOTAL);
    expect(moveLouver(g, 'radio', 1)).toBe('full');
  });

  it('refuses or trips heaters over the power budget in the shadow', () => {
    const g = newThermalGame();
    const shadowDownlink = 33;
    expect(sunlitAt(shadowDownlink) || !downlinkAt(shadowDownlink)).toBe(false);
    while (g.state === 'playing' && g.timeS < shadowDownlink - 2) {
      careful(g);
      stepThermal(g, 0.05);
    }
    for (const p of PARTS) if (!g.heater[p]) toggleHeater(g, p);
    expect(PARTS.every((p) => g.heater[p])).toBe(true);
    expect(budgetW(g)).toBe(BATTERY_MAX_W);
    g.tripped = [];
    while (g.state === 'playing' && g.timeS < shadowDownlink + 0.1) stepThermal(g, 0.05);
    expect(g.tripped.length).toBeGreaterThan(0);
    expect(g.tripped[0]).toBe('instrument');
    expect(g.heater.battery).toBe(true);
    expect(loadW(g)).toBeLessThanOrEqual(budgetW(g));
  });
});
