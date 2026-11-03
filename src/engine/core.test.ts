import { describe, expect, it } from 'vitest';
import { checkAnswer, formatAnswer } from './answers';
import { compareSides, comparisonTokens, eq, holds, tokensToText } from './expr';
import { generateTest } from './generate';
import { numberWords } from './helpers';
import { add, div, mul, parseDecimal, rat, sub, toDecimalString, toMixedString } from './rational';
import { createRng } from './rng';
import type { Answer, Generator } from './types';

describe('rng', () => {
  it('is deterministic per seed', () => {
    const a = createRng('seed-1');
    const b = createRng('seed-1');
    const c = createRng('seed-2');
    const sa = Array.from({ length: 20 }, () => a.int(0, 1000));
    expect(Array.from({ length: 20 }, () => b.int(0, 1000))).toEqual(sa);
    expect(Array.from({ length: 20 }, () => c.int(0, 1000))).not.toEqual(sa);
  });

  it('int stays in range and hits both ends', () => {
    const r = createRng('range');
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i++) {
      const x = r.int(3, 7);
      expect(x).toBeGreaterThanOrEqual(3);
      expect(x).toBeLessThanOrEqual(7);
      seen.add(x);
    }
    expect([...seen].sort()).toEqual([3, 4, 5, 6, 7]);
  });

  it('shuffle is a permutation', () => {
    const r = createRng('shuffle');
    expect(r.shuffle([1, 2, 3, 4, 5]).sort()).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('rational', () => {
  it('normalizes and does exact arithmetic', () => {
    expect(rat(2, 4)).toEqual({ n: 1, d: 2 });
    expect(rat(3, -6)).toEqual({ n: -1, d: 2 });
    expect(add(parseDecimal('0.1')!, parseDecimal('0.2')!)).toEqual(rat(3, 10));
    expect(sub(rat(1, 2), rat(1, 3))).toEqual(rat(1, 6));
    expect(mul(rat(2, 3), rat(3, 4))).toEqual(rat(1, 2));
    expect(div(rat(1, 3), rat(4))).toEqual(rat(1, 12));
    expect(() => rat(1, 0)).toThrow();
  });

  it('parses and prints decimals and mixed numbers', () => {
    expect(parseDecimal('.5')).toEqual(rat(1, 2));
    expect(parseDecimal('3.10')).toEqual(rat(31, 10));
    expect(parseDecimal('abc')).toBeUndefined();
    expect(toDecimalString(rat(7, 100))).toBe('0.07');
    expect(toDecimalString(rat(13, 10))).toBe('1.3');
    expect(() => toDecimalString(rat(1, 3))).toThrow();
    expect(toMixedString(rat(11, 4))).toBe('2 3/4');
    expect(toMixedString(rat(3, 4))).toBe('3/4');
  });
});

describe('expr', () => {
  it('parses author strings and prints them back', () => {
    expect(tokensToText(eq('47 + 38 = __'))).toBe('47 + 38 = __');
    expect(tokensToText(eq('2 × (8 + 7) = __'))).toBe('2 × (8 + 7) = __');
    expect(tokensToText(eq('2_3/4 - 1/4 = __'))).toBe('2 3/4 − 1/4 = __');
    expect(() => eq('4 & 5')).toThrow();
  });

  it('respects precedence and parentheses', () => {
    expect(holds(eq('2 + 3 × 4 = 14'))).toBe(true);
    expect(holds(eq('(2 + 3) × 4 = 20'))).toBe(true);
    expect(holds(eq('12 ÷ 4 ÷ 3 = 1'))).toBe(true);
    expect(holds(eq('10 − 4 − 3 = 3'))).toBe(true);
  });

  it('substitutes the blank anywhere', () => {
    expect(holds(eq('__ − 3 = 5'), rat(8))).toBe(true);
    expect(holds(eq('__ − 3 = 5'), rat(9))).toBe(false);
    expect(holds(eq('42 ÷ __ = 6'), rat(7))).toBe(true);
    expect(holds(eq('3/4 = __'), rat(6, 8))).toBe(true);
    expect(compareSides(comparisonTokens('43', '47'))).toBe('<');
    expect(compareSides(comparisonTokens('3/4', '6/8'))).toBe('=');
  });
});

describe('checkAnswer', () => {
  const ans = <T extends Answer>(a: T) => a;
  it('integers: tolerates spaces, commas and leading zeros', () => {
    const a = ans({ type: 'integer', value: 47382 });
    expect(checkAnswer(a, ' 47,382 ').status).toBe('correct');
    expect(checkAnswer(a, '047382').status).toBe('correct');
    expect(checkAnswer(a, '47381').status).toBe('incorrect');
    expect(checkAnswer(a, '').status).toBe('invalid');
    expect(checkAnswer(a, '4.7').status).toBe('invalid');
  });

  it('decimals compare exactly', () => {
    const a = ans({ type: 'decimal', value: rat(1, 2) });
    expect(checkAnswer(a, '0.5').status).toBe('correct');
    expect(checkAnswer(a, '.50').status).toBe('correct');
    expect(checkAnswer(a, '0.05').status).toBe('incorrect');
  });

  it('fractions accept any equivalent form by default', () => {
    const a = ans({ type: 'fraction', value: rat(3, 2) });
    for (const s of ['3/2', '6/4', '1 1/2']) expect(checkAnswer(a, s).status).toBe('correct');
    expect(checkAnswer(a, '2/3').status).toBe('incorrect');
    expect(checkAnswer(a, '3/0').status).toBe('invalid');
    expect(checkAnswer(a, '1 5/4').status).toBe('invalid');
  });

  it('enforces simplest, exact, mixed and improper forms with a hint', () => {
    const simplest = ans({ type: 'fraction', value: rat(1, 2), form: 'simplest' });
    expect(checkAnswer(simplest, '1/2').status).toBe('correct');
    expect(checkAnswer(simplest, '2/4')).toEqual({
      status: 'incorrect',
      hint: 'Right value. Now simplify it!',
    });

    const exact = ans({ type: 'fraction', value: rat(1, 2), form: 'exact', exact: { n: 2, d: 4 } });
    expect(checkAnswer(exact, '2/4').status).toBe('correct');
    expect(checkAnswer(exact, '1/2').status).toBe('incorrect');
    expect(formatAnswer(exact)).toBe('2/4');

    const mixed = ans({ type: 'mixed-number', value: rat(11, 4), form: 'mixed' });
    expect(checkAnswer(mixed, '2 3/4').status).toBe('correct');
    expect(checkAnswer(mixed, '11/4').hint).toMatch(/mixed number/);

    const improper = ans({ type: 'mixed-number', value: rat(11, 4), form: 'improper' });
    expect(checkAnswer(improper, '11/4').status).toBe('correct');
    expect(checkAnswer(improper, '2 3/4').status).toBe('incorrect');
  });

  it('comparison, choice and quotient-remainder', () => {
    expect(checkAnswer({ type: 'comparison', value: '<' }, '<').status).toBe('correct');
    expect(checkAnswer({ type: 'comparison', value: '<' }, 'less').status).toBe('invalid');
    const c: Answer = {
      type: 'choice',
      choices: [
        { id: 'a', label: 'A' },
        { id: 'b', label: 'B' },
      ],
      correct: 'b',
    };
    expect(checkAnswer(c, 'b').status).toBe('correct');
    expect(checkAnswer(c, 'z').status).toBe('invalid');
    const qr: Answer = { type: 'quotient-remainder', quotient: 6, remainder: 3 };
    for (const s of ['6 R 3', '6r3', '6 R3']) expect(checkAnswer(qr, s).status).toBe('correct');
    expect(checkAnswer(qr, '6').status).toBe('incorrect');
    expect(checkAnswer({ type: 'quotient-remainder', quotient: 6, remainder: 0 }, '6').status).toBe(
      'correct',
    );
  });
});

describe('generateTest', () => {
  const counter: Generator = (rng) => {
    const n = rng.int(0, 2);
    return { instruction: 'x', blocks: [], answer: { type: 'integer', value: n }, key: String(n) };
  };

  it('is reproducible from the seed', () => {
    expect(generateTest(counter, 's', 10).map((p) => p.key)).toEqual(
      generateTest(counter, 's', 10).map((p) => p.key),
    );
  });

  it('uses every distinct problem before repeating, and never repeats back to back', () => {
    const keys = generateTest(counter, 's', 12).map((p) => p.key);
    expect(new Set(keys.slice(0, 3)).size).toBe(3);
    for (let i = 1; i < keys.length; i++) expect(keys[i]).not.toBe(keys[i - 1]);
  });
});

describe('numberWords', () => {
  it('spells numbers the way kids read them', () => {
    expect(numberWords(0)).toBe('zero');
    expect(numberWords(14)).toBe('fourteen');
    expect(numberWords(406)).toBe('four hundred six');
    expect(numberWords(99)).toBe('ninety-nine');
    expect(numberWords(60205)).toBe('sixty thousand two hundred five');
    expect(numberWords(1_000_000)).toBe('one million');
  });
});
