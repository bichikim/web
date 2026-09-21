---
name: dispatch-bug-fixes
description: Manually select up to three open bug issues without WIP, label them WIP, and dispatch each to a separate Luna max worktree for review and fixing.
---

# Dispatch bug fixes

Use only when explicitly invoked as `$dispatch-bug-fixes`.

## Scope

In `bichikim/web`, select at most three open issues with `bug` and without `WIP`. Use caller-supplied issue numbers when given; otherwise select the three newest by creation time. If none qualify, report that and stop before mutation.

## Workflow

1. Refresh issue and label state through the configured GitHub integration, or authenticated GitHub CLI. Ensure the exact `WIP` label exists; if absent, create it with color `fbca04` and description `Work in progress` without changing existing metadata.
2. Immediately before mutation, revalidate every selected issue as open, `bug`-labeled, and not `WIP`. Apply `WIP` to all and verify. If labeling fails, stop and report which issues changed.
3. Fetch the latest `origin/dev`, resolve the repository project with `list_projects`, and create one separate user-visible Codex task per issue with `mcp__codex_app__create_thread`:
   - `model: "gpt-5.6-luna"`, `thinking: "max"`
   - project `worktree` starting from the current `origin/dev` ref
   - a unique title containing the issue number and a prompt containing its URL
   - the task prompt must require a dedicated branch before any edits or commits: check `git branch --show-current` at startup, and if the worktree is detached, create and checkout a unique `codex/bug-<issue-number>-<slug>` branch from the current `HEAD` (add a short unique suffix on collision); verify the branch name is non-empty before continuing
   - the task prompt must make draft-PR creation a required terminal deliverable: after the review gate passes, the task must not finish without a verified draft PR URL, unless the mandatory direct skill read fails or an unrecoverable authentication/permission blocker is reported with exact evidence
4. In each task, inspect relevant callers, callees, types, tests, and configuration; verify the root cause; implement the smallest compatible fix; add regression coverage; and report changed files, evidence, verification, and limitations.
   At task start, never leave the worktree on detached `HEAD`: create or checkout the dedicated issue branch before editing, committing, pushing, or creating a PR. Do not attempt a PR while `git branch --show-current` is empty.
   Completion gate: immediately after the fix, explicitly read and invoke `$critical-review-fix-loop` from `.agents/skills/critical-review-fix-loop/SKILL.md` in the task worktree, then follow its `$critical-review` dependency from `.agents/skills/critical-review/SKILL.md`. Both skills are tracked in `origin/dev` and intentionally use `disable-model-invocation: true`, so they may be absent from the automatically listed skill catalog; catalog absence is not evidence that either skill is unavailable. Do not replace this gate with a manual review. Only report the gate as blocked when a direct file read fails, and do not bypass the block or create the PR; report the blocker and evidence.
   It must perform the full P0–P4 review, fix every authorized issue-scope P0–P2 finding, and rerun the review and applicable unit tests, `typecheck`, lint, and formatting until no P0–P2 remains. Lint or build cannot replace tests or `typecheck`.
   After the gate, verify that `git branch --show-current` is non-empty, push that task branch when needed, and create a draft PR against `dev` with `Fixes #<issue-number>`. Then verify that the PR exists and is draft, capture its URL, and include that URL and branch name in the task's final report. PR creation is a required completion condition, not a best-effort follow-up. If PR creation or verification fails, retry recoverable network, approval, or transient failures; otherwise stop with the exact blocker and evidence rather than claiming completion. Its body must match the final review report and exhaustively include the following; write `none` for any empty category. Do not manually close the issue, remove `WIP`, or create additional tasks.
   - every P0–P2 finding from all passes, with severity, root cause, changed files or behavior, and before/after verification;
   - every confirmed P3–P4 problem remaining or addressed, with one unique review number, evidence, and follow-up/fixed status; and
   - every verification gap, not-applicable or partially covered check, with its reason and limitation.
5. Once every created task exposes a ready task ID, take one immediate status snapshot with `wait_threads` (`timeoutMs: 0`) for all ready IDs. This is a status check, not a request to wait for task completion; do not block or poll for completion. The parent dispatcher may finish while child tasks are active, but an active snapshot is not evidence that the required PR exists; the child task owns the PR creation and must report its verified PR URL when complete. Never pass a pending `clientThreadId` to another thread tool. Finish with selected issue URLs, WIP results, each task's current chat/worktree status, and verification results. Leave `WIP` on every selected issue.

## Guardrails

- Keep selection and labeling to at most three open bug issues without `WIP`.
- Do not use same-directory forks or nested delegation; each issue gets its own project worktree and user-visible task.
- If task creation fails after labeling, leave `WIP` in place and report the failed issue.
