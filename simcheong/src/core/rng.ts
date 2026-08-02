/**
 * A tiny seeded PRNG (mulberry32). Every procedural decision in this film runs
 * through one of these so that a given act renders identically on every reload —
 * which matters a lot when the only way to review the work is to look at it.
 */
export class Rng {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  /** Uniform in [0, 1). */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Uniform in [min, max). */
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /** Uniform in [-spread, spread). */
  spread(spread: number): number {
    return (this.next() * 2 - 1) * spread;
  }

  /** Integer in [min, max]. */
  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  /** True with the given probability. */
  chance(p: number): boolean {
    return this.next() < p;
  }

  /** Pick one element. Throws on an empty list so a bad call fails loudly. */
  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error('Rng.pick called with an empty array');
    const item = items[Math.floor(this.next() * items.length)];
    // noUncheckedIndexedAccess: the bounds are provably fine, but narrow anyway.
    return item as T;
  }

  /** Roughly normal, via the sum of three uniforms. Good enough for scatter. */
  gaussian(mean = 0, deviation = 1): number {
    const sum = this.next() + this.next() + this.next();
    return mean + (sum - 1.5) * 1.1547 * deviation;
  }
}

/**
 * Classic smooth value noise in 1D. Cheap, deterministic, and enough to drive
 * gentle drifts: a lantern's sway, a boat's list, a walking figure's wobble.
 */
export function noise1(x: number, seed = 0): number {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return hash1(i, seed) * (1 - u) + hash1(i + 1, seed) * u;
}

/** Two octaves of {@link noise1}, which is all this film ever needs. */
export function fbm1(x: number, seed = 0): number {
  return noise1(x, seed) * 0.65 + noise1(x * 2.17 + 13.7, seed + 91) * 0.35;
}

function hash1(i: number, seed: number): number {
  let h = Math.imul(i ^ seed, 0x27d4eb2d);
  h ^= h >>> 15;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  return ((h >>> 0) / 4294967296) * 2 - 1;
}
