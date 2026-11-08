import { RAW_MATERIALS } from '../economy/rawMaterial';
import { t } from '../strings';
import { DEPOSIT_COLOUR } from '../world/siteMesh';

/** The always-on bar at the top of the Site view: Company name, Seed and what the deposit colours mean. */
export function showHud(root: HTMLElement, companyName: string, seed: string): void {
  const bar = document.createElement('div');
  bar.className = 'panel hud';

  const name = document.createElement('span');
  name.className = 'hud-company';
  name.textContent = t('hud.company', { name: companyName });

  const seedText = document.createElement('span');
  seedText.className = 'hud-seed';
  seedText.textContent = t('hud.seed', { seed });

  const copy = document.createElement('button');
  copy.type = 'button';
  copy.className = 'small';
  copy.textContent = t('hud.copy');
  copy.title = t('hud.copySeed');
  copy.addEventListener('click', async () => {
    if (await copyText(seed)) {
      copy.textContent = t('hud.copied');
      window.setTimeout(() => (copy.textContent = t('hud.copy')), 1500);
    }
  });

  const legend = document.createElement('ul');
  legend.className = 'legend';
  for (const material of RAW_MATERIALS) {
    const item = document.createElement('li');
    const dot = document.createElement('span');
    dot.className = 'dot';
    dot.style.background = `#${DEPOSIT_COLOUR[material].toString(16).padStart(6, '0')}`;
    item.append(dot, t(`material.${material}`));
    legend.append(item);
  }

  const seedRow = document.createElement('div');
  seedRow.className = 'row';
  seedRow.append(seedText, copy);
  bar.append(name, seedRow, legend);
  root.append(bar);
}

/** Copy to the clipboard, with a fallback for browsers that block the Clipboard API. */
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    document.body.append(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  }
}
