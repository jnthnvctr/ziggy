# Ziggy — K–5 Diagnostic: Brief & Project Plan

*Product name: Ziggy. Not affiliated with Kumon (a registered trademark we don't use).*

## 1. The brief

**What:** A free, open-source web app that diagnoses a child's mastery of K–5 math through short, timed, auto-generated tests, and turns the results into a map they want to climb.

**Who:** Kids aged ~5–11, and the parent or teacher sitting next to them.

**Why:** School tests measure whether a kid *can* get the answer. Kumon and Direct Instruction showed that *automaticity* — getting it right quickly, without strain — is what lets kids move on without stalling later. Nobody offers a free, precise, fun diagnostic of that.

**V1 delivers:**
1. A K–5 skill map organized by grade and strand.
2. Timed tests for any skill, with fresh problems every attempt.
3. Scoring on accuracy and fluency (speed), with a per-skill mastery level.
4. An adaptive placement test that finds a kid's frontier.
5. A mastery map, stickers, personal bests and a character — a reason to come back.

**Not in V1:** lessons, reading, grades 6–12, flexibility/transfer scoring (designed for, built in V2), accounts, multiplayer, classroom dashboards.

## 2. Principles

- **No data collection.** No accounts, no analytics, no cookies, no third-party scripts, no server. Progress lives in the browser (`localStorage`) and can be exported/imported as a file. This keeps us outside COPPA's scope and makes the privacy story one sentence long.
- **Static site.** Deployed to GitHub Pages. Fonts and assets self-hosted.
- **Curriculum is data.** One file per skill; contributors can add skills without touching UI code.
- **Problems are generated and verified by code.** No hand-written banks to memorize; every answer is checked exactly.
- **Accuracy first, then speed.** Timers are visible but never punish a kid who is still learning a skill.
- **Rewards track real competence.** No loot boxes, no streaks that punish a missed day.

## 3. Curriculum scope (K–5)

Based on Common Core domains. Skill IDs extend standard codes, e.g. `3.OA.C.7-mult-facts-6to9`.

| Strand | Grades | V1 priority |
|---|---|---|
| Counting & Cardinality (CC) | K | P0 |
| Operations & Algebraic Thinking (OA) — facts, properties, patterns | K–5 | P0 |
| Number & Operations in Base Ten (NBT) — place value, multi-digit ops | K–5 | P0 |
| Number & Operations — Fractions (NF) | 3–5 | P0 |
| Measurement & Data (MD) — time, money, area, conversions | K–5 | P1 (needs visuals) |
| Geometry (G) | K–5 | P2 (needs visuals/interaction) |

Expect roughly 120–180 fine-grained skills across K–5; P0 strands are about two-thirds of that.

**Skill file (`curriculum/k5/<id>.yaml`):**
```yaml
id: 2.NBT.B.5-add-2digit-regroup
grade: 2
strand: NBT
title: Add two-digit numbers with regrouping
standard: 2.NBT.B.5
prerequisites: [1.OA.C.6-add-within-20, 1.NBT.B.2-place-value-tens]
generator: add2digitRegroup
answer: integer
fluency_target_sec: 8      # per-problem target for "fluent"
test_length: 20
```

## 4. Problem engine

- Each skill names a **generator**: a TypeScript function `(rng, difficulty) → { prompt, answer, render }`.
- **Seeded RNG** so any test can be reproduced from its seed (for bug reports and fairness).
- **Constraints, not randomness:** e.g. "regrouping in ones place, never in tens"; no repeated problems within a test; no trivial cases (×1, +0) unless the skill is about them.
- **Answer types:** integer, decimal, fraction (exact rational, accept equivalent forms per skill rule — e.g. require simplest form only where the skill demands it), comparison (<, =, >), multiple choice.
- **Rendering:** plain math text, vertical-format arithmetic, fraction bars, and later visual models (number lines, arrays, clocks).
- Every generator gets property tests: answers are correct, constraints hold, 10,000 samples never fail.

## 5. Test & scoring engine

**Session types**
- *Skill test* — 10–20 problems on one skill, per-problem and total timing.
- *Placement* — adaptive walk of the skill graph (see below), ~10–15 minutes.
- *Review* — short mixed set from mastered skills, to check retention.

**Measures per skill**
- Accuracy = correct / attempted.
- Fluency = median seconds per correct answer vs. the skill's `fluency_target_sec`.

**Mastery levels**

| Level | Rule (v1 defaults, tune in playtest) |
|---|---|
| Not yet | accuracy < 70% |
| Learning | accuracy 70–89% |
| Accurate | accuracy ≥ 90%, fluency slower than target |
| **Mastered** | accuracy ≥ 90% *and* median time ≤ target, on two separate days |
| Rusty | was Mastered, then a later review dropped below the bar |

**Placement algorithm (v1)**
1. Start at the skill just below the kid's stated grade in each P0 strand.
2. Give a 5-problem probe. Pass fast → jump up the graph; fail → follow prerequisites down.
3. Stop when the boundary is bracketed: a passed skill whose next skill was failed.
4. Mark the frontier, then start practice one notch *below* it (Kumon's "easy start").

**Built-in seams for V2 flexibility testing:** generators can emit "transfer" variants (missing addend, reversed operation, error-spotting); the scorer stores them as a third measure without affecting mastery in V1.

## 6. Kid experience

**Screens:** Home (character + map) → Grade/strand view → Skill card → Test → Results → Reward.

- **Test screen:** one problem at a time, big on-screen number pad (keyboard also works), progress dots, an unobtrusive timer, a ghost marker for last attempt's pace.
- **Results:** stars for accuracy, a lightning bolt for fluency, "new personal best" when earned, the next suggested skill.
- **Map:** grades as regions of a mountain or world; skills as stations. States: locked, available, learning, mastered, rusty.
- **Accessibility:** large touch targets, WCAG AA contrast, reduced-motion option, timer can be hidden, audio read-aloud for K–1 prompts.
- **Grown-up view:** behind a simple gate ("type the answer to 7 × 8"): full skill table, export/import, reset, timer settings.

## 7. Progression & rewards

| Mechanic | Why it works |
|---|---|
| **Personal bests + ghost racing** | The core loop. Every kid can beat yesterday. |
| **Stickers** for each mastered skill, collected in a sticker book | Kumon's proven tactile reward, tied to real milestones. |
| **Map lighting up** | Visible progress plus a visible next goal. |
| **Character evolves** at strand milestones (e.g. all addition facts mastered) | Attachment and identity; anchors the brand. |
| **Weekly goal** (e.g. 3 sessions) instead of a daily streak | Habit without punishing a missed day. |
| **Celebrations** — confetti, sound, character reaction | Immediate, bright feedback. |

Deferred: races against other kids (needs networking and moderation), cosmetic shop.

## 8. Design & characters

- Bright, high-contrast palette; rounded geometry; one friendly display typeface plus a very legible numeral face.
- A lead character (a guide who climbs the map with the kid) plus one companion per strand.
- Deliverables: character sheets, sticker set (one per skill, can share templates by strand), map illustration, motion guidelines, sound set.
- License art openly (CC BY) so the project stays forkable.

## 9. Tech stack

| Concern | Choice |
|---|---|
| App | Vite + React + TypeScript |
| Styling | CSS variables + CSS modules (no heavy UI kit) |
| Animation | CSS + a small library (e.g. Motion) |
| Math | Own exact-rational helpers; no CAS needed for K–5 |
| Storage | `localStorage` behind a versioned storage module; JSON export/import |
| Tests | Vitest (unit + property), Playwright (end-to-end) |
| CI | GitHub Actions: typecheck, lint, test, build, curriculum validator |
| Deploy | GitHub Pages |
| Dependencies | Minimal; lockfile committed; install scripts disabled; Dependabot on |

## 10. Development safety

All development happens in an isolated container, never directly on a personal machine. See `SECURITY.md`. Short version: use **GitHub Codespaces** (code runs on GitHub's VM, not your laptop) or the local **dev container** (hardened Docker: non-root user, all capabilities dropped, no Docker socket, only the repo folder mounted). npm install scripts are disabled by default.

## 11. Milestones

| # | Milestone | Outcome | Rough size |
|---|---|---|---|
| M0 | Foundations | Repo, dev container, CI, app skeleton deploys to Pages | 1 week |
| M1 | Curriculum graph | Schema, validator, full K–5 skill list for P0 strands with prerequisites | 2 weeks |
| M2 | Problem engine | Generators for all P0 skills, answer checking, property tests | 3 weeks |
| M3 | Test & scoring engine | Timed sessions, mastery levels, placement, local storage | 2 weeks |
| M4 | Kid UX | Test screen, results, map, grown-up view | 3 weeks |
| M5 | Progression & rewards | Personal bests, ghost, stickers, character states, weekly goal | 2 weeks |
| M6 | Design & characters | Brand, characters, stickers, map art, sound | runs in parallel with M2–M5 |
| M7 | Playtest & launch | 5–10 kid playtests, threshold tuning, accessibility pass, v1.0 | 2 weeks |

Critical path: M0 → M1 → M2 → M3 → M4 → M7. M5 and M6 run alongside.

## 12. Open questions

1. Character concept (and a trademark check on "Ziggy").
2. Default fluency targets per skill — start from Kumon-like norms (e.g. ~2–3 s per single-digit fact), then tune in playtest.
3. Should the timer be on by default for K–1?
4. Who draws the characters — commission an illustrator, or generate concepts and refine?
5. Licensing: MIT for code, CC BY 4.0 for curriculum and art?
