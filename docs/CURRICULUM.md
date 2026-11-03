# Writing skill files

Every skill Ziggy can test is one YAML file in `curriculum/k5/`. The app reads them at build time; if any file is wrong, the build fails with a plain-English message saying which file and what to fix.

## Example

`curriculum/k5/K.OA.A.5-add-within-5.yaml`

```yaml
id: K.OA.A.5-add-within-5
grade: K
strand: OA
standard: K.OA.A.5
title: Add within 5
prerequisites: [K.CC.B.5-count-objects-to-10]
generator: addWithin5
answer: integer
fluency_target_sec: 3
test_length: 20
notes: Fluency target. Include +0 and doubles; avoid repeating a fact within a test.
```

## Fields

| Field                | Required | Rules                                                                                                                         |
| -------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `id`                 | yes      | `<standard>-<slug>`: the Common Core code, a dash, then lowercase words joined by dashes. The file must be named `<id>.yaml`. |
| `grade`              | yes      | `K`, `1`, `2`, `3`, `4` or `5`. Must match the id.                                                                            |
| `strand`             | yes      | `CC`, `OA`, `NBT`, `NF`, `MD` or `G`. Must match the id.                                                                      |
| `standard`           | yes      | The Common Core code, e.g. `2.NBT.B.5`. Must be the id's prefix.                                                              |
| `title`              | yes      | What a kid sees on the map. 48 characters max.                                                                                |
| `prerequisites`      | no       | Skill ids that come first (omit or `[]` for none). They must exist and be the same grade or earlier. No loops.                |
| `generator`          | yes      | camelCase name of the problem generator in `src/engine` (built in M2).                                                        |
| `answer`             | yes      | `integer`, `decimal`, `fraction`, `mixed-number`, `comparison` or `choice`.                                                   |
| `fluency_target_sec` | yes      | Median seconds per problem that counts as fluent (0.5–120).                                                                   |
| `test_length`        | yes      | Problems in a skill test (5–40).                                                                                              |
| `notes`              | no       | Guidance for whoever writes the generator. Not shown to kids.                                                                 |

Unknown fields are rejected, which catches typos like `fluency:`.

## Granularity

Split a standard into skills a kid can master in a few sessions, and that a single generator can produce. For example, 3.OA.C.7 (multiplication facts) becomes several skills by factor family: ×0/1/2/5/10, ×3/4, ×6/7, ×8/9, then mixed.

## Checking your work

```bash
npm run curriculum:check
```

The same check runs in `npm test` and in CI on every pull request.

## Using skills in code

```ts
import { skills } from 'virtual:curriculum'; // Skill[], prerequisites first
```

Types live in `src/curriculum/types.ts`.
