---
name: cleanup-worktrees
description: >-
  Remove safe git worktrees that have no uncommitted changes and no commits
  missing from a pull request. Use when the user asks to clean up, prune, or
  remove worktrees (워크트리 정리, worktree cleanup).
---

# Cleanup worktrees

Remove linked worktrees that are safe to delete. Worktree only — never delete branches.

## Rules

Remove only when all are true; otherwise skip and say why:

1. Not the current worktree or the primary checkout
2. Clean: `git -C <path> status --porcelain` empty
3. HEAD is on a PR (open or merged): some PR `headRefOid` has HEAD as ancestor (`git merge-base --is-ancestor`)

Never use `git worktree remove --force` unless the user asks.

## Workflow

1. `git worktree list --porcelain`
2. Evaluate each linked worktree except current and primary
3. From the primary checkout: `git worktree remove <path>` for safe ones, then `git worktree prune`
4. Report:

```
Removed:
- <path> (<branch>) — PR #<n>

Skipped:
- <path> (<branch>) — <reason>
```
