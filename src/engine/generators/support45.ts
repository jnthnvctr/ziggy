/**
 * Helpers shared by the grade 4 and 5 generators. Not a generator module:
 * nothing here is registered in GENERATORS.
 */
import { eq } from '../expr';
import { problem } from '../helpers';
import { toMixed, type Rational } from '../rational';
import type { Rng } from '../rng';
import type { Answer, Block, Choice, Problem, Token } from '../types';

/** Grade 4 fraction denominators (4.NF). */
export const D4 = [2, 3, 4, 5, 6, 8, 10, 12] as const;

/** 47382 → "47,382". */
export const fmt = (n: number) => n.toLocaleString('en-US');

export const dec = (value: Rational): Answer => ({ type: 'decimal', value });
export const fracAns = (value: Rational, form: 'any' | 'simplest' = 'any'): Answer =>
  form === 'any' ? { type: 'fraction', value } : { type: 'fraction', value, form };
export const mixedAns = (value: Rational, form?: 'mixed' | 'improper'): Answer =>
  form ? { type: 'mixed-number', value, form } : { type: 'mixed-number', value };

/** A Rational as an eq() source string: "3", "3/4", or (when `mixed`) "2_3/4". */
export function src(r: Rational, mixed = false): string {
  if (r.d === 1) return String(r.n);
  if (mixed && r.n > r.d) {
    const m = toMixed(r);
    return `${m.whole}_${m.n}/${m.d}`;
  }
  return `${r.n}/${r.d}`;
}

/** A Rational as kid-readable text: "3/4", "2 3/4", "5". */
export function words(r: Rational): string {
  if (r.d === 1) return String(r.n);
  const m = toMixed(r);
  return m.whole ? `${m.whole} ${m.n}/${m.d}` : `${m.n}/${m.d}`;
}

/** An equation problem with a non-integer answer (decimal, fraction, mixed number). */
export function equation(
  instruction: string,
  source: string,
  answer: Answer,
  key = source,
): Problem {
  const tokens = eq(source);
  return problem({
    instruction,
    blocks: [{ kind: 'equation', tokens }],
    answer,
    model: tokens,
    key,
  });
}

/** A problem shown as text (with `__` as the answer box) and checked against a model. */
export function textProblem(
  instruction: string,
  text: string,
  answer: Answer,
  model: string | Token[],
  key = text,
  extra: Block[] = [],
): Problem {
  return problem({ instruction, blocks: [...extra, { kind: 'text', text }], answer, model, key });
}

export function storyProblem(text: string, answer: Answer, model: string, key: string): Problem {
  return problem({
    instruction: 'Solve the story.',
    blocks: [{ kind: 'story', text }],
    answer,
    model,
    key,
  });
}

export const YES_NO: Choice[] = [
  { id: 'yes', label: 'Yes' },
  { id: 'no', label: 'No' },
];

export function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a;
}

export const lcm = (a: number, b: number) => (a / gcd(a, b)) * b;

export function isPrime(n: number): boolean {
  if (n < 2) return false;
  for (let i = 2; i * i <= n; i++) if (n % i === 0) return false;
  return true;
}

/** Digits of n, most significant first. */
export const digits = (n: number) => String(n).split('').map(Number);

/** A random integer with exactly `count` digits. */
export const nDigit = (rng: Rng, count: number) => rng.int(10 ** (count - 1), 10 ** count - 1);

/** Round half up to a multiple of `place` (an integer). */
export const roundTo = (n: number, place: number) => Math.floor(n / place + 0.5) * place;
