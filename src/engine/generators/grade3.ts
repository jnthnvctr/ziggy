import { comparisonTokens, eq, tokensToText } from '../expr';
import { arith, ICONS, int, NAMES, plural, problem, THINGS } from '../helpers';
import { rat } from '../rational';
import type { Rng } from '../rng';
import type { Generator, Problem } from '../types';
import { sub2DigitRegroup, sub3Digit, subAcrossZeros } from './grade2';
import { roundTo } from './shared';

// ---------------------------------------------------------------- multiplication and division facts

/** Weight for the "other" factor: 0 and 1 are trivial, so rare. */
const otherWeight = (x: number) => (x <= 1 ? 0.2 : 1);

function multFamily(rng: Rng, family: [number, number][]): Problem {
  const f = rng.weighted(family);
  const other = rng.weighted([...Array(11).keys()].map((x) => [x, otherWeight(x)] as const));
  return rng.chance(0.5)
    ? arith('Multiply.', `${f} × ${other} = __`, f * other)
    : arith('Multiply.', `${other} × ${f} = __`, f * other);
}

export const multFamilyEasy: Generator = (rng) =>
  multFamily(rng, [
    [0, 0.3],
    [1, 0.3],
    [2, 1],
    [5, 1],
    [10, 1],
  ]);
export const multFamily34: Generator = (rng) =>
  multFamily(rng, [
    [3, 1],
    [4, 1],
  ]);
export const multFamily67: Generator = (rng) =>
  multFamily(rng, [
    [6, 1],
    [7, 1],
  ]);
export const multFamily89: Generator = (rng) =>
  multFamily(rng, [
    [8, 1],
    [9, 1],
  ]);

/** Every product to 10 × 10, weighted toward 6-9. */
const allFactorWeight = (x: number) => (x <= 1 ? 0.2 : x >= 6 && x <= 9 ? 3 : x === 10 ? 1 : 1.5);

export const multAllFacts: Generator = (rng) => {
  const w = [...Array(11).keys()].map((x) => [x, allFactorWeight(x)] as const);
  const a = rng.weighted(w);
  const b = rng.weighted(w);
  return arith('Multiply.', `${a} × ${b} = __`, a * b);
};

function divFamily(rng: Rng, divisors: number[]): Problem {
  const d = rng.pick(divisors);
  const q = rng.weighted([...Array(11).keys()].map((x) => [x, otherWeight(x)] as const));
  return arith('Divide.', `${d * q} ÷ ${d} = __`, q);
}

export const divFamilyEasy: Generator = (rng) => divFamily(rng, [2, 5, 10]);
export const divFamily34: Generator = (rng) => divFamily(rng, [3, 4]);
export const divFamily67: Generator = (rng) => divFamily(rng, [6, 7]);
export const divFamily89: Generator = (rng) => divFamily(rng, [8, 9]);

export const divAllFacts: Generator = (rng) => {
  // n ÷ 1 and n ÷ n are included, just not often.
  if (rng.chance(0.08)) {
    const n = rng.int(2, 10);
    return rng.chance(0.5)
      ? arith('Divide.', `${n} ÷ 1 = __`, n)
      : arith('Divide.', `${n} ÷ ${n} = __`, 1);
  }
  const w = [...Array(9).keys()].map((x) => [x + 2, allFactorWeight(x + 2)] as const);
  const d = rng.weighted(w);
  const q = rng.weighted([[0, 0.1], ...w]);
  return arith('Divide.', `${d * q} ÷ ${d} = __`, q);
};

// ---------------------------------------------------------------- meaning of × and ÷

export const equalGroups: Generator = (rng) => {
  const g = rng.int(2, 5);
  const e = rng.int(2, 6);
  const icon = rng.pick(ICONS);
  if (rng.chance(0.5)) {
    return problem({
      instruction: 'How many in all?',
      blocks: [
        { kind: 'groups', groups: g, each: e, icon },
        { kind: 'text', text: `${g} groups of ${e} = __` },
      ],
      answer: int(g * e),
      model: `${g} × ${e} = __`,
      key: `groups:${g}:${e}`,
    });
  }
  return problem({
    instruction: 'How many in all?',
    blocks: [
      { kind: 'array', rows: g, cols: e, icon },
      { kind: 'text', text: `${g} rows of ${e} = __` },
    ],
    answer: int(g * e),
    model: `${g} × ${e} = __`,
    key: `rows:${g}:${e}`,
  });
};

export const shareEqually: Generator = (rng) => {
  const g = rng.int(2, 5);
  const each = rng.int(1, 10);
  const total = g * each;
  const tokens = eq(`${total} ÷ ${g} = __`);
  return problem({
    instruction: `Share ${total} equally into ${g} groups. How many in each group?`,
    blocks: [
      { kind: 'objects', count: total, layout: 'array', icon: rng.pick(ICONS), seed: 0 },
      { kind: 'equation', tokens },
    ],
    answer: int(each),
    model: tokens,
    key: tokensToText(tokens),
  });
};

export const missingFactor: Generator = (rng) => {
  const w = [...Array(10).keys()].map((x) => [x + 1, x === 0 ? 0.2 : 1] as const);
  const a = rng.weighted(w);
  const b = rng.weighted(w);
  const p = a * b;
  const forms: [string, number][] = [
    [`__ × ${b} = ${p}`, a],
    [`${a} × __ = ${p}`, b],
    [`${p} ÷ __ = ${b}`, a],
    [`__ ÷ ${a} = ${b}`, p],
  ];
  const [src, ans] = rng.weighted(forms.map((f, i) => [f, i < 2 ? 1.5 : 1] as const));
  return arith('Find the missing number.', src, ans);
};

export const distributiveSplit: Generator = (rng) => {
  const a = rng.int(3, 9);
  const b = rng.int(6, 9);
  const x = rng.pick([2, 5].filter((s) => s < b));
  const y = b - x;
  if (rng.chance(0.6))
    return arith('Break apart to multiply.', `${a} × ${b} = ${a} × ${x} + ${a} × __`, y);
  return arith('Break apart to multiply.', `${a} × ${b} = ${a} × ${x} + __`, a * y);
};

// ---------------------------------------------------------------- stories

function story(text: string, answer: number, model: string, key: string): Problem {
  return problem({
    instruction: 'Solve the story.',
    blocks: [{ kind: 'story', text }],
    answer: int(answer),
    model,
    key,
  });
}

const BAGS = ['bags', 'boxes', 'baskets', 'jars'] as const;

export const storyMultDiv: Generator = (rng) => {
  const name = rng.pick(NAMES);
  const t = rng.pick(THINGS);
  const g = rng.int(2, 10);
  const e = rng.int(2, 10);
  const p = g * e;
  const bag = rng.pick(BAGS);
  switch (rng.int(0, 4)) {
    case 0:
      return story(
        `${name} has ${g} ${bag}. Each one holds ${plural(e, t)}. How many ${t.many} is that in all?`,
        p,
        `${g} × ${e} = __`,
        `mult:${g}:${e}`,
      );
    case 1:
      return story(
        `${name} shares ${p} ${t.many} equally among ${g} friends. How many ${t.many} does each friend get?`,
        e,
        `${p} ÷ ${g} = __`,
        `share:${p}:${g}`,
      );
    case 2:
      return story(
        `${name} puts ${p} ${t.many} into ${bag} with ${e} in each. How many ${bag} does ${name} fill?`,
        g,
        `${p} ÷ ${e} = __`,
        `group:${p}:${e}`,
      );
    case 3:
      return story(
        `Chairs are set up in ${g} rows with ${e} chairs in each row. How many chairs are there?`,
        p,
        `${g} × ${e} = __`,
        `rows:${g}:${e}`,
      );
    default:
      return story(
        `A ribbon is ${p} inches long. ${name} cuts it into pieces that are each ${e} inches long. How many pieces does ${name} get?`,
        g,
        `${p} ÷ ${e} = __`,
        `ribbon:${p}:${e}`,
      );
  }
};

export const storyTwoStepFourOps: Generator = (rng) => {
  const name = rng.pick(NAMES);
  const t = rng.pick(THINGS);
  for (;;) {
    const g = rng.int(2, 9);
    const e = rng.int(2, 9);
    const c = rng.int(2, 20);
    switch (rng.int(0, 3)) {
      case 0:
        if (g * e - c >= 0)
          return story(
            `${name} buys ${g} packs of ${t.many} with ${e} in each pack. ${name} gives away ${c}. How many ${t.many} are left?`,
            g * e - c,
            `${g} × ${e} − ${c} = __`,
            `mul-sub:${g}:${e}:${c}`,
          );
        break;
      case 1:
        return story(
          `${name} has ${plural(c, t)}. Then ${name} gets ${g} bags with ${e} in each. How many ${t.many} does ${name} have now?`,
          c + g * e,
          `${c} + ${g} × ${e} = __`,
          `add-mul:${c}:${g}:${e}`,
        );
      case 2: {
        const total = g * e;
        const eaten = rng.int(1, e - 1);
        return story(
          `${name} shares ${total} ${t.many} equally among ${g} friends. Then each friend gives ${eaten} away. How many ${t.many} does each friend have now?`,
          e - eaten,
          `${total} ÷ ${g} − ${eaten} = __`,
          `div-sub:${total}:${g}:${eaten}`,
        );
      }
      default: {
        // (a + b) ÷ g: Nia has some, gets more, then splits them into g equal bags.
        const total = g * e;
        const got = rng.int(1, Math.min(total - 1, 30));
        return story(
          `${name} has ${plural(total - got, t)} and finds ${got} more. ${name} puts them all into ${g} equal groups. How many ${t.many} are in each group?`,
          e,
          `(${total - got} + ${got}) ÷ ${g} = __`,
          `add-div:${total - got}:${got}:${g}`,
        );
      }
    }
  }
};

export const arithmeticPattern: Generator = (rng) => {
  const add = rng.chance(0.65);
  let terms: number[];
  let op: '+' | '×';
  let step: number;
  if (add) {
    op = '+';
    step = rng.pick([2, 3, 4, 5, 6, 7, 8, 9, 10, 25]);
    const start = rng.int(0, 20);
    terms = [0, 1, 2, 3, 4].map((i) => start + i * step);
  } else {
    op = '×';
    step = rng.pick([2, 2, 3, 10]);
    const start = rng.int(1, step === 10 ? 3 : 5);
    terms = [0, 1, 2, 3].map((i) => start * step ** i);
  }
  const missing = rng.chance(0.5) ? terms.length - 1 : rng.int(1, terms.length - 1);
  const answer = terms[missing] as number;
  const prev = terms[missing - 1] as number;
  return problem({
    instruction:
      missing === terms.length - 1
        ? 'What comes next in the pattern?'
        : 'What number is missing in the pattern?',
    blocks: [{ kind: 'sequence', items: terms.map((x, i) => (i === missing ? null : x)) }],
    answer: int(answer),
    model: `${prev} ${op} ${step} = __`,
    key: `pattern:${terms.join(',')}:${missing}`,
  });
};

// ---------------------------------------------------------------- place value and rounding

function rounding(n: number, to: number): Problem {
  const r = roundTo(n, to);
  return problem({
    instruction: `Round ${n} to the nearest ${to}.`,
    blocks: [{ kind: 'text', text: `${n} rounds to __` }],
    answer: int(r),
    model: `__ = ${r}`,
    key: `round${to}:${n}`,
  });
}

export const roundTo10: Generator = (rng) => {
  const n = rng.chance(0.5) ? rng.int(11, 99) : rng.int(100, 999);
  const fives = rng.chance(0.25);
  const m = fives ? n - (n % 10) + 5 : n % 10 === 0 ? n + rng.int(1, 9) : n;
  return rounding(Math.min(m, 999), 10);
};

export const roundTo100: Generator = (rng) => {
  const kind = rng.weighted([
    ['fifty', 0.25],
    ['under100', 0.15],
    ['any', 0.6],
  ] as const);
  const n =
    kind === 'fifty'
      ? rng.int(1, 9) * 100 + 50
      : kind === 'under100'
        ? rng.int(10, 99)
        : rng.int(101, 999);
  return rounding(n % 100 === 0 ? n + 7 : n, 100);
};

export const sub3DigitAll: Generator = (rng) =>
  rng.weighted([
    [sub3Digit, 0.5],
    [subAcrossZeros, 0.3],
    [sub2DigitRegroup, 0.2],
  ] as const)(rng);

export const multByTens: Generator = (rng) => {
  const a = rng.weighted([...Array(9).keys()].map((x) => [x + 1, x === 0 ? 0.2 : 1] as const));
  const b = rng.int(1, 9) * 10;
  return rng.chance(0.6)
    ? arith('Multiply.', `${a} × ${b} = __`, a * b)
    : arith('Multiply.', `${b} × ${a} = __`, a * b);
};

// ---------------------------------------------------------------- fractions

const DENOMS = [2, 3, 4, 6, 8] as const;

export const nameFraction: Generator = (rng) => {
  const d = rng.pick(DENOMS);
  const n = rng.int(1, d - 1);
  return problem({
    instruction: 'What fraction is shaded?',
    blocks: [
      { kind: 'fractionModel', shape: rng.pick(['bar', 'circle'] as const), parts: d, shaded: n },
    ],
    answer: { type: 'fraction', value: rat(n, d), form: 'exact', exact: { n, d } },
    model: `__ = ${n}/${d}`,
    key: `shade:${n}/${d}`,
  });
};

export const fractionNumberLine: Generator = (rng) => {
  const d = rng.pick(DENOMS);
  const max = rng.chance(0.7) ? 1 : 2;
  const positions = [...Array(d * max - 1).keys()].map((i) => i + 1).filter((k) => k % d !== 0);
  const k = rng.pick(positions);
  return problem({
    instruction: 'What fraction is at the dot?',
    blocks: [{ kind: 'numberLine', min: 0, max, partsPerUnit: d, point: k }],
    answer: { type: 'fraction', value: rat(k, d), form: 'exact', exact: { n: k, d } },
    model: `__ = ${k}/${d}`,
    key: `line:${max}:${k}/${d}`,
  });
};

/** Fractions with a blank in them are shown as text ("1/2 = __/4"); the model uses ÷. */
function fractionText(instruction: string, text: string, model: string, answer: number): Problem {
  return problem({
    instruction,
    blocks: [{ kind: 'text', text }],
    answer: int(answer),
    model,
    key: text,
  });
}

export const equivalentFractionsSimple: Generator = (rng) => {
  const pairs: [number, number][] = [
    [2, 4],
    [2, 6],
    [2, 8],
    [3, 6],
    [4, 8],
  ];
  const [small, big] = rng.pick(pairs);
  const k = big / small;
  const n = rng.int(1, small - 1);
  if (rng.chance(0.6)) {
    return fractionText(
      'Make the fractions equal.',
      `${n}/${small} = __/${big}`,
      `${n} ÷ ${small} = __ ÷ ${big}`,
      n * k,
    );
  }
  return fractionText(
    'Make the fractions equal.',
    `${n * k}/${big} = __/${small}`,
    `${n * k} ÷ ${big} = __ ÷ ${small}`,
    n,
  );
};

export const wholeAsFraction: Generator = (rng) => {
  const w = rng.int(1, 8);
  switch (rng.int(0, 2)) {
    case 0:
      return fractionText(
        'Write the whole number as a fraction.',
        `${w} = __/1`,
        `${w} = __ ÷ 1`,
        w,
      );
    case 1: {
      const d = rng.pick(DENOMS);
      return fractionText('Find the missing number.', `1 = ${d}/__`, `1 = ${d} ÷ __`, d);
    }
    default: {
      const d = rng.pick([1, 2, 3, 4]);
      const q = rng.int(1, 6);
      return fractionText(
        'What whole number is it?',
        `${q * d}/${d} = __`,
        `${q * d} ÷ ${d} = __`,
        q,
      );
    }
  }
};

function fractionCompare(a: string, b: string, value: '<' | '=' | '>'): Problem {
  const tokens = comparisonTokens(a, b);
  return problem({
    instruction: 'Compare the fractions. Use <, = or >.',
    blocks: [{ kind: 'equation', tokens }],
    answer: { type: 'comparison', value },
    model: tokens,
    key: `${a}?${b}`,
  });
}

const rel = (x: number, y: number) => (x < y ? '<' : x > y ? '>' : '=');

export const compareSameDenom: Generator = (rng) => {
  const d = rng.pick(DENOMS);
  const a = rng.int(1, d);
  const b = rng.chance(0.1)
    ? a
    : rng.pick([...Array(d).keys()].map((i) => i + 1).filter((x) => x !== a));
  return fractionCompare(`${a}/${d}`, `${b}/${d}`, rel(a, b));
};

export const compareSameNumer: Generator = (rng) => {
  const d1 = rng.pick(DENOMS);
  const d2 = rng.chance(0.1) ? d1 : rng.pick(DENOMS.filter((x) => x !== d1));
  const n = rng.int(1, Math.min(d1, d2) - 1);
  // Same top: the bigger bottom means smaller parts.
  return fractionCompare(`${n}/${d1}`, `${n}/${d2}`, rel(d2, d1));
};
