import { eq } from '../expr';
import {
  arith,
  choice,
  ICONS,
  int,
  layoutSeed,
  numberWords,
  plural,
  problem,
  THINGS,
  NAMES,
} from '../helpers';
import type { Rng } from '../rng';
import type { Choice, Generator } from '../types';

/** Distinct distractors near `target`, within [min, max], plus any `extra` candidates. */
function distractors(
  rng: Rng,
  target: number,
  min: number,
  max: number,
  count: number,
  extra: number[] = [],
) {
  const pool = new Set<number>();
  for (const x of extra) if (x !== target && x >= 0) pool.add(x);
  for (const off of rng.shuffle([-2, -1, 1, 2, 3, -3])) {
    const x = target + off;
    if (x >= min && x <= max) pool.add(x);
  }
  return rng.shuffle([...pool]).slice(0, count);
}

function pickNumeral(rng: Rng, min: number, max: number, extra: (n: number) => number[]) {
  const target = rng.int(min, max);
  const options = [target, ...distractors(rng, target, min, max, 3, extra(target))];
  const choices: Choice[] = options.map((n) => ({ id: String(n), label: String(n) }));
  return problem({
    instruction: 'Tap the number you hear.',
    blocks: [{ kind: 'listen', text: numberWords(target) }],
    answer: choice(rng, choices, String(target)),
    key: `pick:${target}`,
  });
}

const reversal = (n: number) => Number(String(n).split('').reverse().join(''));

export const pickNumeralTo10: Generator = (rng) =>
  pickNumeral(rng, 0, 10, (n) => (n === 6 ? [9] : n === 9 ? [6] : []));

export const pickNumeralTo20: Generator = (rng) =>
  pickNumeral(rng, 11, 20, (n) => [reversal(n), n - 10].filter((x) => x !== n && x > 0));

function counting(
  rng: Rng,
  min: number,
  max: number,
  layouts: ('line' | 'array' | 'circle' | 'scattered')[],
  tag: string,
) {
  const count = rng.int(min, max);
  return problem({
    instruction: 'How many are there?',
    blocks: [
      {
        kind: 'objects',
        count,
        layout: rng.pick(layouts),
        icon: rng.pick(ICONS),
        seed: layoutSeed(rng),
      },
    ],
    answer: int(count),
    model: `__ = ${count}`,
    key: `${tag}:${count}`,
  });
}

export const countObjectsTo10: Generator = (rng) =>
  counting(rng, 1, 10, ['line', 'array', 'circle'], 'count10');
export const countScatteredTo10: Generator = (rng) =>
  counting(rng, 1, 10, ['scattered'], 'scatter10');
export const countObjectsTo20: Generator = (rng) =>
  counting(rng, 11, 20, ['line', 'array', 'circle'], 'count20');

export const countOnTo20: Generator = (rng) => {
  const s = rng.int(1, 17);
  return problem({
    instruction: 'What number comes next?',
    blocks: [{ kind: 'sequence', items: [s, s + 1, s + 2, null] }],
    answer: int(s + 3),
    model: `${s + 2} + 1 = __`,
    key: `counton:${s}`,
  });
};

export const countNextTo100: Generator = (rng) => {
  // Half the time the answer starts a new ten (38, 39, __).
  const next = rng.chance(0.5)
    ? rng.pick([10, 20, 30, 40, 50, 60, 70, 80, 90, 100])
    : rng.int(4, 99);
  const shown = rng.chance(0.5) ? 3 : 2;
  const items: (number | null)[] = [];
  for (let i = shown; i >= 1; i--) items.push(next - i);
  items.push(null);
  return problem({
    instruction: 'What number comes next?',
    blocks: [{ kind: 'sequence', items }],
    answer: int(next),
    model: `${next - 1} + 1 = __`,
    key: `next100:${next}`,
  });
};

export const countByTens: Generator = (rng) => {
  const start = rng.int(0, 7) * 10;
  const missing = rng.int(1, 3);
  const items: (number | null)[] = [0, 1, 2, 3].map((i) => (i === missing ? null : start + i * 10));
  const answer = start + missing * 10;
  return problem({
    instruction: 'Count by tens. What number is missing?',
    blocks: [{ kind: 'sequence', items }],
    answer: int(answer),
    model: `${answer - 10} + 10 = __`,
    key: `tens:${start}:${missing}`,
  });
};

export const oneMore: Generator = (rng) => {
  const n = rng.int(0, 9);
  return problem({
    instruction: `What is one more than ${n}?`,
    blocks: [
      { kind: 'objects', count: n, layout: 'line', icon: rng.pick(ICONS), seed: layoutSeed(rng) },
    ],
    answer: int(n + 1),
    model: `${n} + 1 = __`,
    key: `onemore:${n}`,
  });
};

export const compareGroups: Generator = (rng) => {
  const left = rng.int(1, 10);
  const right = rng.chance(0.2)
    ? left
    : rng.pick([...Array(10).keys()].map((i) => i + 1).filter((x) => x !== left));
  const correct = left === right ? 'same' : left > right ? 'left' : 'right';
  return problem({
    instruction: 'Which group has more?',
    blocks: [{ kind: 'twoGroups', left, right, icon: rng.pick(ICONS), seed: layoutSeed(rng) }],
    answer: choice(
      rng,
      [
        { id: 'left', label: 'This group', spoken: 'the first group' },
        { id: 'right', label: 'This group', spoken: 'the second group' },
        { id: 'same', label: 'Same' },
      ],
      correct,
      false,
    ),
    key: `cmpgroups:${left}:${right}`,
  });
};

export const compareTo10: Generator = (rng) => {
  const a = rng.int(1, 10);
  const b = rng.chance(0.2)
    ? a
    : rng.pick([...Array(10).keys()].map((i) => i + 1).filter((x) => x !== a));
  const correct = a === b ? 'same' : a > b ? 'a' : 'b';
  return problem({
    instruction: 'Which number is bigger?',
    blocks: [],
    answer: choice(
      rng,
      [
        { id: 'a', label: String(a) },
        { id: 'b', label: String(b) },
        { id: 'same', label: 'Same', spoken: 'they are the same' },
      ],
      correct,
      false,
    ),
    key: `cmp10:${a}:${b}`,
  });
};

/**
 * Pick a fact uniformly from all pairs, with zero facts (3 + 0, 0 + 0) rarer, so
 * a test isn't full of trivial problems. 0 + 0 and 0 − 0 almost never appear.
 */
function factWeight(a: number, b: number): number {
  if (a === 0 && b === 0) return 0.05;
  return a === 0 || b === 0 ? 0.3 : 1;
}

function addWithin(rng: Rng, max: number) {
  const pairs: [[number, number], number][] = [];
  for (let a = 0; a <= max; a++)
    for (let b = 0; a + b <= max; b++) pairs.push([[a, b], factWeight(a, b)]);
  const [a, b] = rng.weighted(pairs);
  return arith('Add.', `${a} + ${b} = __`, a + b);
}

function subWithin(rng: Rng, max: number) {
  const pairs: [[number, number], number][] = [];
  for (let a = 0; a <= max; a++)
    for (let b = 0; b <= a; b++) pairs.push([[a, b], factWeight(b, a - b)]);
  const [a, b] = rng.weighted(pairs);
  return arith('Subtract.', `${a} − ${b} = __`, a - b);
}

export const addWithin5: Generator = (rng) => addWithin(rng, 5);
export const subWithin5: Generator = (rng) => subWithin(rng, 5);
export const addWithin10: Generator = (rng) => addWithin(rng, 10);
export const subWithin10: Generator = (rng) => subWithin(rng, 10);

export const storyWithin10: Generator = (rng) => {
  const name = rng.pick(NAMES);
  const thing = rng.pick(THINGS);
  if (rng.chance(0.5)) {
    const a = rng.int(1, 8);
    const b = rng.int(1, 10 - a);
    return problem({
      instruction: 'Solve the story.',
      blocks: [
        {
          kind: 'story',
          text: `${name} has ${plural(a, thing)}. ${name} gets ${b} more. How many ${thing.many} does ${name} have now?`,
        },
      ],
      answer: int(a + b),
      model: `${a} + ${b} = __`,
      key: `story10:add:${a}:${b}`,
    });
  }
  const a = rng.int(2, 10);
  const b = rng.int(1, a);
  return problem({
    instruction: 'Solve the story.',
    blocks: [
      {
        kind: 'story',
        text: `${name} has ${plural(a, thing)}. ${name} gives away ${b}. How many ${thing.many} are left?`,
      },
    ],
    answer: int(a - b),
    model: `${a} − ${b} = __`,
    key: `story10:sub:${a}:${b}`,
  });
};

export const decomposeTo10: Generator = (rng) => {
  const t = rng.int(2, 10);
  const a = rng.int(0, t);
  const b = t - a;
  return rng.chance(0.5)
    ? arith('Find the missing number.', `${t} = ${a} + __`, b)
    : arith('Find the missing number.', `${t} = __ + ${b}`, a);
};

export const makeTen: Generator = (rng) => {
  const a = rng.int(0, 10);
  const src = rng.chance(0.7) ? `${a} + __ = 10` : `__ + ${a} = 10`;
  const tokens = eq(src);
  return problem({
    instruction: 'Make 10.',
    blocks: [
      { kind: 'tenFrame', filled: [a] },
      { kind: 'equation', tokens },
    ],
    answer: int(10 - a),
    model: tokens,
    key: src,
  });
};

export const teenDecompose: Generator = (rng) => {
  const ones = rng.int(1, 9);
  const t = 10 + ones;
  const form = rng.int(0, 2);
  const [src, answer] =
    form === 0
      ? [`${t} = 10 + __`, ones]
      : form === 1
        ? [`10 + ${ones} = __`, t]
        : [`${t} = __ + ${ones}`, 10];
  const tokens = eq(src);
  return problem({
    instruction: 'Find the missing number.',
    blocks: [
      { kind: 'tenFrame', filled: [10, ones] },
      { kind: 'equation', tokens },
    ],
    answer: int(answer),
    model: tokens,
    key: src,
  });
};
