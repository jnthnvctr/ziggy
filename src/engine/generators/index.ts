import type { Generator } from '../types';
import * as grade1 from './grade1';
import * as grade2 from './grade2';
import * as grade3 from './grade3';
import * as grade4 from './grade4';
import * as grade5 from './grade5';
import * as kindergarten from './kindergarten';

/**
 * Every generator, by the name skill files use in their `generator` field.
 * Add new grade modules here; names must be unique across modules.
 */
export const GENERATORS: Readonly<Record<string, Generator>> = merge(
  kindergarten,
  grade1,
  grade2,
  grade3,
  grade4,
  grade5,
);

function merge(...modules: Record<string, Generator>[]): Record<string, Generator> {
  const out: Record<string, Generator> = {};
  for (const m of modules) {
    for (const [name, gen] of Object.entries(m)) {
      if (name in out) throw new Error(`generator "${name}" is defined twice`);
      out[name] = gen;
    }
  }
  return out;
}
