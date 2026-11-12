import { t } from '../strings';
import type { World } from '../world/world';

/** A rendered Site shot and one gameplay tip. No timer or minimum reading time. */
export function showLoading(root: HTMLElement, world: World): () => void {
  const screen = document.createElement('section');
  screen.className = 'loading-screen';
  screen.setAttribute('role', 'status');
  screen.setAttribute('aria-live', 'polite');
  const shot = document.createElement('canvas');
  shot.width = world.renderer.domElement.width;
  shot.height = world.renderer.domElement.height;
  shot.setAttribute('aria-hidden', 'true');
  world.renderer.render(world.scene, world.camera);
  shot.getContext('2d')?.drawImage(world.renderer.domElement, 0, 0);
  const card = document.createElement('div');
  card.className = 'panel loading-card';
  const heading = document.createElement('h2');
  heading.textContent = t('loading.heading');
  const tip = document.createElement('p');
  tip.textContent = t('loading.tip');
  card.append(heading, tip);
  screen.append(shot, card);
  root.append(screen);
  return () => screen.remove();
}
