import '../minigames/minigames.css';
import { MINIGAMES, minigameSource, shuffledSet } from '../minigames/catalogue';
import { MinigameRun, PAUSE_EVENT, readBest, recordBest, type Stars } from '../minigames/shell';
import type { Minigame, MinigameId, MinigameLevel, MinigameResult } from '../minigames/types';
import { STRINGS, type StringKey, t } from '../strings';
import { learnMore } from './learnMore';
import { button, el } from './miniGame';

/**
 * The Minigames screen (main menu → Minigames → Explorer or Mission Director): over the title background, the
 * level's three games in a random order. Each game gets an intro card, a stage with a top bar (title, game N of 3,
 * Quit), then a fact card; the end screen totals the stars and lists the facts. Best stars per game are kept in
 * localStorage. One game runs at a time and is destroyed on Quit, Next and Try again.
 */
export interface MinigamesOptions {
  /** Back to the main menu (the screen is already gone). */
  onExit(): void;
}

const SVG = 'http://www.w3.org/2000/svg';

function svgIcon(className: string, d: string, viewBox = '0 0 24 24'): SVGSVGElement {
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', viewBox);
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add(className);
  const path = document.createElementNS(SVG, 'path');
  path.setAttribute('d', d);
  svg.append(path);
  return svg;
}

const STAR_PATH = 'M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z';

/** Three stars, `stars` of them lit; they pop in one by one when `animate`. */
function starRow(stars: number, animate: boolean, className = 'mg-stars'): HTMLElement {
  const row = el('div', className);
  row.setAttribute('role', 'img');
  row.setAttribute('aria-label', t('minigames.stars', { n: stars }));
  for (let i = 0; i < 3; i++) {
    const s = svgIcon('mg-star', STAR_PATH);
    if (i < stars) s.classList.add('lit');
    if (animate && i < stars) s.style.animationDelay = `${0.25 + i * 0.28}s`;
    if (animate) s.classList.add('pop');
    row.append(s);
  }
  return row;
}

/** How to play a game (`minigame.<id>.how`); empty if that game has none yet. */
function howText(id: MinigameId): string {
  const key = `minigame.${id}.how`;
  return key in STRINGS ? t(key as StringKey) : '';
}

function safeStorage(): Storage | null {
  try { return window.localStorage; } catch { return null; }
}

export function showMinigames(root: HTMLElement, level: MinigameLevel, options: MinigamesOptions): void {
  const storage = safeStorage();
  const screen = el('section', `mg-screen mg-${level}`);
  screen.setAttribute('aria-labelledby', 'mg-bar-title');

  // ---- Top bar: title, game N of 3, Quit ✕ ----
  const bar = el('header', 'mg-bar');
  const barTitle = el('h2', 'mg-bar-title');
  barTitle.id = 'mg-bar-title';
  const barCount = el('span', 'mg-bar-count');
  const quit = button('menu-button mg-quit', '');
  quit.append(svgIcon('mg-quit-x', 'M6 6l12 12M18 6L6 18'), document.createTextNode(t('minigames.quit')));
  quit.addEventListener('click', () => askQuit());
  const barText = el('div', 'mg-bar-text');
  barText.append(barTitle, barCount);
  bar.append(barText, quit);

  const body = el('div', 'mg-body');
  screen.append(bar, body);
  root.append(screen);

  let run = new MinigameRun(shuffledSet(level));
  let game: Minigame | null = null;
  let stage: HTMLElement | null = null;
  /** Bumped whenever a game is stopped, so a late `done` from an old game is ignored. */
  let token = 0;
  let phase: 'intro' | 'play' | 'fact' | 'end' = 'intro';

  const setBar = (title: string, count: string) => {
    barTitle.textContent = title;
    barCount.textContent = count;
    barCount.hidden = !count;
  };
  const gameOf = () => t('minigames.gameOf', { n: run.number, total: run.count });
  const levelName = () => t(level === 'explorer' ? 'minigames.explorer' : 'minigames.director');

  function stopGame(): void {
    token++;
    const g = game;
    game = null;
    stage = null;
    g?.destroy();
  }

  function show(card: HTMLElement, focus: HTMLElement | null): void {
    stopGame();
    body.replaceChildren(card);
    body.scrollTop = 0;
    // Keep the card's top (result, stars, total) in view; the focused button may sit below the fold.
    focus?.focus({ preventScroll: true });
  }

  // ---- (a) Intro card ----
  function intro(): void {
    phase = 'intro';
    const id = run.current;
    setBar(levelName(), gameOf());
    const card = el('div', 'panel mg-card mg-intro');
    const badge = el('div', 'mg-badge', String(run.number));
    badge.setAttribute('aria-hidden', 'true');
    const count = el('p', 'mg-kicker', gameOf());
    const title = el('h3', 'mg-title', t(`minigame.${id}.title`));
    const howHead = el('p', 'mg-how-head', t('minigames.how'));
    const how = el('p', 'mg-how', howText(id));
    const start = button('menu-button primary mg-go', t('minigames.start'));
    start.addEventListener('click', () => play());
    card.append(badge, count, title);
    if (how.textContent) card.append(howHead, how);
    card.append(start);
    show(card, start);
  }

  // ---- (b) The game ----
  function play(): void {
    const id = run.current;
    stopGame();
    phase = 'play';
    setBar(t(`minigame.${id}.title`), gameOf());
    const host = el('div', 'mg-stage');
    host.dataset.game = id;
    body.replaceChildren(host);
    body.scrollTop = 0;
    stage = host;
    const mine = ++token;
    const g = MINIGAMES[id]();
    game = g;
    g.start(host, (result) => {
      if (mine !== token) return;
      finished(id, result);
    });
  }

  // ---- (c) Fact card ----
  function finished(id: MinigameId, result: MinigameResult): void {
    run.record(id, result);
    const { isNew } = recordBest(storage, id, result.stars);
    phase = 'fact';
    setBar(t(`minigame.${id}.title`), gameOf());
    const card = el('div', `panel mg-card mg-fact ${result.won ? 'won' : 'lost'}`);
    const head = el('h3', 'mg-result', t(result.won ? 'minigames.won' : 'minigames.lost'));
    card.append(head);
    if (result.line) card.append(el('p', 'mg-line', result.line));
    card.append(starRow(result.stars, true));
    if (isNew) card.append(el('p', 'mg-new-best', t('minigames.newBest')));
    const learned = el('div', 'mg-learned');
    learned.append(el('p', 'mg-learned-head', t('minigames.learned')), el('p', 'mg-learned-fact', t(`minigame.${id}.fact`)));
    const link = learnMore(minigameSource(id));
    link.classList.add('mg-link');
    learned.append(link);
    card.append(learned);

    const buttons = el('div', 'mg-buttons');
    const next = button('menu-button primary', t(run.isLast ? 'minigames.results' : 'minigames.next'));
    next.addEventListener('click', () => { if (run.next()) intro(); else end(); });
    if (!result.won || result.stars < 3) {
      const again = button('menu-button', t('minigames.tryAgain'));
      again.addEventListener('click', () => play());
      if (!result.won) buttons.append(again, next);
      else buttons.append(next, again);
    } else buttons.append(next);
    card.append(buttons);
    show(card, result.won ? next : (buttons.firstElementChild as HTMLElement));
  }

  // ---- End screen ----
  function end(): void {
    phase = 'end';
    setBar(levelName(), '');
    const best = readBest(storage);
    const card = el('div', 'panel mg-card mg-end');
    card.append(el('h3', 'mg-title', t('minigames.end')));
    const total = run.totalStars();
    const totalRow = el('div', 'mg-total');
    const big = svgIcon('mg-total-star', STAR_PATH);
    totalRow.append(big, el('span', '', t('minigames.total', { stars: total, max: run.maxStars() })));
    card.append(totalRow);

    const list = el('ol', 'mg-summary');
    for (const id of run.order) {
      const result = run.result(id);
      const item = el('li', 'mg-summary-item');
      const top = el('div', 'mg-summary-top');
      top.append(el('strong', 'mg-summary-title', t(`minigame.${id}.title`)), starRow(result?.stars ?? 0, false, 'mg-stars small'));
      const b = best[id] as Stars | undefined;
      if (b !== undefined) {
        const bestRow = el('span', 'mg-best');
        bestRow.append(el('span', '', t('minigames.best')), starRow(b, false, 'mg-stars tiny'));
        top.append(bestRow);
      }
      item.append(top, el('p', 'mg-summary-fact', t(`minigame.${id}.fact`)));
      list.append(item);
    }
    card.append(el('p', 'mg-learned-head', t('minigames.facts')), list);

    const buttons = el('div', 'mg-buttons');
    const again = button('menu-button primary', t('minigames.playAgain'));
    again.addEventListener('click', () => { run = new MinigameRun(shuffledSet(level)); intro(); });
    const menu = button('menu-button', t('minigames.menu'));
    menu.addEventListener('click', () => leave());
    buttons.append(again, menu);
    card.append(buttons);
    show(card, again);
  }

  // ---- Quit: a question first (except on the end screen) ----
  let confirm: HTMLElement | null = null;
  const pause = (paused: boolean) => stage?.dispatchEvent(new CustomEvent(PAUSE_EVENT, { detail: paused }));
  function askQuit(): void {
    if (phase === 'end') { leave(); return; }
    if (confirm) return;
    const back = document.activeElement as HTMLElement | null;
    pause(true);
    const shade = el('div', 'mg-confirm');
    shade.setAttribute('role', 'alertdialog');
    shade.setAttribute('aria-modal', 'true');
    const box = el('div', 'panel mg-confirm-box');
    const q = el('p', 'mg-confirm-q', t('minigames.quitConfirm'));
    q.id = 'mg-confirm-q';
    shade.setAttribute('aria-labelledby', q.id);
    const yes = button('menu-button danger', t('minigames.quitYes'));
    const no = button('menu-button primary', t('minigames.quitNo'));
    yes.addEventListener('click', () => leave());
    no.addEventListener('click', () => closeConfirm(back));
    const row = el('div', 'mg-buttons');
    row.append(no, yes);
    box.append(q, row);
    shade.append(box);
    screen.append(shade);
    confirm = shade;
    no.focus();
  }
  function closeConfirm(back: HTMLElement | null): void {
    confirm?.remove();
    confirm = null;
    pause(false);
    if (back && back.isConnected && back !== quit) back.focus();
    else (stage?.querySelector('canvas') as HTMLElement | null)?.focus();
  }

  // Capture phase: while the question is open, the game hears no keys (Tab and Enter still work on the buttons).
  const onKey = (e: KeyboardEvent) => {
    if (confirm) {
      if (e.key === 'Escape') { e.preventDefault(); closeConfirm(null); }
      else if (e.key !== 'Tab' && e.key !== 'Enter' && e.key !== ' ') e.stopPropagation();
      else if (!(e.target instanceof Node && confirm.contains(e.target))) { e.stopPropagation(); e.preventDefault(); }
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      askQuit();
    }
  };
  window.addEventListener('keydown', onKey, true);
  window.addEventListener('keyup', onKeyUp, true);
  function onKeyUp(e: KeyboardEvent): void {
    if (confirm) e.stopPropagation();
  }

  function leave(): void {
    stopGame();
    confirm = null;
    window.removeEventListener('keydown', onKey, true);
    window.removeEventListener('keyup', onKeyUp, true);
    screen.remove();
    options.onExit();
  }

  intro();
}
