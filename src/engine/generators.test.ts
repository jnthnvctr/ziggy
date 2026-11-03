import { skills } from 'virtual:curriculum';
import { describe, expect, it } from 'vitest';
import { formatAnswer, checkAnswer, answerValue } from './answers';
import { compareSides, holds, tokensToText } from './expr';
import { generateTest } from './generate';
import { GENERATORS } from './generators';
import { numberWords } from './helpers';
import { add, rat } from './rational';
import { createRng } from './rng';
import type { Answer, Generator, Problem, Token } from './types';

/** Every grade's generators are written; a new skill without one fails here. */
const GRADES_DONE = new Set(['K', '1', '2', '3', '4', '5']);
const SAMPLES = 3000;

const sample = (gen: Generator, seed: string, n = SAMPLES): Problem[] => {
  const rng = createRng(seed);
  return Array.from({ length: n }, () => gen(rng));
};

const numbers = (tokens: readonly Token[]) =>
  tokens.filter((t): t is Extract<Token, { t: 'num' }> => t.t === 'num').map((t) => t.v.n / t.v.d);

const blanks = (tokens: readonly Token[]) => tokens.filter((t) => t.t === 'blank').length;

describe('generator coverage', () => {
  it('every skill in a finished grade has a generator', () => {
    const missing = skills.filter((s) => GRADES_DONE.has(s.grade) && !GENERATORS[s.generator]);
    expect(missing.map((s) => `${s.id} → ${s.generator}`)).toEqual([]);
  });

  it('every generator is used by some skill', () => {
    const used = new Set(skills.map((s) => s.generator));
    expect(Object.keys(GENERATORS).filter((g) => !used.has(g))).toEqual([]);
  });
});

/**
 * Generic properties every generated problem must satisfy. The answer is checked
 * independently by substituting it into the model equation.
 */
describe.each(skills.filter((s) => GENERATORS[s.generator]).map((s) => [s.id, s] as const))(
  '%s',
  (_id, skill) => {
    const gen = GENERATORS[skill.generator] as Generator;
    const problems = sample(gen, skill.id);

    it(`answers are "${skill.answer}" and verified against the model`, () => {
      for (const p of problems) {
        expect(p.instruction.length, p.key).toBeGreaterThan(0);
        expect(p.answer.type, p.key).toBe(skill.answer);
        // The canonical answer is accepted by the checker.
        expect(checkAnswer(p.answer, formatAnswer(p.answer)).status, p.key).toBe('correct');
        verify(p);
      }
    });

    it('equation blocks are well formed', () => {
      for (const p of problems) {
        for (const b of p.blocks) {
          if (b.kind === 'equation') expect(() => tokensToText(b.tokens), p.key).not.toThrow();
          if (b.kind === 'equation' && p.answer.type !== 'choice')
            expect(blanks(b.tokens), p.key).toBe(1);
        }
      }
    });

    it(`a ${skill.testLength}-problem test never repeats back to back`, () => {
      const test = generateTest(gen, `${skill.id}/test`, skill.testLength);
      expect(test).toHaveLength(skill.testLength);
      for (let i = 1; i < test.length; i++) expect(test[i]!.key).not.toBe(test[i - 1]!.key);
    });
  },
);

function verify(p: Problem) {
  const a = p.answer;
  if (a.type === 'choice') {
    expect(
      a.choices.some((c) => c.id === a.correct),
      p.key,
    ).toBe(true);
    expect(new Set(a.choices.map((c) => c.id)).size, p.key).toBe(a.choices.length);
    // True/false statements are checked against their model.
    if (p.model && blanks(p.model) === 0)
      expect(holds(p.model) ? 'true' : 'false', p.key).toBe(a.correct);
    return;
  }
  expect(p.model, `${p.key}: numeric problems need a model`).toBeDefined();
  const model = p.model as Token[];
  if (a.type === 'comparison') {
    expect(compareSides(model), p.key).toBe(a.value);
    return;
  }
  if (a.type === 'integer') expect(a.value >= 0 && Number.isSafeInteger(a.value), p.key).toBe(true);
  const v = answerValue(a);
  if (v) {
    expect(
      holds(model, v),
      `${p.key}: answer ${formatAnswer(a)} doesn't satisfy ${tokensToText(model)}`,
    ).toBe(true);
    expect(holds(model, add(v, rat(1))), `${p.key}: model also holds for answer + 1`).toBe(false);
  }
}

// ---------------------------------------------------------------- skill-specific constraints (from skill notes)

const gen = (name: string) => GENERATORS[name] as Generator;
const eqNums = (p: Problem) =>
  numbers((p.blocks.find((b) => b.kind === 'equation') as { tokens: Token[] }).tokens);
const intOf = (a: Answer) => (a.type === 'integer' ? a.value : NaN);

describe('kindergarten constraints', () => {
  it('pick numeral: read-aloud matches the right choice; 4 distinct options', () => {
    for (const [name, lo, hi] of [
      ['pickNumeralTo10', 0, 10],
      ['pickNumeralTo20', 11, 20],
    ] as const) {
      for (const p of sample(gen(name), name, 500)) {
        const a = p.answer as Extract<Answer, { type: 'choice' }>;
        const listen = p.blocks.find((b) => b.kind === 'listen') as { text: string };
        expect(listen.text).toBe(numberWords(Number(a.correct)));
        expect(Number(a.correct)).toBeGreaterThanOrEqual(lo);
        expect(Number(a.correct)).toBeLessThanOrEqual(hi);
        expect(new Set(a.choices.map((c) => c.label)).size).toBe(4);
      }
    }
  });

  it('counting skills stay in range and match the picture', () => {
    for (const [name, lo, hi] of [
      ['countObjectsTo10', 1, 10],
      ['countScatteredTo10', 1, 10],
      ['countObjectsTo20', 11, 20],
    ] as const) {
      for (const p of sample(gen(name), name, 500)) {
        const obj = p.blocks.find((b) => b.kind === 'objects') as { count: number; layout: string };
        expect(intOf(p.answer)).toBe(obj.count);
        expect(obj.count).toBeGreaterThanOrEqual(lo);
        expect(obj.count).toBeLessThanOrEqual(hi);
        expect(obj.layout === 'scattered').toBe(name === 'countScatteredTo10');
      }
    }
  });

  it('compare groups and numbers pick the right answer', () => {
    for (const p of sample(gen('compareGroups'), 'cg', 500)) {
      const g = p.blocks[0] as { left: number; right: number };
      const a = p.answer as Extract<Answer, { type: 'choice' }>;
      expect(a.correct).toBe(g.left === g.right ? 'same' : g.left > g.right ? 'left' : 'right');
    }
    for (const p of sample(gen('compareTo10'), 'c10', 500)) {
      const a = p.answer as Extract<Answer, { type: 'choice' }>;
      const [x, y] = ['a', 'b'].map((id) => Number(a.choices.find((c) => c.id === id)!.label)) as [
        number,
        number,
      ];
      expect(a.correct).toBe(x === y ? 'same' : x > y ? 'a' : 'b');
    }
  });

  it('add and subtract within 5 and 10 stay in range', () => {
    for (const [name, max] of [
      ['addWithin5', 5],
      ['subWithin5', 5],
      ['addWithin10', 10],
      ['subWithin10', 10],
    ] as const) {
      for (const p of sample(gen(name), name, 500)) {
        for (const n of eqNums(p)) expect(n).toBeLessThanOrEqual(max);
        expect(intOf(p.answer)).toBeLessThanOrEqual(max);
      }
    }
  });

  it('make 10 and teen numbers show matching ten-frames', () => {
    for (const p of sample(gen('makeTen'), 'm10', 300)) {
      const tf = p.blocks[0] as { filled: number[] };
      expect(tf.filled[0]! + intOf(p.answer)).toBe(10);
    }
    for (const p of sample(gen('teenDecompose'), 'teen', 300)) {
      const tf = p.blocks[0] as { filled: number[] };
      expect(tf.filled[0]).toBe(10);
      expect(tf.filled[1]).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('grade 1 constraints', () => {
  it('make-ten addition: one addend is 7-9, sum 11-18', () => {
    for (const p of sample(gen('addBridgeTen'), 'b10', 500)) {
      const [a, b] = eqNums(p) as [number, number];
      expect([a, b].some((x) => x >= 7 && x <= 9)).toBe(true);
      expect(a + b).toBeGreaterThanOrEqual(11);
      expect(a + b).toBeLessThanOrEqual(18);
    }
  });

  it('subtract within 20: minuend 11-20, and most problems bridge back through 10', () => {
    let bridging = 0;
    const ps = sample(gen('subWithin20'), 's20', 1000);
    for (const p of ps) {
      const [m, s] = eqNums(p) as [number, number];
      expect(m).toBeGreaterThanOrEqual(11);
      expect(m).toBeLessThanOrEqual(20);
      if (s < 10 && s > m % 10) bridging++;
    }
    expect(bridging / ps.length).toBeGreaterThan(0.4);
  });

  it('add three numbers: sum <= 20, and usually includes a pair that makes 10', () => {
    let tens = 0;
    const ps = sample(gen('addThreeTo20'), 'a3', 1000);
    for (const p of ps) {
      const ns = eqNums(p) as [number, number, number];
      expect(ns[0] + ns[1] + ns[2]).toBeLessThanOrEqual(20);
      if (ns[0] + ns[1] === 10 || ns[1] + ns[2] === 10 || ns[0] + ns[2] === 10) tens++;
    }
    expect(tens / ps.length).toBeGreaterThan(0.5);
  });

  it('2-digit + 1-digit: regrouping only where the skill says', () => {
    for (const p of sample(gen('add2Digit1DigitNoRegroup'), 'nr', 500)) {
      const [x, y] = eqNums(p) as [number, number];
      expect((x % 10) + (y % 10)).toBeLessThanOrEqual(9);
    }
    for (const p of sample(gen('add2Digit1DigitRegroup'), 'r', 500)) {
      const [x, y] = eqNums(p) as [number, number];
      expect((x % 10) + (y % 10)).toBeGreaterThanOrEqual(10);
      expect(x + y).toBeLessThanOrEqual(100);
    }
  });

  it('adding and subtracting tens use multiples of 10', () => {
    for (const p of sample(gen('subtractTens'), 'st', 300))
      for (const n of eqNums(p)) expect(n % 10).toBe(0);
    for (const p of sample(gen('addTensTo2Digit'), 'at', 300)) {
      const [, b] = eqNums(p) as [number, number];
      expect(b % 10).toBe(0);
      expect(intOf(p.answer)).toBeLessThanOrEqual(99);
    }
  });

  it('start-unknown stories really have the unknown at the start', () => {
    for (const p of sample(gen('storyStartUnknown20'), 'su', 300))
      expect(p.model![0]!.t).toBe('blank');
  });

  it('compare two-digit numbers often uses same tens or swapped digits', () => {
    let tricky = 0;
    const ps = sample(gen('compare2Digit'), 'c2', 1000);
    for (const p of ps) {
      const [a, b] = numbers(p.model!) as [number, number];
      if (Math.floor(a / 10) === Math.floor(b / 10) || (a % 10) * 10 + Math.floor(a / 10) === b)
        tricky++;
    }
    expect(tricky / ps.length).toBeGreaterThan(0.4);
  });

  it('true/false is roughly balanced', () => {
    const ps = sample(gen('equalSignTrueFalse'), 'tf', 2000);
    const t =
      ps.filter((p) => (p.answer as { correct: string }).correct === 'true').length / ps.length;
    expect(t).toBeGreaterThan(0.4);
    expect(t).toBeLessThan(0.6);
  });
});
