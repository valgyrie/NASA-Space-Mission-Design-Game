import type { RawMaterial } from '../economy/rawMaterial';
import { MINE_OUTPUT_PER_DAY, RECIPES, WAREHOUSE_STORAGE_KG } from '../game/balance';
import {
  type Factory,
  type SiteState,
  buildingAt,
  mineMaterial,
  missingInputs,
  partsMadeBy,
  setMaking,
  storageFree,
} from '../game/siteState';
import type { Site } from '../site/site';
import { t } from '../strings';
import { formatNumber } from './format';
import { itemColour, storageText } from './marketPanel';

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

/** A panel about one building: what it does, how it is doing, and for a Factory, which Part it makes. */
export function showBuildingPanel(root: HTMLElement, site: Site, state: SiteState): BuildingPanel {
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
    const status = el('p', 'side-note');
    const bar = el('div', 'progress');
    const fill = el('div', 'progress-fill');
    bar.append(fill);
    const list = el('div', 'part-choices');
    list.append(el('h3', '', t('panel.makes')));
    const choices = partsMadeBy(factory.kind).map((part) => {
      const recipe = RECIPES[part];
      const b = el('button', 'part-choice');
      b.type = 'button';
      const top = el('span', 'part-name');
      const dot = el('span', 'dot');
      dot.style.background = itemColour(part);
      top.append(dot, t(`part.${part}`));
      const recipeLine = el('span', 'part-sub', t('panel.recipe', { inputs: inputsText(recipe.inputs), days: recipe.days }));
      const mass = el('span', 'part-sub', t('panel.mass', { kg: recipe.massKg }));
      const made = el('span', 'part-sub');
      b.append(top, recipeLine, mass, made);
      b.addEventListener('click', () => {
        setMaking(state, factory, part);
        refresh();
      });
      return { part, b, made };
    });
    list.append(...choices.map((c) => c.b));
    body.append(status, bar, list);
    refresh = () => {
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
        setText(c.made, t('panel.made', { count: state.parts[c.part] }));
      }
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
      if (building.kind === 'mine') {
        const material = mineMaterial(site, building.mine) ?? 'aluminium';
        body.append(
          el('p', 'side-note', t('panel.mine', { kg: MINE_OUTPUT_PER_DAY, material: t(`material.${material}`) })),
        );
        const full = el('p', 'side-note warn');
        body.append(full);
        refresh = () => setText(full, storageFree(state) <= 0 ? t('panel.mineFull') : '');
      } else if (building.kind === 'warehouse') {
        body.append(el('p', 'side-note', t('panel.warehouse', { kg: formatNumber(WAREHOUSE_STORAGE_KG) })));
        const used = el('p', 'side-note');
        body.append(used);
        refresh = () => setText(used, storageText(state));
      } else {
        factoryBody(building.factory);
      }
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
