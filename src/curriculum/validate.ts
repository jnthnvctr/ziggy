import {
  ANSWER_TYPES,
  GRADES,
  STRANDS,
  type AnswerType,
  type GradeId,
  type Skill,
  type Strand,
} from './types';

/** A skill file as read from disk, before validation. */
export interface RawSkillFile {
  /** File name, e.g. `2.NBT.B.5-add-2digit-regroup.yaml`. */
  file: string;
  data: unknown;
}

export interface ValidationError {
  file: string;
  message: string;
}

export interface ValidationResult {
  /** Valid skills in dependency order (prerequisites first), then by grade. */
  skills: Skill[];
  errors: ValidationError[];
}

export interface ValidateOptions {
  /** If given, every skill's `generator` must be one of these (enabled in M2). */
  knownGenerators?: ReadonlySet<string>;
}

// `<grade>.<strand>.<cluster>.<number>[letter]-<slug>`, e.g. 3.OA.C.7-mult-facts-6to9
const ID_PATTERN =
  /^(K|[1-5])\.(CC|OA|NBT|NF|MD|G)\.([A-D])\.(\d{1,2}[a-f]?)-([a-z0-9]+(?:-[a-z0-9]+)*)$/;
const GENERATOR_PATTERN = /^[a-z][A-Za-z0-9]*$/;
const ALLOWED_KEYS = new Set([
  'id',
  'grade',
  'strand',
  'standard',
  'title',
  'prerequisites',
  'generator',
  'answer',
  'fluency_target_sec',
  'test_length',
  'notes',
]);
const TITLE_MAX = 48;

const gradeIndex = (g: GradeId) => GRADES.indexOf(g);

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function normalizeGrade(v: unknown): GradeId | undefined {
  const s = typeof v === 'number' ? String(v) : v;
  return typeof s === 'string' && (GRADES as readonly string[]).includes(s)
    ? (s as GradeId)
    : undefined;
}

/** Check one file's shape and internal consistency. Returns a Skill or pushes errors. */
function validateOne(raw: RawSkillFile, errors: ValidationError[]): Skill | undefined {
  const err = (message: string) => errors.push({ file: raw.file, message });
  const d = raw.data;
  if (!isRecord(d)) {
    err('file must contain a YAML mapping (key: value pairs)');
    return undefined;
  }
  const before = errors.length;

  for (const key of Object.keys(d)) {
    if (!ALLOWED_KEYS.has(key)) err(`unknown field "${key}"`);
  }

  const id = d.id;
  let idMatch: RegExpExecArray | null = null;
  if (typeof id !== 'string') err('"id" is required and must be text');
  else {
    idMatch = ID_PATTERN.exec(id);
    if (!idMatch)
      err(
        `"id" "${id}" must look like <grade>.<strand>.<cluster>.<number>-<slug>, e.g. 2.NBT.B.5-add-2digit-regroup`,
      );
    if (raw.file !== `${id}.yaml`) err(`file name must be "${id}.yaml"`);
  }

  const grade = normalizeGrade(d.grade);
  if (!grade) err(`"grade" must be one of ${GRADES.join(', ')}`);

  const strand = d.strand;
  if (typeof strand !== 'string' || !(STRANDS as readonly string[]).includes(strand))
    err(`"strand" must be one of ${STRANDS.join(', ')}`);

  const standard = d.standard;
  if (typeof standard !== 'string') err('"standard" is required, e.g. 2.NBT.B.5');

  if (idMatch) {
    const [, idGrade, idStrand, cluster, num] = idMatch;
    if (grade && grade !== idGrade) err(`"grade" ${grade} doesn't match the id (${idGrade})`);
    if (typeof strand === 'string' && strand !== idStrand)
      err(`"strand" ${strand} doesn't match the id (${idStrand})`);
    const idStandard = `${idGrade}.${idStrand}.${cluster}.${num}`;
    if (typeof standard === 'string' && standard !== idStandard)
      err(`"standard" ${standard} doesn't match the id (${idStandard})`);
  }

  const title = d.title;
  if (typeof title !== 'string' || title.trim() === '') err('"title" is required');
  else if (title.length > TITLE_MAX)
    err(`"title" is ${title.length} characters; keep it to ${TITLE_MAX} so it fits on the map`);

  const prereqs = d.prerequisites ?? [];
  if (!Array.isArray(prereqs) || !prereqs.every((p) => typeof p === 'string'))
    err('"prerequisites" must be a list of skill ids (use [] for none)');
  else if (typeof id === 'string' && prereqs.includes(id))
    err('a skill cannot be its own prerequisite');
  else if (new Set(prereqs).size !== prereqs.length)
    err('"prerequisites" lists the same skill twice');

  const generator = d.generator;
  if (typeof generator !== 'string' || !GENERATOR_PATTERN.test(generator))
    err('"generator" must be a camelCase name, e.g. add2DigitRegroup');

  const answer = d.answer;
  if (typeof answer !== 'string' || !(ANSWER_TYPES as readonly string[]).includes(answer))
    err(`"answer" must be one of ${ANSWER_TYPES.join(', ')}`);

  const fluency = d.fluency_target_sec;
  if (typeof fluency !== 'number' || !Number.isFinite(fluency) || fluency < 0.5 || fluency > 120)
    err('"fluency_target_sec" must be a number of seconds between 0.5 and 120');

  const testLength = d.test_length;
  if (!Number.isInteger(testLength) || (testLength as number) < 5 || (testLength as number) > 40)
    err('"test_length" must be a whole number between 5 and 40');

  const notes = d.notes;
  if (notes !== undefined && typeof notes !== 'string') err('"notes" must be text');

  if (errors.length > before) return undefined;

  const skill: Skill = {
    id: id as string,
    grade: grade as GradeId,
    strand: strand as Strand,
    standard: standard as string,
    title: (title as string).trim(),
    prerequisites: prereqs as string[],
    generator: generator as string,
    answer: answer as AnswerType,
    fluencyTargetSec: fluency as number,
    testLength: testLength as number,
  };
  if (typeof notes === 'string') skill.notes = notes;
  return skill;
}

/**
 * Validate a whole curriculum: each file's shape, unique ids, prerequisites
 * that exist and come from the same or an earlier grade, and no cycles.
 */
export function validateCurriculum(
  files: readonly RawSkillFile[],
  options: ValidateOptions = {},
): ValidationResult {
  const errors: ValidationError[] = [];
  const byId = new Map<string, { skill: Skill; file: string }>();

  for (const raw of files) {
    const skill = validateOne(raw, errors);
    if (!skill) continue;
    const existing = byId.get(skill.id);
    if (existing) {
      errors.push({
        file: raw.file,
        message: `duplicate id "${skill.id}" (also in ${existing.file})`,
      });
      continue;
    }
    byId.set(skill.id, { skill, file: raw.file });
  }

  for (const { skill, file } of byId.values()) {
    for (const p of skill.prerequisites) {
      const pre = byId.get(p);
      if (!pre) {
        errors.push({ file, message: `prerequisite "${p}" doesn't exist` });
      } else if (gradeIndex(pre.skill.grade) > gradeIndex(skill.grade)) {
        errors.push({
          file,
          message: `prerequisite "${p}" is grade ${pre.skill.grade}, later than this skill's grade ${skill.grade}`,
        });
      }
    }
    if (options.knownGenerators && !options.knownGenerators.has(skill.generator)) {
      errors.push({ file, message: `generator "${skill.generator}" doesn't exist in src/engine` });
    }
  }

  // Cycle detection + topological order (DFS; prerequisites first).
  const ordered: Skill[] = [];
  const state = new Map<string, 'visiting' | 'done'>();
  const ids = [...byId.keys()].sort((a, b) => {
    const ga = gradeIndex(byId.get(a)!.skill.grade);
    const gb = gradeIndex(byId.get(b)!.skill.grade);
    return ga - gb || a.localeCompare(b);
  });
  const visit = (id: string, path: string[]): void => {
    const s = state.get(id);
    if (s === 'done') return;
    if (s === 'visiting') {
      const cycle = [...path.slice(path.indexOf(id)), id];
      errors.push({
        file: byId.get(id)!.file,
        message: `prerequisite cycle: ${cycle.join(' → ')}`,
      });
      return;
    }
    state.set(id, 'visiting');
    for (const p of byId.get(id)!.skill.prerequisites) {
      if (byId.has(p)) visit(p, [...path, id]);
    }
    state.set(id, 'done');
    ordered.push(byId.get(id)!.skill);
  };
  for (const id of ids) visit(id, []);

  return { skills: errors.length ? [] : ordered, errors };
}

/** Human-readable error report, one line per problem. */
export function formatErrors(errors: readonly ValidationError[]): string {
  return errors.map((e) => `  ${e.file}: ${e.message}`).join('\n');
}
