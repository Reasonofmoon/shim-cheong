import type { Object3D } from 'three';
import type { Rng } from './rng';
import type { SkyMood } from './palette';
import type { CameraRig } from './cameraRig';
import type { Stage } from './stage';

/** What an act gets handed when it is built. */
export interface ActContext {
  readonly rng: Rng;
  readonly stage: Stage;
}

/** What an act gets handed on every animation frame. */
export interface ActFrame {
  /** Seconds elapsed since this act began. */
  readonly t: number;
  /** Seconds since the previous frame, already clamped against tab-switch spikes. */
  readonly dt: number;
  /** Progress through the act, 0 → 1. */
  readonly p: number;
}

/** A built, running act. Owns its own subtree and cleans up after itself. */
export interface ActRuntime {
  readonly root: Object3D;
  update(frame: ActFrame, camera: CameraRig): void;
  dispose(): void;
}

/** One of the eight movements of the tale. */
export interface Act {
  /** Stable id used by the URL hash so a given shot can be linked to. */
  readonly id: string;
  /** e.g. "제1막". */
  readonly chapter: string;
  /** e.g. "곽씨부인 세상을 뜨다". */
  readonly title: string;
  readonly duration: number;
  readonly sky: SkyMood;
  build(ctx: ActContext): ActRuntime;
}

/** A line of pansori narration, timed against its act's local clock. */
export interface Caption {
  /** Local start time within the act, in seconds. */
  readonly at: number;
  readonly until: number;
  readonly text: string;
  /**
   * `aniri` is spoken narration, `changgeuk` is sung verse (rendered larger and
   * italic), `chuimsae` is the drummer's shouted encouragement.
   */
  readonly style?: 'aniri' | 'changgeuk' | 'chuimsae';
}
