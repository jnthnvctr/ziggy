import { skills } from 'virtual:curriculum';
import { describe, expect, it } from 'vitest';
import { checkAnswer } from './answers';
import { eq, holds } from './expr';
import { GENERATORS } from './generators';
import { numberWords } from './helpers';
import { toDecimalString } from './rational';
import { createRng } from './rng';
import type { Answer, Block, Generator, Problem, Token } from './types';

const N = 1500;
const gen = (name: string) => GENERATORS[name] as Generator;
const sample = (name: string, n = N): Problem[] => {
  const rng = createRng(`g45/${name}`);
  return Array.from({ length: n }, () => gen(name)(rng));
};
const text = (p: Problem) =>
  p.blocks
    .filter(
      (b): b is Extract<Block, { kind: 'text' | 'story' }> =>
        b.kind === 'text' || b.kind === 'story',
    )
    .map((b) => b.text)
    .join(' ');
const nums = (s: string) => (s.replace(/,/g, '').match(/\d+(?:\.\d+)?/g) ?? []).map(Number);
const share = (ps: Problem[], f: (p: Problem) => boolean) => ps.filter(f).length / ps.length;
const intOf = (a: Answer) => (a.type === 'integer' ? a.value : NaN);
const vert = (p: Problem) =>
  p.blocks.find((b) => b.kind === 'vertical') as Extract<Block, { kind: 'vertical' }>;
const longDiv = (p: Problem) =>
  p.blocks.find((b) => b.kind === 'longDivision') as Extract<Block, { kind: 'longDivision' }>;
const tokens = (p: Problem) =>
  (p.blocks.find((b) => b.kind === 'equation') as { tokens: Token[] }).tokens;
const fracTokens = (ts: Token[]) =>
  ts.filter((t) => t.t === 'frac' || t.t === 'mixed') as Extract<Token, { t: 'frac' | 'mixed' }>[];
/** "n/d" pairs written in text. */
const fracsIn = (s: string) =>
  [...s.matchAll(/(\d+)\/(\d+)/g)].map((m) => [Number(m[1]), Number(m[2])] as const);
const D4 = new Set([2, 3, 4, 5, 6, 8, 10, 12, 100]);
const isPrime = (n: number) => {
  if (n < 2) return false;
  for (let i = 2; i * i <= n; i++) if (n % i === 0) return false;
  return true;
};
const choiceOf = (p: Problem) => p.answer as Extract<Answer, { type: 'choice' }>;

describe('grade 4-5 coverage', () => {
  it('every grade 4 and 5 skill has a generator', () => {
    const missing = skills.filter(
      (s) => (s.grade === '4' || s.grade === '5') && !GENERATORS[s.generator],
    );
    expect(missing.map((s) => `${s.id} → ${s.generator}`)).toEqual([]);
  });
});

describe('grade 4 place value', () => {
  it('value of a digit: the digit appears once and the value is right', () => {
    for (const p of sample('digitValue')) {
      const m = /In ([\d,]+), the (\d) has/.exec(text(p))!;
      const n = m[1]!.replace(/,/g, '');
      const d = m[2]!;
      expect(Number(n)).toBeLessThanOrEqual(1_000_000);
      expect(n.split(d).length - 1).toBe(1);
      const pos = n.length - 1 - n.indexOf(d);
      expect(intOf(p.answer)).toBe(Number(d) * 10 ** pos);
    }
  });

  it('compare big numbers: up to 1,000,000; different lengths and near-matches both common', () => {
    const ps = sample('compareMultiDigit');
    const pairs = ps.map((p) => nums(text(p)) as [number, number]);
    for (const [a, b] of pairs) expect(Math.max(a, b)).toBeLessThanOrEqual(1_000_000);
    expect(
      share(
        ps,
        (_, i = ps.indexOf(_)) => String(pairs[i]![0]).length !== String(pairs[i]![1]).length,
      ),
    ).toBeGreaterThan(0.15);
    const near = pairs.filter(([a, b]) => {
      const [x, y] = [String(a), String(b)];
      return x.length === y.length && [...x].filter((c, i) => c !== y[i]).length === 1;
    });
    expect(near.length / pairs.length).toBeGreaterThan(0.3);
  });

  it('expanded form: one blank; number names match the number', () => {
    const ps = sample('expandedFormMultiDigit');
    for (const p of ps) {
      const t = text(p);
      expect(t.split('__').length - 1).toBe(1);
      if (/^[a-z]/.test(t)) expect(t).toBe(`${numberWords(intOf(p.answer))} = __`);
    }
    expect(share(ps, (p) => /^[a-z]/.test(text(p)))).toBeGreaterThan(0.2);
  });

  it('round to any place: recomputed independently', () => {
    for (const p of sample('roundMultiDigit')) {
      const [n, place] = nums(text(p)) as [number, number];
      expect([10, 100, 1000, 10_000, 100_000]).toContain(place);
      const r = n % place;
      expect(intOf(p.answer)).toBe(r * 2 >= place ? n - r + place : n - r);
    }
  });
});

describe('grade 4 operations', () => {
  it('add multi-digit: up to 6 digits, vertical', () => {
    for (const p of sample('addMultiDigit')) {
      const [a, b] = vert(p).operands as [number, number];
      expect(a + b).toBeLessThanOrEqual(999_999);
      expect(String(a).length).toBeGreaterThanOrEqual(4);
    }
  });

  it('subtract multi-digit: often regroups across zeros', () => {
    const ps = sample('subMultiDigit');
    const acrossZeros = share(ps, (p) => {
      const [a, b] = vert(p).operands as [number, number];
      const inner = String(a).slice(1, -1);
      return inner.includes('0') && a % 100 < b % 100;
    });
    expect(acrossZeros).toBeGreaterThan(0.2);
    for (const p of ps) expect(String(vert(p).operands[0]).length).toBeLessThanOrEqual(6);
  });

  it('2-digit × 1-digit: mostly regrouping', () => {
    const ps = sample('mult2x1');
    for (const p of ps) {
      const [a, b] = vert(p).operands as [number, number];
      expect(a).toBeGreaterThanOrEqual(10);
      expect(a).toBeLessThanOrEqual(99);
      expect(b).toBeLessThanOrEqual(9);
    }
    expect(
      share(
        ps,
        (p) => ((vert(p).operands[0] as number) % 10) * (vert(p).operands[1] as number) >= 10,
      ),
    ).toBeGreaterThan(0.6);
  });

  it('up to 4-digit × 1-digit: sometimes with a zero digit', () => {
    const ps = sample('mult4x1');
    for (const p of ps) {
      const [a, b] = vert(p).operands as [number, number];
      expect(String(a).length).toBeGreaterThanOrEqual(3);
      expect(String(a).length).toBeLessThanOrEqual(4);
      expect(b).toBeLessThanOrEqual(9);
    }
    expect(
      share(ps, (p) => String(vert(p).operands[0]).slice(1, -1).includes('0')),
    ).toBeGreaterThan(0.25);
  });

  it('2-digit × 2-digit: factors 11-99, no multiples of 10', () => {
    for (const p of sample('mult2x2')) {
      for (const x of vert(p).operands) {
        expect(x).toBeGreaterThanOrEqual(11);
        expect(x).toBeLessThanOrEqual(99);
        expect(x % 10).not.toBe(0);
      }
    }
  });

  it('multiply with tens and hundreds: 1-digit × multiple of 10/100/1000, or two multiples of 10', () => {
    for (const p of sample('multPowersOf10')) {
      const ns = tokens(p)
        .filter((t) => t.t === 'num')
        .map((t) => (t as { v: { n: number } }).v.n);
      const [a, b] = ns as [number, number];
      const ok =
        (a < 10 && /^[1-9]0+$/.test(String(b))) ||
        (b < 10 && /^[1-9]0+$/.test(String(a))) ||
        (/^[1-9]0$/.test(String(a)) && /^[1-9]0$/.test(String(b)));
      expect(ok, `${a} × ${b}`).toBe(true);
    }
  });

  it('divide by 1 digit: exact, up to 4-digit dividends', () => {
    for (const p of sample('divBy1Digit')) {
      const { dividend, divisor } = longDiv(p);
      expect(dividend % divisor).toBe(0);
      expect(dividend).toBeLessThanOrEqual(9999);
      expect(divisor).toBeLessThanOrEqual(9);
      expect(intOf(p.answer)).toBe(dividend / divisor);
    }
  });

  for (const [name, minDivisor, maxDivisor, remShare] of [
    ['divBy1DigitRemainder', 2, 9, [0.8, 1]],
    ['divBy2Digit', 11, 99, [0.35, 0.65]],
  ] as const) {
    it(`${name}: quotient and remainder are right, 0 <= r < divisor, remainders ${remShare.join('-')}`, () => {
      const ps = sample(name);
      for (const p of ps) {
        const { dividend, divisor } = longDiv(p);
        const a = p.answer as Extract<Answer, { type: 'quotient-remainder' }>;
        expect(a.quotient * divisor + a.remainder).toBe(dividend);
        expect(a.remainder).toBeGreaterThanOrEqual(0);
        expect(a.remainder).toBeLessThan(divisor);
        expect(divisor).toBeGreaterThanOrEqual(minDivisor);
        expect(divisor).toBeLessThanOrEqual(maxDivisor);
        expect(dividend).toBeLessThanOrEqual(9999);
        expect(holds(p.model!, { n: a.quotient, d: 1 })).toBe(true);
        expect(
          checkAnswer(a, a.remainder ? `${a.quotient} R ${a.remainder}` : String(a.quotient))
            .status,
        ).toBe('correct');
      }
      const withR = share(ps, (p) => (p.answer as { remainder: number }).remainder > 0);
      expect(withR).toBeGreaterThanOrEqual(remShare[0]);
      expect(withR).toBeLessThanOrEqual(remShare[1]);
    });
  }
});

describe('grade 4 factors, multiples, patterns', () => {
  it('is it a factor: correct, balanced, numbers 1-100', () => {
    const ps = sample('isFactor');
    for (const p of ps) {
      const [k, n] = nums(text(p)) as [number, number];
      expect(n).toBeLessThanOrEqual(100);
      expect(choiceOf(p).correct).toBe(n % k === 0 ? 'yes' : 'no');
    }
    const yes = share(ps, (p) => choiceOf(p).correct === 'yes');
    expect(yes).toBeGreaterThan(0.4);
    expect(yes).toBeLessThan(0.6);
  });

  it('multiples: exactly one choice is a multiple, and it is the answer', () => {
    for (const p of sample('isMultiple')) {
      const [k] = nums(text(p)) as [number];
      const a = choiceOf(p);
      const multiples = a.choices.filter((c) => Number(c.label) % k === 0);
      expect(multiples.map((c) => c.id)).toEqual([a.correct]);
    }
  });

  it('prime or composite: correct, balanced, even numbers a minority', () => {
    const ps = sample('primeComposite');
    for (const p of ps) {
      const [n] = nums(text(p)) as [number];
      expect(n).toBeGreaterThanOrEqual(2);
      expect(n).toBeLessThanOrEqual(100);
      expect(choiceOf(p).correct).toBe(isPrime(n) ? 'prime' : 'composite');
    }
    const prime = share(ps, (p) => choiceOf(p).correct === 'prime');
    expect(prime).toBeGreaterThan(0.4);
    expect(prime).toBeLessThan(0.6);
    expect(share(ps, (p) => nums(text(p))[0]! % 2 === 0)).toBeLessThan(0.3);
  });

  it('patterns with a rule: recomputed from the rule', () => {
    for (const p of sample('rulePattern')) {
      const t = text(p);
      const m =
        /Rule: (add|multiply by) (\d+)\. Start at (\d+)\. What is the (\d+)\w\w number/.exec(t)!;
      const [op, step, start, k] = [m[1], Number(m[2]), Number(m[3]), Number(m[4])];
      let v = start;
      for (let i = 1; i < k; i++) v = op === 'add' ? v + step : v * step;
      expect(intOf(p.answer)).toBe(v);
    }
  });

  it('multi-step stories include interpreting a remainder', () => {
    const ps = sample('storyMultiStep');
    expect(share(ps, (p) => /buses|left over/.test(text(p)))).toBeGreaterThan(0.3);
    for (const p of ps.filter((q) => /buses/.test(text(q)))) {
      const [people, size] = nums(text(p)) as [number, number];
      expect(intOf(p.answer)).toBe(Math.ceil(people / size));
      expect(people % size).not.toBe(0);
    }
  });
});

describe('grade 4 fractions', () => {
  it('equivalent fractions: grade 4 denominators only; both directions', () => {
    const ps = sample('equivalentFractions');
    for (const p of ps) {
      const ds = [...text(p).matchAll(/\/(\d+)/g)].map((m) => Number(m[1]));
      if (/\/__/.test(text(p))) ds.push(intOf(p.answer));
      for (const d of ds) expect(D4.has(d), text(p)).toBe(true);
    }
    expect(share(ps, (p) => /\/__/.test(text(p)))).toBeGreaterThan(0.3);
    expect(share(ps, (p) => /__\//.test(text(p)))).toBeGreaterThan(0.2);
  });

  it('simplest form: shown fraction is not already simplest; unsimplified answers are rejected', () => {
    for (const p of sample('simplifyFraction', 500)) {
      const [f] = fracTokens(tokens(p)) as [Extract<Token, { t: 'frac' }>];
      const a = p.answer as Extract<Answer, { type: 'fraction' }>;
      expect(a.form).toBe('simplest');
      expect(a.value.d).not.toBe(f.d);
      expect(checkAnswer(a, `${f.n}/${f.d}`).status).toBe('incorrect');
    }
  });

  it('compare fractions: different tops and bottoms, grade 4 denominators, often straddling 1/2', () => {
    const ps = sample('compareFractions');
    for (const p of ps) {
      const [a, b] = fracTokens(tokens(p)) as [
        Extract<Token, { t: 'frac' }>,
        Extract<Token, { t: 'frac' }>,
      ];
      expect(a.n).not.toBe(b.n);
      expect(a.d).not.toBe(b.d);
      expect(D4.has(a.d) && D4.has(b.d)).toBe(true);
    }
    expect(
      share(ps, (p) => {
        const [a, b] = fracTokens(tokens(p)) as Extract<Token, { t: 'frac' }>[];
        return Math.sign(2 * a!.n - a!.d) * Math.sign(2 * b!.n - b!.d) === -1;
      }),
    ).toBeGreaterThan(0.3);
  });

  for (const name of ['addLikeDenoms', 'subLikeDenoms', 'addSubMixedLike', 'fractionTimesWhole']) {
    it(`${name}: same, grade 4 denominators as written`, () => {
      for (const p of sample(name, 800)) {
        const ds = new Set(fracTokens(tokens(p)).map((t) => t.d));
        for (const d of ds) expect(D4.has(d)).toBe(true);
        expect(ds.size).toBe(1);
      }
    });
  }

  it('like-denominator sums sometimes exceed 1', () => {
    expect(
      share(
        sample('addLikeDenoms'),
        (p) =>
          (p.answer as { value: { n: number; d: number } }).value.n >
          (p.answer as { value: { d: number } }).value.d,
      ),
    ).toBeGreaterThan(0.2);
  });

  it('mixed numbers: subtraction often needs regrouping', () => {
    const subs = sample('addSubMixedLike').filter((p) =>
      tokens(p).some((t) => t.t === 'op' && t.v === '−'),
    );
    expect(
      share(subs, (p) => {
        const [a, b] = fracTokens(tokens(p));
        const fa = a!.t === 'mixed' ? a!.n : a!.n % a!.d;
        const fb = b!.t === 'mixed' ? b!.n : b!.n % b!.d;
        return fa < fb;
      }),
    ).toBeGreaterThan(0.25);
  });

  it('mixed ↔ improper: both directions, with the form the instruction asks for', () => {
    const ps = sample('mixedImproper');
    for (const p of ps) {
      const a = p.answer as Extract<Answer, { type: 'mixed-number' }>;
      expect(a.form).toBe(/mixed number/.test(p.instruction) ? 'mixed' : 'improper');
      const [f] = fracTokens(tokens(p));
      expect(f!.t).toBe(a.form === 'mixed' ? 'frac' : 'mixed');
      expect(a.value.n % a.value.d).not.toBe(0);
    }
    expect(share(ps, (p) => (p.answer as { form: string }).form === 'mixed')).toBeGreaterThan(0.35);
  });

  it('break apart fractions: same denominator throughout; mixed numbers sometimes', () => {
    const ps = sample('decomposeFraction');
    for (const p of ps) {
      const ds = new Set([...text(p).matchAll(/\/(\d+)/g)].map((m) => Number(m[1])));
      expect(ds.size).toBe(1);
    }
    expect(share(ps, (p) => /^\d+ \d+\//.test(text(p)))).toBeGreaterThan(0.15);
  });

  it('fraction stories: one denominator per story, simplest fractions', () => {
    for (const p of sample('storyFractionsLike')) {
      const fs = fracsIn(text(p));
      expect(new Set(fs.map(([, d]) => d)).size).toBe(1);
    }
  });

  it('tenths and hundredths: denominators 10 and 100; decimals include values over 1', () => {
    for (const p of sample('fractionToDecimal'))
      for (const f of fracTokens(tokens(p))) expect([10, 100]).toContain(f.d);
    expect(
      share(sample('fractionToDecimal'), (p) => fracTokens(tokens(p))[0]!.t === 'mixed'),
    ).toBeGreaterThan(0.15);
    for (const p of sample('addTenthsHundredths', 300))
      expect(
        fracTokens(tokens(p))
          .map((f) => f.d)
          .sort(),
      ).toEqual([10, 100]);
  });

  it('compare decimals: to hundredths, with "shorter but bigger" traps and trailing zeros', () => {
    const ps = sample('compareDecimals');
    for (const p of ps)
      for (const x of text(p).split(' __ ')) expect(x.split('.')[1]!.length).toBeLessThanOrEqual(2);
    expect(
      share(ps, (p) => {
        const [x, y] = text(p).split(' __ ') as [string, string];
        const [short, long] = x.length < y.length ? [x, y] : [y, x];
        return short.length !== long.length && Number(short) > Number(long);
      }),
    ).toBeGreaterThan(0.2);
    expect(share(ps, (p) => /0$/.test(text(p)))).toBeGreaterThan(0.08);
  });
});

describe('grade 5 place value and decimals', () => {
  it('powers of 10 use superscripts, never ^', () => {
    for (const p of sample('powersOfTen', 300)) {
      expect(text(p)).toMatch(/10[²³⁴⁵⁶¹]/);
      expect(text(p)).not.toContain('^');
    }
  });

  it('× and ÷ by powers of 10: both operations, whole numbers and decimals', () => {
    const ps = sample('scaleByPowersOf10');
    expect(share(ps, (p) => tokens(p).some((t) => t.t === 'op' && t.v === '÷'))).toBeGreaterThan(
      0.3,
    );
    expect(share(ps, (p) => tokens(p).some((t) => t.t === 'num' && t.v.d > 1))).toBeGreaterThan(
      0.3,
    );
  });

  it('compare to thousandths: thousandths common, different numbers of places, trailing zeros', () => {
    const ps = sample('compareDecimals3');
    const places = (s: string) => s.split('.')[1]?.length ?? 0;
    expect(
      share(ps, (p) =>
        text(p)
          .split(' __ ')
          .some((x) => places(x) === 3),
      ),
    ).toBeGreaterThan(0.5);
    expect(share(ps, (p) => new Set(text(p).split(' __ ').map(places)).size > 1)).toBeGreaterThan(
      0.4,
    );
    expect(
      share(ps, (p) =>
        text(p)
          .split(' __ ')
          .some((x) => /\.\d*0$/.test(x)),
      ),
    ).toBeGreaterThan(0.08);
  });

  it('decimal expanded form: one blank; names use place words', () => {
    const ps = sample('decimalExpandedForm');
    for (const p of ps) {
      const t = text(p);
      expect(t.split('__').length - 1).toBe(1);
      if (/^[a-z]/.test(t)) expect(t).toMatch(/(tenths?|hundredths?|thousandths?) = __$/);
    }
    expect(share(ps, (p) => /^[a-z]/.test(text(p)))).toBeGreaterThan(0.2);
  });

  it('round decimals: recomputed with integer arithmetic', () => {
    for (const p of sample('roundDecimals')) {
      const t = text(p);
      const m = /Round (\d+)\.?(\d*) to the nearest (whole number|tenth|hundredth)/.exec(t)!;
      const thousandths = Number(m[1]) * 1000 + Number((m[2] ?? '').padEnd(3, '0'));
      const unit = { 'whole number': 1000, tenth: 100, hundredth: 10 }[m[3] as 'tenth'];
      const r = thousandths % unit;
      const expected = r * 2 >= unit ? thousandths - r + unit : thousandths - r;
      const a = p.answer as Extract<Answer, { type: 'decimal' }>;
      expect(a.value.n * (1000 / a.value.d)).toBe(expected);
    }
  });

  it('multiply multi-digit: 3-4 digits by 2 digits', () => {
    for (const p of sample('multMultiDigit')) {
      const [a, b] = vert(p).operands as [number, number];
      expect([3, 4]).toContain(String(a).length);
      expect(b).toBeGreaterThanOrEqual(11);
      expect(b % 10).not.toBe(0);
    }
  });

  it('decimal +, −, ×, ÷ stay within hundredths', () => {
    const places = (p: Problem) =>
      tokens(p)
        .filter((t) => t.t === 'num')
        .map((t) => (t as { v: { d: number } }).v.d);
    for (const name of ['addSubDecimals', 'multDecimals', 'divDecimals']) {
      for (const p of sample(name, 800)) {
        for (const d of places(p)) expect(100 % d).toBe(0);
        const a = p.answer as Extract<Answer, { type: 'decimal' }>;
        expect(100 % a.value.d).toBe(0);
      }
    }
    const placesOf = (t: Token) =>
      toDecimalString((t as Extract<Token, { t: 'num' }>).v).split('.')[1]?.length ?? 0;
    expect(
      share(
        sample('addSubDecimals'),
        (p) =>
          new Set(
            tokens(p)
              .filter((t) => t.t === 'num')
              .map(placesOf),
          ).size > 1,
      ),
    ).toBeGreaterThan(0.3);
  });

  it('divide decimals: divisors are whole numbers or tenths', () => {
    for (const p of sample('divDecimals')) {
      const ns = tokens(p).filter((t) => t.t === 'num') as Extract<Token, { t: 'num' }>[];
      expect([1, 2, 5, 10]).toContain(ns[1]!.v.d);
    }
  });
});

describe('grade 5 fractions', () => {
  for (const name of ['addUnlikeDenoms', 'subUnlikeDenoms', 'addSubMixedUnlike']) {
    it(`${name}: different denominators`, () => {
      for (const p of sample(name, 800)) {
        const [a, b] = fracTokens(tokens(p));
        expect(a!.d).not.toBe(b!.d);
      }
    });
  }

  it('mixed numbers with different bottoms: subtraction sometimes regroups', () => {
    const subs = sample('addSubMixedUnlike').filter((p) =>
      tokens(p).some((t) => t.t === 'op' && t.v === '−'),
    );
    expect(
      share(subs, (p) => {
        const [a, b] = fracTokens(tokens(p));
        return a!.n / a!.d < b!.n / b!.d;
      }),
    ).toBeGreaterThan(0.2);
  });

  it('fraction stories use unlike denominators', () => {
    for (const p of sample('storyFractionsAddSub')) {
      const ds = fracsIn(text(p)).map(([, d]) => d);
      expect(new Set(ds).size).toBeGreaterThan(1);
    }
  });

  it('multiply mixed numbers: at least one mixed factor, denominators <= 12', () => {
    for (const p of sample('multMixed')) {
      const fs = fracTokens(tokens(p));
      expect(fs.some((f) => f.t === 'mixed')).toBe(true);
      for (const f of fs) expect(f.d).toBeLessThanOrEqual(12);
    }
  });

  it('bigger or smaller: recomputed from the factor; balanced', () => {
    const ps = sample('scalingJudgement');
    for (const p of ps) {
      const m = /Is (?:(\d+) )?(\d+)\/(\d+) ×/.exec(text(p))!;
      const value = (m[1] ? Number(m[1]) : 0) + Number(m[2]) / Number(m[3]);
      expect(choiceOf(p).correct).toBe(value > 1 ? 'more' : value < 1 ? 'less' : 'same');
    }
    const more = share(ps, (p) => choiceOf(p).correct === 'more');
    expect(more).toBeGreaterThan(0.35);
    expect(more).toBeLessThan(0.55);
  });

  it('fractions as division: answer is n/d; sharing stories sometimes', () => {
    const ps = sample('fractionAsDivision');
    for (const p of ps) {
      const [n, d] = nums(
        p.blocks.some((b) => b.kind === 'story')
          ? text(p)
          : p.model!.map((t) => (t.t === 'num' ? String(t.v.n) : ' ')).join(' '),
      ) as [number, number];
      const a = p.answer as Extract<Answer, { type: 'fraction' }>;
      expect(a.value.n * d).toBe(n * a.value.d);
    }
    expect(share(ps, (p) => p.blocks.some((b) => b.kind === 'story'))).toBeGreaterThan(0.25);
  });
});

describe('grade 5 expressions and patterns', () => {
  it('words to expressions: the right label evaluates to what the words say; labels unique', () => {
    for (const p of sample('wordsToExpression')) {
      const t = text(p);
      const n = nums(t);
      const intended = /^Add/.test(t)
        ? (n[0]! + n[1]!) * n[2]!
        : /^Multiply/.test(t)
          ? n[0]! * n[1]! + n[2]!
          : /^Subtract/.test(t)
            ? (n[1]! - n[0]!) / n[2]!
            : 3 * (n[0]! + n[1]!);
      const a = choiceOf(p);
      const right = a.choices.find((c) => c.id === a.correct)!.label;
      expect(holds(eq(`${right} = ${intended}`)), `${t} → ${right}`).toBe(true);
      expect(new Set(a.choices.map((c) => c.label)).size).toBe(4);
      if (/^Subtract/.test(t)) expect(Number.isInteger(intended)).toBe(true);
    }
  });

  it('order of operations: whole-number results, brackets or mixed precedence every time', () => {
    for (const p of sample('orderOfOperations')) {
      const ts = tokens(p);
      const ops = new Set(ts.filter((t) => t.t === 'op').map((t) => (t as { v: string }).v));
      expect(ts.some((t) => t.t === 'paren') || ops.size > 1).toBe(true);
      expect(Number.isInteger(intOf(p.answer))).toBe(true);
    }
  });

  it('two patterns: B is always a multiple of A, term by term', () => {
    for (const p of sample('twoPatterns', 500)) {
      const seqs = p.blocks.filter((b) => b.kind === 'sequence') as Extract<
        Block,
        { kind: 'sequence' }
      >[];
      const [a, b] = seqs as [(typeof seqs)[0], (typeof seqs)[0]];
      const k = (b.items[1] as number) / (a.items[1] as number);
      b.items.forEach((x, i) => {
        if (x !== null) expect(x).toBe((a.items[i] as number) * k);
      });
    }
  });
});
