/** Grade levels covered in v1. */
export const GRADES = ['K', '1', '2', '3', '4', '5'] as const;
export type GradeId = (typeof GRADES)[number];

/** Common Core domains ("strands"). */
export const STRANDS = ['CC', 'OA', 'NBT', 'NF', 'MD', 'G'] as const;
export type Strand = (typeof STRANDS)[number];

export const STRAND_NAMES: Record<Strand, string> = {
  CC: 'Counting & Cardinality',
  OA: 'Operations & Algebraic Thinking',
  NBT: 'Number & Operations in Base Ten',
  NF: 'Fractions',
  MD: 'Measurement & Data',
  G: 'Geometry',
};

/** How a kid enters an answer, and how it is checked. */
export const ANSWER_TYPES = [
  'integer',
  'decimal',
  'fraction',
  'mixed-number',
  'comparison',
  'choice',
] as const;
export type AnswerType = (typeof ANSWER_TYPES)[number];

/** One fine-grained, testable skill, as used by the app. */
export interface Skill {
  /** `<standard>-<slug>`, e.g. `2.NBT.B.5-add-2digit-regroup`. Unique. */
  id: string;
  grade: GradeId;
  strand: Strand;
  /** Common Core standard code, e.g. `2.NBT.B.5`. Always the id's prefix. */
  standard: string;
  /** Kid-facing name, short enough for a map label. */
  title: string;
  /** Skill ids that must be mastered first. */
  prerequisites: string[];
  /** Name of the problem generator in src/engine (M2). */
  generator: string;
  answer: AnswerType;
  /** Per-problem median time (seconds) that counts as fluent. */
  fluencyTargetSec: number;
  /** Problems in a standard skill test. */
  testLength: number;
  /** Optional notes for contributors (not shown to kids). */
  notes?: string;
}
