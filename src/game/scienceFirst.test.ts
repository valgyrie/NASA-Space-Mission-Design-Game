import { describe, expect, it } from 'vitest';
import { DEFAULT_LOGO } from '../company/logo';
import { generateSite } from '../site/site';
import { SAVE_VERSION, type SaveData, loadGame, saveGame } from '../save/save';
import { STRINGS } from '../strings';
import { contractText } from '../ui/format';
import {
  CONTRACT_IDS,
  NEED_LINES,
  QUESTION_IDS,
  QUESTIONS,
  type ContractId,
  acceptContract,
  availableContracts,
  completeContract,
  contractById,
  isContractId,
  questionOffers,
} from './contracts';
import { launch, shipMission } from './mission';
import { newSiteState, placeAssemblyHall, placeHQ } from './siteState';
import { OPTION_IDS, type OptionId, cannotAnswer, checkDesign, choose, partsNeeded } from './spacecraft';

const site = generateSite('K7QXM2');
const freePlay = () => newSiteState({ lat: -33.86, lon: 151.21, start: 'anywhere' }, 'easy', 'freePlay');

function storage() {
  const data = new Map<string, string>();
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => { data.set(k, v); } };
}

describe('who needs the Data (ticket 42, Light)', () => {
  it('every generated Contract kind has its lines, each naming a kind of person', () => {
    for (const template of ['survey', 'weather', 'relay']) {
      for (let n = 0; n < NEED_LINES; n++) {
        const client = STRINGS[`contract.${template}.need.${n}.client` as keyof typeof STRINGS];
        const line = STRINGS[`contract.${template}.need.${n}.line` as keyof typeof STRINGS];
        expect(client).toMatch(/^An? /);
        expect(line.startsWith(client)).toBe(true);
      }
    }
  });

  it('chooses the line stably from the Contract ID, and only for generated Contracts', () => {
    const lines = new Set<string>();
    for (let n = 0; n < 60; n++) {
      const id: ContractId = `free-${n}`;
      const need = contractById(id).need!;
      expect(need).toBeGreaterThanOrEqual(0);
      expect(need).toBeLessThan(NEED_LINES);
      expect(contractById(id).need).toBe(need);
      expect(contractText(id, 'need')).toBe(STRINGS[`contract.${contractById(id).template}.need.${need}.line` as keyof typeof STRINGS]);
      expect(contractText(id, 'need').startsWith(contractText(id, 'client'))).toBe(true);
      lines.add(contractText(id, 'need'));
    }
    // Every line turns up somewhere.
    expect(lines.size).toBe(3 * NEED_LINES);
    for (const id of CONTRACT_IDS) expect(contractText(id, 'need')).toBe('');
    expect(contractText('explorer1', 'client')).toBe('US Army');
  });
});

describe('Choose a question (ticket 42, Full)', () => {
  it('offers every question in Free Play only, one at a time, and asks a finished one again', () => {
    const state = freePlay();
    expect(questionOffers(newSiteState())).toEqual([]);
    expect(acceptContract(newSiteState(), 'ask-storms-0')).toEqual({ ok: false, problem: 'notYet' });
    expect(questionOffers(state)).toEqual(QUESTION_IDS.map((q) => `ask-${q}-0`));
    expect(acceptContract(state, 'ask-storms-0')).toEqual({ ok: true });
    expect(questionOffers(state)).toEqual([]);
    expect(acceptContract(state, 'ask-seaIce-0')).toEqual({ ok: false, problem: 'notYet' });
    // The generated offers carry on beside it.
    expect(availableContracts(state)).toHaveLength(3);
    completeContract(state, 'ask-storms-0');
    expect(questionOffers(state)).toContain('ask-storms-1');
    expect(questionOffers(state)).toContain('ask-seaIce-0');
  });

  it('keeps question IDs strict, so saves only hold real questions', () => {
    for (const q of QUESTION_IDS) expect(isContractId(`ask-${q}-12`)).toBe(true);
    for (const bad of ['ask-moon-0', 'ask-storms-01', 'ask-storms-', 'ask-storms--1', 'ask-storms-0x']) expect(isContractId(bad)).toBe(false);
  });

  it('lets each question set the orbit, the Payload and the days, all shown as requirements', () => {
    for (const q of QUESTION_IDS) {
      const contract = contractById(`ask-${q}-0`);
      const geo = QUESTIONS[q].template === 'relay';
      expect(contract.kind).toBe('generated');
      expect(contract.question).toBe(q);
      expect(contract.requirements).toEqual([
        { kind: 'orbit', orbit: geo ? 'geostationary' : 'lowEarthOrbit' },
        { kind: 'payload', payload: { survey: 'radiationDetector', weather: 'tvCamera', relay: 'transponder' }[QUESTIONS[q].template] },
        { kind: 'dataDays', days: QUESTIONS[q].days },
      ]);
      for (const field of ['name', 'text', 'client', 'need', 'orbit']) expect(STRINGS).toHaveProperty([`question.${q}.${field}`]);
      expect(contractText(contract.id)).toBe(STRINGS[`question.${q}.name` as keyof typeof STRINGS]);
    }
    // Sea ice is near the poles: only a steep orbit passes over it.
    expect(contractById('ask-seaIce-0').inclinationDeg).toBeGreaterThan(70);
  });

  it('greys out exactly the options that cannot answer the question, each with a reason', () => {
    const greyed = (id: ContractId) => OPTION_IDS.filter((o) => cannotAnswer(contractById(id), o));
    expect(greyed('ask-storms-0')).toEqual(['radiationDetector', 'transponder']);
    expect(greyed('ask-seaIce-0')).toEqual(['radiationDetector', 'transponder']);
    expect(greyed('ask-radiation-0')).toEqual(['tvCamera', 'transponder']);
    expect(greyed('ask-farCall-0')).toEqual(['noEngine', 'radiationDetector', 'tvCamera']);
    for (const q of QUESTION_IDS) for (const o of greyed(`ask-${q}-0`)) expect(STRINGS).toHaveProperty([`question.${q}.no.${o}`]);
    // Other Contracts grey out nothing.
    for (const id of ['free-0', 'free-2', 'syncom3'] as const) expect(greyed(id)).toEqual([]);
  });

  it('flies a question Contract through the usual rules and keeps it through reload', () => {
    const state = freePlay();
    state.money = 20_000_000;
    placeHQ(site, state);
    placeAssemblyHall(site, state).level = 3;
    expect(acceptContract(state, 'ask-seaIce-0').ok).toBe(true);
    const ids: OptionId[] = ['mediumBus', 'solarCells', 'smallBattery', 'simpleAntenna', 'spin', 'noEngine', 'tvCamera'];
    for (const id of ids) expect(choose(state.design, id, state)).toBe(true);
    for (const part of partsNeeded(state.design)) { state.parts[part] += 1; state.betterParts[part] = [1]; }
    expect(checkDesign(state, state.design).ready).toBe(true);
    expect(shipMission(state, state.design).ok).toBe(true);
    const store = storage();
    const saved: SaveData = { version: SAVE_VERSION, company: { name: 'Comet Works', logo: { ...DEFAULT_LOGO } }, site: { seed: 'K7QXM2' }, state };
    expect(saveGame(store, saved)).toBe(true);
    expect(loadGame(store)).toEqual(saved);
    state.day = state.mission!.readyDay;
    let result = launch(state, 'K7QXM2');
    for (let d = 0; !result && d < 40; d++) { state.day += 1; result = launch(state, 'K7QXM2'); }
    expect(result?.report.success).toBe(true);
    expect(state.completed).toContain('ask-seaIce-0');
  });
});
