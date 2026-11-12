import { showLogoDialog } from './ui/logoEditor';
import type { BuildingKind } from './economy/part';
import { type Speed } from './game/balance';
import {
  advanceDays,
  allBuildings,
  build,
  checkBuild,
  daysFor,
  fitBuildings,
  mineMaterial,
  placeAssemblyHall,
  placeHQ,
  storageFree,
} from './game/siteState';
import { eraOf } from './game/eras';
import { showEraCard } from './ui/eraCard';
import { type SaveData, saveGame, startAutosave } from './save/save';
import { generateSite } from './site/site';
import { showBuildMenu } from './ui/buildMenu';
import { showBuildingPanel } from './ui/buildingPanel';
import { showContractsPanel } from './ui/contractsPanel';
import { showHud } from './ui/hud';
import { showMarketPanel } from './ui/marketPanel';
import { showMissionDesigner } from './ui/missionDesigner';
import { showLaunchShow } from './ui/launchShow';
import { showMissionReport } from './ui/missionReport';
import { showMissionTracker } from './ui/missionTracker';
import { showSpaceScreen } from './ui/spaceScreen';
import { showArchive } from './ui/archive';
import { showHistoryCard } from './ui/historyCard';
import { showTutorialGuide } from './ui/tutorialGuide';
import { historyCardFor, patchFor, unlockCard } from './game/history';
import { accepted, deadlineDay } from './game/contracts';
import { isMandatory, settleAnomaly, settleUnanswered } from './game/anomalies';
import { launch, launchWeather, missionStage } from './game/mission';
import { adviseLaunch, siteClimateFor } from './game/places';
import { showScrubCard } from './ui/scrubCard';
import { showGrantCard } from './ui/grantCard';
import { payGrant } from './game/grant';
import { dataWaiting } from './game/research';
import { makeMenu } from './ui/menu';
import { showTopBar } from './ui/topBar';
import { LaunchView } from './world/launchView';
import { SpaceView } from './world/spaceView';
import type { World } from './world/world';

/** A click that moves less than this many pixels is a click, not a camera drag. */
const CLICK_SLOP = 6;

/** Run the Site view for a game: the map, the clock, buildings, the Market and the UI around them. */
export function playSite(world: World, ui: HTMLElement, game: SaveData): void {
  const site = generateSite(game.site.seed, siteClimateFor(game.state.place));
  const state = game.state;
  // A game closed mid-flight left its Anomaly open: settle it now, so the reward is paid.
  settleUnanswered(state);
  world.showSite(site);
  // Every Site starts with an Assembly Hall near its middle; a new game (or an older save) gets it now.
  const hall = placeAssemblyHall(site, state);
  // A save from when buildings took one tile: move apart the ones that now overlap.
  if (fitBuildings(site, state)) saveGame(localStorage, game);
  world.addBuilding('assemblyHall', hall.x, hall.z);
  // The HQ stands beside it; its level is the Company's Era.
  const hq = placeHQ(site, state);
  world.addBuilding('hq', hq.x, hq.z);
  world.setCompanyLogo(game.company.logo);
  for (const mine of state.mines) {
    const material = mineMaterial(site, mine);
    if (material) world.addBuilding('mine', mine.x, mine.z, material);
  }
  for (const f of state.factories) world.addBuilding(f.kind, f.x, f.z);
  for (const w of state.warehouses) world.addBuilding('warehouse', w.x, w.z);
  for (const l of state.labs) world.addBuilding('researchLab', l.x, l.z);
  for (const g of state.groundStations) world.addBuilding('groundStation', g.x, g.z);

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
    state.difficulty,
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
  // Pause the Site while a dialog is up, and put the speed back afterwards (Real History cards, the History Archive).
  const pauser = () => {
    let before: Speed = 1;
    let keyboard = true;
    return {
      onOpen() {
        keyboard = world.keyboardEnabled;
        world.keyboardEnabled = false;
        before = speed;
        setSpeed(0);
        setPlacing(null);
      },
      onClose() {
        world.keyboardEnabled = keyboard;
        setSpeed(before);
      },
    };
  };
  // Accepting a Milestone shows its Real History card: the real story before you build it.
  const contracts = showContractsPanel(ui, state, (id) => {
    const card = historyCardFor(id, 'before');
    if (card && unlockCard(state, card)) history.show(card);
    saveGame(localStorage, game);
  });
  const panel = showBuildingPanel(ui, site, state, () => saveGame(localStorage, game));
  // The Mission Designer pauses the Site like the menu does, and closes the side panels.
  let speedBeforeDesigner: Speed = 1;
  const designer = showMissionDesigner(ui, state, game.site.seed, {
    onOpen() {
      world.keyboardEnabled = false;
      world.hidden = true;
      speedBeforeDesigner = speed;
      setSpeed(0);
      setPlacing(null);
      market.close();
      contracts.close();
      tracker.close();
      panel.close();
    },
    onClose() {
      world.keyboardEnabled = true;
      world.hidden = false;
      setSpeed(speedBeforeDesigner);
    },
    onChange: () => saveGame(localStorage, game),
    onTestRun() {
      if (state.tutorial.testRun) return;
      state.tutorial.testRun = true;
      saveGame(localStorage, game);
    },
  });
  // The Mission Report pauses the Site while it is read.
  let speedBeforeReport: Speed = 1;
  // Real History cards unlocked by the last Mission, shown once its report is closed.
  let cardsAfterReport: ReturnType<typeof historyCardFor>[] = [];
  const showCardsAfterReport = () => {
    const next = cardsAfterReport.shift();
    if (next) history.show(next, showCardsAfterReport);
  };
  const report = showMissionReport(
    ui,
    game.company,
    () => {
      world.keyboardEnabled = true;
      setSpeed(speedBeforeReport);
      // "See it in orbit" opens the Space view right after; the card then waits until that closes.
      window.setTimeout(() => {
        if (!space.isOpen) showCardsAfterReport();
      });
    },
    (r) => space.open(state.reports.indexOf(r)),
  );
  // The Space view pauses the Site like the Mission Designer does.
  let speedBeforeSpace: Speed = 1;
  const space = showSpaceScreen(ui, state, () => new SpaceView(), {
    onOpen() {
      world.keyboardEnabled = false;
      world.hidden = true;
      speedBeforeSpace = speed;
      setSpeed(0);
      setPlacing(null);
      market.close();
      contracts.close();
      tracker.close();
      panel.close();
    },
    onClose() {
      world.keyboardEnabled = true;
      world.hidden = false;
      setSpeed(speedBeforeSpace);
      showCardsAfterReport();
    },
  });
  // The Launch plays first, then the Mission Report. The result is already settled and saved.
  const launchShow = showLaunchShow(ui, () => new LaunchView(), () => game.company.logo);
  const tracker = showMissionTracker(ui, state, {
    onFollow: () => world.followTruck(),
    onLaunch: () => launchMission(),
    isFollowing: () => world.isFollowingTruck,
  });
  const scrub = showScrubCard(ui);
  const launchMission = () => {
    const contract = state.mission?.contract;
    // Weather over the limits Scrubs the Launch: say why and when the next good day is.
    const weather = launchWeather(state);
    if (weather?.scrub && state.mission) {
      scrub.show(state.mission.site, weather, adviseLaunch(state.mission.site, state.day + 1));
      return;
    }
    const cardsBefore = state.history.length;
    const result = launch(state, game.site.seed);
    if (!result || !contract) return;
    saveGame(localStorage, game);
    world.keyboardEnabled = false;
    speedBeforeReport = speed;
    setSpeed(0);
    setPlacing(null);
    contracts.close();
    market.close();
    tracker.close();
    panel.close();
    const taken = accepted(state, contract);
    cardsAfterReport = state.history.slice(cardsBefore);
    const patch = patchFor(state, result.report);
    const earned = patch && { patch, first: state.patches.length === 1 };
    world.hidden = true;
    const kind = result.report.anomaly?.kind;
    const hooks = kind && {
      best: isMandatory(state, kind) ? null : state.anomalyBest[kind]!,
      onAnswer: (score: number, answer: 'played' | 'skipped') => {
        settleAnomaly(state, result.report, score, answer);
        saveGame(localStorage, game);
      },
    };
    launchShow.play(
      result,
      () => {
        world.hidden = false;
        report.show(result.report, taken ? deadlineDay(taken) : null, Math.floor(state.day), earned);
      },
      hooks || undefined,
    );
  };
  // The Market and the Contracts board share the left side, so one closes the other.
  const hud = showHud(
    ui,
    game.company,
    () => menu.open(),
    () => world.goHome(),
    () => {
      contracts.close();
      tracker.close();
      market.toggle();
    },
    () => {
      market.close();
      tracker.close();
      contracts.toggle();
    },
    () => designer.open(),
    launchMission,
    () => {
      market.close();
      contracts.close();
      tracker.toggle();
    },
    () => space.open(),
    () => {
      market.close();
      contracts.close();
      tracker.close();
      archive.open();
    },
    () => {
      market.close();
      contracts.close();
      tracker.close();
      panel.close();
      logo.open();
    },
  );
  const logo = showLogoDialog(ui, game.company, {
    ...pauser(),
    onSave() {
      world.setCompanyLogo(game.company.logo);
      hud.updateLogo();
      saveGame(localStorage, game);
    },
  });
  const topBar = showTopBar(ui, setSpeed);
  const archive = showArchive(ui, state, game.company, { ...pauser(), onCard: (id) => history.show(id) });
  // Real History cards go above everything else, the History Archive included.
  const history = showHistoryCard(ui, pauser());
  // The one-time startup grant, when money runs low.
  const grant = showGrantCard(ui, pauser());
  // The welcome to a new Era, once the HQ Upgrade is done.
  const eraCard = showEraCard(ui, pauser());
  // The tutorial guide sits above the Mission Designer, so it can lead the player through it.
  const tutorial = showTutorialGuide(ui, () => {
    state.tutorial.skipped = true;
    saveGame(localStorage, game);
  });

  let placing: BuildingKind | null = null;
  const setPlacing = (kind: BuildingKind | null) => {
    placing = kind;
    buildMenu.setPlacing(kind);
    world.markTile(null);
    world.renderer.domElement.classList.toggle('placing', kind !== null);
    if (kind) panel.close();
  };
  // Picking the building you are already placing stops placing.
  const buildMenu = showBuildMenu(ui, state, (kind) => setPlacing(placing === kind ? null : kind));

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
    if (e.key !== 'Escape' && (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement)) return;
    if (e.key === 'Escape') {
      // Esc closes the menu first; otherwise stop placing, close a panel, or open the menu.
      if (launchShow.isOpen) launchShow.skip();
      else if (eraCard.isOpen) eraCard.close();
      else if (grant.isOpen) grant.close();
      else if (history.isOpen) history.close();
      else if (logo.isOpen) logo.close();
      else if (menu.isOpen) menu.close();
      else if (archive.isOpen) archive.close();
      else if (space.isOpen) space.close();
      else if (report.isOpen) report.close();
      else if (designer.isOpen) designer.close();
      else if (placing) setPlacing(null);
      else if (panel.isOpen) panel.close();
      else if (market.isOpen) market.close();
      else if (tracker.isOpen) tracker.close();
      else if (contracts.isOpen) contracts.close();
      else menu.open();
      return;
    }
    if (
      launchShow.isOpen ||
      menu.isOpen ||
      logo.isOpen ||
      designer.isOpen ||
      report.isOpen ||
      space.isOpen ||
      history.isOpen ||
      archive.isOpen ||
      grant.isOpen ||
      eraCard.isOpen
    )
      return;
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
    const researching = dataWaiting(state) > 0;
    for (const l of state.labs) world.setWorking(l.x, l.z, researching);
    world.setWorking(hall.x, hall.z, missionStage(state)?.stage === 'assembling');
    // Each building shows its level, and a crane while an Upgrade is under way.
    for (const { building: b } of allBuildings(state)) world.setLevel(b.x, b.z, b.level, b.upgradeDay !== null);
    const gameSeconds = Math.min(seconds, 0.1) * speed;
    world.animateBuildings(gameSeconds);
    // The Mission on its way, on the Site: the truck loads at the dock beside the Assembly Hall, then drives off.
    const stage = missionStage(state);
    const m = state.mission;
    const dock = { x: hall.x, z: hall.z };
    world.updateShipping(
      m && stage ? { id: `${m.contract}@${m.startDay}`, start: dock, design: m.design, ...stage } : null,
      gameSeconds,
      seconds,
    );
    topBar.update(site, state, speed);
    market.update();
    contracts.update();
    tracker.update();
    hud.update(state);
    panel.update();
    buildMenu.update();
    const covered =
      launchShow.isOpen || report.isOpen || space.isOpen || menu.isOpen || history.isOpen || archive.isOpen || grant.isOpen || eraCard.isOpen || logo.isOpen;
    tutorial.update(state, covered, designer.isOpen);
    // A new Era's card, once the HQ Upgrade is done and nothing else is on screen.
    if (!covered && !designer.isOpen && eraOf(state) > state.eraSeen) {
      state.eraSeen = eraOf(state);
      saveGame(localStorage, game);
      eraCard.show(eraOf(state));
    }
    // The startup grant waits until nothing else is on screen (a failed Mission's report and cards first).
    if (!covered && !designer.isOpen && !eraCard.isOpen) {
      const paid = payGrant(state);
      if (paid > 0) {
        saveGame(localStorage, game);
        grant.show(paid);
      }
    }
  });
  startAutosave(localStorage, () => game);

  // Dev builds only: a handle for browser tests and the console.
  if (import.meta.env.DEV) Object.assign(window, { leap: { world, site, state, setSpeed, designer, launchShow, space, history, archive, grant, report, eraCard, panel, contracts } });
}
