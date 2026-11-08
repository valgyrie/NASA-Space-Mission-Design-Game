import { t } from '../strings';

export interface Menu {
  open(): void;
  close(): void;
  readonly isOpen: boolean;
}

/**
 * The pause menu (Esc). Shows the Seed so it can be shared. Settings will live here too.
 * `onOpen` and `onClose` let the game pause and resume.
 */
export function makeMenu(root: HTMLElement, seed: string, onOpen: () => void, onClose: () => void): Menu {
  const backdrop = document.createElement('div');
  backdrop.className = 'backdrop';
  backdrop.hidden = true;

  const panel = document.createElement('div');
  panel.className = 'panel dialog menu';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-labelledby', 'menu-heading');

  const heading = document.createElement('h1');
  heading.id = 'menu-heading';
  heading.textContent = t('menu.heading');

  const seedLabel = document.createElement('span');
  seedLabel.className = 'menu-label';
  seedLabel.textContent = t('menu.seed');
  const seedText = document.createElement('span');
  seedText.className = 'seed-code';
  seedText.textContent = seed;
  const copy = document.createElement('button');
  copy.type = 'button';
  copy.className = 'small';
  copy.textContent = t('menu.copy');
  copy.title = t('menu.copySeed');
  copy.addEventListener('click', async () => {
    if (await copyText(seed)) {
      copy.textContent = t('menu.copied');
      window.setTimeout(() => (copy.textContent = t('menu.copy')), 1500);
    }
  });
  const seedRow = document.createElement('div');
  seedRow.className = 'row';
  seedRow.append(seedText, copy);
  const seedNote = document.createElement('p');
  seedNote.className = 'note';
  seedNote.textContent = t('menu.seedNote');

  const resume = document.createElement('button');
  resume.type = 'button';
  resume.className = 'primary';
  resume.textContent = t('menu.resume');

  const controlsLabel = document.createElement('span');
  controlsLabel.className = 'menu-label';
  controlsLabel.textContent = t('menu.controls');
  const controls = document.createElement('ul');
  controls.className = 'controls';
  for (const key of ['controls.move', 'controls.turn', 'controls.zoom', 'controls.home', 'controls.pause'] as const) {
    const li = document.createElement('li');
    li.textContent = t(key);
    controls.append(li);
  }

  panel.append(heading, seedLabel, seedRow, seedNote, controlsLabel, controls, resume);
  backdrop.append(panel);
  root.append(backdrop);

  const menu = {
    get isOpen() {
      return !backdrop.hidden;
    },
    open() {
      if (menu.isOpen) return;
      backdrop.hidden = false;
      onOpen();
      resume.focus();
    },
    close() {
      if (!menu.isOpen) return;
      backdrop.hidden = true;
      onClose();
    },
  };
  resume.addEventListener('click', () => menu.close());
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) menu.close();
  });
  return menu;
}

/** Copy to the clipboard, with a fallback for browsers that block the Clipboard API. */
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    document.body.append(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  }
}
