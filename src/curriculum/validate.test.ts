import { describe, expect, it } from 'vitest';
import { validateCurriculum, type RawSkillFile } from './validate';

function skill(id: string, overrides: Record<string, unknown> = {}): RawSkillFile {
  const m = /^(K|\d)\.([A-Z]+)\.([A-D])\.(\d+[a-f]?)-/.exec(id);
  const [, grade, strand, cluster, num] = m ?? [];
  return {
    file: `${id}.yaml`,
    data: {
      id,
      grade: grade === 'K' ? 'K' : Number(grade),
      strand,
      standard: `${grade}.${strand}.${cluster}.${num}`,
      title: 'A skill',
      prerequisites: [],
      generator: 'someGenerator',
      answer: 'integer',
      fluency_target_sec: 3,
      test_length: 20,
      ...overrides,
    },
  };
}

const messages = (files: RawSkillFile[]) => validateCurriculum(files).errors.map((e) => e.message);

describe('validateCurriculum', () => {
  it('accepts a valid curriculum and orders prerequisites first', () => {
    const { skills, errors } = validateCurriculum([
      skill('1.OA.C.6-add-within-20', { prerequisites: ['K.OA.A.5-add-within-5'] }),
      skill('K.OA.A.5-add-within-5'),
    ]);
    expect(errors).toEqual([]);
    expect(skills.map((s) => s.id)).toEqual(['K.OA.A.5-add-within-5', '1.OA.C.6-add-within-20']);
    expect(skills[1]).toMatchObject({ grade: '1', fluencyTargetSec: 3, testLength: 20 });
  });

  it('rejects malformed ids and file names that do not match', () => {
    expect(messages([{ ...skill('K.OA.A.5-add'), file: 'wrong.yaml' }])).toContain(
      'file name must be "K.OA.A.5-add.yaml"',
    );
    expect(messages([skill('K.OA.A.5-add', { id: 'add-within-5' })]).join()).toMatch(
      /must look like/,
    );
  });

  it('checks grade, strand and standard agree with the id', () => {
    const errs = messages([
      skill('2.NBT.B.5-add', { grade: 3, strand: 'OA', standard: '2.NBT.B.6' }),
    ]);
    expect(errs.join('\n')).toMatch(/"grade" 3 doesn't match/);
    expect(errs.join('\n')).toMatch(/"strand" OA doesn't match/);
    expect(errs.join('\n')).toMatch(/"standard" 2.NBT.B.6 doesn't match/);
  });

  it('flags unknown fields, bad answer types and out-of-range numbers', () => {
    const errs = messages([
      skill('K.OA.A.5-add', {
        fluency: 3,
        answer: 'number',
        fluency_target_sec: 0,
        test_length: 2.5,
      }),
    ]).join('\n');
    expect(errs).toMatch(/unknown field "fluency"/);
    expect(errs).toMatch(/"answer" must be one of/);
    expect(errs).toMatch(/fluency_target_sec/);
    expect(errs).toMatch(/test_length/);
  });

  it('flags overlong titles', () => {
    expect(messages([skill('K.OA.A.5-add', { title: 'x'.repeat(60) })]).join()).toMatch(
      /keep it to 48/,
    );
  });

  it('flags missing prerequisites and prerequisites from a later grade', () => {
    const errs = messages([
      skill('K.OA.A.5-add', { prerequisites: ['1.OA.C.6-add-20', 'K.CC.A.1-nope'] }),
      skill('1.OA.C.6-add-20'),
    ]).join('\n');
    expect(errs).toMatch(/"K.CC.A.1-nope" doesn't exist/);
    expect(errs).toMatch(/is grade 1, later than this skill's grade K/);
  });

  it('detects duplicate ids', () => {
    const a = skill('K.OA.A.5-add');
    expect(messages([a, { ...a, file: 'K.OA.A.5-add.yaml' }]).join()).toMatch(/duplicate id/);
  });

  it('detects prerequisite cycles and reports the loop', () => {
    const errs = messages([
      skill('K.OA.A.5-a', { prerequisites: ['K.OA.A.5-c'] }),
      skill('K.OA.A.5-b', { prerequisites: ['K.OA.A.5-a'] }),
      skill('K.OA.A.5-c', { prerequisites: ['K.OA.A.5-b'] }),
    ]);
    expect(errs.join()).toMatch(/prerequisite cycle: .*→.*→.*→/);
  });

  it('checks generators exist when a list is provided', () => {
    const { errors } = validateCurriculum([skill('K.OA.A.5-add')], {
      knownGenerators: new Set(['other']),
    });
    expect(errors[0]?.message).toMatch(/generator "someGenerator" doesn't exist/);
  });

  it('returns no skills when anything is invalid', () => {
    const { skills } = validateCurriculum([
      skill('K.OA.A.5-add'),
      skill('K.OA.A.5-bad', { answer: 'x' }),
    ]);
    expect(skills).toEqual([]);
  });
});
