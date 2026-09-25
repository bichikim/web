---
name: dispatch-bug-fixes
description: Select up to three open bug issues without WIP, label them WIP, and dispatch each to a separate Luna max worktree for review, fixing, and a draft PR.
---

# Dispatch bug fixes

Use only when explicitly invoked as `$dispatch-bug-fixes`.

## Scope

In `bichikim/web`, select at most three open `bug` issues without `WIP`. Honor supplied issue numbers; otherwise choose the oldest by creation time. If none qualify, report that and stop.

1. Refresh issue and label state through the GitHub integration or authenticated CLI. Ensure the exact `WIP` label exists; create it only if absent, with color `fbca04` and description `Work in progress`.
2. Revalidate each selection immediately before labeling. Skip ineligible supplied issues; for automatic selection, fill vacancies with the next oldest eligible issues, up to three. Apply `WIP` to all and verify. If labeling fails, stop and report which issues changed.
3. Fetch the latest `origin/dev`. Resolve the project with `list_projects`, then create one user-visible Codex task per issue using `create_thread`: `model: "gpt-6-luna"`, `thinking: "max"`, a separate project worktree starting at that ref, and a unique title containing the issue number. Do not use same-directory forks or nested delegation.
4. Give each task its issue URL and require it to:
   - Create or check out a unique `codex/bug-<issue-number>-<slug>` branch from worktree `HEAD` before edits, commits, or PR creation; verify `git branch --show-current` is non-empty, including when startup is detached.
   - Verify the cause, implement a compatible fix with regression coverage, then directly read and invoke [critical-review-fix-loop](../critical-review-fix-loop/SKILL.md), including its [critical-review](../critical-review/SKILL.md) dependency. These skills may be absent from the catalog because invocation is disabled; a failed direct read blocks the PR, and a manual review cannot replace the gate.
   - After the gate passes, push the branch as needed and create a verified **draft** PR against `dev` with `Fixes #<issue-number>`. Write all prose in the PR body in Korean, faithfully reflecting the final review report. Preserve required literal syntax such as `Fixes #<issue-number>` and technical identifiers, paths, commands, and URLs as written. This Korean-language requirement applies only to the PR body. Require its body to include all P0–P2 findings across review passes with cause, change, and before/after verification; all confirmed P3/P4 findings with unique review numbers and disposition; and all verification gaps or inapplicable checks with reasons. Write `없음` for empty categories. Finish with the draft PR URL and branch name. Retry recoverable PR failures; report exact evidence for an unrecoverable blocker instead of claiming completion.
5. Take one immediate `wait_threads` snapshot (`timeoutMs: 0`) for ready task IDs; never pass a pending `clientThreadId`. Report selected issue URLs, WIP results, and each task's status without waiting for completion. An active task is not proof of a PR.

Leave `WIP` on selected issues, including when task creation fails. Do not manually close issues or create additional tasks.
