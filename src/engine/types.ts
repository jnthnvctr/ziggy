import type { Rational } from './rational';
import type { Rng } from './rng';

// ---------------------------------------------------------------- tokens

/** One piece of a written math expression. */
export type Token =
  | { t: 'num'; v: Rational } // whole numbers and decimals; shown as decimals
  | { t: 'frac'; n: number; d: number } // shown as a stacked fraction, exactly as given
  | { t: 'mixed'; w: number; n: number; d: number } // 2 3/4
  | { t: 'op'; v: '+' | '−' | '×' | '÷' }
  | { t: 'rel'; v: '=' | '<' | '>' } // relation between two sides
  | { t: 'paren'; v: '(' | ')' }
  | { t: 'blank' }; // where the answer goes

// ---------------------------------------------------------------- render model

/**
 * What to draw. The UI (M4) renders these; the engine never touches the DOM.
 * Visual blocks carry the numbers they depict, so they can be checked.
 */
export type Block =
  | { kind: 'equation'; tokens: Token[] }
  | { kind: 'vertical'; op: '+' | '−' | '×'; operands: number[] }
  | { kind: 'longDivision'; dividend: number; divisor: number }
  | { kind: 'sequence'; items: (number | null)[] } // null = blank
  | {
      kind: 'objects';
      count: number;
      layout: 'line' | 'array' | 'circle' | 'scattered';
      icon: string;
      seed: number;
    }
  | { kind: 'twoGroups'; left: number; right: number; icon: string; seed: number }
  | { kind: 'tenFrame'; filled: number[] } // one entry per frame, 0-10 dots each
  | { kind: 'baseTen'; hundreds: number; tens: number; ones: number }
  | { kind: 'story'; text: string }
  | { kind: 'listen'; text: string } // a play-sound button; text is spoken, not shown
  | { kind: 'text'; text: string };

export interface Choice {
  id: string;
  /** What the button shows. */
  label: string;
  /** What read-aloud says, if different from the label. */
  spoken?: string;
}

// ---------------------------------------------------------------- answers

/** Which fraction/mixed-number forms are accepted. Default 'any' = any equivalent form. */
export type FractionForm = 'any' | 'simplest' | 'exact' | 'mixed' | 'improper';

export type Answer =
  | { type: 'integer'; value: number }
  | { type: 'decimal'; value: Rational }
  | { type: 'fraction'; value: Rational; form?: FractionForm; exact?: { n: number; d: number } }
  | { type: 'mixed-number'; value: Rational; form?: FractionForm }
  | { type: 'comparison'; value: '<' | '=' | '>' }
  | { type: 'choice'; choices: Choice[]; correct: string }
  | { type: 'quotient-remainder'; quotient: number; remainder: number };

// ---------------------------------------------------------------- problems

export interface Problem {
  /** What the kid is asked, in words. Shown and read aloud. */
  instruction: string;
  blocks: Block[];
  answer: Answer;
  /**
   * The equation behind the problem, with a blank for the answer. Used to verify
   * the answer in tests and, later, to show a worked solution. Required unless the
   * answer is a choice or comparison that a generator-specific test verifies.
   */
  model?: Token[];
  /** Canonical identity, used to avoid repeats within a test. */
  key: string;
}

/** Produces a fresh problem for one skill from a random stream. */
export type Generator = (rng: Rng) => Problem;
