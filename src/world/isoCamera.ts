/** Pure camera maths for the isometric view. No Three.js objects here, so it is easy to test. */

/** True isometric tilt: the camera looks down at atan(1/√2) ≈ 35.26° above the ground. */
export const ISO_ELEVATION = Math.atan(1 / Math.SQRT2);

/** Same tilt, measured from straight up (what OrbitControls calls the polar angle). */
export const ISO_POLAR = Math.PI / 2 - ISO_ELEVATION;

/** Start facing the classic isometric corner. */
export const START_AZIMUTH = Math.PI / 4;

export const ZOOM_MIN = 0.5;
export const ZOOM_MAX = 4;

/** World units visible from top to bottom of the screen at zoom 1. */
export const VIEW_HEIGHT = 70;

export interface Frustum {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/** Orthographic frustum that keeps VIEW_HEIGHT visible vertically for any screen shape. */
export function frustumFor(aspect: number, viewHeight = VIEW_HEIGHT): Frustum {
  const halfH = viewHeight / 2;
  const halfW = halfH * aspect;
  return { left: -halfW, right: halfW, top: halfH, bottom: -halfH };
}

/** Camera offset from the point it looks at, for a given turn around the vertical axis. */
export function isoOffset(azimuth: number, distance: number): { x: number; y: number; z: number } {
  const flat = Math.cos(ISO_ELEVATION) * distance;
  return {
    x: Math.sin(azimuth) * flat,
    y: Math.sin(ISO_ELEVATION) * distance,
    z: Math.cos(azimuth) * flat,
  };
}

/** Keep the look-at point over the ground, so the player can't pan the world off screen. */
export function clampToGround(x: number, z: number, halfSize: number): { x: number; z: number } {
  const c = (v: number) => Math.min(halfSize, Math.max(-halfSize, v));
  return { x: c(x), z: c(z) };
}
