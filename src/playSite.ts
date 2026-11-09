import type { BuildingKind } from './economy/part';
import { type Speed } from './game/balance';
import { advanceDays, build, checkBuild, daysFor, mineMaterial, storageFree } from './game/siteState';
import { type SaveData, saveGame, startAutosave } from './save/save';
import { generateSite } from './site/site';
import { showBuildMenu } from './ui/buildMenu';
import { showBuildingPanel } from './ui/buildingPanel';
import { showContractsPanel } from './ui/contractsPanel';
import { showHud } from './ui/hud';
import { showMarketPanel } from './ui/marketPanel';
import { showMissionDesigner } from './ui/missionDesigner';
import { showMissionReport } from './ui/missionReport';
import { accepted, deadlineDay } from './game/contracts';
import { launch } from './game/mission';
import { makeMenu } from './ui/menu';
import { showTopBar } from './ui/topBar';
import type { World } from './world/world';

/** A click that moves less than this many pixels is a click, not a camera drag. */
const CLICK_SLOP = 6;

/** Run the Site view for a game: the map, the clock, buildings, the Market and the UI around them. */
export function playSite(world: World, ui: HTMLElement, game: SaveData): void {
  const site = generateSite(game.site.seed);
  const state = game.state;
  world.showSite(site);
  for (const mine of state.mines) {
    const material = mineMaterial(site, mine);
    if (material) world.addBuilding('mine', mine.x, mine.z, material);
  }
  for (const f of state.factories) world.addBuilding(f.kind, f.x, f.z);
  for (const w of state.warehouses) world.addBuilding('warehouse', w.x, w.z);

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
      setPlacing(null);
    },
    () => {
      world.keyboardEnabled = true;
      setSpeed(speedBeforeMenu);
    },
  );
  const market = showMarketPanel(ui, state, () => saveGame(localStorage, game));
  const contracts = showContractsPanel(ui, state, () => saveGame(localStorage, game));
  const panel = showBuildingPanel(ui, site, state);
  // The Mission Designer pauses the Site like the menu does, and closes the side panels.
  let speedBeforeDesigner: Speed = 1;
  const designer = showMissionDesigner(ui, state, {
    onOpen() {
      world.keyboardEnabled = false;
      world.hidden = true;
      speedBeforeDesigner = speed;
      setSpeed(0);
      setPlacing(null);
      market.close();
      contracts.close();
      panel.close();
    },
    onClose() {
      world.keyboardEnabled = true;
      world.hidden = false;
      setSpeed(speedBeforeDesigner);
    },
    onChange: () => saveGame(localStorage, game),
  });
  // The Mission Report pauses the Site while it is read.
  let speedBeforeReport: Speed = 1;
  const report = showMissionReport(ui, () => {
    world.keyboardEnabled = true;
    setSpeed(speedBeforeReport);
  });
  const launchMission = () => {
    const contract = state.mission?.contract;
    const result = launch(state);
    if (!result || !contract) return;
    saveGame(localStorage, game);
    world.keyboardEnabled = false;
    speedBeforeReport = speed;
    setSpeed(0);
    setPlacing(null);
    contracts.close();
    market.close();
    panel.close();
    const taken = accepted(state, contract);
    report.show(result, taken ? deadlineDay(taken) : null, Math.floor(state.day));
  };
  // The Market and the Contracts board share the left side, so one closes the other.
  const hud = showHud(
    ui,
    game.company.name,
    () => menu.open(),
    () => world.goHome(),
    () => {
      contracts.close();
      market.toggle();
    },
    () => {
      market.close();
      contracts.toggle();
    },
    () => designer.open(),
    launchMission,
  );
  const topBar = showTopBar(ui, setSpeed);

  let placing: BuildingKind | null = null;
  const setPlacing = (kind: BuildingKind | null) => {
    placing = kind;
    buildMenu.setPlacing(kind);
    world.markTile(null);
    world.renderer.domElement.classList.toggle('placing', kind !== null);
    if (kind) panel.close();
  };
  // Picking the building you are already placing stops placing.
  const buildMenu = showBuildMenu(ui, (kind) => setPlacing(placing === kind ? null : kind));

  // Placing: hover shows green or red, a click (not a drag) builds. Otherwise a click opens a building's panel.
  const canvas = world.renderer.domElement;
  let down: { x: number; y: number } | null = null;
  canvas.addEventListener('pointermove', (e) => {
    if (!placing) return;
    const tile = world.tileAtScreen(e.clientX, e.clientY);
    world.markTile(tile, !!tile && checkBuild(site, state, placing, tile.x, tile.z).ok);
  });
  canvas.addEventListener('pointerdown', (e) => {
    down = e.button === 0 ? { x: e.clientX, y: e.clientY } : null;
  });
  canvas.addEventListener('pointerup', (e) => {
    if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > CLICK_SLOP) return;
    const tile = world.tileAtScreen(e.clientX, e.clientY);
    if (!placing) {
      if (tile) panel.show(tile.x, tile.z);
      else panel.close();
      return;
    }
    if (!tile) return;
    const result = build(site, state, placing, tile.x, tile.z);
    if (result.ok) {
      const material = placing === 'mine' ? (mineMaterial(site, { x: tile.x, z: tile.z }) ?? undefined) : undefined;
      world.addBuilding(placing, tile.x, tile.z, material);
      saveGame(localStorage, game);
    } else {
      buildMenu.showProblem(result.problem);
    }
    world.markTile(tile, checkBuild(site, state, placing, tile.x, tile.z).ok);
  });
  window.addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLInputElement) return;
    if (e.key === 'Escape') {
      // Esc closes the menu first; otherwise stop placing, close a panel, or open the menu.
      if (menu.isOpen) menu.close();
      else if (report.isOpen) report.close();
      else if (designer.isOpen) designer.close();
      else if (placing) setPlacing(null);
      else if (panel.isOpen) panel.close();
      else if (market.isOpen) market.close();
      else if (contracts.isOpen) contracts.close();
      else menu.open();
      return;
    }
    if (menu.isOpen || designer.isOpen || report.isOpen) return;
    if (e.key === ' ') {
      e.preventDefault();
      setSpeed(speed === 0 ? lastSpeed : 0);
    }
  });

  world.onFrame((seconds) => {
    advanceDays(site, state, daysFor(seconds, speed));
    // Mines turn while there is room to store what they dig; Factories while they make a Part.
    const room = storageFree(state) > 0;
    for (const m of state.mines) world.setWorking(m.x, m.z, room);
    for (const f of state.factories) world.setWorking(f.x, f.z, f.progress !== null);
    world.animateBuildings(Math.min(seconds, 0.1) * speed);
    topBar.update(site, state, speed);
    market.update();
    contracts.update();
    hud.update(state);
    panel.update();
  });
  startAutosave(localStorage, () => game);

  // Dev builds only: a handle for browser tests and the console.
  if (import.meta.env.DEV) Object.assign(window, { leap: { world, site, state, setSpeed, designer } });
}
