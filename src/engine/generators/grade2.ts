import { comparisonTokens } from '../expr';
import {
  arith,
  choice,
  ICONS,
  int,
  NAMES,
  numberWords,
  plural,
  problem,
  THINGS,
  twoNames,
} from '../helpers';
import type { Rng } from '../rng';
import type { Generator, Problem } from '../types';
import { unit, vertical } from './shared';

// ---------------------------------------------------------------- shared helpers (grades 2-3)

const digits = (n: number) => ({ h: Math.floor(n / 100), t: Math.floor(n / 10) % 10, o: n % 10 });

/** Single-digit fact pair, with zero facts rare. */
function factPair(rng: Rng): [number, number] {
  const pairs: [[number, number], number][] = [];
  for (let a = 0; a <= 9; a++) {
    for (let b = 0; b <= 9; b++)
      pairs.push([[a, b], a === 0 && b === 0 ? 0.05 : a === 0 || b === 0 ? 0.2 : 1]);
  }
  return rng.weighted(pairs);
}

// ---------------------------------------------------------------- facts, parity, arrays

export const addFactsTo20: Generator = (rng) => {
  const [a, b] = factPair(rng);
  return arith('Add.', `${a} + ${b} = __`, a + b);
};

export const subFactsTo20: Generator = (rng) => {
  const [a, b] = factPair(rng);
  return arith('Subtract.', `${a + b} − ${a} = __`, b);
};

export const oddEven: Generator = (rng) => {
  const n = rng.int(1, 20);
  const even = n % 2 === 0;
  const pictured = rng.chance(0.5);
  return problem({
    instruction: `Is ${n} odd or even?`,
    blocks: pictured
      ? [{ kind: 'objects', count: n, layout: 'array', icon: rng.pick(ICONS), seed: 0 }]
      : [],
    answer: choice(
      rng,
      [
        { id: 'odd', label: 'Odd' },
        { id: 'even', label: 'Even' },
      ],
      even ? 'even' : 'odd',
      false,
    ),
    key: `parity:${n}:${pictured}`,
  });
};

export const arrayTotal: Generator = (rng) => {
  const w = (x: number) => (x === 1 ? 0.3 : 1);
  const rows = rng.weighted([1, 2, 3, 4, 5].map((x) => [x, w(x)] as const));
  const cols = rng.weighted([1, 2, 3, 4, 5].map((x) => [x, w(x)] as const));
  return problem({
    instruction: 'How many in all?',
    blocks: [{ kind: 'array', rows, cols, icon: rng.pick(ICONS) }],
    answer: int(rows * cols),
    model: `${rows} × ${cols} = __`,
    key: `array:${rows}x${cols}`,
  });
};

// ---------------------------------------------------------------- place value to 1000

/** A three-digit number; ~30% have a zero in the tens or ones place. */
function threeDigit(rng: Rng): number {
  const h = rng.int(1, 9);
  if (rng.chance(0.3))
    return rng.chance(0.5) ? h * 100 + rng.int(1, 9) : h * 100 + rng.int(1, 9) * 10;
  return h * 100 + rng.int(1, 9) * 10 + rng.int(1, 9);
}

export const placeValue3Digit: Generator = (rng) => {
  const kind = rng.weighted([
    ['digit', 0.6],
    ['compose', 0.2],
    ['unusual', 0.2],
  ] as const);
  if (kind === 'unusual') {
    // 2 hundreds and 13 tens = 330
    const h = rng.int(1, 8);
    const t = rng.int(10, 19);
    const text = `${unit(h, 'hundred')} and ${unit(t, 'ten')} = __`;
    return problem({
      instruction: 'What number is it?',
      blocks: [{ kind: 'text', text }],
      answer: int(h * 100 + t * 10),
      model: `${h} × 100 + ${t} × 10 = __`,
      key: text,
    });
  }
  const n = threeDigit(rng);
  const { h, t, o } = digits(n);
  const picture = { kind: 'baseTen' as const, hundreds: h, tens: t, ones: o };
  if (kind === 'compose') {
    const text = `${unit(h, 'hundred')}, ${unit(t, 'ten')} and ${unit(o, 'one')} = __`;
    return problem({
      instruction: 'What number is it?',
      blocks: [picture, { kind: 'text', text }],
      answer: int(n),
      model: `${h} × 100 + ${t} × 10 + ${o} = __`,
      key: text,
    });
  }
  const place = rng.pick(['hundreds', 'tens', 'ones'] as const);
  const [text, answer, model] =
    place === 'hundreds'
      ? [
          `${n} = __ hundreds, ${unit(t, 'ten')} and ${unit(o, 'one')}`,
          h,
          `${n} = __ × 100 + ${t * 10 + o}`,
        ]
      : place === 'tens'
        ? [
            `${n} = ${unit(h, 'hundred')}, __ tens and ${unit(o, 'one')}`,
            t,
            `${n} = ${h * 100 + o} + __ × 10`,
          ]
        : [
            `${n} = ${unit(h, 'hundred')}, ${unit(t, 'ten')} and __ ones`,
            o,
            `${n} = ${h * 100 + t * 10} + __`,
          ];
  return problem({
    instruction: 'Hundreds, tens and ones.',
    blocks: [picture, { kind: 'text', text }],
    answer: int(answer),
    model,
    key: text,
  });
};

export const skipCount: Generator = (rng) => {
  const step = rng.pick([5, 10, 100]);
  const maxStart = (1000 - 3 * step) / step;
  const start = rng.int(step === 100 ? 1 : 0, maxStart) * step;
  const missing = rng.int(0, 3);
  const items = [0, 1, 2, 3].map((i) => (i === missing ? null : start + i * step));
  const answer = start + missing * step;
  return problem({
    instruction: `Count by ${step}s. What number is missing?`,
    blocks: [{ kind: 'sequence', items }],
    answer: int(answer),
    model: missing === 0 ? `__ + ${step} = ${answer + step}` : `${answer - step} + ${step} = __`,
    key: `skip:${step}:${start}:${missing}`,
  });
};

export const expandedForm3Digit: Generator = (rng) => {
  const n = threeDigit(rng);
  const { h, t, o } = digits(n);
  const terms = [h * 100, t * 10, o].filter((x) => x > 0);
  if (rng.chance(0.4)) {
    const src = `${terms.join(' + ')} = __`;
    return arith('Write the number.', src, n);
  }
  const i = rng.int(0, terms.length - 1);
  const shown = terms.map((x, j) => (j === i ? '__' : String(x)));
  return arith('Find the missing part.', `${n} = ${shown.join(' + ')}`, terms[i] as number);
};

export const numberNames3Digit: Generator = (rng) => {
  const h = rng.int(1, 9);
  const r = rng.weighted([
    ['teen', 0.25],
    ['zero', 0.25],
    ['any', 0.5],
  ] as const);
  const rest =
    r === 'teen'
      ? rng.int(11, 19)
      : r === 'zero'
        ? rng.pick([rng.int(1, 9), rng.int(1, 9) * 10])
        : rng.int(21, 99);
  const n = h * 100 + rest;
  return problem({
    instruction: 'Read the words. Type the number.',
    blocks: [{ kind: 'text', text: numberWords(n) }],
    answer: int(n),
    model: `__ = ${n}`,
    key: `words:${n}`,
  });
};

export const compare3Digit: Generator = (rng) => {
  const a = rng.int(100, 999);
  const { h, t, o } = digits(a);
  let b: number;
  const r = rng.next();
  if (r < 0.1) b = a;
  else if (r < 0.45)
    b = h * 100 + rng.int(0, 99); // same hundreds
  else if (r < 0.65) {
    // zeros: 305 vs 350
    const d = rng.int(1, 9);
    const [x, y] = rng.shuffle([h * 100 + d, h * 100 + d * 10]) as [number, number];
    return compareProblem(x, y);
  } else if (r < 0.8 && t !== o)
    b = h * 100 + o * 10 + t; // swapped tens and ones
  else b = rng.int(100, 999);
  return compareProblem(a, b);
};

function compareProblem(a: number, b: number): Problem {
  const tokens = comparisonTokens(String(a), String(b));
  return problem({
    instruction: 'Compare. Use <, = or >.',
    blocks: [{ kind: 'equation', tokens }],
    answer: { type: 'comparison', value: a < b ? '<' : a > b ? '>' : '=' },
    model: tokens,
    key: `${a}?${b}`,
  });
}

export const tenHundredMoreLess: Generator = (rng) => {
  const step = rng.pick([10, 100]);
  const more = rng.chance(0.5);
  let n: number;
  if (rng.chance(0.3)) {
    // Cross a hundred: 195 + 10, 403 − 10 (or a thousand-safe hundreds step)
    const h = rng.int(1, 8);
    n =
      step === 10
        ? more
          ? h * 100 + 90 + rng.int(0, 9)
          : (h + 1) * 100 + rng.int(0, 9)
        : rng.int(100, 900);
  } else n = rng.int(100, 900);
  if (!more && n - step < 0) n += step;
  const ans = more ? n + step : n - step;
  return problem({
    instruction: `Find ${step} ${more ? 'more' : 'less'}.`,
    blocks: [{ kind: 'text', text: `${step} ${more ? 'more' : 'less'} than ${n} is __` }],
    answer: int(ans),
    model: `${n} ${more ? '+' : '−'} ${step} = __`,
    key: `${step}:${more}:${n}`,
  });
};

// ---------------------------------------------------------------- 2-digit add/subtract

export const add2Digit: Generator = (rng) => {
  const [t1, o1] = [rng.int(1, 8), rng.int(0, 9)];
  const [t2, o2] = [rng.int(1, 9 - t1), rng.int(0, 9 - o1)];
  const [a, b] = [t1 * 10 + o1, t2 * 10 + o2];
  return vertical('+', [a, b], a + b);
};

export const add2DigitRegroup: Generator = (rng) => {
  const o1 = rng.int(1, 9);
  const o2 = rng.int(10 - o1, 9);
  for (;;) {
    const t1 = rng.int(1, 8);
    const t2 = rng.int(1, 9 - t1);
    const [a, b] = [t1 * 10 + o1, t2 * 10 + o2];
    if (a + b <= 100) return vertical('+', [a, b], a + b);
  }
};

export const sub2Digit: Generator = (rng) => {
  const t1 = rng.int(2, 9);
  const o1 = rng.int(0, 9);
  const t2 = rng.int(1, t1 - 1);
  const o2 = rng.int(0, o1);
  const [a, b] = [t1 * 10 + o1, t2 * 10 + o2];
  return vertical('−', [a, b], a - b);
};

export const sub2DigitRegroup: Generator = (rng) => {
  const o1 = rng.int(0, 8);
  const o2 = rng.int(o1 + 1, 9);
  const t1 = rng.int(2, 9);
  const t2 = rng.int(1, t1 - 1);
  const [a, b] = [t1 * 10 + o1, t2 * 10 + o2];
  return vertical('−', [a, b], a - b);
};

export const addMany2Digit: Generator = (rng) => {
  const count = rng.pick([3, 4]);
  const nums: number[] = [];
  for (let i = 0; i < count; i++)
    nums.push(
      rng.int(10, Math.min(99, 399 - nums.reduce((s, x) => s + x, 0) - 10 * (count - i - 1))),
    );
  return vertical(
    '+',
    nums,
    nums.reduce((s, x) => s + x, 0),
  );
};

// ---------------------------------------------------------------- 3-digit add/subtract

export const add3Digit: Generator = (rng) => {
  const where = rng.pick(['ones', 'tens', 'both'] as const);
  for (;;) {
    const a = rng.int(100, 899);
    const b = rng.chance(0.25) ? rng.int(10, 99) : rng.int(100, 999 - a);
    const da = digits(a);
    const db = digits(b);
    const onesCarry = da.o + db.o >= 10;
    const tensCarry = da.t + db.t + (onesCarry ? 1 : 0) >= 10;
    const ok =
      where === 'ones'
        ? onesCarry && !tensCarry
        : where === 'tens'
          ? !onesCarry && tensCarry
          : onesCarry && tensCarry;
    if (ok && a + b <= 1000) return vertical('+', [a, b], a + b);
  }
};

/** Subtraction regrouping in ones, tens or both; the top number has no zero digits. */
function sub3NoZeros(rng: Rng): Problem {
  const where = rng.pick(['ones', 'tens', 'both'] as const);
  for (;;) {
    const a = rng.int(1, 9) * 100 + rng.int(1, 9) * 10 + rng.int(1, 9);
    const b = rng.chance(0.25) ? rng.int(10, 99) : rng.int(100, a - 1);
    const da = digits(a);
    const db = digits(b);
    const onesBorrow = da.o < db.o;
    const tensBorrow = da.t - (onesBorrow ? 1 : 0) < db.t;
    const ok =
      where === 'ones'
        ? onesBorrow && !tensBorrow
        : where === 'tens'
          ? !onesBorrow && tensBorrow
          : onesBorrow && tensBorrow;
    if (ok && b < a) return vertical('−', [a, b], a - b);
  }
}

export const sub3Digit: Generator = sub3NoZeros;

/** Top number has a zero in the tens (and maybe ones), and the problem must borrow across it. */
export const subAcrossZeros: Generator = (rng) => {
  const h = rng.int(2, 9);
  const o = rng.chance(0.4) ? 0 : rng.int(1, 8);
  const a = h * 100 + o;
  const bOnes = rng.int(o + 1, 9);
  const b = rng.chance(0.3)
    ? rng.int(1, 9) * 10 + bOnes
    : rng.int(1, h - 1) * 100 + rng.int(0, 9) * 10 + bOnes;
  return vertical('−', [a, b], a - b);
};

// ---------------------------------------------------------------- stories within 100

function story(text: string, answer: number, model: string, key: string): Problem {
  return problem({
    instruction: 'Solve the story.',
    blocks: [{ kind: 'story', text }],
    answer: int(answer),
    model,
    key,
  });
}

export const storyOneStep100: Generator = (rng) => {
  const name = rng.pick(NAMES);
  const t = rng.pick(THINGS);
  const total = rng.int(25, 100);
  const a = rng.int(10, total - 10);
  const b = total - a;
  const [n1, n2] = twoNames(rng);
  switch (rng.int(0, 9)) {
    case 0:
      return story(
        `${name} has ${plural(a, t)}. ${name} gets ${b} more. How many ${t.many} does ${name} have now?`,
        total,
        `${a} + ${b} = __`,
        `add-result:${a}:${b}`,
      );
    case 1:
      return story(
        `${name} has ${plural(a, t)}. ${name} gets some more. Now ${name} has ${total}. How many more did ${name} get?`,
        b,
        `${a} + __ = ${total}`,
        `add-change:${a}:${total}`,
      );
    case 2:
      return story(
        `${name} had some ${t.many}. ${name} got ${b} more. Now ${name} has ${total}. How many did ${name} have at the start?`,
        a,
        `__ + ${b} = ${total}`,
        `add-start:${b}:${total}`,
      );
    case 3:
      return story(
        `${name} has ${plural(total, t)}. ${name} gives away ${b}. How many ${t.many} are left?`,
        a,
        `${total} − ${b} = __`,
        `take-result:${total}:${b}`,
      );
    case 4:
      return story(
        `${name} has ${plural(total, t)}. ${name} gives some away. Now ${name} has ${a}. How many did ${name} give away?`,
        b,
        `${total} − __ = ${a}`,
        `take-change:${total}:${a}`,
      );
    case 5:
      return story(
        `${name} had some ${t.many}. ${name} gave away ${b}. Now ${name} has ${a}. How many did ${name} have at the start?`,
        total,
        `__ − ${b} = ${a}`,
        `take-start:${b}:${a}`,
      );
    case 6:
      return story(
        `${n1} has ${plural(a, t)}. ${n2} has ${plural(b, t)}. How many ${t.many} do they have in all?`,
        total,
        `${a} + ${b} = __`,
        `together:${a}:${b}`,
      );
    case 7:
      return story(
        `${n1} and ${n2} have ${total} ${t.many} in all. ${n1} has ${a}. How many does ${n2} have?`,
        b,
        `${a} + __ = ${total}`,
        `apart:${total}:${a}`,
      );
    case 8:
      return story(
        `${n1} has ${plural(total, t)}. ${n2} has ${plural(a, t)}. How many more ${t.many} does ${n1} have than ${n2}?`,
        b,
        `${a} + __ = ${total}`,
        `more:${total}:${a}`,
      );
    default:
      return story(
        `${n1} has ${plural(a, t)}. ${n2} has ${b} more than ${n1}. How many ${t.many} does ${n2} have?`,
        total,
        `${a} + ${b} = __`,
        `bigger:${a}:${b}`,
      );
  }
};

export const storyTwoStep100: Generator = (rng) => {
  const name = rng.pick(NAMES);
  const t = rng.pick(THINGS);
  for (;;) {
    const a = rng.int(15, 80);
    const b = rng.int(5, 40);
    const c = rng.int(5, 40);
    const kind = rng.int(0, 3);
    if (kind === 0 && a + b <= 100 && a + b - c >= 0)
      return story(
        `${name} has ${plural(a, t)}. ${name} gets ${b} more, then gives away ${c}. How many ${t.many} does ${name} have now?`,
        a + b - c,
        `${a} + ${b} − ${c} = __`,
        `ags:${a}:${b}:${c}`,
      );
    if (kind === 1 && a - b >= 0 && a - b + c <= 100)
      return story(
        `${name} has ${plural(a, t)}. ${name} gives away ${b}, then gets ${c} more. How many ${t.many} does ${name} have now?`,
        a - b + c,
        `${a} − ${b} + ${c} = __`,
        `sga:${a}:${b}:${c}`,
      );
    if (kind === 2 && a + b + c <= 100)
      return story(
        `${name} finds ${plural(a, t)} on Monday, ${b} on Tuesday and ${c} on Wednesday. How many ${t.many} is that in all?`,
        a + b + c,
        `${a} + ${b} + ${c} = __`,
        `aaa:${a}:${b}:${c}`,
      );
    if (kind === 3 && a - b - c >= 0)
      return story(
        `${name} has ${plural(a, t)}. ${name} gives ${b} to a friend and ${c} to a cousin. How many ${t.many} are left?`,
        a - b - c,
        `${a} − ${b} − ${c} = __`,
        `sss:${a}:${b}:${c}`,
      );
  }
};
