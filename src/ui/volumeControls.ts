import { getVolumes, setVolumes } from '../audio/engine';
import { playEffect } from '../audio/sfx';
import { t } from '../strings';

/** Music and sound effects sliders, 0–100. Changes apply at once and are remembered by this browser. */
export function volumeControls(): HTMLElement {
  const box = document.createElement('div');
  box.className = 'volume-controls';
  for (const kind of ['music', 'effects'] as const) {
    const label = document.createElement('label');
    label.className = 'volume-row';
    const name = document.createElement('span');
    name.textContent = t(`volume.${kind}`);
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '0';
    slider.max = '100';
    slider.step = '5';
    slider.dataset.volume = kind;
    const value = document.createElement('span');
    value.className = 'volume-value';
    const show = () => {
      const v = Math.round(getVolumes()[kind] * 100);
      slider.value = String(v);
      value.textContent = t('volume.percent', { n: v });
    };
    slider.addEventListener('input', () => {
      setVolumes({ [kind]: Number(slider.value) / 100 });
      show();
    });
    // Let go of the effects slider and hear how loud they are now.
    if (kind === 'effects') slider.addEventListener('change', () => playEffect('tick'));
    // The other menu may have changed it.
    slider.addEventListener('focus', show);
    box.addEventListener('pointerenter', show);
    show();
    label.append(name, slider, value);
    box.append(label);
  }
  return box;
}
