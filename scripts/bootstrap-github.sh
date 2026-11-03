#!/usr/bin/env bash
# Creates labels, milestones, issues and a Projects (kanban) board for this repo.
# Requires only the GitHub CLI (gh), logged in with:  gh auth login  &&  gh auth refresh -s project
#
# Usage:
#   scripts/bootstrap-github.sh OWNER/REPO            # do it
#   DRY_RUN=1 scripts/bootstrap-github.sh OWNER/REPO  # print what would happen
#
# Safe to re-run: existing labels/milestones are updated or skipped; issues are
# skipped if an issue with the same title already exists.
set -euo pipefail

REPO="${1:?usage: bootstrap-github.sh OWNER/REPO}"
OWNER="${REPO%%/*}"
PROJECT_TITLE="${PROJECT_TITLE:-Ziggy K-5 v1}"
DRY_RUN="${DRY_RUN:-0}"

run() { if [[ "$DRY_RUN" == 1 ]]; then printf '[dry-run] %q ' "$@"; echo; else "$@"; fi; }

# ---------------------------------------------------------------- labels
label() { # name color description
  if [[ "$DRY_RUN" == 1 ]]; then echo "[dry-run] label: $1"; return; fi
  gh label create "$1" --repo "$REPO" --color "$2" --description "$3" --force >/dev/null
}
echo "== Labels"
label "type:feature"   "1d76db" "New capability"
label "type:task"      "c5def5" "Setup, chore or research"
label "type:design"    "d876e3" "Visual, character or UX design"
label "type:content"   "fbca04" "Curriculum and skill content"
label "area:infra"     "5319e7" "Repo, CI, dev environment, deploy"
label "area:curriculum" "e4b429" "Skill graph and skill files"
label "area:engine"    "0e8a16" "Problem generators and answer checking"
label "area:scoring"   "006b75" "Test sessions, mastery, placement"
label "area:ui"        "f9a8d4" "Kid-facing screens"
label "area:rewards"   "fb923c" "Progression and reward loop"
label "area:security"  "b60205" "Supply-chain and dev-environment safety"
label "priority:P0"    "b60205" "Required for v1"
label "priority:P1"    "d93f0b" "Should have for v1"
label "priority:P2"    "fef2c0" "Nice to have / later"
label "good first issue" "7057ff" "Good for newcomers"

# ---------------------------------------------------------------- milestones
milestone() { # title description
  if [[ "$DRY_RUN" == 1 ]]; then echo "[dry-run] milestone: $1"; return; fi
  if gh api "repos/$REPO/milestones?state=all&per_page=100" --jq '.[].title' | grep -Fxq "$1"; then
    echo "  exists: $1"
  else
    gh api "repos/$REPO/milestones" -f title="$1" -f description="$2" >/dev/null && echo "  created: $1"
  fi
}
echo "== Milestones"
M0="M0 Foundations";            milestone "$M0" "Repo, dev container, CI, app skeleton deployed to Pages"
M1="M1 Curriculum graph";       milestone "$M1" "Skill schema, validator, K-5 P0 skill list with prerequisites"
M2="M2 Problem engine";         milestone "$M2" "Generators for all P0 skills, answer checking, property tests"
M3="M3 Test & scoring engine";  milestone "$M3" "Timed sessions, mastery levels, placement, local storage"
M4="M4 Kid UX";                 milestone "$M4" "Test screen, results, map, grown-up view"
M5="M5 Progression & rewards";  milestone "$M5" "Personal bests, ghost, stickers, character states, weekly goal"
M6="M6 Design & characters";    milestone "$M6" "Brand, characters, stickers, map art, sound"
M7="M7 Playtest & launch";      milestone "$M7" "Kid playtests, tuning, accessibility pass, v1.0"

# ---------------------------------------------------------------- project board
PROJECT_NUM=""
if [[ "$DRY_RUN" == 1 ]]; then
  echo "[dry-run] project: $PROJECT_TITLE"
else
  echo "== Project board"
  PROJECT_NUM="$(gh project list --owner "$OWNER" --format json --jq ".projects[] | select(.title==\"$PROJECT_TITLE\") | .number" | head -1)"
  if [[ -z "$PROJECT_NUM" ]]; then
    PROJECT_NUM="$(gh project create --owner "$OWNER" --title "$PROJECT_TITLE" --format json --jq '.number')"
    echo "  created project #$PROJECT_NUM"
  else
    echo "  using existing project #$PROJECT_NUM"
  fi
  gh project link "$PROJECT_NUM" --owner "$OWNER" --repo "$REPO" >/dev/null 2>&1 || true
fi

# ---------------------------------------------------------------- issues
EXISTING=""
if [[ "$DRY_RUN" != 1 ]]; then
  EXISTING="$(gh issue list --repo "$REPO" --state all --limit 500 --json title --jq '.[].title')"
fi
COUNT=0
issue() { # milestone labels title  (body on stdin)
  local ms="$1" labels="$2" title="$3" body
  body="$(cat)"
  COUNT=$((COUNT+1))
  if [[ "$DRY_RUN" == 1 ]]; then echo "[dry-run] issue [$ms] ($labels) $title"; return; fi
  if grep -Fxq "$title" <<<"$EXISTING"; then echo "  exists: $title"; return; fi
  local url
  url="$(gh issue create --repo "$REPO" --title "$title" --body "$body" --label "$labels" --milestone "$ms")"
  echo "  $url  $title"
  if [[ -n "$PROJECT_NUM" ]]; then gh project item-add "$PROJECT_NUM" --owner "$OWNER" --url "$url" >/dev/null; fi
}

echo "== Issues"
# shellcheck source=backlog.sh
source "$(dirname "$0")/backlog.sh"

echo
echo "Done: $COUNT issues processed."
if [[ -n "$PROJECT_NUM" ]]; then echo "Board: https://github.com/users/$OWNER/projects/$PROJECT_NUM (switch the view to 'Board', group by Status; optionally add a Milestone grouping)"; fi
