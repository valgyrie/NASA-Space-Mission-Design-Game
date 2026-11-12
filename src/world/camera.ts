/** Pure camera maths. No Three.js objects here, so it is easy to test. */

/** Classic isometric tilt: the camera looks down at atan(1/√2) ≈ 35.26° above the ground. */
export const ISO_ELEVATION = Math.atan(1 / Math.SQRT2);

/** The view opens at the isometric tilt; the player can tilt from near the horizon to steeply down. */
export const START_ELEVATION = ISO_ELEVATION;
export const MIN_ELEVATION = (7 * Math.PI) / 180;
export const MAX_ELEVATION = (70 * Math.PI) / 180;

/** A narrow lens keeps the isometric look while still showing a horizon when tilted low. */
export const FOV_DEGREES = 30;

/** Start facing the classic isometric corner. */
export const START_AZIMUTH = Math.PI / 4;

/** World units visible from top to bottom of the screen at the start. */
export const START_VIEW_HEIGHT = 92;

/** Camera elevation measured from straight up (what OrbitControls calls the polar angle). */
export function polarFromElevation(elevation: number): number {
  return Math.PI / 2 - elevation;
}

/** Distance at which a perspective camera shows `viewHeight` world units top to bottom. */
export function distanceToShow(viewHeight: number, fovDegrees = FOV_DEGREES): number {
  return viewHeight / 2 / Math.tan((fovDegrees * Math.PI) / 360);
}

export const START_DISTANCE = distanceToShow(START_VIEW_HEIGHT);
export const MIN_DISTANCE = 8;
export const MAX_DISTANCE = START_DISTANCE * 1.25;

/** Camera offset from the point it looks at. */
export function cameraOffset(
  azimuth: number,
  elevation: number,
  distance: number,
): { x: number; y: number; z: number } {
  const flat = Math.cos(elevation) * distance;
  return { x: Math.sin(azimuth) * flat, y: Math.sin(elevation) * distance, z: Math.cos(azimuth) * flat };
}

/**
 * Where the haze starts and where it hides everything, for a camera this far from what it looks at.
 * The Site stays clear; the scenery fades out well before the drawn land ends.
 */
export function hazeFor(distance: number): { near: number; far: number } {
  return { near: distance + 40, far: distance + 190 };
}

/** How far past the Site's edge the player can move the view, in tiles: enough to look at the land next door. */
export const PAN_BEYOND_SITE = 32;

/** Keyboard camera speeds, per second. Moving scales with zoom, so it feels the same close up and far out. */
export const KEY_SPEED = { move: 0.35, turn: 1.4, tilt: 0.9, zoom: 1.6 };

/** Seconds the "whole Site" view takes to glide into place. */
export const HOME_SECONDS = 0.7;

/** The isometric corner direction (45°, 135°, …) closest to a turn, so going home keeps your side of the Site. */
export function nearestIsoAzimuth(azimuth: number): number {
  const quarter = Math.PI / 2;
  return START_AZIMUTH + Math.round((azimuth - START_AZIMUTH) / quarter) * quarter;
}

/** Smooth start and stop for camera moves: 0 → 0, 1 → 1. */
export function easeInOut(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
}

/** Keep the look-at point inside a box of world x/z (the Site and a margin), so the player can't wander off. */
export function clampToBox(
  x: number,
  z: number,
  box: { minX: number; maxX: number; minZ: number; maxZ: number },
): { x: number; z: number } {
  return { x: Math.min(box.maxX, Math.max(box.minX, x)), z: Math.min(box.maxZ, Math.max(box.minZ, z)) };
}

/** Keep the look-at point over the Site or near it, so the player can't wander off. */
export function clampToGround(x: number, z: number, halfSize: number): { x: number; z: number } {
  const c = (v: number) => Math.min(halfSize, Math.max(-halfSize, v));
  return { x: c(x), z: c(z) };
}
