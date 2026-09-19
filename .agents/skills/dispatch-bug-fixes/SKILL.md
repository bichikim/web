---
name: dispatch-bug-fixes
description: Manually select up to three open bug issues without WIP, label them WIP, and dispatch each to a separate Luna max worktree for review and fixing.
---

# Dispatch bug fixes

Use this workflow only when explicitly invoked as `$dispatch-bug-fixes`.

## Scope

Work in `bichikim/web`. Select up to three open issues that have the `bug` label and do not have the `WIP` label. Unless the caller supplies issue numbers, sort by creation time descending and select the three newest matches, or all matches when fewer than three qualify. If no issues match, report the result and stop before labeling or dispatching.

## Workflow

1. Refresh the GitHub issue and label state. Prefer the configured GitHub integration; otherwise use the authenticated GitHub CLI.
2. Check for the exact `WIP` label. If it does not exist, create it with color `fbca04` and description `Work in progress`. Do not edit an existing label's metadata.
3. Revalidate every selected issue immediately before mutation: it must be open, have `bug`, and lack `WIP`. Apply `WIP` to all selected issues and verify the result. If any label mutation fails, stop dispatching and report which issues changed.
4. Fetch the latest `origin/dev`, resolve the Git repository project with `list_projects`, and create one separate Codex task per issue with `mcp__codex_app__create_thread`:
   - `model: "gpt-5.6-luna"`
   - `thinking: "max"`
   - a project `worktree` environment starting from the current `origin/dev` ref
   - a unique title containing the issue number
   - a prompt containing the issue URL and the instructions below
5. In each task, inspect the issue and relevant callers, callees, types, tests, and configuration; reproduce or otherwise verify the root cause; implement the smallest compatible fix; add regression coverage; and report changed files, evidence, verification results, and limitations. Immediately run the completion gate below after the fix. Do not manually close the issue, remove `WIP`, or create additional tasks. After the gate completes, create a draft PR against `dev` from that task's branch and include `Fixes #<issue-number>` in the PR body so GitHub closes the issue when the PR is merged.
   Completion gate: Immediately after completing the fix and regression coverage, explicitly invoke `$critical-review-fix-loop` against the task's current diff. Follow that skill completely: read `$critical-review`, record the full P0–P4 review, fix every authorized issue-scope P0–P2 finding, and rerun the review and required checks until no P0–P2 findings remain. The loop must run applicable unit tests, `typecheck`, lint, and formatting checks; lint or build cannot replace tests or `typecheck`. If the loop is blocked, do not bypass the block or create the draft PR; report the blocker, changed files, evidence, verification results, and limitations.
6. When `create_thread` returns ready `threadId` values, wait for all created tasks with `wait_threads`. Never pass a pending `clientThreadId` to a thread tool; report pending handles until the task IDs become available.
7. Finish with the selected issue URLs, WIP-label result, per-task chat/worktree status, and verification results. Leave `WIP` on every selected issue.

## Guardrails

- Do not select closed, non-bug, or already-WIP issues.
- Keep the selection and labeling limited to at most three issues.
- Do not use a same-directory fork or nested delegation; each issue must have its own user-visible task and project worktree.
- If task creation fails after labeling, leave the label in place and report the failed issue rather than silently removing it.
