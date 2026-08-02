/**
 * Timing primitives for the film. Acts are written as pure functions of local
 * time `t`, so everything here is stateless — which is what makes the scrubber
 * and the act-jump buttons work without any rewind bookkeeping.
 */

export const clamp = (v: number, lo: number, hi: number): number =>
  v < lo ? lo : v > hi ? hi : v;

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Remap `t` from [inA, inB] to [0, 1], clamped at both ends. */
export function span(t: number, inA: number, inB: number): number {
  if (inB === inA) return t >= inB ? 1 : 0;
  return clamp((t - inA) / (inB - inA), 0, 1);
}

/** Remap and ease in one call — the workhorse of every act. */
export function ease(t: number, inA: number, inB: number, fn: Easing = easeInOut): number {
  return fn(span(t, inA, inB));
}

/**
 * A 0→1→0 pulse over [inA, inB]: rises for the first `hold` fraction, sits at 1,
 * then falls. Used for flashes, gusts, and anything that blooms and fades.
 */
export function pulse(t: number, inA: number, inB: number, hold = 0.25): number {
  const p = span(t, inA, inB);
  const rise = hold;
  const fall = 1 - hold;
  if (p < rise) return easeOut(p / rise);
  if (p > fall) return easeIn(1 - (p - fall) / (1 - fall));
  return 1;
}

export type Easing = (t: number) => number;

export const linear: Easing = (t) => t;
export const easeIn: Easing = (t) => t * t;
export const easeOut: Easing = (t) => 1 - (1 - t) * (1 - t);
export const easeInOut: Easing = (t) => (t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t));
export const easeInCubic: Easing = (t) => t * t * t;
export const easeOutCubic: Easing = (t) => 1 - Math.pow(1 - t, 3);
export const easeInOutCubic: Easing = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
export const easeOutQuint: Easing = (t) => 1 - Math.pow(1 - t, 5);
export const easeOutBack: Easing = (t) => {
  const c = 1.70158;
  return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
};
export const easeOutElastic: Easing = (t) => {
  if (t === 0 || t === 1) return t;
  return Math.pow(2, -9 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
};
/** Settles like something heavy dropped in water. */
export const easeOutSink: Easing = (t) => 1 - Math.pow(1 - t, 2.4);

/** Smoothstep between two edges — the GLSL one, in TypeScript. */
export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

/** Triangle wave in [0, 1] with the given period. */
export function tri(t: number, period: number): number {
  const p = ((t % period) + period) % period;
  const h = period / 2;
  return p < h ? p / h : 2 - p / h;
}

/** Position along a straight walk cycle: returns a 0→1 phase. */
export function gait(t: number, stepsPerSecond: number): number {
  return (t * stepsPerSecond) % 1;
}
