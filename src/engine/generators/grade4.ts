import { comparisonTokens, compareSides } from '../expr';
import {
  arith,
  choice,
  int,
  NAMES,
  numberWords,
  plural,
  problem,
  THINGS,
  twoNames,
} from '../helpers';
import { add, mul, rat, sub, type Rational } from '../rational';
import type { Rng } from '../rng';
import type { Choice, Generator } from '../types';
import {
  D4,
  digits,
  equation,
  fmt,
  fracAns,
  isPrime,
  mixedAns,
  nDigit,
  roundTo,
  storyProblem,
  textProblem,
  YES_NO,
} from './support45';

// ================================================================ operations & algebraic thinking

export const multiplicativeCompare: Generator = (rng) => {
  const a = rng.int(2, 10);
  const b = rng.int(2, 10);
  const p = a * b;
  return rng.chance(0.6)
    ? textProblem(
        'Fill in the blank.',
        `${p} is ${a} times as many as __.`,
        int(b),
        `${a} × __ = ${p}`,
      )
    : textProblem(
        'Fill in the blank.',
        `__ is ${a} times as many as ${b}.`,
        int(p),
        `__ = ${a} × ${b}`,
      );
};

const TALL = [
  ['tree', 'bush'],
  ['giraffe', 'dog'],
  ['building', 'house'],
  ['flagpole', 'fence'],
] as const;

export const storyMultiplicativeCompare: Generator = (rng) => {
  const times = rng.int(2, 9);
  const small = rng.int(2, 12);
  const big = times * small;
  switch (rng.int(0, 3)) {
    case 0: {
      const [n1, n2] = twoNames(rng);
      const t = rng.pick(THINGS);
      return storyProblem(
        `${n2} has ${plural(small, t)}. ${n1} has ${times} times as many ${t.many} as ${n2}. How many ${t.many} does ${n1} have?`,
        int(big),
        `${times} × ${small} = __`,
        `mc-have:${times}:${small}`,
      );
    }
    case 1: {
      const [n1, n2] = twoNames(rng);
      const t = rng.pick(THINGS);
      return storyProblem(
        `${n1} has ${plural(big, t)}. That is ${times} times as many as ${n2} has. How many ${t.many} does ${n2} have?`,
        int(small),
        `${times} × __ = ${big}`,
        `mc-div:${times}:${big}`,
      );
    }
    case 2: {
      const [tall, short] = rng.pick(TALL);
      return storyProblem(
        `The ${short} is ${small} feet tall. The ${tall} is ${times} times as tall as the ${short}. How tall is the ${tall}, in feet?`,
        int(big),
        `${times} × ${small} = __`,
        `mc-tall:${times}:${small}`,
      );
    }
    default: {
      const [tall, short] = rng.pick(TALL);
      return storyProblem(
        `The ${tall} is ${big} feet tall. It is ${times} times as tall as the ${short}. How tall is the ${short}, in feet?`,
        int(small),
        `${times} × __ = ${big}`,
        `mc-short:${times}:${big}`,
      );
    }
  }
};

export const storyMultiStep: Generator = (rng) => {
  switch (rng.int(0, 3)) {
    case 0: {
      // Interpret a remainder: round up.
      const size = rng.int(12, 40);
      const groups = rng.int(2, 6);
      const people = size * groups + rng.int(1, size - 1);
      const ans = groups + 1;
      return storyProblem(
        `${people} students are going on a trip. Each bus holds ${size} students. How many buses are needed?`,
        int(ans),
        `(__ − 1) × ${size} < ${people} < __ × ${size}`,
        `buses:${people}:${size}`,
      );
    }
    case 1: {
      // Interpret a remainder: what's left over.
      const per = rng.int(3, 9);
      const bags = rng.int(4, 12);
      const left = rng.int(1, per - 1);
      const total = per * bags + left;
      const name = rng.pick(NAMES);
      return storyProblem(
        `${name} has ${total} cookies. ${name} puts ${per} cookies in each bag. How many cookies are left over?`,
        int(left),
        `${total} − ${per} × ${bags} = __`,
        `leftover:${total}:${per}`,
      );
    }
    case 2: {
      const packs = rng.int(3, 9);
      const each = rng.int(6, 12);
      const gave = rng.int(5, packs * each - 5);
      const name = rng.pick(NAMES);
      return storyProblem(
        `${name} buys ${packs} packs of pencils. Each pack has ${each} pencils. ${name} gives away ${gave} pencils. How many pencils does ${name} have left?`,
        int(packs * each - gave),
        `${packs} × ${each} − ${gave} = __`,
        `packs:${packs}:${each}:${gave}`,
      );
    }
    default: {
      const price = rng.int(3, 12);
      const count = rng.int(3, 8);
      const extra = rng.int(5, 25);
      const name = rng.pick(NAMES);
      return storyProblem(
        `${name} buys ${count} books that cost $${price} each, and a bag that costs $${extra}. How many dollars does ${name} spend in all?`,
        int(count * price + extra),
        `${count} × ${price} + ${extra} = __`,
        `spend:${count}:${price}:${extra}`,
      );
    }
  }
};

export const isFactor: Generator = (rng) => {
  const k = rng.int(2, 12);
  const yes = rng.chance(0.5);
  let n: number;
  if (yes) n = k * rng.int(1, Math.floor(100 / k));
  else {
    do n = k * rng.int(1, Math.floor(100 / k)) + rng.pick([-2, -1, 1, 2]);
    while (n < 2 || n > 100 || n % k === 0);
  }
  return problem({
    instruction: 'Factors.',
    blocks: [{ kind: 'text', text: `Is ${k} a factor of ${n}?` }],
    answer: choice(rng, YES_NO, yes ? 'yes' : 'no', false),
    key: `factor:${k}:${n}`,
  });
};

export const isMultiple: Generator = (rng) => {
  const k = rng.int(2, 9);
  const right = k * rng.int(2, Math.floor(100 / k));
  const wrong = new Set<number>();
  while (wrong.size < 3) {
    const x = k * rng.int(2, Math.floor(100 / k)) + rng.pick([-2, -1, 1, 2, 3]);
    if (x > 1 && x <= 100 && x % k !== 0) wrong.add(x);
  }
  const choices: Choice[] = [right, ...wrong].map((n) => ({ id: String(n), label: String(n) }));
  return problem({
    instruction: 'Multiples.',
    blocks: [{ kind: 'text', text: `Which number is a multiple of ${k}?` }],
    answer: choice(rng, choices, String(right)),
    key: `multiple:${k}:${right}`,
  });
};

const PRIMES = [...Array(99).keys()].map((i) => i + 2).filter(isPrime);
const ODD_COMPOSITES = [...Array(99).keys()]
  .map((i) => i + 2)
  .filter((n) => n % 2 === 1 && !isPrime(n));
const EVEN_COMPOSITES = [...Array(99).keys()].map((i) => i + 2).filter((n) => n % 2 === 0 && n > 2);

export const primeComposite: Generator = (rng) => {
  // Half prime, half composite; composites are mostly odd so "it's even" isn't a shortcut.
  const prime = rng.chance(0.5);
  const n = prime
    ? rng.pick(PRIMES)
    : rng.chance(0.7)
      ? rng.pick(ODD_COMPOSITES)
      : rng.pick(EVEN_COMPOSITES);
  return problem({
    instruction: 'Prime or composite?',
    blocks: [{ kind: 'text', text: `Is ${n} prime or composite?` }],
    answer: choice(
      rng,
      [
        { id: 'prime', label: 'Prime' },
        { id: 'composite', label: 'Composite' },
      ],
      prime ? 'prime' : 'composite',
      false,
    ),
    key: `prime:${n}`,
  });
};

const ORDINAL = ['', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th'];

export const rulePattern: Generator = (rng) => {
  if (rng.chance(0.75)) {
    const step = rng.int(2, 9);
    const start = rng.int(0, 10);
    const k = rng.int(4, 8);
    const ans = start + (k - 1) * step;
    return textProblem(
      'Use the rule.',
      `Rule: add ${step}. Start at ${start}. What is the ${ORDINAL[k]} number? __`,
      int(ans),
      `${start} + ${k - 1} × ${step} = __`,
      `add:${step}:${start}:${k}`,
    );
  }
  const r = rng.int(2, 3);
  const start = rng.int(1, 5);
  const k = rng.int(3, r === 2 ? 6 : 5);
  const ans = start * r ** (k - 1);
  const model = [String(start), ...Array(k - 1).fill(String(r))].join(' × ') + ' = __';
  return textProblem(
    'Use the rule.',
    `Rule: multiply by ${r}. Start at ${start}. What is the ${ORDINAL[k]} number? __`,
    int(ans),
    model,
    `mul:${r}:${start}:${k}`,
  );
};

// ================================================================ place value

/** A number of 4-6 digits in which the digit at `pos` (0 = ones) appears only once and isn't 0. */
function numberWithUniqueDigit(rng: Rng): { n: number; d: number; pos: number } {
  for (;;) {
    const n = nDigit(rng, rng.int(4, 6));
    const ds = digits(n);
    const idx = rng.int(0, ds.length - 2); // not the ones place: that's trivial
    const d = ds[idx] as number;
    if (d !== 0 && ds.filter((x) => x === d).length === 1)
      return { n, d, pos: ds.length - 1 - idx };
  }
}

export const digitValue: Generator = (rng) => {
  const { n, d, pos } = numberWithUniqueDigit(rng);
  return textProblem(
    'Place value.',
    `In ${fmt(n)}, the ${d} has a value of __.`,
    int(d * 10 ** pos),
    `${d} × ${10 ** pos} = __`,
    `dv:${n}:${d}`,
  );
};

export const compareMultiDigit: Generator = (rng) => {
  const len = rng.int(4, 6);
  const r = rng.next();
  let a = nDigit(rng, len);
  let b: number;
  if (r < 0.1) b = a;
  else if (r < 0.55) {
    // Near-match: same length, one digit different.
    const ds = digits(a);
    const i = rng.int(0, ds.length - 1);
    const old = ds[i] as number;
    ds[i] = rng.pick([...Array(10).keys()].filter((x) => x !== old && !(i === 0 && x === 0)));
    b = Number(ds.join(''));
  } else if (r < 0.8) {
    // Different lengths, where the shorter number starts with a bigger digit: 102,345 vs 98,765.
    a = rng.int(1, 7) * 10 ** (len - 1) + rng.int(0, 10 ** (len - 1) - 1);
    b = rng.int(8, 9) * 10 ** (len - 2) + rng.int(0, 10 ** (len - 2) - 1);
  } else b = nDigit(rng, len);
  const [x, y] = rng.chance(0.5) ? [a, b] : [b, a];
  const model = comparisonTokens(String(x), String(y));
  return textProblem(
    'Compare. Use <, = or >.',
    `${fmt(x)} __ ${fmt(y)}`,
    { type: 'comparison', value: compareSides(model) },
    model,
    `${x}?${y}`,
  );
};

export const expandedFormMultiDigit: Generator = (rng) => {
  const n = nDigit(rng, rng.int(5, 6));
  if (rng.chance(0.3)) {
    return textProblem(
      'Write the number.',
      `${numberWords(n)} = __`,
      int(n),
      `__ = ${n}`,
      `names:${n}`,
    );
  }
  const ds = digits(n);
  const parts = ds.map((d, i) => d * 10 ** (ds.length - 1 - i)).filter((p) => p > 0);
  const blank = rng.int(0, parts.length - 1);
  const text = `${fmt(n)} = ${parts.map((p, i) => (i === blank ? '__' : fmt(p))).join(' + ')}`;
  const model = `${n} = ${parts.map((p, i) => (i === blank ? '__' : String(p))).join(' + ')}`;
  return textProblem(
    'Fill in the expanded form.',
    text,
    int(parts[blank] as number),
    model,
    `exp:${n}:${blank}`,
  );
};

const PLACES = [10, 100, 1000, 10_000, 100_000];

export const roundMultiDigit: Generator = (rng) => {
  const place = rng.pick(PLACES);
  let n: number;
  do n = rng.int(place + 1, Math.min(999_999, place * 99));
  while (n % place === 0);
  // Sometimes land exactly on the halfway digit (rounds up).
  if (rng.chance(0.15)) n = Math.floor(n / place) * place + place / 2;
  const ans = roundTo(n, place);
  return textProblem(
    'Round.',
    `Round ${fmt(n)} to the nearest ${fmt(place)}: __`,
    int(ans),
    `__ = ${ans}`,
    `round:${n}:${place}`,
  );
};

// ================================================================ multi-digit operations

function vertical(instruction: string, op: '+' | '−' | '×', a: number, b: number, answer: number) {
  const opSrc = op === '−' ? '−' : op;
  return problem({
    instruction,
    blocks: [{ kind: 'vertical', op, operands: [a, b] }],
    answer: int(answer),
    model: `${a} ${opSrc} ${b} = __`,
    key: `${a}${op}${b}`,
  });
}

export const addMultiDigit: Generator = (rng) => {
  let a: number, b: number;
  do {
    a = nDigit(rng, rng.int(4, 6));
    b = nDigit(rng, rng.int(3, String(a).length));
  } while (a + b > 999_999);
  return vertical('Add.', '+', a, b, a + b);
};

export const subMultiDigit: Generator = (rng) => {
  const len = rng.int(4, 6);
  let a: number;
  if (rng.chance(0.4)) {
    // Zeros in the middle of the top number: 40,000 − 12,345 or 50,203 − 7,568.
    const ds = digits(nDigit(rng, len));
    for (let i = 1; i < len - 1; i++) if (rng.chance(0.6)) ds[i] = 0;
    ds[len - 2] = 0;
    a = Number(ds.join(''));
  } else a = nDigit(rng, len);
  const b = rng.int(Math.floor(a / 10), a - 1);
  return vertical('Subtract.', '−', a, b, a - b);
};

export const mult2x1: Generator = (rng) => {
  const b = rng.int(2, 9);
  let a: number;
  do a = rng.int(12, 99);
  while (a % 10 === 0 || (rng.chance(0.75) && (a % 10) * b < 10));
  return vertical('Multiply.', '×', a, b, a * b);
};

export const mult4x1: Generator = (rng) => {
  const b = rng.int(3, 9);
  const ds = digits(nDigit(rng, rng.int(3, 4)));
  if (rng.chance(0.4)) ds[rng.int(1, ds.length - 2)] = 0; // a zero digit: 4,056 × 7
  const a = Number(ds.join(''));
  return vertical('Multiply.', '×', a, b, a * b);
};

export const mult2x2: Generator = (rng) => {
  const pick = () => {
    let x: number;
    do x = rng.int(11, 99);
    while (x % 10 === 0);
    return x;
  };
  const a = pick();
  const b = pick();
  return vertical('Multiply.', '×', a, b, a * b);
};

export const multPowersOf10: Generator = (rng) => {
  if (rng.chance(0.6)) {
    const d = rng.int(2, 9);
    const m = rng.int(2, 9) * 10 ** rng.int(1, 3);
    return rng.chance(0.5)
      ? arith('Multiply.', `${d} × ${m} = __`, d * m)
      : arith('Multiply.', `${m} × ${d} = __`, d * m);
  }
  const a = rng.int(2, 9) * 10;
  const b = rng.int(2, 9) * 10;
  return arith('Multiply.', `${a} × ${b} = __`, a * b);
};

export const divBy1Digit: Generator = (rng) => {
  const d = rng.int(2, 9);
  const q = rng.int(12, Math.floor(9999 / d));
  const n = q * d;
  return problem({
    instruction: 'Divide.',
    blocks: [{ kind: 'longDivision', dividend: n, divisor: d }],
    answer: int(q),
    model: `${n} ÷ ${d} = __`,
    key: `${n}/${d}`,
  });
};

export const divBy1DigitRemainder: Generator = (rng) => {
  const d = rng.int(2, 9);
  const q = rng.int(3, Math.floor(9990 / d));
  const r = rng.chance(0.9) ? rng.int(1, d - 1) : 0;
  const n = q * d + r;
  return problem({
    instruction: 'Divide. Write the remainder with R.',
    blocks: [{ kind: 'longDivision', dividend: n, divisor: d }],
    answer: { type: 'quotient-remainder', quotient: q, remainder: r },
    model: `__ × ${d} + ${r} = ${n}`,
    key: `${n}/${d}`,
  });
};

// ================================================================ fractions

/** Pairs (small, big) of grade 4 denominators where big is a multiple of small. */
const EQUIV_PAIRS: [number, number][] = [];
for (const a of [...D4, 100])
  for (const b of [...D4, 100]) if (b > a && b % a === 0) EQUIV_PAIRS.push([a, b]);

export const equivalentFractions: Generator = (rng) => {
  const [d1, d2] = rng.pick(EQUIV_PAIRS);
  const n1 = rng.int(1, d1 - 1);
  const n2 = (n1 * d2) / d1;
  switch (rng.int(0, 2)) {
    case 0:
      return textProblem(
        'Find the missing number.',
        `${n1}/${d1} = __/${d2}`,
        int(n2),
        `${n1}/${d1} = __ ÷ ${d2}`,
        `eqv:${n1}/${d1}:n:${d2}`,
      );
    case 1:
      return textProblem(
        'Find the missing number.',
        `${n2}/${d2} = ${n1}/__`,
        int(d1),
        `${n2}/${d2} = ${n1} ÷ __`,
        `eqv:${n2}/${d2}:d:${n1}`,
      );
    default:
      return textProblem(
        'Find the missing number.',
        `${n1}/${d1} = ${n2}/__`,
        int(d2),
        `${n1}/${d1} = ${n2} ÷ __`,
        `eqv:${n1}/${d1}:d2:${n2}`,
      );
  }
};

export const simplifyFraction: Generator = (rng) => {
  let a: number, b: number;
  do {
    b = rng.int(2, 12);
    a = rng.int(1, b - 1);
  } while (rat(a, b).d !== b);
  const k = rng.int(2, b <= 6 ? 6 : 4);
  return equation(
    'Write in simplest form.',
    `${a * k}/${b * k} = __`,
    fracAns(rat(a, b), 'simplest'),
    `simp:${a * k}/${b * k}`,
  );
};

/** Grade 4 equivalent pairs with different tops and bottoms: [small denominator, multiplier]. */
const EQUIV_SCALES: [number, number][] = [];
for (const d of D4)
  for (const k of [2, 3, 4, 5, 6])
    if ((D4 as readonly number[]).includes(d * k)) EQUIV_SCALES.push([d, k]);

export const compareFractions: Generator = (rng) => {
  const f = (): [number, number] => {
    const d = rng.pick(D4);
    return [rng.int(1, d - 1), d];
  };
  const half = (x: [number, number]) => Math.sign(2 * x[0] - x[1]);
  const mode = rng.next();
  let a: [number, number];
  let b: [number, number];
  if (mode < 0.15) {
    // Equivalent: 2/3 vs 8/12.
    const [d, k] = rng.pick(EQUIV_SCALES);
    const n = rng.int(1, d - 1);
    [a, b] = [
      [n, d],
      [n * k, d * k],
    ];
  } else {
    // About 40% of pairs sit on opposite sides of 1/2, so the benchmark trick works.
    const straddle = mode < 0.55;
    do {
      a = f();
      b = f();
    } while (a[0] === b[0] || a[1] === b[1] || (straddle && half(a) * half(b) !== -1));
  }
  if (rng.chance(0.5)) [a, b] = [b, a];
  const tokens = comparisonTokens(`${a[0]}/${a[1]}`, `${b[0]}/${b[1]}`);
  return problem({
    instruction: 'Compare. Use <, = or >.',
    blocks: [{ kind: 'equation', tokens }],
    answer: { type: 'comparison', value: compareSides(tokens) },
    model: tokens,
    key: `${a.join('/')}?${b.join('/')}`,
  });
};

export const addLikeDenoms: Generator = (rng) => {
  const d = rng.pick(D4);
  const a = rng.int(1, d - 1);
  const b = rng.int(1, d - 1);
  return equation('Add.', `${a}/${d} + ${b}/${d} = __`, fracAns(rat(a + b, d)));
};

export const subLikeDenoms: Generator = (rng) => {
  const d = rng.pick(D4);
  const a = rng.int(2, rng.chance(0.2) ? 2 * d - 1 : d);
  const b = rng.int(1, a - 1);
  return equation('Subtract.', `${a}/${d} − ${b}/${d} = __`, fracAns(rat(a - b, d)));
};

export const decomposeFraction: Generator = (rng) => {
  const d = rng.pick(D4.filter((x) => x >= 3));
  if (rng.chance(0.3)) {
    // Mixed number: 2 1/8 = 1 + 1 + __/8
    const w = rng.int(1, 3);
    const n = rng.int(1, d - 1);
    const ones = Array(w).fill('1').join(' + ');
    return textProblem(
      'Break apart the fraction.',
      `${w} ${n}/${d} = ${ones} + __/${d}`,
      int(n),
      `${w}_${n}/${d} = ${ones} + __ ÷ ${d}`,
      `dmix:${w}:${n}/${d}`,
    );
  }
  const n = rng.int(2, d - 1);
  const a = rng.int(1, n - 1);
  return textProblem(
    'Break apart the fraction.',
    `${n}/${d} = ${a}/${d} + __/${d}`,
    int(n - a),
    `${n}/${d} = ${a}/${d} + __ ÷ ${d}`,
    `dfr:${n}/${d}:${a}`,
  );
};

/**
 * A mixed number w n/d with 0 < n < d, keeping the denominator as written
 * (2 2/4 stays 2 2/4), so "same bottom" problems really show the same bottom.
 */
interface Mixed {
  value: Rational;
  text: string; // "2 2/4" or "2/4"
  src: string; // eq() source: "2_2/4" or "2/4"
}

function mixed(rng: Rng, d: number, wMin: number, wMax: number, simplest = false): Mixed {
  const w = rng.int(wMin, wMax);
  let n: number;
  do n = rng.int(1, d - 1);
  while (simplest && rat(n, d).d !== d);
  return {
    value: rat(w * d + n, d),
    text: w ? `${w} ${n}/${d}` : `${n}/${d}`,
    src: w ? `${w}_${n}/${d}` : `${n}/${d}`,
  };
}

const less = (a: Mixed, b: Mixed) => a.value.n * b.value.d < b.value.n * a.value.d;

export const addSubMixedLike: Generator = (rng) => {
  const d = rng.pick(D4);
  let a = mixed(rng, d, 1, 5);
  let b = mixed(rng, d, 1, 4);
  if (rng.chance(0.5))
    return equation('Add.', `${a.src} + ${b.src} = __`, mixedAns(add(a.value, b.value)));
  if (less(a, b)) [a, b] = [b, a];
  if (!less(b, a)) a = mixed(rng, d, 5, 6); // equal: make the first one bigger
  return equation('Subtract.', `${a.src} − ${b.src} = __`, mixedAns(sub(a.value, b.value)));
};

export const mixedImproper: Generator = (rng) => {
  const d = rng.pick(D4.filter((x) => x <= 8));
  const m = mixed(rng, d, 1, 5);
  const improper = `${m.value.n * (d / m.value.d)}/${d}`;
  return rng.chance(0.5)
    ? equation(
        'Write as a mixed number.',
        `${improper} = __`,
        mixedAns(m.value, 'mixed'),
        `to-mixed:${improper}`,
      )
    : equation(
        'Write as a fraction.',
        `${m.src} = __`,
        mixedAns(m.value, 'improper'),
        `to-improper:${m.src}`,
      );
};

const MEASURES = [
  {
    one: 'mile',
    many: 'miles',
    how: 'How far did NAME run in all?',
    verb: 'ran',
    sub: 'How much farther did NAME run in the morning?',
  },
  {
    one: 'cup of flour',
    many: 'cups of flour',
    how: 'How many cups of flour did NAME use in all?',
    verb: 'used',
    sub: 'How many more cups of flour did NAME use in the morning?',
  },
  {
    one: 'hour',
    many: 'hours',
    how: 'How many hours did NAME read in all?',
    verb: 'read for',
    sub: 'How much longer did NAME read in the morning?',
  },
] as const;

export const storyFractionsLike: Generator = (rng) => {
  const name = rng.pick(NAMES);
  const m = rng.pick(MEASURES);
  const d = rng.pick(D4.filter((x) => x <= 10));
  const useMixed = rng.chance(0.4);
  let a = mixed(rng, d, useMixed ? 1 : 0, useMixed ? 3 : 0, true);
  let b = mixed(rng, d, 0, useMixed ? 1 : 0, true);
  const amount = (x: Mixed) => `${x.text} ${x.value.n <= x.value.d ? m.one : m.many}`;
  if (rng.chance(0.5)) {
    if (less(a, b)) [a, b] = [b, a];
    if (!less(b, a)) a = mixed(rng, d, 2, 3, true); // b < 2, so this is always bigger
    return storyProblem(
      `${name} ${m.verb} ${amount(a)} in the morning and ${amount(b)} in the afternoon. ${m.sub.replace('NAME', name)}`,
      fracAns(sub(a.value, b.value)),
      `${a.src} − ${b.src} = __`,
      `fsub:${m.one}:${a.src}:${b.src}`,
    );
  }
  return storyProblem(
    `${name} ${m.verb} ${amount(a)} in the morning and ${amount(b)} in the afternoon. ${m.how.replace('NAME', name)}`,
    fracAns(add(a.value, b.value)),
    `${a.src} + ${b.src} = __`,
    `fadd:${m.one}:${a.src}:${b.src}`,
  );
};

export const fractionTimesWhole: Generator = (rng) => {
  const d = rng.pick(D4);
  const n = rng.int(1, d - 1);
  const w = rng.int(2, 10);
  return rng.chance(0.7)
    ? equation('Multiply.', `${w} × ${n}/${d} = __`, fracAns(mul(rat(w), rat(n, d))))
    : equation('Multiply.', `${n}/${d} × ${w} = __`, fracAns(mul(rat(w), rat(n, d))));
};

const SHARE = [
  ['pizza', 'How much pizza do they eat in all?'],
  ['pan of brownies', 'How many pans of brownies do they eat in all?'],
  ['loaf of bread', 'How many loaves of bread do they eat in all?'],
] as const;

export const storyFractionTimesWhole: Generator = (rng) => {
  const d = rng.pick(D4.filter((x) => x <= 8));
  let n: number;
  do n = rng.int(1, d - 1);
  while (rat(n, d).d !== d);
  const w = rng.int(2, 9);
  const v = mul(rat(w), rat(n, d));
  if (rng.chance(0.5)) {
    const [item, question] = rng.pick(SHARE);
    return storyProblem(
      `Each of ${w} friends eats ${n}/${d} of a ${item}. ${question}`,
      fracAns(v),
      `${w} × ${n}/${d} = __`,
      `share:${w}:${n}/${d}:${item}`,
    );
  }
  const name = rng.pick(NAMES);
  return storyProblem(
    `${name} walks ${n}/${d} of a mile to school every day. How many miles does ${name} walk in ${w} days?`,
    fracAns(v),
    `${w} × ${n}/${d} = __`,
    `walk:${w}:${n}/${d}`,
  );
};

export const tenthsToHundredths: Generator = (rng) => {
  const t = rng.int(1, 9);
  return rng.chance(0.7)
    ? textProblem(
        'Find the missing number.',
        `${t}/10 = __/100`,
        int(t * 10),
        `${t}/10 = __ ÷ 100`,
        `t2h:${t}`,
      )
    : textProblem(
        'Find the missing number.',
        `${t * 10}/100 = __/10`,
        int(t),
        `${t * 10}/100 = __ ÷ 10`,
        `h2t:${t}`,
      );
};

export const addTenthsHundredths: Generator = (rng) => {
  const t = rng.int(1, 9);
  const h = rng.int(1, 99);
  const v = add(rat(t, 10), rat(h, 100));
  return rng.chance(0.7)
    ? equation('Add.', `${t}/10 + ${h}/100 = __`, fracAns(v))
    : equation('Add.', `${h}/100 + ${t}/10 = __`, fracAns(v));
};

export const fractionToDecimal: Generator = (rng) => {
  const d = rng.pick([10, 100]);
  const n = rng.int(1, d - 1);
  const w = rng.chance(0.3) ? rng.int(1, 9) : 0;
  const v = rat(w * d + n, d);
  const s = w ? `${w}_${n}/${d}` : `${n}/${d}`;
  return equation('Write as a decimal.', `${s} = __`, { type: 'decimal', value: v }, `f2d:${s}`);
};

export const compareDecimals: Generator = (rng) => {
  let a: string, b: string;
  const r = rng.next();
  if (r < 0.35) {
    // Trap: fewer digits but bigger (0.5 vs 0.45).
    const t = rng.int(2, 9);
    a = `0.${t}`;
    b = `0.${rng.int(0, t - 1)}${rng.int(1, 9)}`;
  } else if (r < 0.5) {
    // Trailing zero: 0.3 vs 0.30.
    a = `${rng.int(0, 2)}.${rng.int(1, 9)}`;
    b = `${a}0`;
  } else {
    const any = () =>
      `${rng.int(0, 2)}.${rng.chance(0.3) ? rng.int(1, 9) : String(rng.int(1, 99)).padStart(2, '0')}`;
    a = any();
    b = any();
  }
  const [x, y] = rng.chance(0.5) ? [a, b] : [b, a];
  const model = comparisonTokens(x, y);
  return textProblem(
    'Compare. Use <, = or >.',
    `${x} __ ${y}`,
    { type: 'comparison', value: compareSides(model) },
    model,
    `${x}?${y}`,
  );
};
