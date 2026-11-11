import { newSiteState } from './game/siteState';
import { SAVE_VERSION, loadGame } from './save/save';
import { playSite } from './playSite';
import { generateSite } from './site/site';
import { siteClimateFor } from './game/places';
import { t } from './strings';
import { showNewCompany } from './ui/newCompany';
import { World } from './world/world';

const canvas = document.querySelector<HTMLCanvasElement>('#world');
const ui = document.querySelector<HTMLElement>('#ui');
if (!canvas || !ui) throw new Error('Missing #world or #ui in index.html');

document.title = t('game.title');
const world = new World(canvas);
world.start();

const saved = loadGame(localStorage);
if (saved) {
  playSite(world, ui, saved);
} else {
  showNewCompany(ui, {
    onPreview: (seed, place) => world.showSite(generateSite(seed, siteClimateFor(place))),
    onDone: ({ name, logo, seed, place }) =>
      playSite(world, ui, { version: SAVE_VERSION, company: { name, logo }, site: { seed }, state: newSiteState(place) }),
  });
}
