import { MINE_COST } from '../game/balance';
import type { PlaceProblem } from '../game/siteState';
import { t } from '../strings';
import { formatMoney } from './format';

export interface BuildMenu {
  /** Show whether the player is placing a Mine right now. */
  setPlacing(on: boolean): void;
  /** Explain why a Mine can't go where the player clicked. */
  showProblem(problem: PlaceProblem): void;
}

/** The Build menu at the bottom of the Site view. For now it has one building: the Mine. */
export function showBuildMenu(root: HTMLElement, onToggleMine: () => void): BuildMenu {
  const menu = document.createElement('div');
  menu.className = 'panel build-menu';

  const mine = document.createElement('button');
  mine.type = 'button';
  mine.className = 'build-item';
  mine.title = t('build.mineHint');
  const name = document.createElement('span');
  name.textContent = t('build.mine');
  const cost = document.createElement('span');
  cost.className = 'cost';
  cost.textContent = formatMoney(MINE_COST);
  mine.append(name, cost);
  mine.addEventListener('click', onToggleMine);

  const hint = document.createElement('p');
  hint.className = 'build-hint';
  hint.setAttribute('aria-live', 'polite');

  menu.append(hint, mine);
  root.append(menu);

  let timer = 0;
  return {
    setPlacing(on) {
      mine.setAttribute('aria-pressed', String(on));
      hint.classList.remove('problem');
      hint.textContent = on ? t('build.placing') : '';
    },
    showProblem(problem) {
      window.clearTimeout(timer);
      hint.classList.add('problem');
      hint.textContent = t(`build.problem.${problem}`);
      timer = window.setTimeout(() => {
        hint.classList.remove('problem');
        hint.textContent = mine.getAttribute('aria-pressed') === 'true' ? t('build.placing') : '';
      }, 2500);
    },
  };
}
