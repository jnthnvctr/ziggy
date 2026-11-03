import {
  eq as ratEq,
  parseDecimal,
  rat,
  toDecimalString,
  toFractionString,
  toMixedString,
  type Rational,
} from './rational';
import type { Answer } from './types';

/**
 * - correct / incorrect: a real attempt.
 * - invalid: couldn't be read (e.g. "3/0", empty). The UI should ask again
 *   rather than mark it wrong.
 */
export type CheckStatus = 'correct' | 'incorrect' | 'invalid';

export interface CheckResult {
  status: CheckStatus;
  /** Short kid-friendly hint when the value is right but the form isn't ("Simplify it!"). */
  hint?: string;
}

const clean = (s: string) => s.trim().replace(/,/g, '').replace(/\s+/g, ' ');

function parseInteger(s: string): number | undefined {
  const t = clean(s);
  return /^\d+$/.test(t) ? Number(t) : undefined;
}

/** A typed fraction, keeping the form the kid used. */
interface FractionInput {
  value: Rational;
  whole: number;
  n: number;
  d: number;
  kind: 'whole' | 'fraction' | 'mixed';
}

function parseFractionInput(s: string): FractionInput | undefined {
  const t = clean(s);
  let m = /^(\d+) (\d+)\/(\d+)$/.exec(t);
  if (m) {
    const [w, n, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
    if (d === 0 || n >= d) return undefined; // "2 5/4" isn't a well-formed mixed number
    return { value: rat(w * d + n, d), whole: w, n, d, kind: 'mixed' };
  }
  m = /^(\d+)\/(\d+)$/.exec(t);
  if (m) {
    const [n, d] = [Number(m[1]), Number(m[2])];
    if (d === 0) return undefined;
    return { value: rat(n, d), whole: 0, n, d, kind: 'fraction' };
  }
  m = /^(\d+)$/.exec(t);
  if (m) return { value: rat(Number(m[1])), whole: Number(m[1]), n: 0, d: 1, kind: 'whole' };
  return undefined;
}

function gcd(a: number, b: number): number {
  while (b) [a, b] = [b, a % b];
  return a;
}

function checkFraction(
  answer: Extract<Answer, { type: 'fraction' | 'mixed-number' }>,
  input: string,
): CheckResult {
  const f = parseFractionInput(input);
  if (!f) return { status: 'invalid' };
  if (!ratEq(f.value, answer.value)) return { status: 'incorrect' };
  const form = answer.form ?? 'any';
  const exact = answer.type === 'fraction' ? answer.exact : undefined;
  if (form === 'exact' && exact) {
    return f.kind === 'fraction' && f.n === exact.n && f.d === exact.d
      ? { status: 'correct' }
      : { status: 'incorrect', hint: `Write it as __/${exact.d}.` };
  }
  if (form === 'simplest' && f.kind !== 'whole' && gcd(f.n, f.d) !== 1) {
    return { status: 'incorrect', hint: 'Right value. Now simplify it!' };
  }
  if (form === 'simplest' && f.kind === 'fraction' && answer.value.d === 1) {
    return { status: 'incorrect', hint: 'Right value. Write it as a whole number.' };
  }
  const isWhole = answer.value.d === 1;
  const improper = answer.value.n > answer.value.d;
  if (form === 'mixed' && improper && !isWhole && f.kind !== 'mixed') {
    return { status: 'incorrect', hint: 'Right value. Write it as a mixed number.' };
  }
  if (form === 'improper' && f.kind === 'mixed') {
    return { status: 'incorrect', hint: 'Right value. Write it as a fraction.' };
  }
  return { status: 'correct' };
}

/** Check a kid's typed response against the answer. All responses are strings from the keypad. */
export function checkAnswer(answer: Answer, input: string): CheckResult {
  switch (answer.type) {
    case 'integer': {
      const v = parseInteger(input);
      if (v === undefined) return { status: 'invalid' };
      return { status: v === answer.value ? 'correct' : 'incorrect' };
    }
    case 'decimal': {
      const v = parseDecimal(clean(input));
      if (!v) return { status: 'invalid' };
      return { status: ratEq(v, answer.value) ? 'correct' : 'incorrect' };
    }
    case 'fraction':
    case 'mixed-number':
      return checkFraction(answer, input);
    case 'comparison': {
      const t = clean(input);
      if (t !== '<' && t !== '=' && t !== '>') return { status: 'invalid' };
      return { status: t === answer.value ? 'correct' : 'incorrect' };
    }
    case 'choice': {
      const t = clean(input);
      if (!answer.choices.some((c) => c.id === t)) return { status: 'invalid' };
      return { status: t === answer.correct ? 'correct' : 'incorrect' };
    }
    case 'quotient-remainder': {
      const t = clean(input).toUpperCase();
      const m = /^(\d+)(?: ?R ?(\d+))?$/.exec(t);
      if (!m) return { status: 'invalid' };
      const q = Number(m[1]);
      const r = m[2] === undefined ? 0 : Number(m[2]);
      return { status: q === answer.quotient && r === answer.remainder ? 'correct' : 'incorrect' };
    }
  }
}

/** The canonical correct response, as the kid would type it. Shown after a miss. */
export function formatAnswer(answer: Answer): string {
  switch (answer.type) {
    case 'integer':
      return String(answer.value);
    case 'decimal':
      return toDecimalString(answer.value);
    case 'fraction':
      if (answer.form === 'exact' && answer.exact) return `${answer.exact.n}/${answer.exact.d}`;
      return toFractionString(answer.value);
    case 'mixed-number':
      return answer.form === 'improper'
        ? toFractionString(answer.value)
        : toMixedString(answer.value);
    case 'comparison':
      return answer.value;
    case 'choice':
      return answer.correct;
    case 'quotient-remainder':
      return answer.remainder
        ? `${answer.quotient} R ${answer.remainder}`
        : String(answer.quotient);
  }
}

/** Numeric value of an answer, for substituting into a model equation. */
export function answerValue(answer: Answer): Rational | undefined {
  switch (answer.type) {
    case 'integer':
      return rat(answer.value);
    case 'decimal':
    case 'fraction':
    case 'mixed-number':
      return answer.value;
    default:
      return undefined;
  }
}
