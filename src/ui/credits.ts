import { HISTORY_CARD_IDS, HISTORY_CARDS } from '../game/history';
import { LAUNCH_SITE_IDS, LAUNCH_VEHICLE_IDS } from '../game/launchVehicles';
import { CHALLENGE, SITE_SOURCES, SOFTWARE, SOFTWARE_IDS, SOURCES, VEHICLE_SOURCES } from '../game/sources';
import { t, type StringKey } from '../strings';
import { makeDatasetList } from './dataCredits';

/** The Credits screen in the main menu: team, real data, photos, reading sources, audio and software. */
export function makeCredits(): HTMLElement {
  const credits = document.createElement('div');
  credits.className = 'credits';

  const team = section('credits.team.heading');
  team.append(paragraph(t('credits.team'), 'credits-team'), paragraph(t('credits.agents'), 'note'));
  const challenge = paragraph('');
  challenge.append(link(CHALLENGE, t('credits.challenge')));
  team.append(challenge, paragraph(t('credits.notNasa'), 'note'));

  const data = section('credits.data.heading');
  data.append(paragraph(t('data.intro'), 'note'), makeDatasetList());

  const photos = section('credits.photos.heading');
  photos.append(list(HISTORY_CARD_IDS.map((id) => {
    const item = document.createElement('li');
    item.textContent = `${t(`history.${id}.title`)}: ${t(`history.${id}.credit`)}`;
    return item;
  })));

  const reading = section('credits.reading.heading');
  const missionLinks = new Map<string, string>();
  for (const id of HISTORY_CARD_IDS) {
    const href = HISTORY_CARDS[id].learnMore;
    if (!missionLinks.has(href)) missionLinks.set(href, t(`history.${id}.title`));
  }
  const readingLinks: [string, string][] = [
    ...missionLinks.entries(),
    ...LAUNCH_VEHICLE_IDS.map((id): [string, string] => [VEHICLE_SOURCES[id], t(`launchVehicle.${id}`)]),
    ...LAUNCH_SITE_IDS.map((id): [string, string] => [SITE_SOURCES[id], t(`launchSite.${id}.short`)]),
    ...(Object.keys(SOURCES) as (keyof typeof SOURCES)[]).map((id): [string, string] => [SOURCES[id], t(`sources.${id}`)]),
  ];
  reading.append(
    list(readingLinks.map(([href, name]) => listItem(link(href, name)))),
    paragraph(t('credits.reading.note'), 'note'),
    paragraph(t('sources.estimates'), 'note'),
  );

  const audio = section('credits.audio.heading');
  audio.append(paragraph(t('audio.musicCredit')), paragraph(t('audio.effectsCredit')));

  const software = section('credits.software.heading');
  software.append(list(SOFTWARE_IDS.map((id) => listItem(link(SOFTWARE[id], t(`credits.software.${id}`))))));

  credits.append(team, data, photos, reading, audio, software);
  return credits;
}

function section(heading: StringKey): HTMLElement {
  const el = document.createElement('section');
  const h = document.createElement('h3');
  h.textContent = t(heading);
  el.append(h);
  return el;
}

function paragraph(text: string, className?: string): HTMLParagraphElement {
  const p = document.createElement('p');
  if (className) p.className = className;
  p.textContent = text;
  return p;
}

function link(href: string, text: string): HTMLAnchorElement {
  const a = document.createElement('a');
  a.href = href;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.title = t('sources.newTab');
  a.textContent = text;
  return a;
}

function listItem(child: HTMLElement): HTMLLIElement {
  const li = document.createElement('li');
  li.append(child);
  return li;
}

function list(items: HTMLLIElement[]): HTMLUListElement {
  const ul = document.createElement('ul');
  ul.append(...items);
  return ul;
}
