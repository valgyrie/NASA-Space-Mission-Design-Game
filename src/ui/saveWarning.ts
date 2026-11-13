import { t } from '../strings';

export interface SaveWarning {
  /** Show the warning after a refused save; hide it again once a save works. */
  set(failed: boolean): void;
  readonly isShown: boolean;
}

/**
 * A plain warning while the browser refuses to save (storage full or turned off). The game keeps running;
 * the player knows changes may be lost (ticket 02).
 */
export function showSaveWarning(root: HTMLElement): SaveWarning {
  const box = document.createElement('p');
  box.className = 'panel save-warning';
  box.setAttribute('role', 'alert');
  box.textContent = t('save.failed');
  box.hidden = true;
  root.append(box);
  return {
    set(failed) {
      if (box.hidden === !failed) return;
      box.hidden = !failed;
    },
    get isShown() {
      return !box.hidden;
    },
  };
}
