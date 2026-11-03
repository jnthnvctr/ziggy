import { skills } from 'virtual:curriculum';
import { it } from 'vitest';
import { formatAnswer, generateTest, GENERATORS, tokensToText } from '../../src/engine';
import type { Block } from '../../src/engine';

const show = (b: Block) =>
  b.kind === 'equation'
    ? tokensToText(b.tokens)
    : b.kind === 'sequence'
      ? b.items.map((x) => x ?? '__').join(', ')
      : b.kind === 'story' || b.kind === 'text'
        ? b.text
        : b.kind === 'listen'
          ? `[hear: ${b.text}]`
          : `[${b.kind} ${JSON.stringify({ ...b, kind: undefined, seed: undefined })}]`;

it.skipIf(!process.env.ZIGGY_PRINT)('print samples', () => {
  for (const s of skills) {
    const g = GENERATORS[s.generator];
    if (!g) continue;
    console.log(`\n## ${s.id} — ${s.title}`);
    for (const p of generateTest(g, s.id, 3)) {
      const opts =
        p.answer.type === 'choice' ? ` {${p.answer.choices.map((c) => c.label).join(' | ')}}` : '';
      console.log(
        `  ${p.instruction}  ${p.blocks.map(show).join('  ')}${opts}  →  ${formatAnswer(p.answer)}`,
      );
    }
  }
});
