import { useEffect, useMemo, useState } from 'react';
import { skills as loadedSkills } from 'virtual:curriculum';
import { GRADES, STRAND_NAMES, type Skill } from '../curriculum/types';
import {
  checkAnswer,
  formatAnswer,
  generateTest,
  GENERATORS,
  tokensToText,
  type CheckResult,
  type Problem,
} from '../engine';
import { BlockView } from './BlockView';
import s from './preview.module.css';

/** `#skill=<id>&seed=<seed>` so a test can be shared or reported exactly. */
function readHash(): { skill?: string; seed?: string } {
  const p = new URLSearchParams(location.hash.slice(1));
  const out: { skill?: string; seed?: string } = {};
  const skill = p.get('skill');
  const seed = p.get('seed');
  if (skill) out.skill = skill;
  if (seed) out.seed = seed;
  return out;
}

// The virtual module's declaration can't import types, so name the type here.
const skills: Skill[] = loadedSkills;

const newSeed = () => Math.random().toString(36).slice(2, 8);

export function Preview() {
  const initial = readHash();
  const available = skills.filter((k) => GENERATORS[k.generator]);
  const [skillId, setSkillId] = useState(initial.skill ?? available[0]?.id ?? '');
  const [seed, setSeed] = useState(initial.seed ?? newSeed());
  const [grade, setGrade] = useState<string>(skills.find((k) => k.id === skillId)?.grade ?? 'K');
  const [showAnswers, setShowAnswers] = useState(false);

  const skill = skills.find((k) => k.id === skillId);
  const generator = skill ? GENERATORS[skill.generator] : undefined;
  const problems = useMemo(
    () =>
      skill && generator ? generateTest(generator, `${skill.id}/${seed}`, skill.testLength) : [],
    [skill, generator, seed],
  );

  useEffect(() => {
    history.replaceState(
      null,
      '',
      `#skill=${encodeURIComponent(skillId)}&seed=${encodeURIComponent(seed)}`,
    );
  }, [skillId, seed]);

  const inGrade = skills.filter((k) => k.grade === grade);
  const doneCount = available.length;

  return (
    <div className={s.page}>
      <aside className={s.sidebar}>
        <h1 className={s.title}>Problem preview</h1>
        <p className={s.muted}>
          {doneCount} of {skills.length} skills have generators.
        </p>
        <div className={s.tabs} role="tablist" aria-label="Grade">
          {GRADES.map((g) => (
            <button
              key={g}
              type="button"
              role="tab"
              aria-selected={g === grade}
              className={g === grade ? s.tabOn : s.tab}
              onClick={() => setGrade(g)}
            >
              {g}
            </button>
          ))}
        </div>
        <ul className={s.skillList}>
          {inGrade.map((k) => (
            <li key={k.id}>
              <button
                type="button"
                className={k.id === skillId ? s.skillOn : s.skill}
                disabled={!GENERATORS[k.generator]}
                onClick={() => setSkillId(k.id)}
              >
                <span>{k.title}</span>
                <span className={s.muted}>
                  {k.standard} · {STRAND_NAMES[k.strand]}
                  {!GENERATORS[k.generator] && ' · not built yet'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <main className={s.main}>
        {skill ? <SkillHeader skill={skill} /> : <p>Pick a skill.</p>}
        <div className={s.controls}>
          <label>
            Seed{' '}
            <input value={seed} onChange={(e) => setSeed(e.target.value)} className={s.seedInput} />
          </label>
          <button type="button" className={s.button} onClick={() => setSeed(newSeed())}>
            New test
          </button>
          <label>
            <input
              type="checkbox"
              checked={showAnswers}
              onChange={(e) => setShowAnswers(e.target.checked)}
            />{' '}
            Show answers
          </label>
        </div>
        <ol className={s.problems}>
          {problems.map((p, i) => (
            <ProblemCard key={`${seed}-${i}`} p={p} showAnswer={showAnswers} />
          ))}
        </ol>
      </main>
    </div>
  );
}

function SkillHeader({ skill }: { skill: Skill }) {
  return (
    <header className={s.header}>
      <h2>{skill.title}</h2>
      <p className={s.muted}>
        {skill.id} · generator <code>{skill.generator}</code> · answer {skill.answer} · fluent at{' '}
        {skill.fluencyTargetSec}s · {skill.testLength} problems
      </p>
      {skill.notes && <p className={s.notes}>{skill.notes}</p>}
    </header>
  );
}

function ProblemCard({ p, showAnswer }: { p: Problem; showAnswer: boolean }) {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<CheckResult | null>(null);
  const submit = (value: string) => {
    setInput(value);
    setResult(checkAnswer(p.answer, value));
  };
  const a = p.answer;

  return (
    <li className={s.card}>
      <p className={s.instruction}>{p.instruction}</p>
      {p.blocks.map((b, i) => (
        <BlockView key={i} b={b} />
      ))}

      <div className={s.answerRow}>
        {a.type === 'choice' ? (
          a.choices.map((c) => (
            <button key={c.id} type="button" className={s.button} onClick={() => submit(c.id)}>
              {c.label}
            </button>
          ))
        ) : a.type === 'comparison' ? (
          (['<', '=', '>'] as const).map((op) => (
            <button key={op} type="button" className={s.button} onClick={() => submit(op)}>
              {op}
            </button>
          ))
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit(input);
            }}
          >
            <input
              aria-label="Your answer"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className={s.answerInput}
              inputMode="decimal"
            />
            <button type="submit" className={s.button}>
              Check
            </button>
          </form>
        )}
        {result && (
          <span
            className={
              result.status === 'correct' ? s.good : result.status === 'invalid' ? s.muted : s.bad
            }
          >
            {result.status === 'correct'
              ? 'Correct'
              : result.status === 'invalid'
                ? "Can't read that"
                : 'Not quite'}
            {result.hint ? ` · ${result.hint}` : ''}
          </span>
        )}
      </div>

      {showAnswer && (
        <p className={s.muted}>
          Answer: <strong>{formatAnswer(a)}</strong>
          {p.model && <> · model {tokensToText(p.model)}</>} · key {p.key}
        </p>
      )}
    </li>
  );
}
