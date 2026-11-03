# Security & safe development

## Where code runs

**Never run `npm install` or the dev server directly on your personal machine.** Use one of:

1. **GitHub Codespaces (recommended).** Click _Code → Codespaces → Create codespace on main_. Everything runs on a GitHub-hosted VM; a malicious package can't reach your laptop's files, keychain, SSH keys or wallets. Turn off _Settings → Codespaces → GPG verification / dotfiles_ unless you need them, and don't add personal secrets to Codespaces.
2. **Local dev container.** Docker Desktop + VS Code _Dev Containers_ extension → _Reopen in Container_. The container runs as a non-root user with all Linux capabilities dropped, `no-new-privileges`, a process and memory cap, and only this repo folder mounted (no Docker socket, no home directory).

Note: a container still shares the host kernel, and the repo folder itself is writable from inside it. Codespaces is the stronger boundary. Don't open this repo in a container on a machine that also holds high-value keys if you can use Codespaces instead.

## Dependency rules

- Install scripts are disabled (`.npmrc: ignore-scripts=true`).
- Lockfile is committed; CI uses `npm ci`.
- Exact versions (`save-exact`); Dependabot proposes upgrades as reviewable PRs.
- Every new dependency needs a one-line justification in its PR. Prefer zero-dependency solutions for small things.
- GitHub Actions are pinned to commit SHAs with minimal `permissions:`.

## The app itself

The app is a static site with no backend, no analytics, no accounts and no third-party requests. A strict Content-Security-Policy blocks external connections. Kids' progress stays in their browser.

## Reporting

Please report vulnerabilities privately via GitHub's _Report a vulnerability_ button on the Security tab.
