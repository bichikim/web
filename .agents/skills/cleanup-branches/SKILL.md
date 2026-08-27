---
name: cleanup-branches
description: Plan and, only after confirmation, delete remote and matching local branches whose PR is merged or closed and whose commits and file changes are fully accounted for; use for branch cleanup.
---

# Cleanup branches

Delete remote branches whose PR is already **merged** or **closed (not merged)**
and that have no leftover commits or file changes. Delete matching local
branches too. Never delete `main` or `dev`.

**Plan first.** Show what would be deleted; delete only after the user
explicitly asks to delete.

## Rules

Delete only when all are true; otherwise skip and say why:

1. Branch is not `main` or `dev` (local or `origin/*`)
2. Not the currently checked-out branch
3. No **open** PR for that head (`gh pr list --head <branch> --state open`)
4. A **merged** or **closed** PR exists for that head:
   - prefer merged: `gh pr list --head <branch> --state merged`
   - else closed (not merged): `gh pr list --head <branch> --state closed`
5. Tip has no commits beyond that PR tip:
   `git merge-base --is-ancestor <tip> <prHeadRefOid>`
   (prefer `origin/<branch>` tip; squash/rebase → do **not** require ancestry on
   `dev`/`main`)
6. Local delete: if a worktree has the branch checked out, that tree is clean
   (`status --porcelain` empty); dirty → skip local only

Never force-push or rewrite history. Use `git branch -D` only after the PR
checks (plain `-d` often fails after squash).

## Workflow

1. `git fetch --prune origin`
2. Candidates: remote heads under `origin` (exclude `main`/`dev`/`HEAD`), plus
   local-only branches with the same checks
3. **Plan (default):** report would-delete vs skipped. Do **not** run
   `git push --delete` or `git branch -D`.
4. Stop and wait. Delete only when the user explicitly asks to delete.
5. **Delete (after confirmation only):** safe remote →
   `git push origin --delete <branch>`; matching safe local →
   `git branch -D <branch>`; report removed vs skipped.

```
Would delete:
- origin/<branch> — merged PR #<n>
- origin/<branch> — closed PR #<n> (not merged)
- <branch> (local) — matched origin / merged PR #<n>

Skipped:
- <branch> — <reason>
```

After confirmation, use the same shape with `Removed:` instead of `Would delete:`.
