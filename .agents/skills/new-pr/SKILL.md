---
name: new-pr
description: Create and verify a new GitHub task PR against dev. Use for a new draft or ready task PR.
---

# Create new pull request

Create a new PR using the steps below.

## Workflow

1. Before editing, committing, or pushing, run `git branch --show-current`.
   - Reuse a checked-out branch only after verifying it belongs to the current task and is neither `dev` nor `main`.
   - From detached `HEAD` or `dev`, create a task branch at the current `HEAD`. From a different task branch, establish the current task’s base and isolate its changes before branching. Preserve unrelated changes and ask if the intended base or change ownership is ambiguous.
   - Name new branches `codex/bug-<issue-number>-<slug>` for an explicit issue or `codex/feature/<name>` otherwise. Add a short unique suffix for collisions. Recheck the branch and continue only once a branch for the current task is checked out.
2. If there are uncommitted changes, review them briefly (see **Safety** below), then follow [git](../git/SKILL.md) when drafting the commit message and commit only task-related changes.
3. Push the verified task branch to the remote.
4. Create a PR against `dev` using the rules below.
5. Verify the PR through GitHub and report its URL and branch. Check the requested draft status, `dev` base, expected head branch, and each required issue-closing reference. Wait for remote CI or deployment only on request.

## Safety

Before committing or pushing:

- **Secrets/credentials**: If changes may include secrets or credentials, stop and tell the user. Do not commit or push.
- **Destructive git commands**: Prefer normal commands (`git push`, `git merge`, etc.). Do not use destructive commands unless the user explicitly requests them; ask first if unsure.
- **Git config**: Do not change git config. If a config change seems necessary, ask the user first.
- **Pre-commit review**: Briefly review staged and unstaged changes before committing. Complete authorized fixes and select only task-related changes for the commit, preserving unrelated work. Ask only when proceeding requires additional authority or a user decision; follow the secrets rule above.
- **Branch/PR failures**: Retry recoverable network, approval, and transient failures. If branch creation, push, PR creation, or post-creation verification remains blocked, stop with the exact command output and do not claim that the PR was created.

## Pull request

- Unless the user explicitly asks for a ready (non-draft) PR, create it as a **draft**.
- Generate the PR title automatically based on the changes.
- Prefer GitHub MCP when it is configured. Otherwise, use the authenticated GitHub CLI (`gh pr create`). Stop only when neither is available or authentication fails.
- Do not perform a separate duplicate-PR lookup before creation; attempt PR creation directly and report the GitHub response if the branch already has a PR.
- When the changes fix a GitHub issue, include one closing reference per issue in the PR body using `Fixes #<issue-number>`. Use `Fixes owner/repo#<issue-number>` for issues in another repository. Use only issue numbers explicitly provided or directly verified from the current task or branch context; if the mapping is ambiguous, ask instead of guessing.
- If the caller supplies a required PR body, preserve it verbatim while ensuring it contains the required sections below; do not replace a review report with a generic template.

Include the following sections in the PR body:

- Summary: Brief overview of the PR changes
- Testing: How reviewers can verify the changes
