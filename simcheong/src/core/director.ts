import { Group } from 'three';
import { disposeTree } from '../builders/materials';
import { Rng } from './rng';
import { clamp } from './timeline';
import type { Act, ActRuntime, Caption } from './types';
import type { CameraRig } from './cameraRig';
import type { Stage } from './stage';
import type { Subtitles } from './subtitles';

/**
 * The projectionist.
 *
 * Acts are built lazily on entry and torn down on exit, so only one act's worth
 * of geometry is ever resident. That is what keeps a film with eight distinct
 * environments inside a sane memory budget, and it is only possible because
 * every act is a pure function of its local time — there is no accumulated
 * simulation state to lose when an act is rebuilt.
 *
 * The consequence worth knowing about: seeking backwards inside an act is free
 * and exact, but crossing an act boundary costs a rebuild (a few tens of
 * milliseconds). The fade-to-black between acts hides it.
 */

export interface DirectorEvents {
  onActChange(index: number, act: Act): void;
  onProgress(actTime: number, actDuration: number, totalTime: number, totalDuration: number): void;
  onPlayStateChange(playing: boolean): void;
}

/** Seconds of black between acts, split evenly into fade-out and fade-in. */
const TRANSITION = 1.1;

export class Director {
  private readonly acts: readonly Act[];
  private readonly captions: Readonly<Record<string, readonly Caption[]>>;
  private readonly stage: Stage;
  private readonly rig: CameraRig;
  private readonly subtitles: Subtitles;
  private readonly fadeEl: HTMLElement;
  private readonly events: DirectorEvents;

  private index = 0;
  private localTime = 0;
  private current: ActRuntime | null = null;
  private readonly holder = new Group();

  private playing = false;
  private transition = 0;
  private pendingIndex: number | null = null;
  private pendingTime = 0;

  /** Cumulative start time of each act, for the global scrubber. */
  private readonly offsets: number[] = [];
  readonly totalDuration: number;

  constructor(
    acts: readonly Act[],
    captions: Readonly<Record<string, readonly Caption[]>>,
    stage: Stage,
    rig: CameraRig,
    subtitles: Subtitles,
    fadeEl: HTMLElement,
    events: DirectorEvents,
  ) {
    this.acts = acts;
    this.captions = captions;
    this.stage = stage;
    this.rig = rig;
    this.subtitles = subtitles;
    this.fadeEl = fadeEl;
    this.events = events;

    this.stage.scene.add(this.holder);

    let sum = 0;
    for (const act of acts) {
      this.offsets.push(sum);
      sum += act.duration;
    }
    this.totalDuration = sum;
  }

  get currentAct(): Act {
    const act = this.acts[this.index];
    if (!act) throw new Error(`Director has no act at index ${this.index}`);
    return act;
  }

  get actIndex(): number {
    return this.index;
  }

  get isPlaying(): boolean {
    return this.playing;
  }

  get actTime(): number {
    return this.localTime;
  }

  /**
   * True while an act change is in flight. `goTo` refuses to seek during one,
   * so anything driving the film from outside (the capture harness) has to be
   * able to see this rather than guess at a sleep duration.
   */
  get isTransitioning(): boolean {
    return this.transition > 0;
  }

  /** False before any act has been built — the state right after construction. */
  get hasBuiltAct(): boolean {
    return this.current !== null;
  }

  /** Global elapsed time across the whole film. */
  get globalTime(): number {
    return (this.offsets[this.index] ?? 0) + this.localTime;
  }

  start(index = 0, atTime = 0): void {
    this.enter(index, atTime);
    this.play();
  }

  play(): void {
    if (this.playing) return;
    this.playing = true;
    this.events.onPlayStateChange(true);
  }

  pause(): void {
    if (!this.playing) return;
    this.playing = false;
    this.events.onPlayStateChange(false);
  }

  toggle(): void {
    if (this.playing) this.pause();
    else this.play();
  }

  /**
   * Jump to an act. Goes through the fade so the rebuild stall is invisible.
   *
   * The condition for seeking instead of fading is "the act I want is already
   * the live one and no act change is pending" — deliberately *not* "and no
   * fade is running". The earlier version also required `transition === 0`,
   * which had two bad consequences:
   *
   *   - Every call arriving mid-fade reset `transition` back to a full
   *     TRANSITION. A caller issuing jumps faster than 1.1 s apart could hold
   *     the fade open forever, and since the seek branch was never taken, the
   *     act stayed frozen at whatever time it was entered at. The capture
   *     harness did exactly this and produced byte-identical frames for three
   *     acts — with no error anywhere, because nothing was actually wrong
   *     except that the seek silently never ran.
   *   - Clicking two act chips in quick succession wedged the player the same
   *     way.
   *
   * Once `pendingIndex` is null the incoming act has been built and is live;
   * seeking within it is safe even while the fade finishes on top.
   */
  goTo(index: number, atTime = 0): void {
    const target = clamp(index, 0, this.acts.length - 1);
    if (target === this.index && this.pendingIndex === null) {
      this.seek(atTime);
      return;
    }
    this.pendingIndex = target;
    this.pendingTime = atTime;
    this.transition = TRANSITION;
  }

  next(): void {
    if (this.index < this.acts.length - 1) this.goTo(this.index + 1);
  }

  previous(): void {
    // Restart the current act first, the way a chapter button on a disc does.
    if (this.localTime > 3) this.seek(0);
    else if (this.index > 0) this.goTo(this.index - 1);
  }

  /** Scrub within the current act. Instant and exact — acts are stateless. */
  seek(t: number): void {
    this.localTime = clamp(t, 0, this.currentAct.duration);
    this.applyFrame(0);
  }

  /** Scrub across the whole film by global time. */
  seekGlobal(t: number): void {
    const target = clamp(t, 0, this.totalDuration);
    let index = 0;
    for (let i = 0; i < this.acts.length; i++) {
      if (target >= (this.offsets[i] ?? 0)) index = i;
    }
    const local = target - (this.offsets[index] ?? 0);
    if (index === this.index) this.seek(local);
    else this.goTo(index, local);
  }

  update(dt: number): void {
    if (this.transition > 0) {
      this.transition -= dt;
      const half = TRANSITION / 2;

      if (this.pendingIndex !== null && this.transition <= half) {
        this.enter(this.pendingIndex, this.pendingTime);
        this.pendingIndex = null;
      }

      // 0 at the extremes, 1 at the midpoint.
      const k =
        this.transition > half
          ? 1 - (this.transition - half) / half
          : this.transition / half;
      this.fadeEl.style.opacity = String(clamp(k, 0, 1));

      if (this.transition <= 0) {
        this.transition = 0;
        this.fadeEl.style.opacity = '0';
      }
      // Time keeps running during the second half of the fade so the incoming
      // act is already alive when it becomes visible.
      if (this.pendingIndex !== null) {
        this.applyFrame(0);
        return;
      }
    }

    if (this.playing) {
      this.localTime += dt;
      if (this.localTime >= this.currentAct.duration) {
        if (this.index < this.acts.length - 1) {
          this.localTime = this.currentAct.duration;
          this.goTo(this.index + 1);
        } else {
          this.localTime = this.currentAct.duration;
          this.pause();
        }
      }
    }

    this.applyFrame(dt);
  }

  private applyFrame(dt: number): void {
    const act = this.currentAct;
    const t = clamp(this.localTime, 0, act.duration);
    const frame = { t, dt, p: act.duration > 0 ? t / act.duration : 0 };

    this.rig.tick(dt);
    this.current?.update(frame, this.rig);

    this.subtitles.update(act.id, this.captions[act.id] ?? [], t);
    this.events.onProgress(t, act.duration, this.globalTime, this.totalDuration);
  }

  private enter(index: number, atTime: number): void {
    if (this.current) {
      this.holder.remove(this.current.root);
      this.current.dispose();
      disposeTree(this.current.root);
      this.current = null;
    }

    this.index = clamp(index, 0, this.acts.length - 1);
    const act = this.currentAct;
    this.localTime = clamp(atTime, 0, act.duration);

    // Seeding from the act index keeps every act's randomness stable across
    // reloads while still giving each act a different world.
    const rng = new Rng(0x5117 + this.index * 7919);
    this.rig.reset(this.index);
    this.stage.applyMood(act.sky);
    this.subtitles.clear();

    this.current = act.build({ rng, stage: this.stage });
    this.holder.add(this.current.root);

    this.events.onActChange(this.index, act);
    this.applyFrame(0);
  }

  dispose(): void {
    if (this.current) {
      this.holder.remove(this.current.root);
      this.current.dispose();
      disposeTree(this.current.root);
      this.current = null;
    }
    this.stage.scene.remove(this.holder);
  }
}
