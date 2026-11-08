import { World } from './world/world';

const canvas = document.querySelector<HTMLCanvasElement>('#world');
if (!canvas) throw new Error('Missing #world canvas');

const world = new World(canvas);
world.start();
