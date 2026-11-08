import { BUILDING_KINDS, type BuildingKind } from '../economy/part';
import { BUILD_COST, WAREHOUSE_STORAGE_KG } from '../game/balance';
import type { PlaceProblem } from '../game/siteState';
import { t } from '../strings';
import { formatMoney, formatNumber } from './format';

export interface BuildMenu {
  /** Show which building the player is placing right now, if any. */
  setPlacing(kind: BuildingKind | null): void;
  /** Explain why a building can't go where the player clicked. */
  showProblem(problem: PlaceProblem): void;
}

function placingText(kind: BuildingKind | null): string {
  if (!kind) return '';
  return kind === 'mine' ? t('build.placing.mine') : t('build.placing.other', { name: t(`building.${kind}`) });
}

/** The Build menu at the bottom of the Site view: one button per building, with its cost. */
export function showBuildMenu(root: HTMLElement, onPick: (kind: BuildingKind) => void): BuildMenu {
  const menu = document.createElement('div');
  menu.className = 'panel build-menu';

  const row = document.createElement('div');
  row.className = 'build-items';
  const buttons = new Map<BuildingKind, HTMLButtonElement>();
  for (const kind of BUILDING_KINDS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'build-item';
    b.title = t(`build.hint.${kind}`, { kg: formatNumber(WAREHOUSE_STORAGE_KG) });
    const name = document.createElement('span');
    name.textContent = t(`building.${kind}`);
    const cost = document.createElement('span');
    cost.className = 'cost';
    cost.textContent = formatMoney(BUILD_COST[kind]);
    b.append(name, cost);
    b.addEventListener('click', () => onPick(kind));
    buttons.set(kind, b);
    row.append(b);
  }

  const hint = document.createElement('p');
  hint.className = 'build-hint';
  hint.setAttribute('aria-live', 'polite');

  menu.append(hint, row);
  root.append(menu);

  let placing: BuildingKind | null = null;
  let timer = 0;
  return {
    setPlacing(kind) {
      placing = kind;
      for (const [k, b] of buttons) b.setAttribute('aria-pressed', String(k === kind));
      hint.classList.remove('problem');
      hint.textContent = placingText(kind);
    },
    showProblem(problem) {
      window.clearTimeout(timer);
      hint.classList.add('problem');
      hint.textContent = t(`build.problem.${problem}`);
      timer = window.setTimeout(() => {
        hint.classList.remove('problem');
        hint.textContent = placingText(placing);
      }, 2500);
    },
  };
}
