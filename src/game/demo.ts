import { DEFAULT_LOGO } from '../company/logo';
import type { BuildingKind } from '../economy/part';
import { RAW_MATERIALS } from '../economy/rawMaterial';
import { SAVE_VERSION, type SaveData, type SaveStorage } from '../save/save';
import { generateSite } from '../site/site';
import { t } from '../strings';
import { acceptContract } from './contracts';
import { eraStartDay } from './eras';
import { siteClimateFor } from './places';
import { build, checkBuild, newSiteState, placeAssemblyHall, placeHQ } from './siteState';
import { choose, partsNeeded, type OptionId } from './spacecraft';

/** The Campaign Eras built so far. Add a prepared Company here when another Era is playable. */
export const DEMO_ERAS = [1, 2, 3, 5] as const;
export type DemoEra = (typeof DEMO_ERAS)[number];
export const DEMO_SEED = 'K7QXM2';
export const DEMO_SAVE_KEY = 'leap.demo';

/** All writes, including autosave and pagehide, go to the demo slot instead of the player's Company. */
export function demoStorage(storage: SaveStorage): SaveStorage {
  return {
    getItem: () => storage.getItem(DEMO_SAVE_KEY),
    setItem: (_key, value) => storage.setItem(DEMO_SAVE_KEY, value),
  };
}

/** Each demo's Milestone, the cards it has seen on accepting it, and its ready design. */
const DEMO_CONTRACT = { 1: 'explorer1', 2: 'telstar1', 3: 'apollo11', 5: 'artemis2' } as const;
const DEMO_CARDS = {
  1: ['explorer1Before'],
  2: ['telstar1Before'],
  3: ['saturnVBefore', 'apollo11Before'],
  5: ['artemis2Before'],
} as const;
const DEMO_DESIGN: Record<DemoEra, OptionId[]> = {
  1: ['smallBus', 'batteriesOnly', 'largeBattery', 'simpleAntenna', 'spin', 'noEngine', 'radiationDetector'],
  2: ['mediumBus', 'solarCells', 'smallBattery', 'simpleAntenna', 'spin', 'noEngine', 'transponder'],
  // Apollo 11: 41 kg in the Lunar Module's 45; the Dish Antenna reaches home from the Moon; the battery covers the night.
  3: ['largeBus', 'foldOutPanels', 'largeBattery', 'dishAntenna', 'spin', 'noEngine', 'sciencePackage'],
  // Artemis II: an 11.5 kg 12U CubeSat for a one-day Mission.
  5: ['cubeSatBus', 'solarCells', 'smallBattery', 'simpleAntenna', 'spin', 'noEngine', 'radiationDetector'],
};

/** A fresh ready-made save, using the same Site, rules and Parts as an ordinary Campaign. */
export function createDemo(era: DemoEra): SaveData {
  const state = newSiteState();
  const site = generateSite(DEMO_SEED, siteClimateFor(state.place));
  const hall = placeAssemblyHall(site, state);
  placeHQ(site, state).level = era;
  // Era 3 and the Artemis Era fly the Large Bus, which needs a level 3 Assembly Hall.
  hall.level = era === 1 ? 1 : era === 2 ? 2 : 3;
  state.day = eraStartDay(era);
  state.eraSeen = era;
  state.tutorial.skipped = true;
  // Prepared demo stock and budgets are game values, not historical costs.
  state.money = 20_000_000;
  if (era === 2) {
    state.completed = ['explorer1', 'tiros1'];
    state.history = ['explorer1Before', 'explorer1After', 'vanguard1', 'tiros1Before', 'tiros1After'];
    state.vehicle = 'thorDelta';
  }
  if (era >= 3) {
    state.completed = ['explorer1', 'tiros1', 'telstar1', 'syncom3', ...(era === 5 ? ['apollo11' as const] : [])];
    state.history = [
      'explorer1Before', 'explorer1After', 'vanguard1', 'tiros1Before', 'tiros1After',
      'telstar1Before', 'telstar1After', 'alouette1', 'syncom3Before', 'syncom3After',
      ...(era === 5 ? (['saturnVBefore', 'apollo11Before', 'apollo11After'] as const) : []),
    ];
    // Better Batteries from the research done so far: the lunar night leaves the Large Battery a thin margin.
    state.research = { processedKb: 2_000, tech: ['betterBatteries'] };
  }

  // Group the industry near the hall; Mines use the nearest free Deposit of each Raw Material.
  const tiles = site.tiles.map((tile, i) => ({ ...tile, x: i % site.size, z: Math.floor(i / site.size) }));
  tiles.sort((a, b) => (a.x - hall.x) ** 2 + (a.z - hall.z) ** 2 - (b.x - hall.x) ** 2 - (b.z - hall.z) ** 2);
  const add = (kind: BuildingKind, deposit?: (typeof RAW_MATERIALS)[number]) => {
    const tile = tiles.find((p) => (!deposit || p.deposit === deposit) && checkBuild(site, state, kind, p.x, p.z).ok);
    if (!tile) throw new Error('No room for a demo building');
    build(site, state, kind, tile.x, tile.z);
  };
  add('warehouse');
  for (const material of RAW_MATERIALS) add('mine', material);
  for (const kind of ['metalWorks', 'electronicsLab', 'batteryPlant'] as const) add(kind);
  if (era >= 2) {
    add('solarFab');
    add('researchLab');
    add('groundStation');
    state.factories.find((f) => f.kind === 'metalWorks')!.making = era === 5 ? 'cubeSatBus' : 'mediumBus';
    state.factories.find((f) => f.kind === 'electronicsLab')!.making = era === 2 ? 'transponder' : era === 3 ? 'sciencePackage' : 'relayRadio';
  }
  for (const material of RAW_MATERIALS) state.stock[material] = 300;

  const contract = DEMO_CONTRACT[era];
  acceptContract(state, contract);
  state.history.push(...DEMO_CARDS[era]);
  for (const option of DEMO_DESIGN[era]) choose(state.design, option, state);
  // Enough for the prepared design and a second attempt, plus a battery choice to experiment with.
  for (const part of partsNeeded(state.design)) state.parts[part] = 2;
  state.parts.smallBattery = 2;
  state.parts.largeBattery = 2;
  // The Artemis demo goes on to Artemis III and IV: Parts for a camera satellite and a lunar relay are in stock too.
  if (era === 5) for (const part of ['mediumBus', 'largeBus', 'tvCamera', 'relayRadio', 'foldOutPanels', 'dishAntenna', 'mainEngine'] as const) state.parts[part] = 1;
  state.money = era === 1 ? 2_000_000 : era === 2 ? 8_000_000 : 20_000_000;

  return {
    version: SAVE_VERSION,
    company: { name: t('demo.company'), logo: { ...DEFAULT_LOGO } },
    site: { seed: DEMO_SEED },
    state,
  };
}
