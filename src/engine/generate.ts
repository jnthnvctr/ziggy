import { createRng } from './rng';
import type { Generator, Problem } from './types';

/**
 * Build a test: `count` problems from one generator, reproducible from `seed`.
 * Avoids repeats; if the generator's pool is smaller than `count` (e.g. "make 10"
 * has 11 facts), repeats are allowed but never back to back.
 */
export function generateTest(generator: Generator, seed: string, count: number): Problem[] {
  const rng = createRng(seed);
  const seen = new Set<string>();
  const out: Problem[] = [];
  const maxTries = 200;
  while (out.length < count) {
    let pick: Problem | undefined;
    let fallback: Problem | undefined;
    for (let i = 0; i < maxTries; i++) {
      const p = generator(rng);
      if (!seen.has(p.key)) {
        pick = p;
        break;
      }
      if (!fallback && p.key !== out[out.length - 1]?.key) fallback = p;
    }
    const chosen = pick ?? fallback ?? generator(rng);
    seen.add(chosen.key);
    out.push(chosen);
  }
  return out;
}
