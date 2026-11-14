import { logoUrl } from '../company/logo';
import type { Company } from '../save/save';
import { RAW_MATERIALS } from '../economy/rawMaterial';
import { availableContracts, daysLeft } from '../game/contracts';
import { missionStage } from '../game/mission';
import { satellitesInOrbit } from '../game/space';
import type { SiteState } from '../game/siteState';
import { icon } from './icons';
import { t } from '../strings';
import { DEPOSIT_COLOUR } from '../world/siteMesh';
import { contractText, cssColour, formatDays, formatNumber } from './format';

export interface Hud {
  /** Refresh the active Contract line. Cheap enough to call every frame. */
  update(state: SiteState): void;
  updateLogo(): void;
}

function setText(e: HTMLElement, text: string): void {
  if (e.textContent !== text) e.textContent = text;
}

/** The panel at the top left of the Site view: Company name, menu button, Deposit colours, Market, Contracts, Mission Designer and the active Contract. */
export function showHud(
  root: HTMLElement,
  company: Company,
  onMenu: () => void,
  onHome: () => void,
  onMarket: () => void,
  onContracts: () => void,
  onDesigner: () => void,
  onLaunch: () => void,
  onTrack: () => void,
  onSpace: () => void,
  onArchive: () => void,
  onLogo: () => void,
): Hud {
  const bar = document.createElement('div');
  bar.className = 'panel hud';

  const name = document.createElement('span');
  name.className = 'hud-company';
  name.textContent = t('hud.company', { name: company.name });
  name.title = name.textContent; // the whole name on hover when it is cut short

  const menu = document.createElement('button');
  menu.type = 'button';
  menu.className = 'small icon-button';
  menu.textContent = t('hud.menuIcon');
  menu.title = t('hud.menu');
  menu.setAttribute('aria-label', t('hud.menu'));
  menu.addEventListener('click', onMenu);

  const home = document.createElement('button');
  home.type = 'button';
  home.className = 'small icon-button';
  home.textContent = t('hud.homeIcon');
  home.title = t('hud.home');
  home.setAttribute('aria-label', t('hud.home'));
  home.addEventListener('click', onHome);

  const legend = document.createElement('ul');
  legend.className = 'legend';
  for (const material of RAW_MATERIALS) {
    const item = document.createElement('li');
    const dot = document.createElement('span');
    dot.className = 'dot';
    dot.style.background = cssColour(DEPOSIT_COLOUR[material]);
    item.append(dot, t(`material.${material}`));
    legend.append(item);
  }

  const market = document.createElement('button');
  market.type = 'button';
  market.className = 'small market-button';
  market.textContent = t('market.open');
  market.title = t('market.openName');
  market.prepend(icon('market'));
  market.addEventListener('click', onMarket);

  const contracts = document.createElement('button');
  contracts.type = 'button';
  contracts.className = 'small market-button';
  contracts.textContent = t('contracts.open');
  contracts.title = t('contracts.openName');
  contracts.prepend(icon('contracts'));
  contracts.dataset.tutorial = 'contracts';
  contracts.addEventListener('click', onContracts);

  const designer = document.createElement('button');
  designer.type = 'button';
  designer.className = 'small market-button designer-button';
  designer.textContent = t('designer.open');
  designer.title = t('designer.openName');
  designer.prepend(icon('designer'));
  designer.classList.add('designer-open');
  designer.dataset.tutorial = 'designer';
  designer.addEventListener('click', onDesigner);

  // Shown once something is in orbit: the Space view with every Spacecraft up there.
  const space = document.createElement('button');
  space.type = 'button';
  space.className = 'small market-button designer-button space-button';
  space.textContent = t('space.open');
  space.title = t('space.openName');
  space.prepend(icon('space'));
  space.hidden = true;
  space.addEventListener('click', onSpace);

  // Shown once there is something in it: Mission Patches and Real History cards.
  const archive = document.createElement('button');
  archive.type = 'button';
  archive.className = 'small market-button designer-button';
  archive.textContent = t('archive.open');
  archive.title = t('archive.openName');
  archive.prepend(icon('archive'));
  archive.hidden = true;
  archive.addEventListener('click', onArchive);

  const buttons = document.createElement('div');
  buttons.className = 'row hud-buttons';
  buttons.append(market, contracts);

  const active = document.createElement('p');
  active.className = 'hud-contract';

  // The Mission on its way: assembling, shipping, then a Launch button once it is at the Launch Site.
  const mission = document.createElement('p');
  mission.className = 'hud-mission';
  const launch = document.createElement('button');
  launch.type = 'button';
  launch.className = 'small launch-button';
  launch.textContent = t('mission.launch');
  launch.title = t('mission.launchName');
  launch.prepend(icon('rocket'));
  launch.hidden = true;
  launch.dataset.tutorial = 'launch';
  launch.addEventListener('click', onLaunch);
  const track = document.createElement('button');
  track.type = 'button';
  track.className = 'small market-button';
  track.textContent = t('mission.track');
  track.title = t('mission.trackName');
  track.prepend(icon('track'));
  track.hidden = true;
  track.addEventListener('click', onTrack);

  const logo = document.createElement('button');
  logo.type = 'button';
  logo.className = 'hud-logo';
  logo.title = t('logo.edit');
  logo.setAttribute('aria-label', t('logo.edit'));
  const logoImage = document.createElement('img');
  logoImage.alt = '';
  logoImage.src = logoUrl(company.logo);
  logo.append(logoImage);
  logo.addEventListener('click', onLogo);

  const top = document.createElement('div');
  top.className = 'row hud-top';
  top.append(menu, logo, name, home);
  bar.append(top, legend, buttons, designer, space, archive, active, mission, track, launch);
  root.append(bar);

  // Panels on the left open just below the HUD, which grows while a Mission is on its way.
  const place = () => document.documentElement.style.setProperty('--hud-bottom', `${bar.offsetTop + bar.offsetHeight + 10}px`);
  new ResizeObserver(place).observe(bar);
  place();

  return {
    updateLogo() { logoImage.src = logoUrl(company.logo); },
    update(state) {
      // Nudge towards the board while there is work on offer and none taken.
      const nudge = state.contracts.length === 0 && availableContracts(state).length > 0;
      if (contracts.classList.contains('attention') !== nudge) contracts.classList.toggle('attention', nudge);
      const stage = missionStage(state);
      if (stage && state.mission) {
        const values = {
          contract: contractText(state.mission.contract),
          site: t(`launchSite.${state.mission.site}.short`),
          days: formatDays(stage.daysLeft),
        };
        setText(mission, t(`mission.${stage.stage}`, values));
      } else setText(mission, '');
      if (launch.hidden !== (stage?.stage !== 'ready')) launch.hidden = stage?.stage !== 'ready';
      if (track.hidden !== !stage) track.hidden = !stage;
      const orbiting = satellitesInOrbit(state).length > 0;
      if (space.hidden === orbiting) space.hidden = !orbiting;
      const kept = state.history.length > 0 || state.patches.length > 0;
      if (archive.hidden === kept) archive.hidden = !kept;
      const first = state.contracts[0];
      if (!first) return setText(active, '');
      const name = contractText(first.id);
      const left = daysLeft(state, first);
      setText(active, left > 0 ? t('contracts.hudActive', { name, days: formatNumber(left) }) : t('contracts.hudOverdue', { name }));
      active.classList.toggle('warn', left === 0);
    },
  };
}
