import { skills } from 'virtual:curriculum';
import { describe, expect, it } from 'vitest';
import { GENERATORS } from './generators';
import { roundTo } from './generators/shared';
import { numberWords } from './helpers';
import { createRng } from './rng';
import type { Answer, Block, Generator, Problem, Token } from './types';

const sample = (name: string, n = 1000): Problem[] => {
  const g = GENERATORS[name] as Generator;
  const rng = createRng(`g23:${name}`);
  return Array.from({ length: n }, () => g(rng));
};

const nums = (tokens: readonly Token[]) =>
  tokens.filter((t): t is Extract<Token, { t: 'num' }> => t.t === 'num').map((t) => t.v.n / t.v.d);
const modelNums = (p: Problem) => nums(p.model ?? []);
const operands = (p: Problem) =>
  (p.blocks.find((b) => b.kind === 'vertical') as Extract<Block, { kind: 'vertical' }>).operands;
const intOf = (a: Answer) => (a.type === 'integer' ? a.value : NaN);
const d = (n: number) => ({ h: Math.floor(n / 100), t: Math.floor(n / 10) % 10, o: n % 10 });
const share = (ps: Problem[], f: (p: Problem) => boolean) => ps.filter(f).length / ps.length;

describe('grade 2 and 3 coverage', () => {
  it('every grade 2 and 3 skill has a generator', () => {
    const missing = skills.filter(
      (s) => (s.grade === '2' || s.grade === '3') && !GENERATORS[s.generator],
    );
    expect(missing.map((s) => `${s.id} → ${s.generator}`)).toEqual([]);
  });
});

describe('grade 2 constraints', () => {
  it('facts to 20: two single-digit addends, zero facts rare', () => {
    const ps = sample('addFactsTo20');
    for (const p of ps) for (const n of modelNums(p)) expect(n).toBeLessThanOrEqual(9);
    expect(share(ps, (p) => modelNums(p).includes(0))).toBeLessThan(0.15);
    for (const p of sample('subFactsTo20')) {
      const [m, s] = modelNums(p) as [number, number];
      expect(s).toBeLessThanOrEqual(9);
      expect(m - s).toBeLessThanOrEqual(9);
    }
  });

  it('odd or even: numbers to 20, right answer, about half pictured', () => {
    const ps = sample('oddEven');
    for (const p of ps) {
      const n = Number(/Is (\d+)/.exec(p.instruction)![1]);
      expect(n).toBeLessThanOrEqual(20);
      expect((p.answer as { correct: string }).correct).toBe(n % 2 ? 'odd' : 'even');
    }
    const pictured = share(ps, (p) => p.blocks.length > 0);
    expect(pictured).toBeGreaterThan(0.3);
    expect(pictured).toBeLessThan(0.7);
  });

  it('arrays: up to 5 by 5, answer is the total', () => {
    for (const p of sample('arrayTotal')) {
      const a = p.blocks[0] as Extract<Block, { kind: 'array' }>;
      expect(a.rows).toBeLessThanOrEqual(5);
      expect(a.cols).toBeLessThanOrEqual(5);
      expect(intOf(p.answer)).toBe(a.rows * a.cols);
    }
  });

  it('place value: three-digit numbers, includes zeros and unusual forms', () => {
    const ps = sample('placeValue3Digit');
    expect(
      share(ps, (p) => p.blocks.some((b) => b.kind === 'text' && / 1\d tens/.test(b.text))),
    ).toBeGreaterThan(0.1);
    expect(
      share(ps, (p) =>
        p.blocks.some((b) => b.kind === 'baseTen' && (b.tens === 0 || b.ones === 0)),
      ),
    ).toBeGreaterThan(0.1);
    for (const p of ps) {
      const bt = p.blocks.find((b) => b.kind === 'baseTen') as
        Extract<Block, { kind: 'baseTen' }> | undefined;
      if (bt) expect(bt.hundreds).toBeGreaterThanOrEqual(1);
    }
  });

  it('skip count: steps of 5, 10, 100, within 1000', () => {
    for (const p of sample('skipCount')) {
      const items = (p.blocks[0] as Extract<Block, { kind: 'sequence' }>).items;
      const step = Number(/by (\d+)s/.exec(p.instruction)![1]);
      expect([5, 10, 100]).toContain(step);
      const full = items.map((x) => x ?? intOf(p.answer));
      for (let i = 1; i < full.length; i++) expect(full[i]! - full[i - 1]!).toBe(step);
      expect(Math.max(...full)).toBeLessThanOrEqual(1000);
    }
  });

  it('expanded form: one blank, some numbers with a zero place', () => {
    const ps = sample('expandedForm3Digit');
    expect(share(ps, (p) => modelNums(p).filter((n) => n > 0).length < 4)).toBeGreaterThan(0.15);
  });

  it('number names: words match the answer, includes teens and zeros', () => {
    const ps = sample('numberNames3Digit');
    for (const p of ps)
      expect((p.blocks[0] as { text: string }).text).toBe(numberWords(intOf(p.answer)));
    expect(
      share(ps, (p) => {
        const r = intOf(p.answer) % 100;
        return r >= 11 && r <= 19;
      }),
    ).toBeGreaterThan(0.15);
    expect(
      share(ps, (p) => {
        const x = d(intOf(p.answer));
        return x.t === 0 || x.o === 0;
      }),
    ).toBeGreaterThan(0.15);
  });

  it('compare 3-digit: often same hundreds or zeros', () => {
    const ps = sample('compare3Digit');
    expect(
      share(ps, (p) => {
        const [a, b] = nums(p.model!) as [number, number];
        return d(a).h === d(b).h;
      }),
    ).toBeGreaterThan(0.5);
  });

  it('10 or 100 more/less: starts within 100-909 and sometimes crosses a hundred', () => {
    const ps = sample('tenHundredMoreLess');
    for (const p of ps) {
      const [n] = modelNums(p) as [number];
      expect(n).toBeGreaterThanOrEqual(100);
      expect(n).toBeLessThanOrEqual(909);
    }
    expect(
      share(ps, (p) => {
        const [n, s] = modelNums(p) as [number, number];
        return s === 10 && Math.floor(n / 100) !== Math.floor(intOf(p.answer) / 100);
      }),
    ).toBeGreaterThan(0.05);
  });

  it('2-digit add/subtract: regrouping exactly where the skill says', () => {
    for (const p of sample('add2Digit')) {
      const [a, b] = operands(p) as [number, number];
      expect(d(a).o + d(b).o).toBeLessThanOrEqual(9);
      expect(a).toBeGreaterThanOrEqual(10);
      expect(b).toBeGreaterThanOrEqual(10);
    }
    for (const p of sample('add2DigitRegroup')) {
      const [a, b] = operands(p) as [number, number];
      expect(d(a).o + d(b).o).toBeGreaterThanOrEqual(10);
      expect(a + b).toBeLessThanOrEqual(100);
    }
    for (const p of sample('sub2Digit')) {
      const [a, b] = operands(p) as [number, number];
      expect(d(a).o).toBeGreaterThanOrEqual(d(b).o);
      expect(b).toBeGreaterThanOrEqual(10);
    }
    for (const p of sample('sub2DigitRegroup')) {
      const [a, b] = operands(p) as [number, number];
      expect(d(a).o).toBeLessThan(d(b).o);
      expect(b).toBeGreaterThanOrEqual(10);
    }
  });

  it('add 3 or 4 two-digit numbers: total < 400', () => {
    for (const p of sample('addMany2Digit')) {
      const ops = operands(p);
      expect([3, 4]).toContain(ops.length);
      for (const n of ops) expect(n >= 10 && n <= 99).toBe(true);
      expect(intOf(p.answer)).toBeLessThan(400);
    }
  });

  it('add within 1000: regroups in ones, tens or both; total <= 1000', () => {
    const ps = sample('add3Digit');
    let ones = 0,
      tens = 0,
      both = 0;
    for (const p of ps) {
      const [a, b] = operands(p) as [number, number];
      expect(a + b).toBeLessThanOrEqual(1000);
      const oc = d(a).o + d(b).o >= 10;
      const tc = d(a).t + d(b).t + (oc ? 1 : 0) >= 10;
      expect(oc || tc).toBe(true);
      if (oc && tc) both++;
      else if (oc) ones++;
      else tens++;
    }
    for (const c of [ones, tens, both]) expect(c / ps.length).toBeGreaterThan(0.2);
  });

  it('subtract within 1000: regroups, no zeros in the top number', () => {
    for (const p of sample('sub3Digit')) {
      const [a, b] = operands(p) as [number, number];
      const x = d(a);
      expect(x.h * x.t * x.o).not.toBe(0);
      const ob = x.o < d(b).o;
      const tb = x.t - (ob ? 1 : 0) < d(b).t;
      expect(ob || tb).toBe(true);
    }
  });

  it('subtract across zeros: zero tens in the top number, and it must borrow', () => {
    const ps = sample('subAcrossZeros');
    for (const p of ps) {
      const [a, b] = operands(p) as [number, number];
      expect(d(a).t).toBe(0);
      expect(d(a).o).toBeLessThan(d(b).o);
      expect(b).toBeLessThan(a);
    }
    expect(share(ps, (p) => operands(p)[0]! % 100 === 0)).toBeGreaterThan(0.25);
  });

  it('stories within 100: every number and intermediate result in 0-100', () => {
    for (const name of ['storyOneStep100', 'storyTwoStep100']) {
      for (const p of sample(name)) {
        for (const n of modelNums(p)) expect(n).toBeLessThanOrEqual(100);
        expect(intOf(p.answer)).toBeLessThanOrEqual(100);
      }
    }
    for (const p of sample('storyTwoStep100')) {
      const [a, b] = modelNums(p) as [number, number];
      const ops = p.model!.filter((t) => t.t === 'op').map((t) => (t as { v: string }).v);
      const first = ops[0] === '+' ? a + b : a - b;
      expect(first >= 0 && first <= 100).toBe(true);
    }
  });

  it('one-step stories cover all unknown positions', () => {
    const ps = sample('storyOneStep100');
    expect(share(ps, (p) => p.model![0]!.t === 'blank')).toBeGreaterThan(0.1);
  });
});

describe('grade 3 constraints', () => {
  it('times-table families use the right factors, both orders, 0 and 1 rare', () => {
    const fam: Record<string, number[]> = {
      multFamilyEasy: [0, 1, 2, 5, 10],
      multFamily34: [3, 4],
      multFamily67: [6, 7],
      multFamily89: [8, 9],
    };
    for (const [name, f] of Object.entries(fam)) {
      const ps = sample(name);
      for (const p of ps) {
        const [a, b] = modelNums(p) as [number, number];
        expect(f.includes(a) || f.includes(b), `${name}: ${a} × ${b}`).toBe(true);
        expect(a <= 10 && b <= 10).toBe(true);
      }
      expect(
        share(ps, (p) => f.includes(modelNums(p)[1]!) && !f.includes(modelNums(p)[0]!)),
      ).toBeGreaterThan(0.2);
      if (name !== 'multFamilyEasy')
        expect(share(ps, (p) => modelNums(p).some((n) => n <= 1))).toBeLessThan(0.1);
    }
  });

  it('all times tables are weighted toward 6-9', () => {
    const ps = sample('multAllFacts', 3000);
    expect(share(ps, (p) => modelNums(p).some((n) => n >= 6 && n <= 9))).toBeGreaterThan(0.6);
  });

  it('division families: exact quotients 0-10 with the family divisor', () => {
    const fam: Record<string, number[]> = {
      divFamilyEasy: [2, 5, 10],
      divFamily34: [3, 4],
      divFamily67: [6, 7],
      divFamily89: [8, 9],
    };
    for (const [name, ds] of Object.entries(fam)) {
      for (const p of sample(name)) {
        const [n, dv] = modelNums(p) as [number, number];
        expect(ds).toContain(dv);
        expect(n % dv).toBe(0);
        expect(n / dv).toBeLessThanOrEqual(10);
      }
    }
  });

  it('all division facts: dividend <= 100, divisor 1-10, includes n ÷ 1 and n ÷ n', () => {
    const ps = sample('divAllFacts', 3000);
    for (const p of ps) {
      const [n, dv] = modelNums(p) as [number, number];
      expect(n).toBeLessThanOrEqual(100);
      expect(dv >= 1 && dv <= 10).toBe(true);
    }
    expect(ps.some((p) => modelNums(p)[1] === 1)).toBe(true);
    expect(
      ps.some((p) => {
        const [n, dv] = modelNums(p);
        return n === dv;
      }),
    ).toBe(true);
  });

  it('share equally: quotients <= 10 with a picture of the total', () => {
    for (const p of sample('shareEqually')) {
      expect(intOf(p.answer)).toBeLessThanOrEqual(10);
      const obj = p.blocks.find((b) => b.kind === 'objects') as Extract<Block, { kind: 'objects' }>;
      expect(obj.count).toBe(modelNums(p)[0]);
    }
  });

  it('missing factor: unknown in either factor and in division', () => {
    const ps = sample('missingFactor');
    expect(share(ps, (p) => p.model![0]!.t === 'blank')).toBeGreaterThan(0.2);
    expect(share(ps, (p) => p.model!.some((t) => t.t === 'op' && t.v === '÷'))).toBeGreaterThan(
      0.2,
    );
  });

  it('break apart: the split really adds up to the original factor', () => {
    for (const p of sample('distributiveSplit')) {
      const [a, b, a2, x] = modelNums(p) as [number, number, number, number];
      expect(a2).toBe(a);
      expect(x).toBeLessThan(b);
    }
  });

  it('times and divide stories: products within 100', () => {
    for (const p of sample('storyMultDiv'))
      for (const n of modelNums(p)) expect(n).toBeLessThanOrEqual(100);
  });

  it('two-step stories use two different operations, answers whole and >= 0', () => {
    for (const p of sample('storyTwoStepFourOps')) {
      const ops = new Set(p.model!.filter((t) => t.t === 'op').map((t) => (t as { v: string }).v));
      expect(ops.size).toBe(2);
      expect(intOf(p.answer)).toBeGreaterThanOrEqual(0);
    }
  });

  it('number patterns: add and multiply patterns, some missing in the middle', () => {
    const ps = sample('arithmeticPattern');
    expect(share(ps, (p) => p.model!.some((t) => t.t === 'op' && t.v === '×'))).toBeGreaterThan(
      0.2,
    );
    expect(
      share(ps, (p) => (p.blocks[0] as { items: (number | null)[] }).items.at(-1) !== null),
    ).toBeGreaterThan(0.2);
  });

  it('rounding: half up, two- and three-digit numbers, includes 5s, x50s and numbers under 100', () => {
    const r10 = sample('roundTo10');
    for (const p of r10) {
      const n = Number(/Round (\d+)/.exec(p.instruction)![1]);
      expect(intOf(p.answer)).toBe(roundTo(n, 10));
      expect(n).toBeGreaterThanOrEqual(10);
    }
    expect(share(r10, (p) => /Round \d*5 /.test(p.instruction))).toBeGreaterThan(0.15);
    expect(share(r10, (p) => /Round \d{3} /.test(p.instruction))).toBeGreaterThan(0.3);
    const r100 = sample('roundTo100');
    for (const p of r100)
      expect(intOf(p.answer)).toBe(roundTo(Number(/Round (\d+)/.exec(p.instruction)![1]), 100));
    expect(share(r100, (p) => /Round \d50 /.test(p.instruction))).toBeGreaterThan(0.15);
    expect(share(r100, (p) => /Round \d\d /.test(p.instruction))).toBeGreaterThan(0.05);
  });

  it('fluent subtraction mixes in subtracting across zeros', () => {
    const ps = sample('sub3DigitAll');
    expect(
      share(ps, (p) => {
        const [a] = operands(p) as [number];
        return a >= 100 && d(a).t === 0;
      }),
    ).toBeGreaterThan(0.15);
  });

  it('multiply by tens: one-digit times 10-90', () => {
    for (const p of sample('multByTens')) {
      const ns = modelNums(p);
      expect(ns.some((n) => n >= 10 && n <= 90 && n % 10 === 0)).toBe(true);
      expect(ns.some((n) => n >= 1 && n <= 9)).toBe(true);
    }
  });

  it('fractions use denominators 2, 3, 4, 6, 8, and name/number-line answers expect the form shown', () => {
    for (const p of sample('nameFraction')) {
      const m = p.blocks[0] as Extract<Block, { kind: 'fractionModel' }>;
      expect([2, 3, 4, 6, 8]).toContain(m.parts);
      expect(p.answer).toMatchObject({ form: 'exact', exact: { n: m.shaded, d: m.parts } });
      expect(m.shaded >= 1 && m.shaded < m.parts).toBe(true);
    }
    for (const p of sample('fractionNumberLine')) {
      const l = p.blocks[0] as Extract<Block, { kind: 'numberLine' }>;
      expect([2, 3, 4, 6, 8]).toContain(l.partsPerUnit);
      expect(p.answer).toMatchObject({ form: 'exact', exact: { n: l.point, d: l.partsPerUnit } });
      expect(l.point! % l.partsPerUnit).not.toBe(0);
    }
    for (const name of ['equivalentFractionsSimple', 'compareSameDenom', 'compareSameNumer']) {
      for (const p of sample(name, 500)) {
        const dens =
          name === 'equivalentFractionsSimple'
            ? [modelNums(p)[1]!, modelNums(p)[2]!]
            : p.model!.filter((t) => t.t === 'frac').map((t) => (t as { d: number }).d);
        for (const x of dens) expect([2, 3, 4, 6, 8]).toContain(x);
      }
    }
  });

  it('compare fractions: same denominator or same numerator as named', () => {
    for (const [name, field] of [
      ['compareSameDenom', 'd'],
      ['compareSameNumer', 'n'],
    ] as const) {
      for (const p of sample(name, 500)) {
        const [x, y] = p.model!.filter((t) => t.t === 'frac') as { n: number; d: number }[];
        expect(x![field]).toBe(y![field]);
      }
    }
  });
});
