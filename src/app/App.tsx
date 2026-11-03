import { skills } from 'virtual:curriculum';
import { GRADES } from './grades';
import styles from './App.module.css';

/** Placeholder home screen for M0. Replaced by the mastery map in M4. */
export function App() {
  const countByGrade = new Map<string, number>();
  for (const s of skills) countByGrade.set(s.grade, (countByGrade.get(s.grade) ?? 0) + 1);

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <ZiggyMark />
        <h1 className={styles.title}>Ziggy</h1>
        <p className={styles.tagline}>Climb the math mountain, one rung at a time.</p>
      </section>

      <ol className={styles.grades} aria-label="Grades">
        {GRADES.map((g, i) => (
          <li key={g.id} className={styles.grade} style={{ ['--hue' as string]: String(i * 48) }}>
            <span className={styles.gradeLabel}>{g.short}</span>
            <span className={styles.gradeText}>
              <span className={styles.gradeName}>{g.name}</span>
              <span className={styles.gradeCount}>{countByGrade.get(g.id) ?? 0} skills</span>
            </span>
          </li>
        ))}
      </ol>

      <p className={styles.note}>
        Under construction. Free and open source, and we collect nothing — your progress stays on
        this device.
      </p>
    </main>
  );
}

/** Temporary mark until character design lands (M6). */
function ZiggyMark() {
  return (
    <svg className={styles.mark} viewBox="0 0 120 120" role="img" aria-label="Ziggy logo">
      <circle cx="60" cy="60" r="56" fill="var(--sun)" />
      <path
        d="M34 38h52L36 82h50"
        fill="none"
        stroke="var(--ink)"
        strokeWidth="12"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
