import { describe, expect, it } from 'vitest';
import { PANEL_PAR_S, PANEL_TIME_S, PUSH_COOLDOWN_S, goodMoment, newPanelGame, panelScore, pushPanel, stepPanel, type PanelGame } from './panelGame';

/** Play a whole game at 60 frames a second, pushing whenever `push` says so. */
function play(push: (g: PanelGame) => boolean): PanelGame {
  const g = newPanelGame();
  while (g.state === 'playing') {
    if (push(g)) pushPanel(g);
    stepPanel(g, 1 / 60);
  }
  return g;
}

describe('Stuck solar panel: the mini-game', () => {
  it('stays stuck if nothing is done', () => {
    const g = play(() => false);
    expect(g.state).toBe('lost');
    expect(g.elapsedS).toBeCloseTo(PANEL_TIME_S);
    expect(panelScore(g)).toBe(0);
  });

  it('opens with pushes in time with the swing, well before par', () => {
    const g = play(goodMoment);
    expect(g.state).toBe('won');
    expect(g.openedAtS!).toBeLessThan(PANEL_PAR_S);
    expect(panelScore(g)).toBe(1);
  });

  it('opens with one push a swing, as a person would', () => {
    let last = -9;
    const g = play((x) => {
      if (!goodMoment(x) || x.elapsedS - last < 0.9) return false;
      last = x.elapsedS;
      return true;
    });
    expect(g.state).toBe('won');
    expect(panelScore(g)).toBeGreaterThan(0.5);
  });

  it("doesn't open by pressing as fast as the thruster allows", () => {
    const g = play(() => true);
    expect(g.state).toBe('lost');
    expect(g.pushes).toBeGreaterThan(30);
  });

  it('waits for the thruster between pushes and says whether a push helped', () => {
    const g = newPanelGame();
    expect(pushPanel(g)).toBe('out');
    expect(pushPanel(g)).toBeNull();
    stepPanel(g, PUSH_COOLDOWN_S + 0.01);
    expect(pushPanel(g)).not.toBeNull();
  });

  it('plays the same at any frame rate', () => {
    const a = newPanelGame();
    const b = newPanelGame();
    stepPanel(a, 1);
    for (let i = 0; i < 100; i++) stepPanel(b, 0.01);
    expect(a.open).toBeCloseTo(b.open, 3);
  });

  it('scores less the longer it took', () => {
    const at = (s: number) => panelScore({ ...newPanelGame(), state: 'won', openedAtS: s });
    expect(at(PANEL_PAR_S)).toBe(1);
    expect(at(10)).toBeLessThan(at(8));
    expect(at(PANEL_TIME_S)).toBe(0);
  });
});
