import { describe, expect, it } from 'vitest';
import { RECIPES } from './balance';
import { acceptContract } from './contracts';
import { buyPrice } from './market';
import { newSiteState } from './siteState';
import {
  type Design,
  type OptionId,
  OPTION_IDS,
  SLOTS,
  buyMissing,
  checkDesign,
  choose,
  costToBuy,
  emptyDesign,
  emptySlots,
  isUnlocked,
  optionsFor,
  partsToBuy,
  spacecraftMass,
} from './spacecraft';

/** The tutorial's Explorer 1: Small Bus, batteries only, Large Battery, Simple Antenna, spin, radiation detector. */
const EXPLORER: OptionId[] = ['smallBus', 'batteriesOnly', 'largeBattery', 'simpleAntenna', 'spin', 'radiationDetector'];

function design(...ids: OptionId[]): Design {
  const d = emptyDesign();
  for (const id of ids) choose(d, id);
  return d;
}

const swap = (from: OptionId, to: OptionId) => EXPLORER.map((id) => (id === from ? to : id));

describe('Mission Designer slots', () => {
  it('offers at least one unlocked option in every slot', () => {
    for (const slot of SLOTS) expect(optionsFor(slot).some((o) => isUnlocked(newSiteState(), o.id)), slot).toBe(true);
  });

  it('puts every option in exactly one slot, and every Part it needs exists', () => {
    for (const id of OPTION_IDS) {
      const options = SLOTS.flatMap((slot) => optionsFor(slot)).filter((o) => o.id === id);
      expect(options).toHaveLength(1);
      if (options[0]!.part) expect(RECIPES[options[0]!.part]).toBeDefined();
    }
  });

  it('keeps Solar Cells locked until the Vanguard 1 card (Explorer 1 flew on batteries)', () => {
    const state = newSiteState();
    const d = emptyDesign();
    expect(choose(d, 'solarCells', state)).toBe(false);
    expect(d.power).toBeNull();
    state.history.push('vanguard1');
    expect(isUnlocked(state, 'solarCells')).toBe(true);
    expect(choose(d, 'solarCells', state)).toBe(true);
    expect(d.power).toBe('solarCells');
  });

  it('replaces the option in a slot', () => {
    const d = design('smallBus', 'mediumBus');
    expect(d.bus).toBe('mediumBus');
    expect(emptySlots(d)).toEqual(['power', 'battery', 'comms', 'pointing', 'payload']);
  });
});

describe('checking a design', () => {
  it('passes all six resources with the Explorer 1 design', () => {
    const check = checkDesign(newSiteState(), design(...EXPLORER));
    expect(check.problems).toEqual([]);
    expect(Object.values(check.gauges).map((g) => g.status)).toEqual(Array(6).fill('ok'));
    expect(check.ready).toBe(true);
  });

  it('weighs the Bus and everything on it', () => {
    expect(spacecraftMass(design(...EXPLORER))).toBe(3 + 6 + 1 + 1.5);
  });

  it('is too heavy for Juno I with a Medium Bus', () => {
    const check = checkDesign(newSiteState(), design(...swap('smallBus', 'mediumBus')));
    expect(check.gauges.mass.status).toBe('short');
    expect(check.problems).toContainEqual({ kind: 'tooHeavy', overKg: spacecraftMass(design(...swap('smallBus', 'mediumBus'))) - 14, bigger: null });
  });

  it('runs out of Power before 30 days with a Small Battery, so Data falls short too', () => {
    const check = checkDesign(newSiteState(), design(...swap('largeBattery', 'smallBattery')));
    expect(check.gauges.power.status).toBe('short');
    expect(check.gauges.data.status).toBe('short');
    expect(check.lastsDays).toBeLessThan(30);
    expect(check.problems).toEqual([{ kind: 'powerShort', lastsDays: check.lastsDays, needDays: 30 }]);
  });

  it('waits for the slots a resource depends on instead of warning', () => {
    const check = checkDesign(newSiteState(), design('smallBus'));
    expect(check.gauges.power).toMatchObject({ status: 'waiting', waitingFor: 'power' });
    expect(check.gauges.communications).toMatchObject({ status: 'waiting', waitingFor: 'comms' });
    expect(check.gauges.mass.status).toBe('ok');
    expect(check.problems).toEqual([]);
    expect(check.ready).toBe(false);
  });

  it('uses the accepted Contract for the deadline', () => {
    const state = newSiteState();
    acceptContract(state, 'explorer1');
    state.day = 340; // 25 days left: not enough to build (30), ship (7) and fly (30)
    const check = checkDesign(state, design(...EXPLORER));
    expect(check.goal.status).toBe('accepted');
    expect(check.gauges.time.status).toBe('short');
    expect(check.problems).toContainEqual({ kind: 'late', needDays: 67, daysLeft: 25 });
  });

  it('is short on Budget when the money cannot buy the missing Parts', () => {
    const state = { ...newSiteState(), money: 1_000 };
    const check = checkDesign(state, design(...EXPLORER));
    expect(check.gauges.budget.status).toBe('short');
    expect(check.problems).toContainEqual({ kind: 'money', short: costToBuy(state, design(...EXPLORER)) - 1_000 });
  });
});

describe('Parts from the Warehouse or the Market', () => {
  it('counts only the Parts the Warehouse lacks', () => {
    const state = newSiteState();
    state.parts.smallBus = 1;
    state.parts.largeBattery = 2;
    expect(partsToBuy(state, design(...EXPLORER))).toEqual(['simpleAntenna', 'radiationDetector']);
    expect(costToBuy(state, design(...EXPLORER))).toBe(buyPrice('simpleAntenna') + buyPrice('radiationDetector'));
  });

  it('buys every missing Part at once', () => {
    const state = { ...newSiteState(), warehouses: [{ x: 0, z: 0, level: 1, upgradeDay: null }] };
    const cost = costToBuy(state, design(...EXPLORER));
    expect(buyMissing(state, design(...EXPLORER))).toEqual({ ok: true });
    expect(state.money).toBe(newSiteState().money - cost);
    expect(partsToBuy(state, design(...EXPLORER))).toEqual([]);
    expect(checkDesign(state, design(...EXPLORER)).gauges.budget.value).toBe(0);
  });

  it('buys nothing when the money does not cover all of them', () => {
    const state = { ...newSiteState(), money: buyPrice('smallBus') };
    expect(buyMissing(state, design(...EXPLORER))).toEqual({ ok: false, problem: 'money' });
    expect(state.parts.smallBus).toBe(0);
  });
});
