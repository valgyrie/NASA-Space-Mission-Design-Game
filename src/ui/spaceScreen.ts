import { audio } from '../audio/sound';
import { type Satellite, type SatelliteStatus, orbitMinutes, satellitesInOrbit } from '../game/space';
import type { SiteState } from '../game/siteState';
import { t } from '../strings';
import { SPEEDUP, type SpaceView } from '../world/spaceView';
import { contractText, formatDecimal, formatGameDate, formatNumber } from './format';
import { learnMore, missionLinks } from './learnMore';
import { SOURCES } from '../game/sources';

/**
 * The Space view: Earth with every Spacecraft the Company has in orbit. A list on the left and a name tag
 * on each Spacecraft; picking one (in the list, on its tag or on the Spacecraft itself) follows it along
 * its orbit and shows what it is doing.
 */

export interface SpaceScreen {
  /** Open it, following one Spacecraft (by id) or showing the whole Earth. */
  open(followId?: number | null): void;
  close(): void;
  readonly isOpen: boolean;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  e.className = className;
  if (text) e.textContent = text;
  return e;
}

function button(className: string, text: string): HTMLButtonElement {
  const b = el('button', className, text);
  b.type = 'button';
  return b;
}

/** What it is doing, in a few words. */
export function statusText(status: SatelliteStatus): string {
  switch (status.kind) {
    case 'working':
      return t('space.working', { day: formatNumber(status.day + 1), days: formatNumber(status.days) });
    case 'silent':
      return t('space.silent', { day: formatNumber(status.powerOutDay) });
    case 'done':
      return t('space.done');
  }
}

/** The facts shown for one Spacecraft. */
export function satelliteFacts(sat: Satellite): string[] {
  const minutes = orbitMinutes(sat.orbitKm);
  return [
    t('space.launched', {
      date: formatGameDate(sat.report.launchDay),
      vehicle: t(`launchVehicle.${sat.report.vehicle}`),
      site: t(`launchSite.${sat.report.site}.short`),
    }),
    t(sat.orbitKm.low === sat.orbitKm.high ? 'space.orbitCircle' : 'space.orbit', {
      low: formatNumber(sat.orbitKm.low),
      high: formatNumber(sat.orbitKm.high),
      tilt: formatDecimal(sat.inclinationDeg),
    }),
    t('space.lap', { minutes: formatNumber(Math.round(minutes)), speedup: formatNumber(SPEEDUP) }),
  ];
}

export function showSpaceScreen(
  root: HTMLElement,
  state: SiteState,
  makeView: () => SpaceView,
  hooks: { onOpen(): void; onClose(): void },
): SpaceScreen {
  const screen = el('div', 'space');
  screen.hidden = true;
  screen.setAttribute('role', 'dialog');
  screen.setAttribute('aria-modal', 'true');
  screen.setAttribute('aria-labelledby', 'space-heading');
  const tags = el('div', 'space-tags');

  const card = el('div', 'space-card');
  const head = el('div', 'space-head');
  const heading = el('h2', '', t('space.heading'));
  heading.id = 'space-heading';
  const close = button('small icon-button', t('space.closeIcon'));
  close.title = t('space.close');
  close.setAttribute('aria-label', t('space.close'));
  head.append(heading, close);
  const hint = el('p', 'space-hint', t('space.hint'));
  const list = el('ul', 'space-list');
  const empty = el('p', 'space-hint', t('space.empty'));
  const detail = el('section', 'space-detail');
  const name = el('h3', '');
  const status = el('p', 'space-status');
  const facts = el('ul', 'space-facts');
  const sources = el('div', '');
  const whole = button('small', t('space.whole'));
  detail.append(name, status, facts, sources, whole);
  const note = el('p', 'space-hint warn', t('space.no3d'));
  card.append(head, hint, list, empty, detail, learnMore(SOURCES.earth, t('sources.earth')), note);
  screen.append(tags, card);
  root.append(screen);

  let view: SpaceView | null = null;
  let viewFailed = false;
  let sats: Satellite[] = [];
  let followed: number | null = null;
  const tagButtons = new Map<number, HTMLButtonElement>();
  const listButtons = new Map<number, HTMLButtonElement>();

  const label = (sat: Satellite) => contractText(sat.contract);

  const select = (id: number | null) => {
    followed = id;
    view?.follow(id);
    const sat = sats.find((s) => s.id === id);
    detail.hidden = !sat;
    for (const [key, b] of listButtons) b.setAttribute('aria-pressed', String(key === id));
    for (const [key, b] of tagButtons) b.classList.toggle('on', key === id);
    if (!sat) return;
    name.textContent = label(sat);
    status.textContent = statusText(sat.status);
    status.dataset.kind = sat.status.kind;
    facts.replaceChildren(...satelliteFacts(sat).map((line) => el('li', '', line)));
    sources.replaceChildren(missionLinks(sat.contract, sat.report.vehicle));
  };

  const moveTags = () => {
    if (!view) return;
    for (const tag of view.tags()) {
      const b = tagButtons.get(tag.id);
      if (!b) continue;
      b.hidden = !tag.visible || tag.id === followed;
      if (!b.hidden) b.style.transform = `translate(${Math.round(tag.x)}px, ${Math.round(tag.y)}px)`;
    }
  };

  const api: SpaceScreen = {
    open(followId = null) {
      if (!view && !viewFailed) {
        try {
          view = makeView();
          view.canvas.className = 'space-canvas';
          screen.prepend(view.canvas);
          view.onPick = (id) => select(id);
          view.onFrame = moveTags;
        } catch {
          viewFailed = true;
        }
      }
      note.hidden = !viewFailed;
      sats = satellitesInOrbit(state);
      view?.load(sats);
      // Two Spacecraft from the same Contract are told apart by their Launch date.
      const twins = (sat: Satellite) => sats.filter((s) => s.contract === sat.contract).length > 1;
      listButtons.clear();
      list.replaceChildren(
        ...sats.map((sat) => {
          const li = el('li', '');
          const b = button('space-item', '');
          const dot = el('span', 'space-dot');
          dot.dataset.kind = sat.status.kind;
          b.append(dot, el('span', 'space-item-name', label(sat)), el('span', 'space-item-date', formatGameDate(sat.report.launchDay)));
          b.title = statusText(sat.status);
          b.addEventListener('click', () => select(followed === sat.id ? null : sat.id));
          listButtons.set(sat.id, b);
          li.append(b);
          return li;
        }),
      );
      tagButtons.clear();
      tags.replaceChildren(
        ...sats.map((sat) => {
          const b = button('space-tag', twins(sat) ? t('space.tagDated', { name: label(sat), date: formatGameDate(sat.report.launchDay) }) : label(sat));
          b.hidden = true;
          b.addEventListener('click', () => select(sat.id));
          tagButtons.set(sat.id, b);
          return b;
        }),
      );
      empty.hidden = sats.length > 0;
      hint.hidden = sats.length === 0 || viewFailed;
      hooks.onOpen();
      screen.hidden = false;
      audio.setScene('space', 'orbit');
      view?.start();
      select(sats.some((s) => s.id === followId) ? followId : null);
      close.focus();
    },
    close() {
      if (screen.hidden) return;
      screen.hidden = true;
      audio.setScene('space', null);
      view?.stop();
      hooks.onClose();
    },
    get isOpen() {
      return !screen.hidden;
    },
  };
  close.addEventListener('click', () => api.close());
  whole.addEventListener('click', () => select(null));
  return api;
}
