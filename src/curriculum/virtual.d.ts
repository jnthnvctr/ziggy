declare module 'virtual:curriculum' {
  import type { Skill } from './types';
  /** Every K-5 skill, validated at build time, prerequisites before dependents. */
  export const skills: Skill[];
}
