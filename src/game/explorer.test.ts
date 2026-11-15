import { describe, expect, it } from 'vitest';
import { acceptContract } from './contracts';
import { designReview } from './designReview';
import {
  CHECKLIST_COVERS,
  chanceWord,
  dayPhase,
  designWith,
  explorerChecklist,
  gaugeChange,
  ghostLayout,
  optionLevels,
  whatIf,
} from './explorer';
import { isExplorer } from './modes';
import { type SiteState, newSiteState } from './siteState';
import { type Gauge, type OptionId, OPTIONS, checkDesign, choose, optionsFor } from './spacecraft';

const EXPLORER: OptionId[] = ['smallBus', 'batteriesOnly', 'largeBattery', 'simpleAntenna', 'spin', 'radiationDetector'];

function company(ids: OptionId[] = EXPLORER): SiteState {
  const state = newSiteState();
  state.money = 50_000_000;
  state.assemblyHall = { x: 0, z: 0, level: 3, upgradeDay: null };
  acceptContract(state, 'explorer1');
  for (const id of ids) choose(state.design, id);
  return state;
}

const g = (value: number, target: number, sense: Gauge['sense'], status: Gauge['status'] = 'ok'): Gauge => ({ value, target, sense, status });

describe('modes', () => {
  it('Explorer is the easy difficulty', () => {
    expect(isExplorer({ difficulty: 'easy' })).toBe(true);
    expect(isExplorer({ difficulty: 'advanced' })).toBe(false);
    expect(isExplorer(null)).toBe(false);
  });
});

describe('ghost preview', () => {
  it('swaps one option into its slot and leaves the rest', () => {
    const state = company();
    const next = designWith(state.design, 'smallBattery');
    expect(next.battery).toBe('smallBattery');
    expect(next.bus).toBe('smallBus');
    expect(state.design.battery).toBe('largeBattery');
  });

  it('a smaller battery lowers Power and Mass: Power worse, Mass better', () => {
    const state = company();
    const changes = whatIf(state, state.design, 'smallBattery');
    expect(changes.power.change).toBe('down');
    expect(changes.power.better).toBe(false);
    expect(changes.mass.change).toBe('down');
    expect(changes.mass.better).toBe(true);
    // The same numbers the bars use.
    expect(changes.power.after).toEqual(checkDesign(state, designWith(state.design, 'smallBattery')).gauges.power);
  });

  it('picking the option already chosen changes nothing', () => {
    const state = company();
    const changes = whatIf(state, state.design, 'largeBattery');
    for (const c of Object.values(changes)) {
      expect(c.change).toBe('same');
      expect(c.better).toBeNull();
    }
  });

  it('applies the screen adjustment to both checks', () => {
    const state = company();
    const changes = whatIf(state, state.design, 'smallBattery', (check) => {
      check.gauges.budget.value += 1_000;
    });
    expect(changes.budget.before.value).toBe(checkDesign(state, state.design).gauges.budget.value + 1_000);
  });

  it('says a bar turning short is worse, and turning ok is better', () => {
    expect(gaugeChange(g(5, 8, 'max'), g(9, 8, 'max', 'short')).better).toBe(false);
    expect(gaugeChange(g(5, 8, 'min', 'short'), g(9, 8, 'min')).better).toBe(true);
    expect(gaugeChange(g(0, 8, 'min', 'waiting'), g(9, 8, 'min')).change).toBe('up');
    expect(gaugeChange(g(5, 8, 'min'), g(0, 8, 'min', 'waiting')).better).toBeNull();
  });

  it('puts the fill and the ghost on one scale', () => {
    const layout = ghostLayout(g(4, 8, 'min', 'short'), g(16, 8, 'min'));
    expect(layout.ghost).toBeCloseTo(4 * layout.fill);
    expect(layout.ghost).toBeLessThan(1);
    expect(layout.target).toBeCloseTo(layout.fill * 2);
  });
});

describe('option levels', () => {
  it('ranks the batteries from least to most energy', () => {
    const batteries = optionsFor('battery', 'advanced');
    const level = (id: OptionId) => optionLevels(OPTIONS[id], batteries).find((l) => l.stat === 'battery')!.level;
    expect(level('smallBattery')).toBe(1);
    expect(level('largeBattery')).toBe(3);
    expect(level('mediumBattery')).toBe(1);
  });

  it('leaves out numbers an option does not have, and Mass without a Part', () => {
    const spin = optionLevels(OPTIONS.spin, optionsFor('pointing'));
    expect(spin).toEqual([]);
    const antenna = optionLevels(OPTIONS.simpleAntenna, optionsFor('comms', 'easy')).map((l) => l.stat);
    expect(antenna).toEqual(['mass', 'sends', 'uses']);
  });
});

describe('time and chance in words', () => {
  it('turns day N of M into early, halfway or near the end', () => {
    expect(dayPhase(3, 30)).toBe('early');
    expect(dayPhase(16, 30)).toBe('halfway');
    expect(dayPhase(27, 30)).toBe('late');
    expect(dayPhase(0, 0)).toBe('early');
  });

  it('turns a success estimate into a word', () => {
    expect(chanceWord(95)).toBe('great');
    expect(chanceWord(75)).toBe('good');
    expect(chanceWord(50)).toBe('fair');
    expect(chanceWord(10)).toBe('poor');
  });
});

describe('Explorer checklist', () => {
  const list = (state: SiteState) =>
    explorerChecklist(designReview(state, state.design), checkDesign(state, state.design), state.design);

  it('ticks every line for the Explorer 1 design', () => {
    const lines = list(company());
    expect(lines.map((l) => l.key)).toEqual(['orbitMass.ok', 'payload.ok', 'battery.ok', 'data.ok', 'communications.ok', 'time.ok', 'budget.ok', expect.stringMatching(/^spare\./)]);
    expect(lines.filter((l) => l.mark === 'no')).toEqual([]);
  });

  it('crosses the battery when it runs out, in plain words', () => {
    const lines = list(company(['smallBus', 'batteriesOnly', 'smallBattery', 'simpleAntenna', 'spin', 'radiationDetector']));
    const line = lines.find((l) => l.key.startsWith('battery.'));
    expect(line).toEqual({ mark: 'no', key: 'battery.no' });
  });

  it('crosses the money line when the Company is short', () => {
    const state = company();
    state.money = 0;
    expect(list(state).find((l) => l.key.startsWith('budget.'))).toEqual({ mark: 'no', key: 'budget.no' });
  });

  it('warns when the antenna cannot send the Data home', () => {
    const state = company(['mediumBus', 'solarCells', 'largeBattery', 'lowPowerAntenna', 'spin', 'tvCamera']);
    const line = list(state).find((l) => l.key.startsWith('communications.'))!;
    expect(line.mark).toBe('no');
  });

  it('covers the plan problems that have their own lines', () => {
    expect(CHECKLIST_COVERS).toEqual(['tooHeavy', 'cantReach', 'busFull', 'money']);
  });
});
