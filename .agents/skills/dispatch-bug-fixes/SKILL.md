---
name: dispatch-bug-fixes
description: Manually select three open bug issues without WIP, label them WIP, and dispatch each to a separate Luna max worktree for review and fixing.
---

# Dispatch bug fixes

Use this workflow only when explicitly invoked as `$dispatch-bug-fixes`.

## Scope

Work in `bichikim/web`. Select exactly three open issues that have the `bug` label and do not have the `WIP` label. Unless the caller supplies issue numbers, sort by creation time descending and select the three newest matches. If fewer than three issues match, report the result and stop before labeling or dispatching.

## Workflow

1. Refresh the GitHub issue and label state. Prefer the configured GitHub integration; otherwise use the authenticated GitHub CLI.
2. Check for the exact `WIP` label. If it does not exist, create it with color `fbca04` and description `Work in progress`. Do not edit an existing label's metadata.
3. Revalidate every selected issue immediately before mutation: it must be open, have `bug`, and lack `WIP`. Apply `WIP` to all three and verify the result. If any label mutation fails, stop dispatching and report which issues changed.
4. Fetch the latest `origin/dev`, resolve the Git repository project with `list_projects`, and create one separate Codex task per issue with `mcp__codex_app__create_thread`:
   - `model: "gpt-5.6-luna"`
   - `thinking: "max"`
   - a project `worktree` environment starting from the current `origin/dev` ref
   - a unique title containing the issue number
   - a prompt containing the issue URL and the instructions below
5. In each task, inspect the issue and relevant callers, callees, types, tests, and configuration; reproduce or otherwise verify the root cause; implement the smallest compatible fix; add regression coverage; run relevant tests, `pnpm lint`, and `pnpm format`; and report changed files, evidence, verification results, and limitations. Do not create additional tasks, close the issue, remove `WIP`, or create a pull request.
6. When `create_thread` returns ready `threadId` values, wait for all three tasks with `wait_threads`. Never pass a pending `clientThreadId` to a thread tool; report pending handles until the task IDs become available.
7. Finish with the selected issue URLs, WIP-label result, per-task chat/worktree status, and verification results. Leave `WIP` on every selected issue.

## Guardrails

- Do not select closed, non-bug, or already-WIP issues.
- Keep the selection and labeling limited to exactly three issues.
- Do not use a same-directory fork or nested delegation; each issue must have its own user-visible task and project worktree.
- If task creation fails after labeling, leave the label in place and report the failed issue rather than silently removing it.
