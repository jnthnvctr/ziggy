import { comparisonTokens, eq, tokensToText } from '../expr';
import {
  arith,
  choice,
  int,
  plural,
  problem,
  THINGS,
  TRUE_FALSE,
  twoNames,
  NAMES,
} from '../helpers';
import type { Rng } from '../rng';
import type { Generator, Problem } from '../types';

export const addDoubles: Generator = (rng) => {
  const n = rng.int(1, 10);
  return arith('Add.', `${n} + ${n} = __`, 2 * n);
};

export const addNearDoubles: Generator = (rng) => {
  const n = rng.int(1, 9);
  return rng.chance(0.5)
    ? arith('Add.', `${n} + ${n + 1} = __`, 2 * n + 1)
    : arith('Add.', `${n + 1} + ${n} = __`, 2 * n + 1);
};

export const addBridgeTen: Generator = (rng) => {
  const big = rng.pick([7, 8, 9]);
  const other = rng.int(11 - big, 9);
  return rng.chance(0.5)
    ? arith('Add.', `${big} + ${other} = __`, big + other)
    : arith('Add.', `${other} + ${big} = __`, big + other);
};

export const addWithin20: Generator = (rng) => {
  if (rng.chance(0.7)) {
    const a = rng.int(0, 9);
    const b = rng.int(0, 9);
    return arith('Add.', `${a} + ${b} = __`, a + b);
  }
  const teen = rng.int(10, 19);
  const d = rng.int(0, 20 - teen);
  return rng.chance(0.5)
    ? arith('Add.', `${teen} + ${d} = __`, teen + d)
    : arith('Add.', `${d} + ${teen} = __`, teen + d);
};

export const subWithin20: Generator = (rng) => {
  const m = rng.int(11, 20);
  const ones = m % 10;
  const kind = rng.weighted([
    ['bridge', 0.6],
    ['noBridge', 0.2],
    ['teen', 0.2],
  ] as const);
  let b: number;
  if (kind === 'bridge' && ones < 9) b = rng.int(ones + 1, 9);
  else if (kind === 'teen') b = rng.int(10, m);
  else b = rng.int(0, Math.min(ones, 9));
  return arith('Subtract.', `${m} − ${b} = __`, m - b);
};

export const missingAddSub20: Generator = (rng) => {
  const c = rng.int(2, 20);
  const a = rng.chance(0.1) ? rng.pick([0, c]) : rng.int(1, c - 1);
  const b = c - a;
  const forms: [string, number][] = [
    [`${a} + __ = ${c}`, b],
    [`__ + ${b} = ${c}`, a],
    [`${c} − __ = ${a}`, b],
    [`__ − ${b} = ${a}`, c],
    [`${c} = __ + ${b}`, a],
    [`${c} = ${a} + __`, b],
  ];
  const [src, ans] = rng.pick(forms);
  return arith('Find the missing number.', src, ans);
};

export const commutativeMissing: Generator = (rng) => {
  if (rng.chance(0.6)) {
    const a = rng.int(1, 10);
    const b = rng.int(1, 10);
    return rng.chance(0.5)
      ? arith('Find the missing number.', `${a} + ${b} = ${b} + __`, a)
      : arith('Find the missing number.', `${a} + ${b} = __ + ${a}`, b);
  }
  // Three addends with a pair that makes 10: 4 + 6 + 3 = 10 + __
  const x = rng.int(1, 9);
  const c = rng.int(1, 9);
  return rng.chance(0.5)
    ? arith('Find the missing number.', `${x} + ${10 - x} + ${c} = 10 + __`, c)
    : arith('Find the missing number.', `${c} + ${x} + ${10 - x} = ${c} + __`, 10);
};

export const subtractAsMissingAddend: Generator = (rng) => {
  const b = rng.int(2, 9);
  const diff = rng.int(1, 10);
  const c = b + diff;
  const main = eq(`${c} − ${b} = __`);
  return problem({
    instruction: 'Subtract. Think addition!',
    blocks: [
      { kind: 'equation', tokens: main },
      { kind: 'text', text: `Think: ${b} + ? = ${c}` },
    ],
    answer: int(diff),
    model: main,
    key: tokensToText(main),
  });
};

export const equalSignTrueFalse: Generator = (rng) => {
  const a = rng.int(0, 10);
  const b = rng.int(0, 10);
  const s = a + b;
  const truth = rng.chance(0.5);
  // The value written on the other side: right, or off by 1-2 (never negative).
  const t = truth ? s : s + rng.pick([-2, -1, 1, 2].filter((o) => s + o >= 0));
  let src: string;
  switch (rng.int(0, 3)) {
    case 0:
      src = `${a} + ${b} = ${t}`;
      break;
    case 1:
      src = `${t} = ${a} + ${b}`;
      break;
    case 2: {
      // Expressions on both sides: 4 + 1 = 5 + 0
      const c = rng.int(0, t);
      src = `${a} + ${b} = ${c} + ${t - c}`;
      break;
    }
    default:
      src = truth ? `${s} = ${s}` : `${s} = ${s} + ${rng.int(1, 3)}`;
  }
  const tokens = eq(src);
  return problem({
    instruction: 'True or false?',
    blocks: [{ kind: 'equation', tokens }],
    answer: choice(rng, TRUE_FALSE, truth ? 'true' : 'false', false),
    model: tokens,
    key: src,
  });
};

export const addThreeTo20: Generator = (rng) => {
  let a: number, b: number, c: number;
  if (rng.chance(0.6)) {
    const x = rng.int(1, 9);
    const rest = rng.int(1, 9);
    [a, b, c] = rng.shuffle([x, 10 - x, rest]) as [number, number, number];
  } else {
    a = rng.int(1, 9);
    b = rng.int(1, Math.min(9, 19 - a));
    c = rng.int(1, Math.min(9, 20 - a - b));
  }
  return arith('Add.', `${a} + ${b} + ${c} = __`, a + b + c);
};

// ---------------------------------------------------------------- stories within 20

function story(text: string, answer: number, model: string, key: string): Problem {
  return problem({
    instruction: 'Solve the story.',
    blocks: [{ kind: 'story', text }],
    answer: int(answer),
    model,
    key,
  });
}

export const storyWithin20: Generator = (rng) => {
  const name = rng.pick(NAMES);
  const t = rng.pick(THINGS);
  const total = rng.int(5, 20);
  const a = rng.int(1, total - 1);
  const b = total - a;
  switch (rng.int(0, 5)) {
    case 0: // add to, result unknown
      return story(
        `${name} has ${plural(a, t)}. ${name} gets ${b} more. How many ${t.many} does ${name} have now?`,
        total,
        `${a} + ${b} = __`,
        `add-result:${a}:${b}`,
      );
    case 1: // add to, change unknown
      return story(
        `${name} has ${plural(a, t)}. ${name} gets some more. Now ${name} has ${total}. How many more did ${name} get?`,
        b,
        `${a} + __ = ${total}`,
        `add-change:${a}:${total}`,
      );
    case 2: // take from, result unknown
      return story(
        `${name} has ${plural(total, t)}. ${name} gives away ${b}. How many ${t.many} are left?`,
        a,
        `${total} − ${b} = __`,
        `take-result:${total}:${b}`,
      );
    case 3: // take from, change unknown
      return story(
        `${name} has ${plural(total, t)}. ${name} gives some away. Now ${name} has ${a}. How many did ${name} give away?`,
        b,
        `${total} − __ = ${a}`,
        `take-change:${total}:${a}`,
      );
    case 4: {
      // put together, total unknown
      const [n1, n2] = twoNames(rng);
      return story(
        `${n1} has ${plural(a, t)}. ${n2} has ${plural(b, t)}. How many ${t.many} do they have in all?`,
        total,
        `${a} + ${b} = __`,
        `together:${a}:${b}`,
      );
    }
    default: // take apart, addend unknown
      return story(
        `There are ${total} ${t.many} in a box. ${a} are big and the rest are small. How many are small?`,
        b,
        `${a} + __ = ${total}`,
        `apart:${total}:${a}`,
      );
  }
};

export const storyStartUnknown20: Generator = (rng) => {
  const name = rng.pick(NAMES);
  const t = rng.pick(THINGS);
  const total = rng.int(5, 20);
  const a = rng.int(1, total - 1);
  const b = total - a;
  return rng.chance(0.5)
    ? story(
        `${name} had some ${t.many}. ${name} got ${b} more. Now ${name} has ${total}. How many did ${name} have at the start?`,
        a,
        `__ + ${b} = ${total}`,
        `start-add:${b}:${total}`,
      )
    : story(
        `${name} had some ${t.many}. ${name} gave away ${b}. Now ${name} has ${a}. How many did ${name} have at the start?`,
        total,
        `__ − ${b} = ${a}`,
        `start-take:${b}:${a}`,
      );
};

export const storyCompare20: Generator = (rng) => {
  const [n1, n2] = twoNames(rng);
  const t = rng.pick(THINGS);
  const small = rng.int(1, 15);
  const diff = rng.int(1, 20 - small);
  const big = small + diff;
  switch (rng.int(0, 3)) {
    case 0:
      return story(
        `${n1} has ${plural(big, t)}. ${n2} has ${plural(small, t)}. How many more ${t.many} does ${n1} have than ${n2}?`,
        diff,
        `${small} + __ = ${big}`,
        `more:${big}:${small}`,
      );
    case 1:
      return story(
        `${n1} has ${plural(big, t)}. ${n2} has ${plural(small, t)}. How many fewer ${t.many} does ${n2} have than ${n1}?`,
        diff,
        `${big} − __ = ${small}`,
        `fewer:${big}:${small}`,
      );
    case 2:
      return story(
        `${n1} has ${plural(small, t)}. ${n2} has ${diff} more than ${n1}. How many ${t.many} does ${n2} have?`,
        big,
        `${small} + ${diff} = __`,
        `bigger:${small}:${diff}`,
      );
    default:
      return story(
        `${n1} has ${plural(big, t)}. ${n2} has ${diff} fewer than ${n1}. How many ${t.many} does ${n2} have?`,
        small,
        `${big} − ${diff} = __`,
        `smaller:${big}:${diff}`,
      );
  }
};

// ---------------------------------------------------------------- place value

export const countNextTo120: Generator = (rng) => {
  const start = rng.chance(0.25) ? rng.int(96, 99) : rng.int(1, 117);
  const missing = rng.int(0, 3);
  const items = [0, 1, 2, 3].map((i) => (i === missing ? null : start + i));
  const answer = start + missing;
  return problem({
    instruction: 'What number is missing?',
    blocks: [{ kind: 'sequence', items }],
    answer: int(answer),
    model: `${answer} = __`,
    key: `run120:${start}:${missing}`,
  });
};

/** "1 ten", "3 tens". */
const unit = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

export const tensAndOnes: Generator = (rng) => {
  const tens = rng.int(1, 9);
  const ones = rng.int(0, 9);
  const n = tens * 10 + ones;
  const form = rng.int(0, 2);
  const [text, answer, model] =
    form === 0
      ? [`${n} = __ tens and ${unit(ones, 'one')}`, tens, `${n} = __ × 10 + ${ones}`]
      : form === 1
        ? [`${n} = ${unit(tens, 'ten')} and __ ones`, ones, `${n} = ${tens} × 10 + __`]
        : [`${unit(tens, 'ten')} and ${unit(ones, 'one')} = __`, n, `${tens} × 10 + ${ones} = __`];
  return problem({
    instruction: 'Tens and ones.',
    blocks: [
      { kind: 'baseTen', hundreds: 0, tens, ones },
      { kind: 'text', text },
    ],
    answer: int(answer),
    model,
    key: text,
  });
};

/** Pick a different two-digit number, often with the same tens digit or swapped digits. */
function partner2Digit(rng: Rng, a: number): number {
  const [t, o] = [Math.floor(a / 10), a % 10];
  const r = rng.next();
  if (r < 0.1) return a;
  if (r < 0.35 && o !== t && o !== 0) return o * 10 + t;
  if (r < 0.7) {
    const o2 = rng.pick([...Array(10).keys()].filter((x) => x !== o));
    return t * 10 + o2;
  }
  let b = rng.int(10, 99);
  if (b === a) b = a === 99 ? 98 : a + 1;
  return b;
}

export const compare2Digit: Generator = (rng) => {
  const a = rng.int(10, 99);
  const b = partner2Digit(rng, a);
  const value = a < b ? '<' : a > b ? '>' : '=';
  const tokens = comparisonTokens(String(a), String(b));
  return problem({
    instruction: 'Compare. Use <, = or >.',
    blocks: [{ kind: 'equation', tokens }],
    answer: { type: 'comparison', value },
    model: tokens,
    key: `${a}?${b}`,
  });
};

export const tenMoreLess: Generator = (rng) => {
  if (rng.chance(0.5)) {
    const n = rng.int(1, 89);
    return problem({
      instruction: 'Find 10 more.',
      blocks: [{ kind: 'text', text: `10 more than ${n} is __` }],
      answer: int(n + 10),
      model: `${n} + 10 = __`,
      key: `more:${n}`,
    });
  }
  const n = rng.int(11, 99);
  return problem({
    instruction: 'Find 10 less.',
    blocks: [{ kind: 'text', text: `10 less than ${n} is __` }],
    answer: int(n - 10),
    model: `${n} − 10 = __`,
    key: `less:${n}`,
  });
};

export const addTensTo2Digit: Generator = (rng) => {
  const a = rng.int(10, 89);
  const b = rng.int(1, Math.floor((99 - a) / 10)) * 10;
  return arith('Add.', `${a} + ${b} = __`, a + b);
};

export const add2Digit1DigitNoRegroup: Generator = (rng) => {
  const a = rng.int(1, 9) * 10 + rng.int(0, 8);
  const b = rng.int(1, 9 - (a % 10));
  return rng.chance(0.8)
    ? arith('Add.', `${a} + ${b} = __`, a + b)
    : arith('Add.', `${b} + ${a} = __`, a + b);
};

export const add2Digit1DigitRegroup: Generator = (rng) => {
  const ones = rng.int(1, 9);
  const tens = rng.int(1, 9);
  const a = tens * 10 + ones;
  const b = rng.int(10 - ones, Math.min(9, 100 - a));
  return rng.chance(0.8)
    ? arith('Add.', `${a} + ${b} = __`, a + b)
    : arith('Add.', `${b} + ${a} = __`, a + b);
};

export const subtractTens: Generator = (rng) => {
  const a = rng.int(2, 9) * 10;
  const b = (rng.chance(0.1) ? a / 10 : rng.int(1, a / 10 - 1)) * 10;
  return arith('Subtract.', `${a} − ${b} = __`, a - b);
};
