import type { SiteState } from '../game/siteState';
import { TUTORIAL_STEPS, type TutorialStep, tutorialStep } from '../game/tutorial';
import { t } from '../strings';

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

/** The Explorer 1 tutorial: one short line at a time, and a glow on what to press next. */
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
  const line = document.createElement('p');
  line.className = 'tutorial-line';
  box.append(head, line);
  root.append(box);

  box.setAttribute('aria-label', t('tutorial.label'));

  let shown: TutorialStep | null = null;
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
      const hidden = !step || covered;
      if (box.hidden !== hidden) box.hidden = hidden;
      if (box.classList.contains('low') !== low) box.classList.toggle('low', low);
      if (step !== shown) {
        shown = step;
        for (const e of document.querySelectorAll('.tutorial-target')) e.classList.remove('tutorial-target');
      }
      if (!step) return;
      glow(step);
      const progress = t('tutorial.progress', { n: TUTORIAL_STEPS.indexOf(step) + 1, total: TUTORIAL_STEPS.length });
      if (label.textContent !== progress) label.textContent = progress;
      const text = t(`tutorial.step.${step}`);
      if (line.textContent !== text) line.textContent = text;
    },
  };
}
