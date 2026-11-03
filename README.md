# Ziggy

A free, open-source K–5 math diagnostic: short, timed, auto-generated tests that measure accuracy *and* fluency, and a map that makes kids want to climb to the next rung.

- **Plan:** [docs/PLAN.md](docs/PLAN.md)
- **Privacy:** we collect nothing. No accounts, no analytics, no server — progress stays in the browser.
- **Developing:** open in GitHub Codespaces or the dev container. Don't install dependencies on your own machine. See [SECURITY.md](SECURITY.md).

## Setting up the project board (one time)

```bash
gh auth login
gh auth refresh -s project            # lets gh create a Projects board
DRY_RUN=1 scripts/bootstrap-github.sh OWNER/ziggy   # preview
scripts/bootstrap-github.sh OWNER/ziggy             # create labels, milestones, issues, board
```

The backlog lives in [`scripts/backlog.sh`](scripts/backlog.sh); edit it before running if you want to change anything. Re-running is safe — existing issues are skipped.

*Not affiliated with Kumon.*
