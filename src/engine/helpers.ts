import { eq, tokensToText } from './expr';
import type { Rng } from './rng';
import type { Answer, Block, Choice, Problem, Token } from './types';

/**
 * Conventions for generators:
 * - In `text` and `story` blocks, `__` marks where the answer box goes.
 * - Every numeric problem carries a `model` equation with a blank; tests substitute
 *   the answer into it, so a wrong answer can't slip through.
 */

export const int = (value: number): Answer => ({ type: 'integer', value });

export interface ProblemInit {
  instruction: string;
  blocks: Block[];
  answer: Answer;
  model?: Token[] | string;
  key?: string;
}

export function problem(init: ProblemInit): Problem {
  const model = typeof init.model === 'string' ? eq(init.model) : init.model;
  const p: Problem = {
    instruction: init.instruction,
    blocks: init.blocks,
    answer: init.answer,
    key: init.key ?? `${init.instruction}|${JSON.stringify(init.blocks)}`,
  };
  if (model) p.model = model;
  return p;
}

/** The common case: show an equation with a blank, answer is an integer. */
export function arith(instruction: string, src: string, answer: number): Problem {
  const tokens = eq(src);
  return problem({
    instruction,
    blocks: [{ kind: 'equation', tokens }],
    answer: int(answer),
    model: tokens,
    key: tokensToText(tokens),
  });
}

/** A choice answer; choices are shuffled so the right one isn't always first. */
export function choice(rng: Rng, choices: Choice[], correct: string, shuffle = true): Answer {
  return { type: 'choice', choices: shuffle ? rng.shuffle(choices) : choices, correct };
}

export const TRUE_FALSE: Choice[] = [
  { id: 'true', label: 'True' },
  { id: 'false', label: 'False' },
];

/** A random seed for blocks that need stable random layout (scattered objects). */
export const layoutSeed = (rng: Rng) => rng.int(0, 2 ** 31 - 1);

// ---------------------------------------------------------------- words

const ONES = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

function under1000(n: number): string {
  const parts: string[] = [];
  const h = Math.floor(n / 100);
  const r = n % 100;
  if (h) parts.push(`${ONES[h]} hundred`);
  if (r)
    parts.push(
      r < 20 ? (ONES[r] as string) : TENS[Math.floor(r / 10)] + (r % 10 ? `-${ONES[r % 10]}` : ''),
    );
  return parts.join(' ');
}

/** 406 → "four hundred six"; 60205 → "sixty thousand two hundred five". Up to 999,999,999. */
export function numberWords(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > 999_999_999) throw new RangeError(`numberWords: ${n}`);
  if (n === 0) return 'zero';
  const parts: string[] = [];
  const m = Math.floor(n / 1_000_000);
  const k = Math.floor((n % 1_000_000) / 1000);
  const r = n % 1000;
  if (m) parts.push(`${under1000(m)} million`);
  if (k) parts.push(`${under1000(k)} thousand`);
  if (r) parts.push(under1000(r));
  return parts.join(' ');
}

// ---------------------------------------------------------------- story material

export const NAMES = [
  'Ava',
  'Leo',
  'Mia',
  'Sam',
  'Zoe',
  'Kai',
  'Noah',
  'Lily',
  'Omar',
  'Priya',
  'Ben',
  'Ana',
  'Theo',
  'Maya',
  'Eli',
  'Ruby',
  'Jin',
  'Nia',
  'Max',
  'Ivy',
  'Luis',
  'Amara',
  'Finn',
  'Hana',
] as const;

export interface Thing {
  one: string;
  many: string;
}

export const THINGS: readonly Thing[] = [
  { one: 'apple', many: 'apples' },
  { one: 'shell', many: 'shells' },
  { one: 'sticker', many: 'stickers' },
  { one: 'marble', many: 'marbles' },
  { one: 'book', many: 'books' },
  { one: 'crayon', many: 'crayons' },
  { one: 'cookie', many: 'cookies' },
  { one: 'balloon', many: 'balloons' },
  { one: 'toy car', many: 'toy cars' },
  { one: 'rock', many: 'rocks' },
  { one: 'leaf', many: 'leaves' },
  { one: 'block', many: 'blocks' },
];

/** Icons the UI knows how to draw for object pictures. */
export const ICONS = ['apple', 'star', 'fish', 'duck', 'ball', 'flower', 'heart', 'car'] as const;

export const plural = (n: number, t: Thing) => `${n} ${n === 1 ? t.one : t.many}`;

/** Two different names. */
export function twoNames(rng: Rng): [string, string] {
  const [a, b] = rng.shuffle(NAMES);
  return [a as string, b as string];
}
