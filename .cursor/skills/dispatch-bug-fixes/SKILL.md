---
name: dispatch-bug-fixes
description: Manually select three open bug issues without WIP, label them WIP, and dispatch each to a separate Cursor Background Agent worktree for review and fixing.
disable-model-invocation: true
---

# Dispatch bug fixes

Run this workflow only when explicitly invoked with `/dispatch-bug-fixes`.

## Scope

Work in `bichikim/web`. Select exactly three open issues that have the `bug` label and do not have the `WIP` label. Unless the caller supplies issue numbers, sort by creation time descending and select the three newest matches. If fewer than three issues match, report the result and stop before labeling or dispatching.

## Workflow

1. Refresh the GitHub issue and label state. Prefer the configured GitHub integration; otherwise use the authenticated GitHub CLI.
2. Check for the exact `WIP` label. If it does not exist, create it with color `fbca04` and description `Work in progress`. Do not edit an existing label's metadata.
3. Revalidate every selected issue immediately before mutation: it must be open, have `bug`, and lack `WIP`. Apply `WIP` to all three and verify the result. If any label mutation fails, stop dispatching and report which issues changed.
4. Fetch the latest `origin/dev`. For each issue, start a separate Cursor Background Agent from the latest `dev` state using the Background Agent sidebar or `Ctrl+E`; do not use a chat tab alone because the issues require isolated worktrees. If the Cursor host exposes a Background Agents API, start the three runs independently in parallel.
   - Select `gpt-5.6-luna` and Max Mode when those options are available. If Cursor cannot expose that model or mode, report routing as unverified instead of silently substituting another model.
   - Give every run a unique title containing its issue number and the issue URL.
   - Require an isolated branch/worktree per issue and do not reuse the current chat's checkout.
5. Give each agent this task: inspect the issue and relevant callers, callees, types, tests, and configuration; reproduce or otherwise verify the root cause; implement the smallest compatible fix; add regression coverage; run relevant tests, `pnpm lint`, and `pnpm format`; and report changed files, evidence, verification results, and limitations. When the fix is complete, create a draft PR against `dev` from that agent's branch and include `Fixes #<issue-number>` in the PR body so GitHub closes the issue when the PR is merged. Do not manually close the issue, remove `WIP`, or create additional agents.
6. Follow each Background Agent's status and completion signal. Do not claim a fix is complete before the corresponding agent finishes. If the current Cursor surface cannot create Background Agents programmatically, return three ready-to-paste agent prompts and the exact blocker instead of claiming that dispatch succeeded.
7. Finish with the selected issue URLs, WIP-label result, per-agent chat/branch/worktree status, and verification results. Leave `WIP` on every selected issue.

## Guardrails

- Do not select closed, non-bug, or already-WIP issues.
- Keep the selection and labeling limited to exactly three issues.
- Do not use the current checkout for more than one issue; each issue must have its own Background Agent worktree.
- If task creation fails after labeling, leave the label in place and report the failed issue rather than silently removing it.
