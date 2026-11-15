import * as THREE from 'three';

/**
 * Letting the player look around during a Moon sequence: drag (mouse or touch) to swing the camera round what it is
 * watching, scroll or pinch to move a little closer or further. A couple of seconds after letting go, the camera
 * eases back onto the film's own path. With reduced motion the easing is quick and nothing swings on its own.
 */

/** Seconds after the last touch before the camera drifts back to the film's path. */
export const RETURN_AFTER_S = 2.2;
const PITCH_LIMIT = 1.2;
const ZOOM_MIN = 0.55;
const ZOOM_MAX = 1.8;

/**
 * Turn the camera's offset from its target by `yaw` (round the world's up) and `pitch` (up or down, limited so it
 * never flips over the top), and scale its length by `zoom`.
 */
export function orbitOffset(offset: THREE.Vector3, yaw: number, pitch: number, zoom: number): THREE.Vector3 {
  const length = offset.length();
  if (length < 1e-9) return offset.clone();
  const flat = Math.hypot(offset.x, offset.z);
  const elevation = Math.atan2(offset.y, flat);
  const heading = Math.atan2(offset.x, offset.z) + yaw;
  const e = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, elevation + pitch));
  const r = length * Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoom));
  return new THREE.Vector3(Math.sin(heading) * Math.cos(e) * r, Math.sin(e) * r, Math.cos(heading) * Math.cos(e) * r);
}

/** How much of the player's offset is left after `idle` seconds without input and `dt` more seconds. */
export function easeBack(value: number, rest: number, idle: number, dt: number, calm: boolean): number {
  if (idle < RETURN_AFTER_S) return value;
  const k = 1 - Math.exp(-dt * (calm ? 6 : 1.4));
  return value + (rest - value) * k;
}

export class LookAround {
  yaw = 0;
  pitch = 0;
  zoom = 1;
  /** Only while true do pointer events move the camera (the Moon scene is on screen). */
  active = false;
  private idle = Infinity;
  private drag: { id: number; x: number; y: number } | null = null;
  private pinch = new Map<number, { x: number; y: number }>();
  private pinchStart = 0;
  private readonly off: (() => void)[] = [];

  constructor(element: HTMLElement, private readonly calm: boolean) {
    const on = <K extends keyof HTMLElementEventMap>(type: K, fn: (e: HTMLElementEventMap[K]) => void, options?: AddEventListenerOptions) => {
      element.addEventListener(type, fn as EventListener, options);
      this.off.push(() => element.removeEventListener(type, fn as EventListener));
    };
    on('pointerdown', (e) => {
      if (!this.active) return;
      this.pinch.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.pinch.size === 2) this.pinchStart = this.spread();
      this.drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
      element.setPointerCapture?.(e.pointerId);
      this.idle = 0;
    });
    on('pointermove', (e) => {
      if (!this.active || !this.drag) return;
      if (this.pinch.has(e.pointerId)) this.pinch.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.pinch.size >= 2) {
        const now = this.spread();
        if (this.pinchStart > 0) this.zoom = clampZoom(this.zoom * (this.pinchStart / Math.max(1, now)));
        this.pinchStart = now;
      } else if (e.pointerId === this.drag.id) {
        const h = Math.max(1, element.clientHeight);
        this.yaw -= ((e.clientX - this.drag.x) / h) * 3;
        this.pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, this.pitch + ((e.clientY - this.drag.y) / h) * 2.4));
        this.drag.x = e.clientX;
        this.drag.y = e.clientY;
      }
      this.idle = 0;
    });
    const end = (e: PointerEvent) => {
      this.pinch.delete(e.pointerId);
      if (this.drag?.id === e.pointerId) this.drag = null;
    };
    on('pointerup', end);
    on('pointercancel', end);
    on(
      'wheel',
      (e) => {
        if (!this.active) return;
        e.preventDefault();
        this.zoom = clampZoom(this.zoom * Math.exp(e.deltaY * 0.0012));
        this.idle = 0;
      },
      { passive: false },
    );
  }

  private spread(): number {
    const [a, b] = [...this.pinch.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  }

  /** Called every frame: time passes, and without input the offsets ease back to the film's path. */
  update(dt: number): void {
    if (this.drag) return;
    this.idle += dt;
    this.yaw = easeBack(this.yaw, 0, this.idle, dt, this.calm);
    this.pitch = easeBack(this.pitch, 0, this.idle, dt, this.calm);
    this.zoom = easeBack(this.zoom, 1, this.idle, dt, this.calm);
  }

  /** Forget any offset at once (a new sequence starts). */
  reset(): void {
    this.yaw = this.pitch = 0;
    this.zoom = 1;
    this.idle = Infinity;
  }

  /** Move `camera` (already placed on the film's path, looking at `target`) by the player's offset. */
  apply(camera: THREE.Camera, target: THREE.Vector3): void {
    if (this.yaw === 0 && this.pitch === 0 && this.zoom === 1) return;
    const offset = orbitOffset(camera.position.clone().sub(target), this.yaw, this.pitch, this.zoom);
    camera.position.copy(target).add(offset);
    camera.lookAt(target);
  }

  dispose(): void {
    for (const f of this.off) f();
    this.off.length = 0;
  }
}

function clampZoom(z: number): number {
  return Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, z));
}
