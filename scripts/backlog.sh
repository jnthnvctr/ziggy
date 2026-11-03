# Issue backlog for Ziggy K-5 v1. Sourced by bootstrap-github.sh.
# Format: issue "<milestone>" "<comma,separated,labels>" "<title>" <<'EOF' ... body ... EOF
# Edit freely before running; the plan behind these lives in docs/PLAN.md.

# ============================================================ M0 Foundations
issue "$M0" "type:task,area:security,priority:P0" "Hardened dev container + Codespaces config" <<'EOF'
All development runs in an isolated container. See SECURITY.md.

- [ ] `.devcontainer/devcontainer.json` works in GitHub Codespaces
- [ ] Local Docker variant: non-root, `--cap-drop=ALL`, `no-new-privileges`, no Docker socket, only repo mounted
- [ ] `.npmrc` with `ignore-scripts=true`, `save-exact=true`
- [ ] Document the workflow in CONTRIBUTING.md
EOF

issue "$M0" "type:task,area:security,priority:P0" "Dependency policy and supply-chain guardrails" <<'EOF'
- [ ] Commit lockfile; CI uses `npm ci`
- [ ] Enable Dependabot alerts + security updates
- [ ] Enable secret scanning and push protection
- [ ] Add `npm audit --omit=dev` (or equivalent) to CI
- [ ] Rule in CONTRIBUTING: new dependencies need a short justification in the PR
EOF

issue "$M0" "type:task,area:infra,priority:P0" "Scaffold app: Vite + React + TypeScript" <<'EOF'
- [ ] Vite React-TS template, strict TS
- [ ] ESLint + Prettier
- [ ] Folder layout: `src/app`, `src/engine`, `src/scoring`, `src/ui`, `curriculum/k5`
- [ ] No analytics, no third-party scripts, fonts self-hosted
EOF

issue "$M0" "type:task,area:infra,priority:P0" "CI: typecheck, lint, test, build on every PR" <<'EOF'
GitHub Actions workflow. Pin actions to commit SHAs. Minimal `permissions:` block.
EOF

issue "$M0" "type:task,area:infra,priority:P0" "Deploy to GitHub Pages from main" <<'EOF'
- [ ] Pages workflow on push to main
- [ ] Strict Content-Security-Policy meta tag (self only, no external connects)
EOF

issue "$M0" "type:task,area:infra,priority:P1" "Repo docs: README, CONTRIBUTING, LICENSE (MIT code / CC BY 4.0 content), CODE_OF_CONDUCT" <<'EOF'
Decide licensing split for code vs curriculum and art.
EOF

issue "$M0" "type:task,priority:P1" "Trademark check for the name Ziggy" <<'EOF'
Name chosen: Ziggy. Check USPTO (education/software classes) and app stores for conflicts, e.g. the existing "Ziggy" comic-strip trademark. Never use "Kumon" (registered trademark).
EOF

# ============================================================ M1 Curriculum graph
issue "$M1" "type:feature,area:curriculum,priority:P0" "Skill file schema (YAML) + TypeScript types" <<'EOF'
Fields: id, grade, strand, title, standard, prerequisites, generator, answer type, fluency_target_sec, test_length, notes.
See docs/PLAN.md §3 for an example.
EOF

issue "$M1" "type:feature,area:curriculum,priority:P0" "Curriculum validator (runs in CI)" <<'EOF'
- [ ] Schema validation for every skill file
- [ ] Prerequisites reference existing skills
- [ ] Graph is acyclic
- [ ] Every skill's generator exists (once M2 starts)
- [ ] Build step compiles skills into one JSON bundle for the app
EOF

issue "$M1" "type:content,area:curriculum,priority:P0" "Skill list: Kindergarten (CC, OA, NBT)" <<'EOF'
Break K standards into fine-grained, testable skills with prerequisites and fluency targets.
EOF
issue "$M1" "type:content,area:curriculum,priority:P0" "Skill list: Grade 1 (OA, NBT)" <<'EOF'
Include addition/subtraction facts within 20 split into sub-skills (make-10, doubles, near-doubles...).
EOF
issue "$M1" "type:content,area:curriculum,priority:P0" "Skill list: Grade 2 (OA, NBT)" <<'EOF'
Multi-digit add/subtract with and without regrouping; place value to 1000.
EOF
issue "$M1" "type:content,area:curriculum,priority:P0" "Skill list: Grade 3 (OA, NBT, NF)" <<'EOF'
Multiplication/division facts split by factor families; intro fractions.
EOF
issue "$M1" "type:content,area:curriculum,priority:P0" "Skill list: Grade 4 (OA, NBT, NF)" <<'EOF'
Multi-digit multiplication, long division, equivalent fractions, fraction add/subtract like denominators, decimals to hundredths.
EOF
issue "$M1" "type:content,area:curriculum,priority:P0" "Skill list: Grade 5 (OA, NBT, NF)" <<'EOF'
Unlike denominators, fraction multiply/divide, decimal operations, order of operations.
EOF

issue "$M1" "type:task,area:curriculum,priority:P1" "Set default fluency targets per skill" <<'EOF'
Research Kumon-like norms (e.g. ~2-3 s per single-digit fact) and set defaults; to be tuned in M7 playtests.
EOF

issue "$M1" "type:content,area:curriculum,priority:P2" "Skill list: Measurement & Data and Geometry (K-5) — post-v1" <<'EOF'
Needs visual/interactive problem types. Plan only for now.
EOF

# ============================================================ M2 Problem engine
issue "$M2" "type:feature,area:engine,priority:P0" "Seeded RNG + generator interface" <<'EOF'
`(rng, params) => { prompt, answer, render, meta }`. Same seed => same test. No duplicate problems within a session.
EOF

issue "$M2" "type:feature,area:engine,priority:P0" "Exact rational arithmetic helpers" <<'EOF'
Fractions, mixed numbers, decimals as exact rationals; simplest-form checks.
EOF

issue "$M2" "type:feature,area:engine,priority:P0" "Answer parsing and checking" <<'EOF'
Types: integer, decimal, fraction, mixed number, comparison (<,=,>), multiple choice. Per-skill rule for whether simplest form is required.
EOF

issue "$M2" "type:feature,area:engine,priority:P0" "Problem renderers: inline, vertical arithmetic, fraction" <<'EOF'
Vertical format for multi-digit add/sub/mult; long-division layout; stacked fractions.
EOF

issue "$M2" "type:feature,area:engine,priority:P0" "Generators: K-1 skills" <<'EOF'
One generator per skill file. Property tests: 10k samples, answers correct, constraints hold.
EOF
issue "$M2" "type:feature,area:engine,priority:P0" "Generators: Grade 2-3 skills" <<'EOF'
Same acceptance criteria as K-1.
EOF
issue "$M2" "type:feature,area:engine,priority:P0" "Generators: Grade 4-5 skills" <<'EOF'
Same acceptance criteria as K-1.
EOF

issue "$M2" "type:feature,area:engine,priority:P2" "Transfer-item variants (seam for V2 flexibility testing)" <<'EOF'
Missing-number, reversed operation, error-spotting variants. Stored as a third measure; not counted toward mastery in v1.
EOF

issue "$M2" "type:task,area:engine,priority:P1" "Generator preview page (dev only)" <<'EOF'
Browse any skill, regenerate samples, inspect seeds. Speeds up content review.
EOF

# ============================================================ M3 Test & scoring
issue "$M3" "type:feature,area:scoring,priority:P0" "Timed session engine" <<'EOF'
Skill test (10-20 problems), per-problem + total timing, pause handling, early exit.
EOF

issue "$M3" "type:feature,area:scoring,priority:P0" "Scoring: accuracy, fluency, mastery levels" <<'EOF'
Levels: Not yet / Learning / Accurate / Mastered (2 separate days) / Rusty. Thresholds configurable. See PLAN §5.
EOF

issue "$M3" "type:feature,area:scoring,priority:P0" "Adaptive placement test" <<'EOF'
Walk the skill graph per strand: 5-problem probes, jump up on fast pass, follow prerequisites down on fail, stop when frontier is bracketed. Target 10-15 minutes.
EOF

issue "$M3" "type:feature,area:scoring,priority:P1" "Review sessions for retention" <<'EOF'
Mixed set from mastered skills; marks Rusty when below bar.
EOF

issue "$M3" "type:feature,area:scoring,priority:P0" "Local storage module (versioned) + export/import" <<'EOF'
All progress in localStorage behind a versioned schema with migrations. JSON export/import file. Multiple kid profiles on one device. Nothing leaves the browser.
EOF

# ============================================================ M4 Kid UX
issue "$M4" "type:feature,area:ui,priority:P0" "Test screen with on-screen number pad" <<'EOF'
Big targets, keyboard support, progress dots, unobtrusive timer (hideable), works on tablet and phone.
EOF
issue "$M4" "type:feature,area:ui,priority:P0" "Results screen" <<'EOF'
Accuracy stars, fluency bolt, personal-best callout, missed problems review, next suggested skill.
EOF
issue "$M4" "type:feature,area:ui,priority:P0" "Mastery map (grade regions, skill stations)" <<'EOF'
States: locked, available, learning, accurate, mastered, rusty. Frontier highlighted.
EOF
issue "$M4" "type:feature,area:ui,priority:P0" "Grade and strand browse view" <<'EOF'
Major topics per grade with mastery status.
EOF
issue "$M4" "type:feature,area:ui,priority:P0" "Profile picker (no accounts)" <<'EOF'
Kid picks their character/profile on the device. No names required.
EOF
issue "$M4" "type:feature,area:ui,priority:P1" "Grown-up view behind a simple gate" <<'EOF'
Full skill table, export/import, reset, timer and threshold settings.
EOF
issue "$M4" "type:feature,area:ui,priority:P1" "Read-aloud for K-1 prompts" <<'EOF'
Use the browser's built-in speech synthesis (no network calls).
EOF
issue "$M4" "type:task,area:ui,priority:P1" "Accessibility baseline" <<'EOF'
WCAG AA contrast, reduced-motion, focus states, screen-reader labels, large touch targets.
EOF

# ============================================================ M5 Progression & rewards
issue "$M5" "type:feature,area:rewards,priority:P0" "Personal bests + ghost racer" <<'EOF'
Ghost marker shows last attempt's pace during a test; celebrate new bests.
EOF
issue "$M5" "type:feature,area:rewards,priority:P0" "Sticker book" <<'EOF'
One sticker per mastered skill; collection view by grade/strand.
EOF
issue "$M5" "type:feature,area:rewards,priority:P1" "Character evolution at strand milestones" <<'EOF'
Character gains stages/gear when a strand milestone is mastered (e.g. all addition facts).
EOF
issue "$M5" "type:feature,area:rewards,priority:P1" "Weekly goal (instead of daily streak)" <<'EOF'
e.g. 3 sessions per week, with gentle reminder on home screen. No loss penalties.
EOF
issue "$M5" "type:feature,area:rewards,priority:P0" "Celebration moments: confetti, sound, character reactions" <<'EOF'
Respect reduced-motion and a mute setting.
EOF

# ============================================================ M6 Design & characters
issue "$M6" "type:design,priority:P0" "Visual identity: palette, type, UI tokens" <<'EOF'
Bright, high-contrast, rounded. A display face plus a very legible numeral face (self-hosted, open license).
EOF
issue "$M6" "type:design,priority:P0" "Lead character concept + character sheet" <<'EOF'
Guide who climbs the map with the kid. Expressions: neutral, cheer, thinking, encouraging-after-miss.
EOF
issue "$M6" "type:design,priority:P1" "Strand companion characters" <<'EOF'
One per P0 strand (CC, OA, NBT, NF).
EOF
issue "$M6" "type:design,priority:P0" "Sticker art system" <<'EOF'
Template per strand so stickers for ~150 skills are feasible.
EOF
issue "$M6" "type:design,priority:P0" "Map illustration" <<'EOF'
Grades K-5 as regions; must scale to future grades and subjects.
EOF
issue "$M6" "type:design,priority:P1" "Motion and sound set" <<'EOF'
Correct/incorrect/finish/personal-best/sticker sounds; motion guidelines.
EOF
issue "$M6" "type:design,priority:P0" "Hi-fi mockups of core screens" <<'EOF'
Home/map, test, results, sticker book, grown-up view. Phone + tablet.
EOF

# ============================================================ M7 Playtest & launch
issue "$M7" "type:task,priority:P0" "Playtest protocol + 5-10 kid sessions" <<'EOF'
Observe, don't collect: notes by the adult running the session; no recordings or telemetry.
EOF
issue "$M7" "type:task,area:scoring,priority:P0" "Tune mastery thresholds and fluency targets from playtests" <<'EOF'
Adjust the defaults in PLAN §5 and per-skill fluency targets based on what playtests show.
EOF
issue "$M7" "type:task,area:ui,priority:P0" "Accessibility and device QA pass" <<'EOF'
iPad, Chromebook, Android phone, iPhone; keyboard-only; screen reader spot check.
EOF
issue "$M7" "type:task,area:infra,priority:P1" "End-to-end tests for core flows (Playwright)" <<'EOF'
Placement -> map -> skill test -> results -> sticker.
EOF
issue "$M7" "type:task,priority:P0" "v1.0 release + launch page" <<'EOF'
Privacy statement ("we collect nothing"), how-to for parents/teachers, contributing guide link.
EOF
