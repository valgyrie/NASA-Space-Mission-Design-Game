import { type SaveData, loadGame, startAutosave } from './save/save';
import { generateSite } from './site/site';
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
  world.showSite(generateSite(game.site.seed));
  showHud(ui, game.company.name, game.site.seed);
  startAutosave(localStorage, () => game);
}

const saved = loadGame(localStorage);
if (saved) {
  play(ui, saved);
} else {
  showNewCompany(ui, {
    onSeed: (seed) => world.showSite(generateSite(seed)),
    onDone: ({ name, seed }) => play(ui, { version: 2, company: { name }, site: { seed } }),
  });
}
