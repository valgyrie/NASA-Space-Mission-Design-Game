import { type Segment, showAt, showLength } from '../game/ascent';
import type { LaunchVehicleId } from '../game/launchVehicles';
import { TITLE_COUNTDOWN_S, pickRocket, titleShow } from '../game/titleShow';
import { type Design, type OptionId, choose, emptyDesign } from '../game/spacecraft';
import { type CompanyLogo, DEFAULT_LOGO } from '../company/logo';
import { LaunchView } from './launchView';

/**
 * The title screen's backdrop: one of the five Launch Vehicles lifts off from the pad, climbs and fires its
 * upper stages, then the picture fades and another rocket takes its place. It reuses the Launch show's
 * LaunchView unchanged; nothing here reaches the game or its saves.
 */

/** Frames to skip while shaders compile, then frames to time; slower than this median and the Site is shown instead. */
const WARM_UP_FRAMES = 20;
const TIMED_FRAMES = 60;
const SLOW_FRAME_S = 1 / 12;
/** Seconds of fade to black at the end of each Launch, and back in at the start of the next. */
const FADE_S = 1.2;

const EXPLORER: OptionId[] = ['smallBus', 'batteriesOnly', 'largeBattery', 'simpleAntenna', 'spin', 'noEngine', 'radiationDetector'];
const TELSTAR: OptionId[] = ['mediumBus', 'solarCells', 'smallBattery', 'simpleAntenna', 'spin', 'noEngine', 'transponder'];

function designFor(vehicle: LaunchVehicleId): Design {
  const design = emptyDesign();
  for (const option of vehicle === 'juno1' || vehicle === 'thorAble' ? EXPLORER : TELSTAR) choose(design, option);
  return design;
}

export class TitleLaunch {
  readonly element = document.createElement('div');
  private readonly view: LaunchView;
  private readonly fade = document.createElement('div');
  private vehicle: LaunchVehicleId | null = null;
  private segments: Segment[] = [];
  private length = 0;
  private seconds = 0;
  private last = 0;
  private frame = 0;
  private shot = '';

  /** Throws where WebGL is missing; the caller then keeps the Site behind the menu. */
  constructor(
    private readonly logo: CompanyLogo = DEFAULT_LOGO,
    private readonly still = false,
    private readonly onRocket: (vehicle: LaunchVehicleId) => void = () => {},
    private readonly onSlow: () => void = () => {},
  ) {
    this.view = new LaunchView();
    this.element.className = 'title-launch';
    this.element.setAttribute('aria-hidden', 'true');
    this.view.canvas.className = 'title-launch-canvas';
    this.fade.className = 'title-launch-fade';
    this.element.append(this.view.canvas, this.fade);
  }

  start(): void {
    this.next();
    this.last = performance.now();
    let frames = 0;
    const timed: number[] = [];
    const tick = (now: number) => {
      const raw = (now - this.last) / 1000;
      const dt = this.still ? 0 : Math.min(0.1, raw);
      this.last = now;
      if (++frames > WARM_UP_FRAMES && timed.length < TIMED_FRAMES && !this.still) {
        timed.push(raw);
        if (timed.length === TIMED_FRAMES && [...timed].sort((a, b) => a - b)[TIMED_FRAMES / 2]! > SLOW_FRAME_S) {
          this.onSlow();
          return;
        }
      }
      this.seconds += dt;
      if (this.seconds >= this.length) this.next();
      const m = showAt(this.segments, this.seconds);
      const shot = this.view.render(m, dt, true);
      // Fade from and to black at each end of a Launch; a quick flash where the show cuts between shots.
      const edge = Math.min(this.seconds, this.length - this.seconds);
      this.fade.style.opacity = this.still ? '0' : Math.min(1, Math.max(0, 1 - edge / FADE_S)).toFixed(3);
      if (this.shot && shot !== this.shot) {
        this.fade.classList.remove('cut');
        void this.fade.offsetWidth;
        this.fade.classList.add('cut');
      }
      this.shot = shot;
      this.frame = requestAnimationFrame(tick);
    };
    this.frame = requestAnimationFrame(tick);
  }

  /** Stop drawing and free the rocket and the WebGL context. */
  destroy(): void {
    cancelAnimationFrame(this.frame);
    this.view.unload();
    this.element.remove();
    const gl = this.view.canvas.getContext('webgl2') ?? this.view.canvas.getContext('webgl');
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  }

  private next(): void {
    const vehicle = pickRocket(this.vehicle);
    this.vehicle = vehicle;
    this.segments = titleShow(vehicle);
    this.length = showLength(this.segments);
    // Reduced motion: one still picture of the rocket waiting on the pad.
    this.seconds = this.still ? TITLE_COUNTDOWN_S - 2 : 0;
    this.shot = '';
    this.view.load(designFor(vehicle), vehicle, { low: 400, high: 400 }, this.logo);
    this.onRocket(vehicle);
  }
}
