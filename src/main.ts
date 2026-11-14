import { audio } from './audio/sound';
import { allBuildings, fitBuildings, mineMaterial, newSiteState, placeAssemblyHall, placeHQ } from './game/siteState';
import { SAVE_VERSION, loadGame, type SaveData, type SaveStorage } from './save/save';
import { generateSite } from './site/site';
import { siteClimateFor } from './game/places';
import { t } from './strings';
import { createDemo, demoStorage, type DemoEra } from './game/demo';
import { type MainMenu, showMainMenu } from './ui/mainMenu';
import { showNewCompany } from './ui/newCompany';
import { World } from './world/world';
import { preloadBuildingModels } from './world/buildingModels';
import { showOnline } from './ui/online';
import { TitleLaunch } from './world/titleLaunch';
import { addOwnedPlots } from './game/plots';
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
  addOwnedPlots(site, game.state);
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

// Behind the main menu, a random rocket lifts off; without WebGL (or too slow for it) the Site stays instead.
let titleLaunch: TitleLaunch | null = null;
let menu: MainMenu | null = null;
function showTitleLaunch(): void {
  if (!titleLaunch) {
    try {
      titleLaunch = new TitleLaunch(saved?.company.logo, reducedMotion.matches, (vehicle) => menu?.setRocket(vehicle), () => hideTitleLaunch());
    } catch {
      return;
    }
    root.prepend(titleLaunch.element);
    titleLaunch.start();
  }
  world.hidden = true;
}
function hideTitleLaunch(): void {
  titleLaunch?.destroy();
  titleLaunch = null;
  menu?.setRocket(null);
  world.hidden = false;
}

async function startGame(game: SaveData, options?: { storage: SaveStorage; demoEra: DemoEra }): Promise<void> {
  titlePreview = false;
  menu = null;
  hideTitleLaunch();
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
  titlePreview = false;
  menu = null;
  hideTitleLaunch();
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
  menu = showMainMenu(root, {
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
  showTitleLaunch();
}
// Draw the title Site once the building models are in (or after a few seconds), so the simple stand-in models never
// flash up first; skip it if the player has already moved on to a game or the new-Company screen.
let titlePreview = true;
void preloadBuildingModels(4000).then(() => {
  if (titlePreview) previewCompany();
});
mainMenu();
