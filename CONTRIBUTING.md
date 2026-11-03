# Contributing to Ziggy

Thanks for helping! The plan lives in [docs/PLAN.md](docs/PLAN.md) and the work is tracked as GitHub issues on the project board.

## Set up (never on your own machine)

1. **Codespaces (recommended):** _Code → Codespaces → Create codespace on main_. Dependencies install automatically.
2. **Or the dev container:** Docker Desktop + VS Code _Dev Containers_ → _Reopen in Container_.

Why: see [SECURITY.md](SECURITY.md). In short, a malicious package should never be able to reach your laptop.

## Everyday commands

| Command             | What it does                                  |
| ------------------- | --------------------------------------------- |
| `npm run dev`       | Start the app at http://localhost:5173/ziggy/ |
| `npm test`          | Run unit tests                                |
| `npm run lint`      | Lint                                          |
| `npm run typecheck` | Type-check                                    |
| `npm run format`    | Auto-format                                   |
| `npm run build`     | Production build into `dist/`                 |

## Rules of the road

- **No data collection.** No network requests, analytics, cookies or third-party scripts. Lint blocks `fetch` in app code, and the production build ships a strict Content-Security-Policy.
- **Dependencies:** install with `npm install --ignore-scripts --save-exact <pkg>` (the `.npmrc` already enforces this). Justify every new dependency in your PR.
- **Curriculum is data:** skills go in `curriculum/k5/*.yaml`, not in code.
- **One issue per PR**, link it with `Closes #N`. CI must pass.

## Layout

```
curriculum/k5/   skill files (M1)
src/app/         app shell and screens
src/engine/      problem generators and answer checking (M2)
src/scoring/     sessions, mastery, placement (M3)
src/ui/          shared components and styles
docs/            plan and design notes
```
