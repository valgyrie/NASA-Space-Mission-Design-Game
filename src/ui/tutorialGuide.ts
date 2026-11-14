import type { SiteState } from '../game/siteState';
import { SOURCES } from '../game/sources';
import { NASA_STEPS, NASA_STEP_OF, TUTORIAL_STEPS, type TutorialStep, tutorialEnded, tutorialStep } from '../game/tutorial';
import { t } from '../strings';
import { learnMore } from './learnMore';

export interface TutorialGuide {
  /**
   * Show the current step, or hide while `covered` (a full-screen show or dialog is up). `low` moves it to the
   * bottom of the screen, out of the Mission Designer's way. Cheap enough to call every frame.
   */
  update(state: SiteState, covered: boolean, low: boolean): void;
}

/**
 * What each step points at: elements carrying `data-tutorial="<name>"` glow while the step is shown.
 * The designer's buttons are listed too, so the guide works whether the Mission Designer is open or not.
 */
const TARGETS: Record<TutorialStep, string[]> = {
  contract: ['contracts', 'accept-explorer1'],
  mine: ['build-mine'],
  factory: ['build-metalWorks'],
  design: ['designer'],
  testRun: ['designer', 'designer-next', 'planner-testrun'],
  ship: ['designer', 'designer-next', 'planner-ship', 'testrun-back'],
  travel: ['speed-4'],
  launch: ['launch'],
};

/** The Explorer 1 tutorial: one short line at a time under NASA's six steps, and a glow on what to press next. */
export function showTutorialGuide(root: HTMLElement, onSkip: () => void): TutorialGuide {
  const box = document.createElement('div');
  box.className = 'panel tutorial';
  box.hidden = true;
  box.setAttribute('role', 'status');
  const head = document.createElement('div');
  head.className = 'tutorial-head';
  const label = document.createElement('span');
  label.className = 'tutorial-label';
  const skip = document.createElement('button');
  skip.type = 'button';
  skip.className = 'small tutorial-skip';
  skip.textContent = t('tutorial.skip');
  skip.title = t('tutorial.skipName');
  skip.addEventListener('click', onSkip);
  head.append(label, skip);
  // NASA's six steps: done ones ticked, the current one lit (ticket 39).
  const row = document.createElement('ol');
  row.className = 'tutorial-nasa';
  row.setAttribute('aria-label', t('tutorial.nasa.row'));
  const dots = NASA_STEPS.map((id, i) => {
    const dot = document.createElement('li');
    dot.className = 'tutorial-nasa-step';
    dot.dataset.step = id;
    dot.textContent = String(i + 1);
    row.append(dot);
    return dot;
  });
  const line = document.createElement('p');
  line.className = 'tutorial-line';
  // Only on the last card: NASA's slides.
  const learn = learnMore(SOURCES.sixSteps, t('sources.sixSteps'));
  learn.hidden = true;
  box.append(head, row, line, learn);
  root.append(box);

  /** Tick the steps before `now`; light `now`. `now` past the end ticks them all. */
  const showRow = (now: number) => {
    dots.forEach((dot, i) => {
      const state = i < now ? 'done' : i === now ? 'now' : 'next';
      if (dot.dataset.state === state) return;
      dot.dataset.state = state;
      const name = t(`tutorial.nasa.${NASA_STEPS[i]}`);
      dot.textContent = state === 'done' ? t('tutorial.nasa.tick') : String(i + 1);
      const key = state === 'done' ? 'tutorial.nasa.dotDone' : state === 'now' ? 'tutorial.nasa.dotNow' : 'tutorial.nasa.dot';
      dot.title = t(key, { n: i + 1, name });
      dot.setAttribute('aria-label', dot.title);
      if (state === 'now') dot.setAttribute('aria-current', 'step');
      else dot.removeAttribute('aria-current');
    });
  };

  box.setAttribute('aria-label', t('tutorial.label'));

  let shown: TutorialStep | 'end' | null = null;
  // Panels redraw their buttons, so the glow is checked every frame, not only when the step changes.
  const glow = (step: TutorialStep) => {
    for (const name of TARGETS[step]) {
      for (const e of document.querySelectorAll(`[data-tutorial="${name}"]`)) {
        if (!e.classList.contains('tutorial-target')) e.classList.add('tutorial-target');
      }
    }
  };

  return {
    update(state, covered, low) {
      const step = tutorialStep(state);
      const end = !step && tutorialEnded(state);
      const hidden = (!step && !end) || covered;
      if (box.hidden !== hidden) box.hidden = hidden;
      if (box.classList.contains('low') !== low) box.classList.toggle('low', low);
      // Low over the Mission Designer: its lists get room at the end, so what the step points at can scroll clear (ticket 13).
      const room = !hidden && low;
      if (document.body.classList.contains('tutorial-low') !== room) document.body.classList.toggle('tutorial-low', room);
      const now = step ?? (end ? 'end' : null);
      if (now !== shown) {
        shown = now;
        for (const e of document.querySelectorAll('.tutorial-target')) e.classList.remove('tutorial-target');
        // The last card: everything ticked, the six names in one line, the slides, and Close instead of Skip.
        learn.hidden = now !== 'end';
        skip.textContent = t(now === 'end' ? 'tutorial.close' : 'tutorial.skip');
        skip.title = t(now === 'end' ? 'tutorial.closeName' : 'tutorial.skipName');
        if (now === 'end') {
          showRow(NASA_STEPS.length);
          label.textContent = t('tutorial.done');
          line.textContent = t('tutorial.end');
        }
      }
      if (!step) return;
      glow(step);
      const nasa = NASA_STEP_OF[step];
      showRow(NASA_STEPS.indexOf(nasa));
      const progress = t('tutorial.progress', {
        nasa: t(`tutorial.nasa.${nasa}`),
        n: TUTORIAL_STEPS.indexOf(step) + 1,
        total: TUTORIAL_STEPS.length,
      });
      if (label.textContent !== progress) label.textContent = progress;
      const text = t(`tutorial.step.${step}`);
      if (line.textContent !== text) line.textContent = text;
      // The room left under the Mission Designer's lists: the guide's height, its gap from the bottom and a margin.
      if (room) {
        const needed = `${box.offsetHeight + 48}px`;
        if (document.body.style.getPropertyValue('--tutorial-room') !== needed) document.body.style.setProperty('--tutorial-room', needed);
      }
    },
  };
}
