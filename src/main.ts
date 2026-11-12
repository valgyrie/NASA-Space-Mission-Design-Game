import { audio } from './audio/sound';
import { allBuildings, fitBuildings, mineMaterial, newSiteState, placeAssemblyHall, placeHQ } from './game/siteState';
import { SAVE_VERSION, loadGame, type SaveData, type SaveStorage } from './save/save';
import { generateSite } from './site/site';
import { siteClimateFor } from './game/places';
import { t } from './strings';
import { createDemo, demoStorage, type DemoEra } from './game/demo';
import { showMainMenu } from './ui/mainMenu';
import { showNewCompany } from './ui/newCompany';
import { World } from './world/world';
import { showOnline } from './ui/online';
import { showTitleScreen } from './ui/titleScreen';
import { showLoading } from './ui/loading';

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
let inMenu = true;
world.keyboardEnabled = false;
world.controls.enabled = false;

/** Draw a Company without advancing its Game date or writing its save. */
function previewCompany(): void {
  const game = saved ? structuredClone(saved) : createDemo(2);
  const site = generateSite(game.site.seed, siteClimateFor(game.state.place));
  placeAssemblyHall(site, game.state);
  placeHQ(site, game.state);
  fitBuildings(site, game.state);
  world.showSite(site);
  for (const { kind, building: b } of allBuildings(game.state)) {
    world.addBuilding(kind, b.x, b.z, kind === 'mine' ? mineMaterial(site, b) ?? undefined : undefined);
    world.setLevel(b.x, b.z, b.level, b.upgradeDay !== null);
  }
  world.setCompanyLogo(game.company.logo);
}
// A live scene for title, setup, Demo picker and Online. Respect reduced-motion preferences.
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
world.onFrame((seconds) => {
  if (!inMenu) return;
  world.animateBuildings(reducedMotion.matches ? 0 : Math.min(seconds, 0.1));
});

async function startGame(game: SaveData, options?: { storage: SaveStorage; demoEra: DemoEra }): Promise<void> {
  const done = showLoading(root, world);
  const playing = import('./playSite');
  // Let the rendered shot paint before generating the Site; never hold a completed load for a tip.
  await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  try {
    const { playSite } = await playing;
    online.destroy();
    inMenu = false;
    world.controls.enabled = true;
    world.keyboardEnabled = true;
    playSite(world, root, game, options);
  } finally {
    done();
  }
}
function startNew(): void {
  showNewCompany(root, {
    onBack: () => { previewCompany(); mainMenu(); },
    onPreview: (seed, place) => world.showSite(generateSite(seed, siteClimateFor(place))),
    onDone: ({ name, logo, seed, place, difficulty, playMode }) => {
      if (saved && !window.confirm(t('seed.replace'))) { previewCompany(); mainMenu(); return; }
      void startGame({ version: SAVE_VERSION, company: { name, logo }, site: { seed }, state: newSiteState(place, difficulty, playMode) });
    },
  });
}
function mainMenu(): void {
  world.keyboardEnabled = false;
  world.controls.enabled = false;
  showMainMenu(root, {
    companyName: saved?.company.name,
    onOnline: () => online.open(),
    onSharedSeed: () => startNew(),
    onPlay() {
      if (saved) {
        void startGame(saved);
      } else {
        startNew();
      }
    },
    onDemo(era) {
      void startGame(createDemo(era), { storage: demoStorage(localStorage), demoEra: era });
    },
  });
}
previewCompany();
showTitleScreen(root, mainMenu);
