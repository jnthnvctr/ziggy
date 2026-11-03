import { resolve } from 'node:path';
import type { Plugin } from 'vite';
import { formatErrors, validateCurriculum } from '../../src/curriculum/validate';
import { loadSkillFiles } from './load';

const VIRTUAL_ID = 'virtual:curriculum';
const RESOLVED_ID = '\0' + VIRTUAL_ID;

/**
 * Exposes the validated K-5 curriculum to the app as `import { skills } from 'virtual:curriculum'`.
 * Any invalid skill file fails the build (and shows the error overlay in dev).
 */
export function curriculumPlugin(dir = 'curriculum/k5'): Plugin {
  const absDir = resolve(dir);
  return {
    name: 'ziggy-curriculum',
    resolveId(id) {
      return id === VIRTUAL_ID ? RESOLVED_ID : undefined;
    },
    load(id) {
      if (id !== RESOLVED_ID) return undefined;
      const { files, parseErrors } = loadSkillFiles(absDir);
      const { skills, errors } = validateCurriculum(files);
      const all = [...parseErrors, ...errors];
      if (all.length) {
        throw new Error(`Curriculum has ${all.length} problem(s):\n${formatErrors(all)}`);
      }
      for (const f of files) this.addWatchFile(resolve(absDir, f.file));
      return `export const skills = ${JSON.stringify(skills)};`;
    },
    configureServer(server) {
      server.watcher.add(absDir);
      server.watcher.on('all', (_event, path) => {
        if (!path.startsWith(absDir)) return;
        const mod = server.moduleGraph.getModuleById(RESOLVED_ID);
        if (mod) server.reloadModule(mod);
      });
    },
  };
}
