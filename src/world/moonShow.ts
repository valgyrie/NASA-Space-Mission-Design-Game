import type * as THREE from 'three';
import type { CompanyLogo } from '../company/logo';
import type { Design } from '../game/spacecraft';

/**
 * The Moon sequences of the Launch show (Eras 3 and 5): what plays after the climb when a Mission goes to or
 * near the Moon. Apollo 11: Saturn V's S-IVB fires "Off to the Moon", lunar orbit, the Lunar Module lands at
 * Tranquility Base and the crew sets up the Company's science package. Artemis II: Orion's flight round the Moon.
 * Artemis III: Orion docking with a lander test article in low Earth orbit. Artemis IV: a crewed landing near the
 * south pole. The player's Spacecraft is shown in each.
 *
 * INTERFACE CONTRACT (docs/eras-demo/PLAN.md): the game-logic side (ascent.ts, launchShow.ts) only uses the
 * exported types and functions below; the 3D side owns everything else in this file and in src/world/moon*.ts.
 * This first version is a stub with the final signatures; the 3D side fills it in.
 */

export type MoonShowKind = 'apollo11' | 'artemis2' | 'artemis3' | 'artemis4';

/** How the Company helps Artemis III and IV (the player's choice). */
export type ArtemisChoice = 'camera' | 'relay' | 'spaceWeather' | 'cargoLander' | 'mapper';

export interface MoonShowSpec {
  kind: MoonShowKind;
  /** Artemis III: camera, relay or spaceWeather. Artemis IV: relay, cargoLander or mapper. */
  choice?: ArtemisChoice;
}

/** One captioned moment of a Moon sequence. Its text is the strings `moonShow.<kind>.<key>` and `moonShow.<kind>.<key>.detail`. */
export interface MoonBeat {
  key: string;
  /** Seconds from the start of the sequence, at normal speed. */
  startS: number;
}

/** The captioned moments of a sequence, in order; the first starts at 0. */
export function moonShowBeats(spec: MoonShowSpec): MoonBeat[] {
  return [
    { key: 'start', startS: 0 },
    { key: 'arrive', startS: moonShowLength(spec) / 2 },
  ];
}

/** Screen seconds the whole sequence takes at normal speed (about 30–60). */
export function moonShowLength(_spec: MoonShowSpec): number {
  return 40;
}

/** The beat playing at `seconds` into the sequence. */
export function moonBeatAt(spec: MoonShowSpec, seconds: number): MoonBeat {
  const beats = moonShowBeats(spec);
  let beat = beats[0]!;
  for (const b of beats) if (b.startS <= seconds) beat = b;
  return beat;
}

/**
 * The 3D sequence. LaunchView owns one, draws it while the show's segment is 'moon', and passes its renderer in.
 * `render` takes the sequence's own seconds (ShowMoment.value), so pause, speed-up and Skip all work.
 */
export class MoonShow {
  constructor(private readonly renderer: THREE.WebGLRenderer) {}

  /** Get ready for one Mission: build the right scene, with the player's Spacecraft and logo. */
  start(_spec: MoonShowSpec, _design: Design, _logo: CompanyLogo): void {}

  /** Draw the sequence at `seconds`; `dt` is screen seconds since the last frame (for dust, flames). */
  render(_seconds: number, _dt: number, _width: number, _height: number): void {
    void this.renderer;
  }

  /** Free the GPU memory when the show closes. */
  dispose(): void {}
}
