# Problem engine

Turns a skill into fresh problems and checks kids' answers. Pure TypeScript, with no DOM and no network.

```ts
import { GENERATORS, generateTest, checkAnswer, formatAnswer } from './engine';

const test = generateTest(GENERATORS.add2DigitRegroup, 'any-seed', 20); // same seed → same test
checkAnswer(test[0].answer, '85'); // { status: 'correct' | 'incorrect' | 'invalid', hint? }
formatAnswer(test[0].answer); // "85", shown after a miss
```

## Pieces

| File          | What it does                                                                              |
| ------------- | ----------------------------------------------------------------------------------------- |
| `rng.ts`      | Seeded random numbers, so any test can be replayed from its seed.                         |
| `rational.ts` | Exact fractions and decimals: 0.1 + 0.2 is exactly 3/10, and 2/4 equals 1/2.              |
| `expr.ts`     | `eq('47 + 38 = __')` builds an equation; `holds()` checks it with the answer substituted. |
| `types.ts`    | The problem model: `instruction`, `blocks` (what to draw), `answer`, `model`, `key`.      |
| `answers.ts`  | Reads what a kid typed and checks it, including fraction forms (simplest, mixed, …).      |
| `generate.ts` | Builds a test from a generator with no repeats (and never two in a row).                  |
| `generators/` | One function per generator name used in `curriculum/k5/*.yaml`.                           |

## Writing a generator

A generator is `(rng) => Problem`. Most are a few lines:

```ts
export const addDoubles: Generator = (rng) => {
  const n = rng.int(1, 10);
  return arith('Add.', `${n} + ${n} = __`, 2 * n);
};
```

Rules:

1. **Use only `rng`** for randomness (never `Math.random`), so tests replay exactly.
2. **Every numeric problem has a `model`**, an equation with `__` where the answer goes. The tests substitute your answer into it. `arith()` does this for you. For stories and pictures, pass the equation behind the problem (`model: '5 + __ = 12'`).
3. **Follow the skill's `notes`.** They are the spec: number ranges, regrouping, zeros, which part is missing.
4. **Give a `key`** that identifies the problem (usually its equation), so a test doesn't repeat it.
5. In `text` and `story` blocks, `__` marks the answer box. Use `?` for any other unknown you show.
6. Register the generator by exporting it from a module listed in `generators/index.ts`.

## Tests

`generators.test.ts` runs every generator 3,000 times per skill and checks that:

- the answer has the skill's type and satisfies the model equation (and the answer + 1 doesn't),
- the checker accepts the canonical answer,
- equations have exactly one blank,
- a full-length test never repeats a problem back to back.

It also checks constraints taken from each skill's notes (ranges, regrouping, how often tricky cases appear). Add a constraint test whenever the notes ask for something specific.

To read sample problems for every skill:

```bash
ZIGGY_PRINT=1 npx vitest run tooling/engine/sample.test.ts --silent=false
```
