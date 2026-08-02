---
name: cleanup-branches
description: >
  Delete remote and matching local git branches whose PR is already merged and
  that have no remaining commits or file changes. Use when the user asks to
  clean up, prune, or delete merged branches (브랜치 정리, cleanup branches,
  delete merged branches).
---

# Cleanup branches

원격지에 이미 PR이 합쳐져서 커밋 또는 변경된 파일이 없는 브랜치를 지운다.
원격과 같은 로컬 브랜치가 있으면 함께 지운다. `main` / `dev` 는 절대 지우지 않는다.

## Rules

Delete only when all are true; otherwise skip and say why:

1. Branch is not `main` or `dev` (local or `origin/*`)
2. Not the currently checked-out branch
3. A **merged** PR exists for that head (`gh pr list --head <branch> --state merged`)
4. Tip has no commits beyond a merged PR tip:
   `git merge-base --is-ancestor <tip> <prHeadRefOid>`
   (prefer `origin/<branch>` tip; squash/rebase → do **not** require ancestry on `dev`/`main`)
5. Local delete: if a worktree has the branch checked out, that tree is clean (`status --porcelain` empty); dirty → skip local only

Never force-push or rewrite history. Use `git branch -D` only after the merged-PR checks (plain `-d` often fails after squash).

## Workflow

1. `git fetch --prune origin`
2. Candidates: remote heads under `origin` (exclude `main`/`dev`/`HEAD`), plus local-only branches with the same checks
3. Safe remote → `git push origin --delete <branch>`
4. Matching safe local → `git branch -D <branch>`
5. Report:

```
Removed:
- origin/<branch> — merged PR #<n>
- <branch> (local) — matched origin / merged PR #<n>

Skipped:
- <branch> — <reason>
```
