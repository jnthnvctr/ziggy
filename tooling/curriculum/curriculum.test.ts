import { describe, expect, it } from 'vitest';
import { formatErrors, validateCurriculum } from '../../src/curriculum/validate';
import { loadSkillFiles } from './load';

// Validates the real curriculum on every `npm test` (and so in CI).
describe('curriculum/k5', () => {
  it('has no invalid skill files', () => {
    const { files, parseErrors } = loadSkillFiles('curriculum/k5');
    const { errors } = validateCurriculum(files);
    const all = [...parseErrors, ...errors];
    expect(all, `\n${formatErrors(all)}`).toEqual([]);
    expect(files.length).toBeGreaterThan(0);
  });
});
