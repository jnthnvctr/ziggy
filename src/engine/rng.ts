/**
 * Seeded pseudo-random numbers. The same seed always produces the same
 * sequence, so any test can be replayed exactly from its seed.
 */
export interface Rng {
  /** Float in [0, 1). */
  next(): number;
  /** Integer in [min, max], inclusive. */
  int(min: number, max: number): number;
  /** One item, uniformly. */
  pick<T>(items: readonly T[]): T;
  /** True with probability p. */
  chance(p: number): boolean;
  /** A shuffled copy. */
  shuffle<T>(items: readonly T[]): T[];
  /** One item, chosen in proportion to its weight. */
  weighted<T>(items: readonly (readonly [T, number])[]): T;
  /** An independent stream derived from this one (for sub-tasks). */
  fork(label: string): Rng;
}

/** xmur3 string hash → 32-bit seed. */
function hashSeed(s: string): number {
  let h = 1779033703 ^ s.length;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  h ^= h >>> 16;
  return h >>> 0;
}

/** mulberry32: small, fast, good enough for problem generation (not crypto). */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createRng(seed: string | number): Rng {
  const seedStr = String(seed);
  const next = mulberry32(hashSeed(seedStr));
  let forks = 0;
  const rng: Rng = {
    next,
    int(min, max) {
      if (!Number.isInteger(min) || !Number.isInteger(max) || max < min) {
        throw new RangeError(`rng.int(${min}, ${max}): need integers with min <= max`);
      }
      return min + Math.floor(next() * (max - min + 1));
    },
    pick(items) {
      if (items.length === 0) throw new RangeError('rng.pick: empty list');
      return items[Math.floor(next() * items.length)] as (typeof items)[number];
    },
    chance(p) {
      return next() < p;
    },
    shuffle(items) {
      const a = [...items];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [a[i], a[j]] = [a[j] as (typeof a)[number], a[i] as (typeof a)[number]];
      }
      return a;
    },
    weighted(items) {
      const total = items.reduce((s, [, w]) => s + w, 0);
      if (!(total > 0)) throw new RangeError('rng.weighted: weights must sum to > 0');
      let r = next() * total;
      for (const [item, w] of items) {
        if ((r -= w) < 0) return item;
      }
      return (items[items.length - 1] as (typeof items)[number])[0];
    },
    fork(label) {
      return createRng(`${seedStr}/${label}/${forks++}`);
    },
  };
  return rng;
}
