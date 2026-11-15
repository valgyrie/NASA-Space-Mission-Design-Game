import { makeAudioControls } from './audioControls';
import { comingSoon } from './comingSoon';
import { makeDataCredits } from './dataCredits';
import { shareSeed } from '../site/shareSeed';
import { t } from '../strings';
import type { SiteState } from '../game/siteState';

export interface Menu {
  open(): void;
  close(): void;
  readonly isOpen: boolean;
}

/**
 * The pause menu (Esc): Seed, settings and controls.
 * `onOpen` and `onClose` let the game pause and resume. `onSwitchMode`, when given, lets an Explorer Company move
 * to Mission Director for good, after a confirm.
 */
export function makeMenu(root: HTMLElement, seed: string, state: Pick<SiteState, 'difficulty' | 'playMode' | 'place'>, onOpen: () => void, onClose: () => void, onMainMenu: () => void, onOnline?: () => void, onSwitchMode?: () => void): Menu {
  const difficulty = state.difficulty;
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
    if (await copyText(shareSeed(seed, state.place))) {
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

  const settings = document.createElement('span');
  settings.className = 'menu-label';
  settings.textContent = t('menu.settings');
  const mode = document.createElement('p');
  mode.className = 'menu-mode';
  mode.textContent = t('menu.mode', { mode: t(`mode.${difficulty}`) });
  const playMode = document.createElement('p');
  playMode.className = 'menu-mode';
  const modeNote = document.createElement('p');
  modeNote.className = 'note';
  modeNote.textContent = t(`mode.${difficulty}.note`);
  const fixedMode = document.createElement('p');
  fixedMode.className = 'note';
  fixedMode.textContent = t('menu.fixedMode');

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

  // Game modes: an Explorer Company can switch to Mission Director, one way, after a confirm.
  const switchBox = document.createElement('div');
  switchBox.className = 'menu-switch';
  const canSwitch = !!onSwitchMode && difficulty === 'easy';
  switchBox.hidden = !canSwitch;
  fixedMode.hidden = canSwitch;
  if (canSwitch) {
    const switchNote = document.createElement('p');
    switchNote.className = 'note';
    switchNote.textContent = t('modes.switchNote');
    const switchButton = document.createElement('button');
    switchButton.type = 'button';
    switchButton.className = 'small';
    switchButton.textContent = t('modes.switch');
    const confirmBox = document.createElement('div');
    confirmBox.className = 'menu-switch-confirm';
    confirmBox.hidden = true;
    confirmBox.setAttribute('role', 'alert');
    const confirmText = document.createElement('p');
    confirmText.textContent = t('modes.switchConfirm');
    const yes = document.createElement('button');
    yes.type = 'button';
    yes.className = 'small';
    yes.textContent = t('modes.switchYes');
    const no = document.createElement('button');
    no.type = 'button';
    no.className = 'small';
    no.textContent = t('modes.switchNo');
    const row = document.createElement('div');
    row.className = 'row';
    row.append(yes, no);
    confirmBox.append(confirmText, row);
    switchButton.addEventListener('click', () => {
      confirmBox.hidden = false;
      switchButton.hidden = true;
      no.focus();
    });
    no.addEventListener('click', () => {
      confirmBox.hidden = true;
      switchButton.hidden = false;
      switchButton.focus();
    });
    yes.addEventListener('click', () => onSwitchMode!());
    switchBox.append(switchNote, switchButton, confirmBox);
  }

  panel.append(heading, seedLabel, seedRow, seedNote, settings, playMode, mode, modeNote, fixedMode, switchBox, makeAudioControls(), makeDataCredits(), controlsLabel, controls);
  // Resume, Main menu and Online stay pinned to the bottom of the panel, so they never need a scroll to reach.
  const footer = document.createElement('div');
  footer.className = 'sticky-foot menu-footer';
  footer.append(resume);
  const mainMenu = document.createElement('button');
  mainMenu.type = 'button';
  mainMenu.textContent = t('mainMenu.heading');
  mainMenu.addEventListener('click', onMainMenu);
  footer.append(mainMenu);
  const online = document.createElement('button');
  online.type = 'button';
  online.textContent = t('online.heading');
  // Online is switched off for now: greyed, says "Coming soon" on hover, and does nothing when clicked.
  comingSoon(online);
  footer.append(online);
  panel.append(footer);
  backdrop.append(panel);
  root.append(backdrop);

  const menu = {
    get isOpen() {
      return !backdrop.hidden;
    },
    open() {
      if (menu.isOpen) return;
      playMode.textContent = t('menu.playMode', { mode: t(`playMode.${state.playMode}`) });
      online.hidden = !onOnline || state.playMode !== 'freePlay';
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
