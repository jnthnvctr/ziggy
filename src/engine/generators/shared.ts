import { eq, tokensToText } from '../expr';
import { int, problem } from '../helpers';
import type { Problem } from '../types';

// Helpers shared by grade modules. Not generators, so not registered.

/** "1 ten", "3 tens". */
export const unit = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** A vertical-format problem (stacked numbers), with its equation as the model. */
export function vertical(op: '+' | '−', operands: number[], answer: number): Problem {
  const src = `${operands.join(` ${op} `)} = __`;
  const model = eq(src);
  return problem({
    instruction: op === '+' ? 'Add.' : 'Subtract.',
    blocks: [{ kind: 'vertical', op, operands }],
    answer: int(answer),
    model,
    key: tokensToText(model),
  });
}

/** Round half up to the nearest `to`. */
export const roundTo = (n: number, to: number) => Math.floor((n + to / 2) / to) * to;
