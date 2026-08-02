---
name: cleanup-branches
description: >
  Plan and (only after user confirmation) delete remote and matching local git
  branches whose PR is already merged and that have no remaining commits or
  file changes. Use when the user asks to clean up, prune, or delete merged
  branches (브랜치 정리, cleanup branches, delete merged branches).
---

# Cleanup branches

Delete remote branches whose PR is already merged and that have no leftover
commits or file changes. Delete matching local branches too. Never delete
`main` or `dev`.

**Plan first.** Show what would be deleted; delete only after the user
explicitly asks to delete.

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
3. **Plan (default):** report would-delete vs skipped. Do **not** run `git push --delete` or `git branch -D`.
4. Stop and wait. Delete only when the user explicitly asks to delete.
5. **Delete (after confirmation only):** safe remote → `git push origin --delete <branch>`; matching safe local → `git branch -D <branch>`; report removed vs skipped.

```
Would delete:
- origin/<branch> — merged PR #<n>
- <branch> (local) — matched origin / merged PR #<n>

Skipped:
- <branch> — <reason>
```

After confirmation, use the same shape with `Removed:` instead of `Would delete:`.
