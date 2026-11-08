import { type SaveData, loadGame, startAutosave } from './save/save';
import { t } from './strings';
import { showHud } from './ui/hud';
import { showNewCompany } from './ui/newCompany';
import { World } from './world/world';

const canvas = document.querySelector<HTMLCanvasElement>('#world');
const ui = document.querySelector<HTMLElement>('#ui');
if (!canvas || !ui) throw new Error('Missing #world or #ui in index.html');

document.title = t('game.title');
const world = new World(canvas);
world.start();

function play(ui: HTMLElement, game: SaveData): void {
  showHud(ui, game.company.name);
  startAutosave(localStorage, () => game);
}

const saved = loadGame(localStorage);
if (saved) {
  play(ui, saved);
} else {
  showNewCompany(ui, (name) => play(ui, { version: 1, company: { name } }));
}
