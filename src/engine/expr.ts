import {
  add,
  cmp,
  div,
  mul,
  rat,
  sub,
  toDecimalString,
  parseDecimal,
  type Rational,
} from './rational';
import type { Token } from './types';

const TOKEN_RE = /__|\d+_\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?|[+\-−×x*÷=<>()]/g;

/**
 * Author-friendly expression parser: `eq('47 + 38 = __')`.
 * Numbers: `12`, `0.07`; fractions: `3/4`; mixed numbers: `2_3/4`; blank: `__`.
 * Operators: + - − × x * ÷; relations: = < >; parentheses.
 */
export function eq(src: string): Token[] {
  const out: Token[] = [];
  const pieces = src.match(TOKEN_RE) ?? [];
  if (pieces.join('') !== src.replace(/\s+/g, '')) {
    throw new SyntaxError(`eq: can't parse "${src}"`);
  }
  for (const p of pieces) {
    if (p === '__') out.push({ t: 'blank' });
    else if (p === '+') out.push({ t: 'op', v: '+' });
    else if (p === '-' || p === '−') out.push({ t: 'op', v: '−' });
    else if (p === 'x' || p === '×' || p === '*') out.push({ t: 'op', v: '×' });
    else if (p === '÷') out.push({ t: 'op', v: '÷' });
    else if (p === '=' || p === '<' || p === '>') out.push({ t: 'rel', v: p });
    else if (p === '(' || p === ')') out.push({ t: 'paren', v: p });
    else if (p.includes('_')) {
      const [w, nd] = p.split('_') as [string, string];
      const [n, d] = nd.split('/').map(Number) as [number, number];
      out.push({ t: 'mixed', w: Number(w), n, d });
    } else if (p.includes('/')) {
      const [n, d] = p.split('/').map(Number) as [number, number];
      out.push({ t: 'frac', n, d });
    } else out.push({ t: 'num', v: parseDecimal(p) as Rational });
  }
  return out;
}

/** Plain-text form, e.g. "47 + 38 = __". */
export function tokensToText(tokens: readonly Token[]): string {
  const parts: string[] = [];
  for (const tk of tokens) {
    if (tk.t === 'num') parts.push(toDecimalString(tk.v));
    else if (tk.t === 'frac') parts.push(`${tk.n}/${tk.d}`);
    else if (tk.t === 'mixed') parts.push(`${tk.w} ${tk.n}/${tk.d}`);
    else if (tk.t === 'blank') parts.push('__');
    else parts.push(tk.v);
  }
  return parts.join(' ').replace(/\( /g, '(').replace(/ \)/g, ')');
}

const PREC: Record<string, number> = { '+': 1, '−': 1, '×': 2, '÷': 2 };

function apply(op: string, a: Rational, b: Rational): Rational {
  switch (op) {
    case '+':
      return add(a, b);
    case '−':
      return sub(a, b);
    case '×':
      return mul(a, b);
    default:
      return div(a, b);
  }
}

/** Evaluate one side (no relations), substituting `blank` for any blank token. */
function evalSide(tokens: readonly Token[], blank: Rational | undefined): Rational {
  const vals: Rational[] = [];
  const ops: string[] = [];
  const reduce = () => {
    const op = ops.pop() as string;
    const b = vals.pop();
    const a = vals.pop();
    if (!a || !b) throw new SyntaxError('expr: malformed expression');
    vals.push(apply(op, a, b));
  };
  for (const tk of tokens) {
    if (tk.t === 'num') vals.push(tk.v);
    else if (tk.t === 'frac') vals.push(rat(tk.n, tk.d));
    else if (tk.t === 'mixed') vals.push(rat(tk.w * tk.d + tk.n, tk.d));
    else if (tk.t === 'blank') {
      if (!blank) throw new SyntaxError('expr: blank with no value');
      vals.push(blank);
    } else if (tk.t === 'paren' && tk.v === '(') ops.push('(');
    else if (tk.t === 'paren') {
      while (ops.length && ops[ops.length - 1] !== '(') reduce();
      if (ops.pop() !== '(') throw new SyntaxError('expr: unbalanced )');
    } else if (tk.t === 'op') {
      while (
        ops.length &&
        ops[ops.length - 1] !== '(' &&
        PREC[ops[ops.length - 1] as string]! >= PREC[tk.v]!
      )
        reduce();
      ops.push(tk.v);
    } else throw new SyntaxError('expr: unexpected relation');
  }
  while (ops.length) {
    if (ops[ops.length - 1] === '(') throw new SyntaxError('expr: unbalanced (');
    reduce();
  }
  if (vals.length !== 1) throw new SyntaxError('expr: malformed expression');
  return vals[0] as Rational;
}

/** Split on relations: `a = b < c` → sides [a, b, c] and relations ['=', '<']. */
function splitSides(tokens: readonly Token[]) {
  const sides: Token[][] = [[]];
  const rels: string[] = [];
  for (const tk of tokens) {
    if (tk.t === 'rel') {
      rels.push(tk.v);
      sides.push([]);
    } else (sides[sides.length - 1] as Token[]).push(tk);
  }
  return { sides, rels };
}

/** Evaluate each side of a relation chain. */
export function evaluateSides(tokens: readonly Token[], blank?: Rational): Rational[] {
  return splitSides(tokens).sides.map((s) => evalSide(s, blank));
}

/** `left __ right`, where the blank is the <, = or > the kid chooses. */
export function comparisonTokens(left: string, right: string): Token[] {
  return [...eq(left), { t: 'blank' }, ...eq(right)];
}

/** For a comparison model (`left __ right`), the relation that makes it true. */
export function compareSides(tokens: readonly Token[]): '<' | '=' | '>' {
  const i = tokens.findIndex((tk) => tk.t === 'blank');
  if (i < 0) throw new SyntaxError('expr: comparison needs a blank');
  const c = cmp(evalSide(tokens.slice(0, i), undefined), evalSide(tokens.slice(i + 1), undefined));
  return c < 0 ? '<' : c > 0 ? '>' : '=';
}

/** Does the statement hold with `blank` substituted? (`3 + __ = 7` holds for 4.) */
export function holds(tokens: readonly Token[], blank?: Rational): boolean {
  const { sides, rels } = splitSides(tokens);
  if (rels.length === 0) throw new SyntaxError('expr: no relation to check');
  const vals = sides.map((s) => evalSide(s, blank));
  return rels.every((r, i) => {
    const c = cmp(vals[i] as Rational, vals[i + 1] as Rational);
    return r === '=' ? c === 0 : r === '<' ? c < 0 : c > 0;
  });
}
