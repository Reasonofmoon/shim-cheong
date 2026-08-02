import type { CameraRig } from './cameraRig';
import { easeInOutCubic, lerp, span, type Easing } from './timeline';

/**
 * A camera setup, in the film sense: one continuous framing that may drift from
 * `from` to `to` over its duration.
 *
 * Shots are declarative and time-addressed. Given a list of them and a local
 * time, {@link playShots} produces exactly one camera pose — no state, no
 * interpolation history. That is what lets the scrubber land on any frame of a
 * seven-minute film and get the right composition immediately, which turned out
 * to be the single most important property for being able to review this work
 * at all.
 */

/** `[posX, posY, posZ, targetX, targetY, targetZ]`. */
export type Pose6 = readonly [number, number, number, number, number, number];

export interface Shot {
  /** Local time this shot takes over, in seconds. */
  readonly at: number;
  readonly from: Pose6;
  /** Omit for a locked-off shot. */
  readonly to?: Pose6;
  /** A single value locks the lens; a pair zooms across the shot. */
  readonly fov?: number | readonly [number, number];
  readonly ease?: Easing;
  /** Operator drift amplitude in world units. */
  readonly handheld?: number;
  readonly handheldFreq?: number;
  /** Dutch angle in radians; a pair rolls across the shot. */
  readonly roll?: number | readonly [number, number];
  /**
   * When set, the camera *position* is interpolated in polar coordinates
   * around this point instead of linearly. Without it, a wide orbit cuts the
   * chord and the camera visibly dives towards the subject at mid-shot.
   */
  readonly arc?: readonly [number, number, number];
  /** Called once per frame while this shot is live — for shot-specific effects. */
  readonly onFrame?: (local: number, progress: number) => void;
}

/**
 * Pose the camera for time `t`. Shots must be listed in ascending `at`; each
 * runs until the next one begins, and the last runs to the end of the act.
 */
export function playShots(shots: readonly Shot[], t: number, rig: CameraRig, actEnd: number): void {
  if (shots.length === 0) return;

  let index = 0;
  for (let i = 0; i < shots.length; i++) {
    if (t >= (shots[i]?.at ?? 0)) index = i;
  }

  const shot = shots[index];
  if (!shot) return;
  const end = shots[index + 1]?.at ?? actEnd;
  const p = span(t, shot.at, end);
  const eased = (shot.ease ?? easeInOutCubic)(p);

  const from = shot.from;
  const to = shot.to ?? shot.from;

  rig.setHandheld(shot.handheld ?? 0, shot.handheldFreq ?? 0.55);
  rig.setRoll(
    Array.isArray(shot.roll)
      ? lerp(shot.roll[0] ?? 0, shot.roll[1] ?? 0, eased)
      : ((shot.roll as number | undefined) ?? 0),
  );

  const fov = Array.isArray(shot.fov)
    ? lerp(shot.fov[0] ?? 42, shot.fov[1] ?? 42, eased)
    : ((shot.fov as number | undefined) ?? 42);

  let px: number;
  let py: number;
  let pz: number;

  if (shot.arc) {
    const [cx, cy, cz] = shot.arc;
    const r0 = Math.hypot(from[0] - cx, from[2] - cz);
    const r1 = Math.hypot(to[0] - cx, to[2] - cz);
    let a0 = Math.atan2(from[2] - cz, from[0] - cx);
    let a1 = Math.atan2(to[2] - cz, to[0] - cx);
    // Take the short way round, so a 350° orbit does not become a 10° one.
    while (a1 - a0 > Math.PI) a1 -= Math.PI * 2;
    while (a0 - a1 > Math.PI) a1 += Math.PI * 2;
    const r = lerp(r0, r1, eased);
    const a = lerp(a0, a1, eased);
    px = cx + Math.cos(a) * r;
    py = lerp(from[1], to[1], eased);
    pz = cz + Math.sin(a) * r;
    void cy;
  } else {
    px = lerp(from[0], to[0], eased);
    py = lerp(from[1], to[1], eased);
    pz = lerp(from[2], to[2], eased);
  }

  rig.place(
    px,
    py,
    pz,
    lerp(from[3], to[3], eased),
    lerp(from[4], to[4], eased),
    lerp(from[5], to[5], eased),
    fov,
  );

  shot.onFrame?.(t - shot.at, p);
}

/** Sugar for a static frame. A touch of drift is on by default — a perfectly
 *  locked camera reads as a rendering, not a shot. */
export function hold(at: number, pose: Pose6, fov?: number, handheld = 0.02): Shot {
  return { at, from: pose, handheld, ...(fov !== undefined ? { fov } : {}) };
}

/** Sugar for a move from one framing to another. */
export function move(
  at: number,
  from: Pose6,
  to: Pose6,
  fov?: number | readonly [number, number],
  ease?: Easing,
  handheld = 0.02,
): Shot {
  return {
    at,
    from,
    to,
    handheld,
    ...(fov !== undefined ? { fov } : {}),
    ...(ease !== undefined ? { ease } : {}),
  };
}

/** Orbit around a point — expressed as two poses on a circle. */
export function orbitShot(
  at: number,
  center: readonly [number, number, number],
  radius: number,
  fromAngle: number,
  toAngle: number,
  height: number,
  lookHeight = 0,
  fov?: number,
  handheld = 0.03,
): Shot {
  const pose = (angle: number): Pose6 => [
    center[0] + Math.cos(angle) * radius,
    center[1] + height,
    center[2] + Math.sin(angle) * radius,
    center[0],
    center[1] + lookHeight,
    center[2],
  ];
  return {
    at,
    from: pose(fromAngle),
    to: pose(toAngle),
    arc: center,
    handheld,
    ...(fov !== undefined ? { fov } : {}),
  };
}
