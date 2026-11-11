import { type SiteBuildingKind, isFactory } from '../economy/part';
import type { RawMaterial } from '../economy/rawMaterial';
import { LAB_KB_PER_DAY, MINE_OUTPUT_PER_DAY, RECIPES, TECH_TREE, WAREHOUSE_STORAGE_KG } from '../game/balance';
import { ERA_YEARS, type Era, LAST_ERA, eraMilestones, eraOf, isPartOpen, milestonesDone } from '../game/eras';
import { groundBoost } from '../game/spacecraft';
import { missionStage } from '../game/mission';
import { type BusId, busesAt, checkUpgrade, maxLevel, nextUpgrade, startUpgrade, upgradeDaysLeft } from '../game/upgrades';
import { TECH_IDS, buyTech, dataWaiting, labRate, nextPointShare, researchPoints } from '../game/research';
import {
  type Building,
  type Factory,
  type SiteState,
  buildingAt,
  levelBoost,
  mineMaterial,
  mineOutput,
  missingInputs,
  partMass,
  partsMadeBy,
  setMaking,
  storageFree,
  warehouseStorage,
} from '../game/siteState';
import type { Site } from '../site/site';
import { t } from '../strings';
import { formatDays, formatDecimal, formatMoney, formatNumber } from './format';
import { itemColour, storageText } from './marketPanel';
import { stockText } from './missionDesigner';

export interface BuildingPanel {
  /** Show the building on tile (x, z), or close the panel if nothing stands there. */
  show(x: number, z: number): void;
  close(): void;
  readonly isOpen: boolean;
  /** Refresh status and progress. Cheap enough to call every frame. */
  update(): void;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  e.className = className;
  if (text) e.textContent = text;
  return e;
}

function setText(e: HTMLElement, text: string): void {
  if (e.textContent !== text) e.textContent = text;
}

function inputsText(inputs: Partial<Record<RawMaterial, number>>): string {
  return (Object.entries(inputs) as [RawMaterial, number][])
    .map(([m, kg]) => t('panel.input', { kg: formatNumber(Math.ceil(kg)), material: t(`material.${m}`) }))
    .join(t('panel.and'));
}

/**
 * A panel about one building: what it does, how it is doing, its level and Upgrade, and for a Factory, which
 * Part it makes. `onChange` runs after an Upgrade starts, so it can be saved.
 */
export function showBuildingPanel(root: HTMLElement, site: Site, state: SiteState, onChange: () => void = () => {}): BuildingPanel {
  const panel = el('div', 'panel side-panel building-panel');
  panel.hidden = true;
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-labelledby', 'building-heading');
  const head = el('div', 'side-head');
  const heading = el('h2', '');
  heading.id = 'building-heading';
  const close = el('button', 'small icon-button', t('panel.close'));
  close.type = 'button';
  close.title = t('panel.closeName');
  close.setAttribute('aria-label', t('panel.closeName'));
  head.append(heading, close);
  const body = el('div', 'side-body');
  panel.append(head, body);
  root.append(panel);

  let tile: { x: number; z: number } | null = null;
  /** Rebuilt by `show`; refreshes the moving numbers. */
  let refresh = () => {};

  const factoryBody = (factory: Factory) => {
    const mark = el('p', 'side-note');
    const status = el('p', 'side-note');
    const bar = el('div', 'progress');
    const fill = el('div', 'progress-fill');
    bar.append(fill);
    const list = el('div', 'part-choices');
    list.append(el('h3', '', t('panel.makes')));
    // Parts of a later Era are left out until the Company reaches it.
    const choices = partsMadeBy(factory.kind).filter((part) => isPartOpen(state, part)).map((part) => {
      const recipe = RECIPES[part];
      const b = el('button', 'part-choice');
      b.type = 'button';
      const top = el('span', 'part-name');
      const dot = el('span', 'dot');
      dot.style.background = itemColour(part);
      top.append(dot, t(`part.${part}`));
      const recipeLine = el('span', 'part-sub', t('panel.recipe', { inputs: inputsText(recipe.inputs), days: recipe.days }));
      const mass = el('span', 'part-sub');
      const made = el('span', 'part-sub');
      b.append(top, recipeLine, mass, made);
      b.addEventListener('click', () => {
        setMaking(state, factory, part);
        refresh();
      });
      return { part, b, made, mass };
    });
    list.append(...choices.map((c) => c.b));
    body.append(mark, status, bar, list);
    refresh = () => {
      setText(mark, t('panel.factoryMark', { mark: factory.level }));
      const missing = missingInputs(state, factory.making);
      const working = factory.progress !== null;
      setText(
        status,
        working
          ? t('panel.working', { part: t(`part.${factory.making}`) })
          : t('panel.waiting', { missing: inputsText(missing) }),
      );
      status.classList.toggle('warn', !working);
      fill.style.width = `${Math.round(((factory.progress ?? 0) / RECIPES[factory.making].days) * 100)}%`;
      for (const c of choices) {
        const on = String(c.part === factory.making);
        if (c.b.getAttribute('aria-pressed') !== on) c.b.setAttribute('aria-pressed', on);
        setText(c.made, t('panel.made', { count: stockText(state, c.part) }));
        setText(c.mass, t('panel.mass', { kg: formatDecimal(partMass(c.part, factory.level)) }));
      }
    };
  };

  // A Research Lab: Data waiting, Research Points, and the tech tree to spend them on.
  const labBody = (lab: Building) => {
    const about = el('p', 'side-note');
    body.append(about);
    const points = el('p', 'research-points');
    const bar = el('div', 'progress');
    const fill = el('div', 'progress-fill');
    bar.append(fill);
    const next = el('p', 'side-note');
    const status = el('p', 'side-note');
    const list = el('div', 'part-choices tech-tree');
    list.append(el('h3', '', t('research.tree')), el('p', 'side-note', t('research.treeNote')));
    const problem = el('p', 'side-problem');
    problem.setAttribute('aria-live', 'polite');
    const items = TECH_IDS.map((id) => {
      const item = el('div', 'part-choice tech');
      item.append(
        el('span', 'part-name', t(`tech.${id}`)),
        el('span', 'part-sub', t(`tech.${id}.about`)),
        el('span', 'part-sub', t('research.cost', { cost: TECH_TREE[id].cost })),
      );
      const b = el('button', 'small trade', t('research.buy', { cost: TECH_TREE[id].cost }));
      b.type = 'button';
      b.dataset.tech = id;
      b.addEventListener('click', () => {
        const r = buyTech(state, id);
        problem.textContent = r.ok ? '' : t(`research.problem.${r.problem}`);
        refresh();
      });
      item.append(b);
      list.append(item);
      return { id, item, b };
    });
    body.append(points, bar, next, status, list, problem);
    refresh = () => {
      setText(about, t('panel.lab', { kb: formatNumber(LAB_KB_PER_DAY * levelBoost(lab.level)) }));
      const rp = researchPoints(state);
      setText(points, t('research.points', { points: rp }));
      const share = nextPointShare(state);
      fill.style.width = `${Math.round(share * 100)}%`;
      setText(next, t('research.next', { pct: Math.floor(share * 100) }));
      const waiting = dataWaiting(state);
      setText(
        status,
        waiting > 0
          ? `${t('research.working', { kb: formatNumber(labRate(state)) })} · ${t('research.waiting', { kb: formatNumber(Math.floor(waiting)) })}`
          : t('research.idle'),
      );
      for (const { id, item, b } of items) {
        const owned = state.research.tech.includes(id);
        item.setAttribute('aria-pressed', String(owned));
        setText(b, owned ? t('research.owned') : t('research.buy', { cost: TECH_TREE[id].cost }));
        b.disabled = owned || rp < TECH_TREE[id].cost;
      }
    };
  };

  // The Assembly Hall: the biggest Bus it takes, and the Spacecraft being put together.
  const hallBody = (hall: Building) => {
    const about = el('p', 'side-note');
    const work = el('p', 'side-note');
    body.append(about, work);
    refresh = () => {
      setText(about, t('panel.assemblyHall', { bus: t(`part.${busesAt(hall.level).at(-1) ?? 'smallBus'}`) }));
      const stage = missionStage(state);
      setText(
        work,
        state.mission && stage?.stage === 'assembling'
          ? t('panel.assembling', { contract: t(`contract.${state.mission.contract}.name`), days: formatDays(stage.daysLeft) })
          : '',
      );
    };
  };

  // The HQ: the Company's Era, and what the next one waits for.
  const hqBody = () => {
    const about = el('p', 'side-note');
    const next = el('p', 'side-note');
    body.append(about, next);
    refresh = () => {
      const era = eraOf(state);
      setText(about, t('panel.hq', { era, from: ERA_YEARS[era].from, to: ERA_YEARS[era].to }));
      const waiting = eraMilestones(era).filter((id) => !state.completed.includes(id));
      setText(
        next,
        era >= LAST_ERA
          ? t('panel.hqNewest', { era })
          : milestonesDone(state, era)
            ? t('panel.hqReady', { era, next: era + 1, year: ERA_YEARS[(era + 1) as Era].from })
            : t('panel.hqWaiting', { milestones: waiting.map((id) => t(`contract.${id}.name`)).join(t('stat.list')) }),
      );
    };
  };

  // A Ground Station: how much all of them add to what antennas send.
  const stationBody = () => {
    const about = el('p', 'side-note');
    body.append(about);
    refresh = () => setText(about, t('panel.groundStation', { boost: formatDecimal(groundBoost(state)) }));
  };

  // Every building: its level, what the next one does, and the Upgrade to get there (or the one under way).
  const levelBody = (kind: SiteBuildingKind, building: Building) => {
    const box = el('div', 'level-box');
    const label = el('h3', '');
    const next = el('p', 'side-note');
    const bar = el('div', 'progress');
    const fill = el('div', 'progress-fill');
    bar.append(fill);
    const upgrade = el('button', 'small trade upgrade');
    upgrade.type = 'button';
    const note = el('p', 'side-note', t('level.keepsWorking'));
    const problem = el('p', 'side-problem');
    problem.setAttribute('aria-live', 'polite');
    box.append(label, next, bar, upgrade, note, problem);
    upgrade.addEventListener('click', () => {
      const r = startUpgrade(state, kind, building);
      problem.textContent = r.ok ? '' : t(`level.problem.${r.problem}`);
      onChange();
      refresh();
    });
    const nextText = (level: number): string => {
      if (kind === 'mine') return t('level.next.mine', { level, kg: formatNumber(MINE_OUTPUT_PER_DAY * levelBoost(level)) });
      if (kind === 'warehouse') return t('level.next.warehouse', { level, kg: formatNumber(WAREHOUSE_STORAGE_KG * levelBoost(level)) });
      if (kind === 'researchLab') return t('level.next.researchLab', { level, kb: formatNumber(LAB_KB_PER_DAY * levelBoost(level)) });
      if (kind === 'assemblyHall') return t('level.next.assemblyHall', { level, bus: t(`part.${busesAt(level).at(-1) as BusId}`) });
      if (kind === 'hq') return t('level.next.hq', { level, from: ERA_YEARS[level as Era].from, to: ERA_YEARS[level as Era].to });
      if (kind === 'groundStation') return t('level.next.groundStation', { level });
      return isFactory(kind) ? t('level.next.factory', { level }) : '';
    };
    // At the top level for now: the hall's next level comes with the Large Bus in a later Era.
    const topText = () => {
      const era = eraOf(state);
      return kind === 'assemblyHall' && maxLevel(kind, era) < maxLevel(kind, LAST_ERA) ? t('level.topEra', { era: era + 1 }) : t('level.top');
    };
    return {
      box,
      refresh() {
        const era = eraOf(state);
        setText(label, t('level.label', { level: building.level, max: maxLevel(kind, era) }));
        const up = nextUpgrade(kind, building, era);
        const left = upgradeDaysLeft(state, building);
        setText(next, up ? nextText(up.level) : topText());
        bar.hidden = left === null;
        upgrade.hidden = !up || left !== null;
        note.hidden = !up;
        if (left !== null && up) {
          const total = up.days;
          fill.style.width = `${Math.round(Math.min(1, Math.max(0, 1 - (building.upgradeDay! - state.day) / total)) * 100)}%`;
          setText(upgrade, '');
          setText(next, t('level.underway', { level: up.level, days: formatDays(left) }));
        } else if (up) {
          setText(upgrade, t('level.upgrade', { cost: formatMoney(up.cost), days: formatDays(up.days) }));
          upgrade.title = t('level.upgradeName', { level: up.level, cost: formatMoney(up.cost), days: formatDays(up.days) });
          upgrade.disabled = !checkUpgrade(state, kind, building).ok;
        }
      },
    };
  };

  const api: BuildingPanel = {
    show(x, z) {
      const building = buildingAt(state, x, z);
      if (!building) {
        api.close();
        return;
      }
      tile = { x, z };
      body.replaceChildren();
      heading.textContent = t(`building.${building.kind}`);
      const levels = levelBody(building.kind, building.building);
      if (building.kind === 'mine') {
        const mine = building.mine;
        const material = t(`material.${mineMaterial(site, mine) ?? 'aluminium'}`);
        const digs = el('p', 'side-note');
        const full = el('p', 'side-note warn');
        body.append(digs, full);
        refresh = () => {
          setText(digs, t('panel.mine', { kg: formatNumber(mineOutput(mine)), material }));
          setText(full, storageFree(state) <= 0 ? t('panel.mineFull') : '');
        };
      } else if (building.kind === 'warehouse') {
        const warehouse = building.building;
        const adds = el('p', 'side-note');
        const used = el('p', 'side-note');
        body.append(adds, used);
        refresh = () => {
          setText(adds, t('panel.warehouse', { kg: formatNumber(warehouseStorage(warehouse)) }));
          setText(used, storageText(state));
        };
      } else if (building.kind === 'researchLab') {
        labBody(building.building);
      } else if (building.kind === 'assemblyHall') {
        hallBody(building.building);
      } else if (building.kind === 'hq') {
        hqBody();
      } else if (building.kind === 'groundStation') {
        stationBody();
      } else {
        factoryBody(building.factory);
      }
      // The level and its Upgrade come last, under what the building does.
      body.append(levels.box);
      const inner = refresh;
      refresh = () => {
        inner();
        levels.refresh();
      };
      panel.hidden = false;
      refresh();
    },
    close() {
      panel.hidden = true;
      tile = null;
    },
    get isOpen() {
      return !panel.hidden;
    },
    update() {
      if (tile) refresh();
    },
  };
  close.addEventListener('click', () => api.close());
  return api;
}
