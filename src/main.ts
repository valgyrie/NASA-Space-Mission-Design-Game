import { audio } from './audio/sound';
import { newSiteState } from './game/siteState';
import { SAVE_VERSION, loadGame } from './save/save';
import { playSite } from './playSite';
import { generateSite } from './site/site';
import { JPL, siteClimateFor } from './game/places';
import { t } from './strings';
import { createDemo, DEMO_SEED, demoStorage } from './game/demo';
import { showMainMenu } from './ui/mainMenu';
import { showNewCompany } from './ui/newCompany';
import { World } from './world/world';
import { showOnline } from './ui/online';

const canvas = document.querySelector<HTMLCanvasElement>('#world');
const ui = document.querySelector<HTMLElement>('#ui');
if (!canvas || !ui) throw new Error('Missing #world or #ui in index.html');
const root = ui;

audio.init();
audio.setScene('screen', 'menu');
document.title = t('game.title');
const world = new World(canvas);
world.start();

const saved = loadGame(localStorage);
const online = showOnline(root, () => loadGame(localStorage), { onOpen() {}, onClose() {} });
function startNew(): void {
  showNewCompany(root, {
    onBack: mainMenu,
    onPreview: (seed, place) => world.showSite(generateSite(seed, siteClimateFor(place))),
    onDone: ({ name, logo, seed, place, difficulty, playMode }) => {
      if (saved && !window.confirm(t('seed.replace'))) { mainMenu(); return; }
      online.destroy();
      world.controls.enabled = true;
      world.keyboardEnabled = true;
      playSite(world, root, { version: SAVE_VERSION, company: { name, logo }, site: { seed }, state: newSiteState(place, difficulty, playMode) });
    },
  });
}
function mainMenu(): void {
  world.keyboardEnabled = false;
  world.controls.enabled = false;
  world.showSite(generateSite(saved?.site.seed ?? DEMO_SEED, siteClimateFor(saved?.state.place ?? JPL)));
  showMainMenu(root, {
    companyName: saved?.company.name,
    onOnline: () => online.open(),
    onSharedSeed: () => startNew(),
    onPlay() {
      if (saved) {
        online.destroy();
        world.controls.enabled = true;
        world.keyboardEnabled = true;
        playSite(world, root, saved);
      } else {
        startNew();
      }
    },
    onDemo(era) {
      online.destroy();
      world.controls.enabled = true;
      world.keyboardEnabled = true;
      playSite(world, root, createDemo(era), { storage: demoStorage(localStorage), demoEra: era });
    },
  });
}
mainMenu();
