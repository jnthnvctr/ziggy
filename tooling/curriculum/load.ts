import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import type { RawSkillFile } from '../../src/curriculum/validate';

/** Read every `*.yaml` skill file in a directory. Unparseable files are reported in `parseErrors`. */
export function loadSkillFiles(dir: string): {
  files: RawSkillFile[];
  parseErrors: { file: string; message: string }[];
} {
  const files: RawSkillFile[] = [];
  const parseErrors: { file: string; message: string }[] = [];
  for (const name of readdirSync(dir).sort()) {
    if (name.endsWith('.yml')) {
      parseErrors.push({ file: name, message: 'use the .yaml extension' });
      continue;
    }
    if (!name.endsWith('.yaml')) continue;
    const text = readFileSync(join(dir, name), 'utf8');
    try {
      files.push({ file: name, data: parse(text) });
    } catch (e) {
      parseErrors.push({
        file: name,
        message: `YAML error: ${(e as Error).message.split('\n')[0]}`,
      });
    }
  }
  return { files, parseErrors };
}
