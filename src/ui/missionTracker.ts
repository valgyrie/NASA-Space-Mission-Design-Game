import type { BusId } from '../game/upgrades';
import { type MissionStage, missionStage, missionTimeline } from '../game/mission';
import type { SiteState } from '../game/siteState';
import { t } from '../strings';
import { contractText, formatDays, formatGameDate, formatNumber } from './format';
import { adviseLaunch } from '../game/places';
import { adviceText, weatherText } from './weatherText';

export interface MissionTracker {
  toggle(): void;
  open(): void;
  close(): void;
  readonly isOpen: boolean;
  /** Refresh the truck, the stages and the dates. Cheap enough to call every frame. */
  update(): void;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  e.className = className;
  if (text) e.textContent = text;
  return e;
}

function setText(e: HTMLElement, text: string): void {
  if (e.textContent !== text) e.textContent = text;
}

/** A small side-on truck carrying a crate, facing right (towards the Launch Site). */
function truckIcon(): SVGSVGElement {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('class', 'tracker-truck');
  svg.setAttribute('viewBox', '0 0 34 18');
  svg.setAttribute('aria-hidden', 'true');
  const shape = (tag: string, attrs: Record<string, string | number>) => {
    const e = document.createElementNS(ns, tag);
    for (const [k, val] of Object.entries(attrs)) e.setAttribute(k, String(val));
    svg.append(e);
  };
  shape('rect', { x: 1, y: 3, width: 19, height: 9, rx: 1, fill: '#b98a5a' }); // crate
  shape('rect', { x: 9, y: 3, width: 2, height: 9, fill: '#2a2a2a' });
  shape('rect', { x: 0, y: 12, width: 31, height: 2, fill: '#46505f' }); // bed
  shape('path', { d: 'M22 12 V5 h6 l4 4 v3 Z', fill: '#d9583a' }); // cab
  shape('rect', { x: 24, y: 6.5, width: 4, height: 2.5, fill: '#9fd3ff' });
  for (const cx of [6, 14, 27]) shape('circle', { cx, cy: 15, r: 2.6, fill: '#1d1f23' });
  return svg;
}

type StageName = MissionStage['stage'] | 'flight';
const ORDER: StageName[] = ['assembling', 'shipping', 'ready', 'flight'];

/**
 * The Mission tracker: where the Spacecraft is now (a truck on the road from the Site to the Launch
 * Site), each stage with its dates, and the dates still to come. It can send the camera after the truck,
 * and Launch once the Spacecraft has arrived.
 */
export function showMissionTracker(
  root: HTMLElement,
  state: SiteState,
  hooks: { onFollow(): void; onLaunch(): void; isFollowing(): boolean },
): MissionTracker {
  const panel = el('div', 'panel side-panel tracker');
  panel.hidden = true;
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-labelledby', 'tracker-heading');

  const head = el('div', 'side-head');
  const heading = el('h2', '', t('tracker.heading'));
  heading.id = 'tracker-heading';
  const close = el('button', 'small icon-button', t('panel.close'));
  close.type = 'button';
  close.title = t('panel.closeName');
  close.setAttribute('aria-label', t('panel.closeName'));
  head.append(heading, close);

  const none = el('p', 'side-note', t('tracker.none'));
  const body = el('div', 'tracker-body');
  const subtitle = el('p', 'tracker-subtitle');

  // The road: the Site on the left, the Launch Site on the right, and the truck between them.
  const road = el('div', 'tracker-road');
  const from = el('span', 'tracker-end', t('tracker.site'));
  const to = el('span', 'tracker-end');
  const track = el('div', 'tracker-track');
  const travelled = el('div', 'tracker-travelled');
  const truck = truckIcon();
  track.append(travelled, truck);
  road.append(from, track, to);
  const now = el('p', 'tracker-now');
  now.setAttribute('aria-live', 'polite');

  const stages = el('ol', 'tracker-stages');
  const rows = new Map<StageName, { li: HTMLElement; name: HTMLElement; when: HTMLElement; bar: HTMLElement; fill: HTMLElement }>();
  for (const s of ORDER) {
    const li = el('li', '');
    const name = el('span', 'tracker-stage-name');
    const when = el('span', 'tracker-when');
    const bar = el('div', 'tracker-bar');
    const fill = el('div', 'tracker-fill');
    bar.append(fill);
    li.append(name, when, bar);
    stages.append(li);
    rows.set(s, { li, name, when, bar, fill });
  }
  const deadline = el('p', 'tracker-deadline');
  const weather = el('p', 'tracker-weather');
  const advice = el('p', 'tracker-advice');

  const follow = el('button', 'small tracker-follow', t('tracker.follow'));
  follow.type = 'button';
  follow.addEventListener('click', () => hooks.onFollow());
  const launch = el('button', 'small launch-button', t('mission.launch'));
  launch.type = 'button';
  launch.title = t('mission.launchName');
  launch.addEventListener('click', () => hooks.onLaunch());
  const buttons = el('div', 'row tracker-buttons');
  buttons.append(follow, launch);

  body.append(subtitle, road, now, stages, deadline, weather, advice, buttons);
  panel.append(head, none, body);
  root.append(panel);

  const update = () => {
    if (panel.hidden) return;
    const m = state.mission;
    const stage = missionStage(state);
    const dates = missionTimeline(state);
    none.hidden = !!m;
    body.hidden = !m;
    if (!m || !stage || !dates) return;

    const contract = contractText(m.contract);
    const site = t(`launchSite.${m.site}.short`);
    setText(subtitle, t('tracker.subtitle', { contract, vehicle: t(`launchVehicle.${m.vehicle}`), site: t(`launchSite.${m.site}`) }));
    setText(to, site);

    // The truck waits at the Site during assembly, then crosses the road.
    const along = stage.stage === 'assembling' ? 0 : stage.stage === 'shipping' ? stage.fraction : 1;
    truck.style.left = `${along * 100}%`;
    travelled.style.width = `${along * 100}%`;
    const days = formatDays(stage.daysLeft);
    setText(now, t(`tracker.now.${stage.stage}`, { days, site }));

    const bus = t(`part.${(m.design.bus ?? 'smallBus') as BusId}`);
    const range = (a: number, b: number) => t('tracker.range', { from: formatGameDate(a), to: formatGameDate(b) });
    const texts: Record<StageName, [string, string]> = {
      assembling: [t('tracker.stage.assembling', { bus }), range(dates.startDay, dates.shipDay)],
      shipping: [t('tracker.stage.shipping', { site }), range(dates.shipDay, dates.readyDay)],
      ready: [t('tracker.stage.ready', { site }), t('tracker.from', { date: formatGameDate(dates.readyDay) })],
      flight: [
        t('tracker.stage.flight', { days: formatNumber(dates.endDay - dates.launchDay) }),
        t('tracker.ends', { date: formatGameDate(dates.endDay) }),
      ],
    };
    const current = ORDER.indexOf(stage.stage);
    for (const [i, s] of ORDER.entries()) {
      const r = rows.get(s)!;
      const status = i < current ? 'done' : i === current ? 'now' : 'next';
      if (r.li.dataset.status !== status) r.li.dataset.status = status;
      setText(r.name, texts[s][0]);
      setText(r.when, texts[s][1]);
      const showBar = status === 'now' && s !== 'ready';
      r.bar.hidden = !showBar;
      if (showBar) r.fill.style.width = `${stage.fraction * 100}%`;
    }

    if (dates.deadlineDay === null) setText(deadline, '');
    else {
      const late = dates.endDay > dates.deadlineDay;
      setText(deadline, t(late ? 'tracker.deadlineLate' : 'tracker.deadline', { date: formatGameDate(dates.deadlineDay) }));
      deadline.classList.toggle('warn', late);
    }

    // Launch weather on the first day it can go, and the Launch Window advisor's pick.
    setText(weather, weatherText(m.site, dates.launchDay));
    setText(advice, adviceText(adviseLaunch(m.site, dates.launchDay)));

    follow.hidden = stage.stage === 'ready';
    follow.setAttribute('aria-pressed', String(hooks.isFollowing()));
    setText(follow, t(hooks.isFollowing() ? 'tracker.following' : 'tracker.follow'));
    launch.hidden = stage.stage !== 'ready';
  };

  const api: MissionTracker = {
    toggle() {
      if (panel.hidden) api.open();
      else api.close();
    },
    open() {
      panel.hidden = false;
      update();
    },
    close() {
      panel.hidden = true;
    },
    get isOpen() {
      return !panel.hidden;
    },
    update,
  };
  close.addEventListener('click', () => api.close());
  return api;
}
