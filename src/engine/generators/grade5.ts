import { compareSides, comparisonTokens } from '../expr';
import { arith, choice, int, NAMES, numberWords, problem } from '../helpers';
import { add, cmp, div, mul, ONE, rat, sub, toDecimalString, type Rational } from '../rational';
import type { Rng } from '../rng';
import type { Choice, Generator } from '../types';
import {
  dec,
  equation,
  fracAns,
  lcm,
  mixedAns,
  nDigit,
  src,
  storyProblem,
  textProblem,
  words,
} from './support45';

/** n / 10^k as a decimal string: ds(52, 3) → "0.052". */
const ds = (n: number, k: number) => toDecimalString(rat(n, 10 ** k));

// ================================================================ place value and powers of 10

export const placeValueTenTimes: Generator = (rng) => {
  const r = rng.next();
  if (r < 0.4) {
    const x = ds(rng.int(1, 99), rng.int(1, 3));
    const v = mul(rat(10), parseRat(x));
    return textProblem(
      'Place value.',
      `__ is 10 times as much as ${x}.`,
      dec(v),
      `10 × ${x} = __`,
      `x10:${x}`,
    );
  }
  if (r < 0.8) {
    const x = rng.chance(0.5)
      ? String(rng.int(1, 99) * 10 ** rng.int(0, 2))
      : ds(rng.int(1, 99), rng.int(1, 2));
    const v = div(parseRat(x), rat(10));
    return textProblem(
      'Place value.',
      `__ is 1/10 of ${x}.`,
      dec(v),
      `${x} ÷ 10 = __`,
      `tenth:${x}`,
    );
  }
  const d = rng.int(1, 9);
  const p = rng.int(-2, 2); // value of the bigger one is d × 10^p
  const big = p >= 0 ? String(d * 10 ** p) : ds(d, -p);
  const small = p - 1 >= 0 ? String(d * 10 ** (p - 1)) : ds(d, 1 - p);
  return textProblem(
    'Place value.',
    `The ${d} in ${big} is worth __ times as much as the ${d} in ${small}.`,
    dec(rat(10)),
    `${small} × __ = ${big}`,
    `ratio:${d}:${p}`,
  );
};

/** Exact Rational from a decimal string. */
function parseRat(s: string): Rational {
  const [w, f = ''] = s.split('.');
  return rat(Number((w ?? '0') + f), 10 ** f.length);
}

export const scaleByPowersOf10: Generator = (rng) => {
  const power = rng.pick([10, 100, 1000]);
  const x = rng.chance(0.5) ? String(rng.int(2, 9999)) : ds(rng.int(11, 999), rng.int(1, 2));
  const xv = parseRat(x);
  if (rng.chance(0.5))
    return equation('Multiply.', `${x} × ${power} = __`, dec(mul(xv, rat(power))));
  const v = div(xv, rat(power));
  return equation('Divide.', `${x} ÷ ${power} = __`, dec(v));
};

const SUP = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶'];

export const powersOfTen: Generator = (rng) => {
  if (rng.chance(0.5)) {
    const e = rng.int(2, 6);
    return textProblem(
      'Powers of 10.',
      `10${SUP[e]} = __`,
      int(10 ** e),
      `${Array(e).fill('10').join(' × ')} = __`,
      `pow:${e}`,
    );
  }
  const c = rng.int(2, 9);
  const e = rng.int(1, 4);
  return textProblem(
    'Powers of 10.',
    `${c} × 10${SUP[e]} = __`,
    int(c * 10 ** e),
    `${c} × ${Array(e).fill('10').join(' × ')} = __`,
    `cpow:${c}:${e}`,
  );
};

export const compareDecimals3: Generator = (rng) => {
  const r = rng.next();
  let a: string, b: string;
  if (r < 0.35) {
    // Different numbers of places: 0.7 vs 0.698.
    const w = rng.int(0, 2);
    const t = rng.int(1, 9);
    a = `${w}.${t}`;
    b = `${w}.${t - 1}${String(rng.int(1, 99)).padStart(2, '0')}`;
  } else if (r < 0.5) {
    // Trailing zeros: 0.50 vs 0.5.
    const w = rng.int(0, 2);
    a = `${w}.${rng.int(1, 9)}`;
    b = `${a}${rng.chance(0.5) ? '0' : '00'}`;
  } else if (r < 0.75) {
    // Same tenths and hundredths, thousandths differ: 0.345 vs 0.347.
    const head = `${rng.int(0, 2)}.${String(rng.int(0, 99)).padStart(2, '0')}`;
    const [p, q] = rng.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    a = `${head}${p}`;
    b = `${head}${q}`;
  } else {
    const any = () => ds(rng.int(1, 2999), rng.int(1, 3));
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

const PLACE_NAME = ['', 'tenth', 'hundredth', 'thousandth'];

/** 3.507 → "three and five hundred seven thousandths". */
function decimalWords(s: string): string {
  const [w = '0', f = ''] = s.split('.');
  const fracN = Number(f);
  const unit = `${PLACE_NAME[f.length]}${fracN === 1 ? '' : 's'}`;
  const fracWords = `${numberWords(fracN)} ${unit}`;
  return Number(w) ? `${numberWords(Number(w))} and ${fracWords}` : fracWords;
}

export const decimalExpandedForm: Generator = (rng) => {
  const w = rng.int(0, 9);
  const [a, b, c] = [rng.int(0, 9), rng.int(0, 9), rng.int(1, 9)];
  const s = `${w}.${a}${b}${c}`;
  if (rng.chance(0.3)) {
    return textProblem(
      'Write the number.',
      `${decimalWords(s)} = __`,
      dec(parseRat(s)),
      `__ = ${s}`,
      `dnames:${s}`,
    );
  }
  const parts = [w ? String(w) : '', a ? `0.${a}` : '', b ? `0.0${b}` : '', `0.00${c}`].filter(
    Boolean,
  );
  if (parts.length < 2) return decimalExpandedForm(rng);
  const blank = rng.int(0, parts.length - 1);
  const shown = parts.map((p, i) => (i === blank ? '__' : p)).join(' + ');
  return textProblem(
    'Fill in the expanded form.',
    `${s} = ${shown}`,
    dec(parseRat(parts[blank] as string)),
    `${s} = ${shown}`,
    `dexp:${s}:${blank}`,
  );
};

const ROUND_TO = [
  ['whole number', 1000],
  ['tenth', 100],
  ['hundredth', 10],
] as const;

export const roundDecimals: Generator = (rng) => {
  const [name, unit] = rng.pick(ROUND_TO);
  let m: number;
  do m = rng.int(1001, 49999);
  while (m % 10 === 0 || m % unit === 0);
  if (rng.chance(0.15)) m = Math.floor(m / unit) * unit + unit / 2; // exactly halfway: rounds up
  const rounded = Math.floor((m + unit / 2) / unit) * unit;
  const x = ds(m, 3);
  return textProblem(
    'Round.',
    `Round ${x} to the nearest ${name}: __`,
    dec(rat(rounded, 1000)),
    `__ = ${ds(rounded, 3)}`,
    `rd:${x}:${name}`,
  );
};

// ================================================================ multi-digit and decimal operations

export const multMultiDigit: Generator = (rng) => {
  const a = nDigit(rng, rng.int(3, 4));
  let b: number;
  do b = rng.int(11, 99);
  while (b % 10 === 0);
  return problem({
    instruction: 'Multiply.',
    blocks: [{ kind: 'vertical', op: '×', operands: [a, b] }],
    answer: int(a * b),
    model: `${a} × ${b} = __`,
    key: `${a}×${b}`,
  });
};

export const divBy2Digit: Generator = (rng) => {
  const d = rng.int(11, 99);
  const q = rng.int(Math.max(2, Math.ceil(100 / d)), Math.floor(9900 / d));
  const r = rng.chance(0.5) ? rng.int(1, d - 1) : 0;
  const n = q * d + r;
  return problem({
    instruction: 'Divide. Write the remainder with R.',
    blocks: [{ kind: 'longDivision', dividend: n, divisor: d }],
    answer: { type: 'quotient-remainder', quotient: q, remainder: r },
    model: `__ × ${d} + ${r} = ${n}`,
    key: `${n}/${d}`,
  });
};

/** A decimal with 0, 1 or 2 places, as a Rational and its string. */
function decimal(rng: Rng, places: 0 | 1 | 2, maxWhole: number): [Rational, string] {
  let n: number;
  do n = rng.int(1, maxWhole * 10 ** places + 10 ** places - 1);
  while (places > 0 && n % 10 === 0);
  return [rat(n, 10 ** places), ds(n, places)];
}

export const addSubDecimals: Generator = (rng) => {
  const pa = rng.pick([1, 2] as const);
  const pb = rng.chance(0.6) ? (pa === 1 ? 2 : rng.pick([0, 1] as const)) : pa;
  let [a, as] = decimal(rng, pa, 20);
  let [b, bs] = decimal(rng, pb, 20);
  if (rng.chance(0.5)) return equation('Add.', `${as} + ${bs} = __`, dec(add(a, b)));
  if (cmp(a, b) <= 0) [a, as, b, bs] = [add(b, rat(1)), toDecimalString(add(b, rat(1))), a, as];
  return equation('Subtract.', `${as} − ${bs} = __`, dec(sub(a, b)));
};

export const multDecimals: Generator = (rng) => {
  const r = rng.next();
  let a: [Rational, string], b: [Rational, string];
  if (r < 0.4) {
    a = decimal(rng, 1, 9);
    b = decimal(rng, 1, 9); // 2.3 × 4.7
  } else if (r < 0.75) {
    a = decimal(rng, 1, 30);
    const w = rng.int(2, 12);
    b = [rat(w), String(w)];
  } else {
    a = decimal(rng, 2, 5);
    const w = rng.int(2, 9);
    b = [rat(w), String(w)];
  }
  if (rng.chance(0.5)) [a, b] = [b, a];
  return equation('Multiply.', `${a[1]} × ${b[1]} = __`, dec(mul(a[0], b[0])));
};

export const divDecimals: Generator = (rng) => {
  let q: Rational, d: Rational, dsrc: string;
  if (rng.chance(0.5)) {
    // Whole-number divisor, quotient to hundredths: 8.42 ÷ 2
    const w = rng.int(2, 9);
    [d, dsrc] = [rat(w), String(w)];
    q = decimal(rng, rng.pick([1, 2] as const), 9)[0];
  } else {
    // Tenths divisor, quotient whole or tenths: 3.6 ÷ 0.4
    const t = rng.int(2, 25);
    if (t % 10 === 0) return divDecimals(rng);
    [d, dsrc] = [rat(t, 10), ds(t, 1)];
    q = rng.chance(0.5) ? rat(rng.int(2, 12)) : decimal(rng, 1, 9)[0];
  }
  const n = mul(q, d);
  return equation('Divide.', `${toDecimalString(n)} ÷ ${dsrc} = __`, dec(q));
};

// ================================================================ fractions

/** Unlike denominator pairs (2-12) with a common denominator of at most 24. */
const UNLIKE: [number, number][] = [];
for (let a = 2; a <= 12; a++)
  for (let b = 2; b <= 12; b++) if (a !== b && lcm(a, b) <= 24) UNLIKE.push([a, b]);

/** A proper fraction in simplest form, so its denominator is really d. */
function proper(rng: Rng, d: number): Rational {
  let n: number;
  do n = rng.int(1, d - 1);
  while (rat(n, d).d !== d);
  return rat(n, d);
}

/** Keep the written form (2/4 stays 2/4) for display. */
function properRaw(rng: Rng, d: number): [Rational, string] {
  const n = rng.int(1, d - 1);
  return [rat(n, d), `${n}/${d}`];
}

export const addUnlikeDenoms: Generator = (rng) => {
  const [b, d] = rng.pick(UNLIKE);
  const [x, xs] = properRaw(rng, b);
  const [y, ys] = properRaw(rng, d);
  return equation('Add.', `${xs} + ${ys} = __`, fracAns(add(x, y)));
};

export const subUnlikeDenoms: Generator = (rng) => {
  for (;;) {
    const [b, d] = rng.pick(UNLIKE);
    const [x, xs] = properRaw(rng, b);
    const [y, ys] = properRaw(rng, d);
    if (cmp(x, y) > 0) return equation('Subtract.', `${xs} − ${ys} = __`, fracAns(sub(x, y)));
    if (cmp(y, x) > 0) return equation('Subtract.', `${ys} − ${xs} = __`, fracAns(sub(y, x)));
  }
};

/** w + n/d written as "w_n/d" for eq(). */
const mixedSrc = (w: number, n: number, d: number) => `${w}_${n}/${d}`;

export const addSubMixedUnlike: Generator = (rng) => {
  const [b, d] = rng.pick(UNLIKE);
  const n1 = rng.int(1, b - 1);
  const n2 = rng.int(1, d - 1);
  if (rng.chance(0.5)) {
    const w1 = rng.int(1, 5);
    const w2 = rng.int(1, 4);
    const v = add(rat(w1 * b + n1, b), rat(w2 * d + n2, d));
    return equation('Add.', `${mixedSrc(w1, n1, b)} + ${mixedSrc(w2, n2, d)} = __`, mixedAns(v));
  }
  const w2 = rng.int(1, 4);
  const w1 = rng.int(w2 + 1, 6);
  const v = sub(rat(w1 * b + n1, b), rat(w2 * d + n2, d));
  return equation('Subtract.', `${mixedSrc(w1, n1, b)} − ${mixedSrc(w2, n2, d)} = __`, mixedAns(v));
};

export const storyFractionsAddSub: Generator = (rng) => {
  const name = rng.pick(NAMES);
  const [b, d] = rng.pick(UNLIKE.filter(([x, y]) => x <= 8 && y <= 8));
  let x = proper(rng, b);
  let y = proper(rng, d);
  const unit = (r: Rational, one: string, many: string) =>
    `${words(r)} ${cmp(r, ONE) <= 0 ? one : many}`;
  switch (rng.int(0, 2)) {
    case 0:
      return storyProblem(
        `${name} ran ${unit(x, 'mile', 'miles')} on Monday and ${unit(y, 'mile', 'miles')} on Tuesday. How many miles did ${name} run in all?`,
        fracAns(add(x, y)),
        `${src(x)} + ${src(y)} = __`,
        `run:${src(x)}:${src(y)}`,
      );
    case 1: {
      const have = add(rat(rng.int(1, 3)), x);
      return storyProblem(
        `${name} had ${unit(have, 'cup', 'cups')} of flour and used ${unit(y, 'cup', 'cups')} to bake bread. How much flour is left, in cups?`,
        fracAns(sub(have, y)),
        `${src(have, true)} − ${src(y)} = __`,
        `flour:${src(have)}:${src(y)}`,
      );
    }
    default: {
      if (cmp(x, y) === 0) y = proper(rng, d);
      if (cmp(x, y) < 0) [x, y] = [y, x];
      if (cmp(x, y) === 0) x = add(x, rat(1, lcm(b, d)));
      return storyProblem(
        `A green ribbon is ${words(x)} yard long. A blue ribbon is ${words(y)} yard long. How much longer is the green ribbon, in yards?`,
        fracAns(sub(x, y)),
        `${src(x)} − ${src(y)} = __`,
        `ribbon:${src(x)}:${src(y)}`,
      );
    }
  }
};

export const fractionAsDivision: Generator = (rng) => {
  let n: number, d: number;
  do {
    n = rng.int(1, 12);
    d = rng.int(2, 12);
  } while (n % d === 0);
  if (rng.chance(0.6))
    return equation(
      'Divide. Write the answer as a fraction.',
      `${n} ÷ ${d} = __`,
      fracAns(rat(n, d)),
    );
  const verb = n === 1 ? 'pizza is' : 'pizzas are';
  return storyProblem(
    `${n} ${verb} shared equally by ${d} friends. How much pizza does each friend get?`,
    fracAns(rat(n, d)),
    `${n} ÷ ${d} = __`,
    `sharepz:${n}:${d}`,
  );
};

export const multFractions: Generator = (rng) => {
  const b = rng.int(2, 12);
  const d = rng.int(2, 12);
  const [x, xs] = properRaw(rng, b);
  const [y, ys] = properRaw(rng, d);
  return equation('Multiply.', `${xs} × ${ys} = __`, fracAns(mul(x, y)));
};

export const multMixed: Generator = (rng) => {
  const d1 = rng.int(2, 12);
  const a = rat(rng.int(1, 3) * d1 + rng.int(1, d1 - 1), d1);
  let b: Rational;
  const r = rng.next();
  if (r < 0.35)
    b = rat(rng.int(2, 6)); // mixed × whole
  else if (r < 0.65)
    b = proper(rng, rng.int(2, 12)); // mixed × fraction
  else {
    const d2 = rng.int(2, 8);
    b = rat(rng.int(1, 2) * d2 + rng.int(1, d2 - 1), d2); // mixed × mixed
  }
  const [x, y] = rng.chance(0.5) ? [a, b] : [b, a];
  return equation('Multiply.', `${src(x, true)} × ${src(y, true)} = __`, mixedAns(mul(x, y)));
};

export const scalingJudgement: Generator = (rng) => {
  const w = rng.int(6, 30);
  const r = rng.next();
  let shown: string;
  let c: number;
  if (r < 0.45) {
    const d = rng.int(2, 12);
    shown = `${rng.int(1, d - 1)}/${d}`; // less than 1
    c = -1;
  } else if (r < 0.9) {
    const d = rng.int(2, 8);
    const f = rat(d + rng.int(1, 2 * d - 1), d); // more than 1, shown as 5/4 or 1 1/4
    shown = f.d === 1 ? `${f.n * 2}/2` : rng.chance(0.5) ? `${f.n}/${f.d}` : words(f);
    c = 1;
  } else {
    const d = rng.int(2, 9);
    shown = `${d}/${d}`; // equal to 1
    c = 0;
  }
  const choices: Choice[] = [
    { id: 'more', label: `More than ${w}` },
    { id: 'less', label: `Less than ${w}` },
    { id: 'same', label: `Equal to ${w}` },
  ];
  return problem({
    instruction: 'Bigger or smaller? Decide without working it out.',
    blocks: [{ kind: 'text', text: `Is ${shown} × ${w} more than, less than or equal to ${w}?` }],
    answer: choice(rng, choices, c > 0 ? 'more' : c < 0 ? 'less' : 'same', false),
    key: `scale:${shown}:${w}`,
  });
};

export const unitFractionDivWhole: Generator = (rng) => {
  const d = rng.int(2, 10);
  const w = rng.int(2, 10);
  return equation('Divide.', `1/${d} ÷ ${w} = __`, fracAns(rat(1, d * w)));
};

export const wholeDivUnitFraction: Generator = (rng) => {
  const d = rng.int(2, 10);
  const w = rng.int(2, 10);
  return arith('Divide.', `${w} ÷ 1/${d} = __`, w * d);
};

export const storyFractionDivision: Generator = (rng) => {
  const d = rng.int(2, 8);
  const w = rng.int(2, 9);
  switch (rng.int(0, 2)) {
    case 0:
      return storyProblem(
        `How many 1/${d}-cup servings are in ${w} cups of trail mix?`,
        fracAns(rat(w * d)),
        `${w} ÷ 1/${d} = __`,
        `servings:${w}:${d}`,
      );
    case 1:
      return storyProblem(
        `A ribbon is ${w} feet long. It is cut into pieces that are each 1/${d} foot long. How many pieces are there?`,
        fracAns(rat(w * d)),
        `${w} ÷ 1/${d} = __`,
        `pieces:${w}:${d}`,
      );
    default:
      return storyProblem(
        `${w} friends share 1/${d} of a pizza equally. What fraction of the whole pizza does each friend get?`,
        fracAns(rat(1, w * d)),
        `1/${d} ÷ ${w} = __`,
        `sharefr:${w}:${d}`,
      );
  }
};

// ================================================================ expressions and patterns

export const orderOfOperations: Generator = (rng) => {
  const [a, b, c] = [rng.int(2, 9), rng.int(1, 9), rng.int(1, 9)];
  switch (rng.int(0, 5)) {
    case 0:
      return arith('Solve. Brackets first!', `${a} × (${b} + ${c}) = __`, a * (b + c));
    case 1: {
      const p = (a + b) * c;
      const d = rng.int(1, Math.min(20, p));
      return arith('Solve. Brackets first!', `(${a} + ${b}) × ${c} − ${d} = __`, p - d);
    }
    case 2:
      return arith('Solve. Multiply before you add!', `${a} + ${b} × ${c} = __`, a + b * c);
    case 3: {
      const big = a + b;
      return arith('Solve. Brackets first!', `(${big} − ${b}) × ${c} = __`, a * c);
    }
    case 4: {
      const s = b + c;
      const q = rng.int(2, 9);
      const d = rng.int(1, 20);
      return arith('Solve. Brackets first!', `${s * q} ÷ (${b} + ${c}) + ${d} = __`, q + d);
    }
    default: {
      const q = rng.int(1, 9);
      const prod = a * b;
      const dv = rng.int(2, 9);
      if (q > prod) return orderOfOperations(rng);
      return arith(
        'Solve. Multiply and divide first!',
        `${a} × ${b} − ${q * dv} ÷ ${dv} = __`,
        prod - q,
      );
    }
  }
};

/** Templates: the words, the right expression, and three tempting wrong ones. */
export const wordsToExpression: Generator = (rng) => {
  const [a, b, c] = [rng.int(2, 9), rng.int(2, 9), rng.int(2, 9)];
  let text: string, right: string, wrong: string[];
  switch (rng.int(0, 3)) {
    case 0:
      text = `Add ${a} and ${b}, then multiply by ${c}.`;
      right = `${c} × (${a} + ${b})`;
      wrong = [`${c} × ${a} + ${b}`, `${a} + ${b} × ${c}`, `${a} + ${b} + ${c}`];
      break;
    case 1:
      text = `Multiply ${a} by ${b}, then add ${c}.`;
      right = `${a} × ${b} + ${c}`;
      wrong = [`${a} × (${b} + ${c})`, `(${a} + ${b}) × ${c}`, `${a} + ${b} + ${c}`];
      break;
    case 2: {
      const big = b + c * rng.int(2, 9);
      text = `Subtract ${b} from ${big}, then divide by ${c}.`;
      right = `(${big} − ${b}) ÷ ${c}`;
      wrong = [`${big} − ${b} ÷ ${c}`, `(${b} − ${big}) ÷ ${c}`, `${c} ÷ (${big} − ${b})`];
      break;
    }
    default:
      text = `Three times the sum of ${a} and ${b}.`;
      right = `3 × (${a} + ${b})`;
      wrong = [`3 × ${a} + ${b}`, `3 + (${a} + ${b})`, `(3 + ${a}) × ${b}`];
  }
  const labels = [right, ...wrong];
  const ids = ['a', 'b', 'c', 'd'];
  const choices: Choice[] = labels.map((label, i) => ({ id: ids[i] as string, label }));
  return problem({
    instruction: 'Which expression matches the words?',
    blocks: [{ kind: 'text', text }],
    answer: choice(rng, choices, 'a'),
    key: text,
  });
};

export const twoPatterns: Generator = (rng) => {
  const stepA = rng.int(1, 5);
  const k = rng.int(2, 4);
  const stepB = stepA * k;
  const terms = 5;
  const seqA = Array.from({ length: terms }, (_, i) => i * stepA);
  const seqB = Array.from({ length: terms }, (_, i) => i * stepB);
  const rules = [
    { kind: 'text' as const, text: `Pattern A: start at 0, add ${stepA}.` },
    { kind: 'sequence' as const, items: seqA },
    { kind: 'text' as const, text: `Pattern B: start at 0, add ${stepB}.` },
  ];
  if (rng.chance(0.5)) {
    const miss = rng.int(2, terms - 1);
    return problem({
      instruction: 'Finish pattern B.',
      blocks: [...rules, { kind: 'sequence', items: seqB.map((x, i) => (i === miss ? null : x)) }],
      answer: int(seqB[miss] as number),
      model: `${miss} × ${stepB} = __`,
      key: `tp-miss:${stepA}:${k}:${miss}`,
    });
  }
  return problem({
    instruction: 'Compare the patterns.',
    blocks: [
      ...rules,
      { kind: 'sequence', items: seqB },
      {
        kind: 'text',
        text: `Each number in pattern B is __ times the matching number in pattern A.`,
      },
    ],
    answer: int(k),
    model: `${stepA} × __ = ${stepB}`,
    key: `tp-ratio:${stepA}:${k}`,
  });
};
