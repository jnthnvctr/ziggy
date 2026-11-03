/**
 * Exact rational numbers, so 0.1 + 0.2 is exactly 3/10 and 2/4 equals 1/2.
 * Always normalized: denominator > 0 and gcd(n, d) = 1.
 */
export interface Rational {
  readonly n: number;
  readonly d: number;
}

function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a;
}

function checkSafe(x: number): number {
  if (!Number.isSafeInteger(x)) throw new RangeError(`rational: ${x} is not a safe integer`);
  return x;
}

export function rat(n: number, d = 1): Rational {
  checkSafe(n);
  checkSafe(d);
  if (d === 0) throw new RangeError('rational: denominator is 0');
  if (d < 0) [n, d] = [-n, -d];
  const g = gcd(n, d) || 1;
  return { n: n / g + 0, d: d / g };
}

export const ZERO = rat(0);
export const ONE = rat(1);

export const add = (a: Rational, b: Rational) => rat(a.n * b.d + b.n * a.d, a.d * b.d);
export const sub = (a: Rational, b: Rational) => rat(a.n * b.d - b.n * a.d, a.d * b.d);
export const mul = (a: Rational, b: Rational) => rat(a.n * b.n, a.d * b.d);
export function div(a: Rational, b: Rational): Rational {
  if (b.n === 0) throw new RangeError('rational: division by zero');
  return rat(a.n * b.d, a.d * b.n);
}

export const cmp = (a: Rational, b: Rational) => Math.sign(a.n * b.d - b.n * a.d);
export const eq = (a: Rational, b: Rational) => a.n === b.n && a.d === b.d;
export const isInteger = (a: Rational) => a.d === 1;

/** Split into whole part and proper fraction (for non-negative values). */
export function toMixed(a: Rational): { whole: number; n: number; d: number } {
  const whole = Math.floor(a.n / a.d);
  return { whole, n: a.n - whole * a.d, d: a.d };
}

/** True if the decimal expansion terminates (denominator has only 2s and 5s). */
export function isTerminating(a: Rational): boolean {
  let d = a.d;
  while (d % 2 === 0) d /= 2;
  while (d % 5 === 0) d /= 5;
  return d === 1;
}

/** Exact decimal string, e.g. 7/100 → "0.07". Throws if it doesn't terminate. */
export function toDecimalString(a: Rational): string {
  if (!isTerminating(a)) throw new RangeError(`rational: ${a.n}/${a.d} has no finite decimal`);
  const neg = a.n < 0;
  let n = Math.abs(a.n);
  const whole = Math.floor(n / a.d);
  n -= whole * a.d;
  let digits = '';
  while (n !== 0) {
    n *= 10;
    digits += Math.floor(n / a.d);
    n %= a.d;
  }
  return (neg ? '-' : '') + String(whole) + (digits ? '.' + digits : '');
}

/** Parse "12", "0.07", ".5", "3.10" exactly. Returns undefined if not a plain decimal. */
export function parseDecimal(s: string): Rational | undefined {
  const m = /^(-)?(\d*)(?:\.(\d+))?$/.exec(s.trim());
  if (!m || (m[2] === '' && m[3] === undefined)) return undefined;
  const [, sign, intPart = '', frac = ''] = m;
  const n = Number((intPart || '0') + frac);
  const r = rat(n, 10 ** frac.length);
  return sign ? rat(-r.n, r.d) : r;
}

/** Display form: "3/4", "2", or "-1/2". */
export const toFractionString = (a: Rational) => (a.d === 1 ? String(a.n) : `${a.n}/${a.d}`);

/** Display form as a mixed number: "2 3/4", "3/4", "2". */
export function toMixedString(a: Rational): string {
  const { whole, n, d } = toMixed(a);
  if (n === 0) return String(whole);
  return whole === 0 ? `${n}/${d}` : `${whole} ${n}/${d}`;
}
