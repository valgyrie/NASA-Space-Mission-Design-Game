import { audio } from '../audio/sound';
import { TRACK_IDS } from '../audio/tracks';
import { t } from '../strings';

/** The same settings in the main and pause menus; preferences belong to this browser, not a Company. */
export function makeAudioControls(): HTMLElement {
  const section = document.createElement('fieldset');
  section.className = 'audio-controls';
  const legend = document.createElement('legend');
  legend.textContent = t('audio.heading');
  section.append(legend);
  for (const kind of ['music', 'effects'] as const) {
    const label = document.createElement('label');
    label.textContent = t(kind === 'music' ? 'audio.music' : 'audio.effects');
    const input = document.createElement('input');
    input.type = 'range';
    input.min = '0'; input.max = '100'; input.step = '1';
    input.value = String(Math.round(audio.settings[kind] * 100));
    input.setAttribute('aria-label', t(kind === 'music' ? 'audio.music' : 'audio.effects'));
    input.dataset.audio = kind;
    const value = document.createElement('output');
    const update = () => {
      input.value = String(Math.round(audio.settings[kind] * 100));
      value.textContent = t('audio.volume', { n: input.value });
    };
    input.addEventListener('input', () => { audio.setVolume(kind, Number(input.value) / 100); update(); });
    input.addEventListener('change', () => { if (kind === 'effects') audio.effect('reward'); });
    // Menus can be created before another copy changes the setting.
    section.addEventListener('pointerenter', update);
    section.addEventListener('focusin', update);
    update();
    label.append(input, value);
    section.append(label);
  }
  // Shown only when the browser could not load or decode the music; effects still work then.
  const problem = document.createElement('p');
  problem.className = 'note warn';
  problem.textContent = t('audio.musicFailed');
  const showProblem = () => { problem.hidden = !audio.musicFailed; };
  audio.onMusicStatus(showProblem);
  showProblem();
  section.append(problem);
  const credits = document.createElement('details');
  const summary = document.createElement('summary');
  summary.textContent = t('audio.credits');
  const music = document.createElement('p');
  music.className = 'note';
  music.textContent = t('audio.musicCredit');
  const effects = document.createElement('p');
  effects.className = 'note';
  effects.textContent = t('audio.effectsCredit');
  const files = document.createElement('ul');
  for (const id of TRACK_IDS) {
    const item = document.createElement('li');
    item.textContent = id + '.mp3';
    files.append(item);
  }
  credits.append(summary, music, effects, files);
  section.append(credits);
  return section;
}
