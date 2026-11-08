import { type Speed } from './game/balance';
import { advanceDays, checkMine, daysFor, mineMaterial, placeMine } from './game/siteState';
import { type SaveData, saveGame, startAutosave } from './save/save';
import { generateSite } from './site/site';
import { showBuildMenu } from './ui/buildMenu';
import { showHud } from './ui/hud';
import { makeMenu } from './ui/menu';
import { showTopBar } from './ui/topBar';
import type { World } from './world/world';

/** A click that moves less than this many pixels is a click, not a camera drag. */
const CLICK_SLOP = 6;

/** Run the Site view for a game: the map, the clock, Mines and the UI around them. */
export function playSite(world: World, ui: HTMLElement, game: SaveData): void {
  const site = generateSite(game.site.seed);
  const state = game.state;
  world.showSite(site);
  for (const mine of state.mines) {
    const material = mineMaterial(site, mine);
    if (material) world.addMine(mine.x, mine.z, material);
  }

  let speed: Speed = 1;
  let lastSpeed: Speed = 1;
  const setSpeed = (s: Speed) => {
    if (s !== 0) lastSpeed = s;
    speed = s;
  };

  // The menu pauses the Site while it is open and puts the speed back afterwards.
  let speedBeforeMenu: Speed = 1;
  const menu = makeMenu(
    ui,
    game.site.seed,
    () => {
      world.keyboardEnabled = false;
      speedBeforeMenu = speed;
      setSpeed(0);
      if (placing) setPlacing(false);
    },
    () => {
      world.keyboardEnabled = true;
      setSpeed(speedBeforeMenu);
    },
  );
  showHud(ui, game.company.name, () => menu.open(), () => world.goHome());
  const topBar = showTopBar(ui, setSpeed);
  let placing = false;
  const setPlacing = (on: boolean) => {
    placing = on;
    buildMenu.setPlacing(on);
    world.markTile(null);
    world.renderer.domElement.classList.toggle('placing', on);
  };
  const buildMenu = showBuildMenu(ui, () => setPlacing(!placing));

  // Placing Mines: hover shows green or red, a click (not a drag) builds.
  const canvas = world.renderer.domElement;
  let down: { x: number; y: number } | null = null;
  canvas.addEventListener('pointermove', (e) => {
    if (!placing) return;
    const tile = world.tileAtScreen(e.clientX, e.clientY);
    world.markTile(tile, !!tile && checkMine(site, state, tile.x, tile.z).ok);
  });
  canvas.addEventListener('pointerdown', (e) => {
    down = e.button === 0 ? { x: e.clientX, y: e.clientY } : null;
  });
  canvas.addEventListener('pointerup', (e) => {
    if (!placing || !down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > CLICK_SLOP) return;
    const tile = world.tileAtScreen(e.clientX, e.clientY);
    if (!tile) return;
    const result = placeMine(site, state, tile.x, tile.z);
    if (result.ok) {
      world.addMine(tile.x, tile.z, result.material);
      saveGame(localStorage, game);
    } else {
      buildMenu.showProblem(result.problem);
    }
    world.markTile(tile, checkMine(site, state, tile.x, tile.z).ok);
  });
  window.addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLInputElement) return;
    if (e.key === 'Escape') {
      // Esc backs out one step: stop placing first, otherwise open or close the menu.
      if (placing) setPlacing(false);
      else if (menu.isOpen) menu.close();
      else menu.open();
      return;
    }
    if (menu.isOpen) return;
    if (e.key === ' ') {
      e.preventDefault();
      setSpeed(speed === 0 ? lastSpeed : 0);
    }
  });

  world.onFrame((seconds) => {
    advanceDays(site, state, daysFor(seconds, speed));
    world.animateBuildings(Math.min(seconds, 0.1) * speed);
    topBar.update(site, state, speed);
  });
  startAutosave(localStorage, () => game);

  // Dev builds only: a handle for browser tests and the console.
  if (import.meta.env.DEV) Object.assign(window, { leap: { world, site, state, setSpeed } });
}
