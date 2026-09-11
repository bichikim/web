---
name: new-pr
description: Create a GitHub pull request from the current branch by committing changes, pushing, and opening against dev with generated Summary and Testing sections.
---

# Create new pull request

Create a new PR using the steps below.

## Workflow

1. If the current branch is `dev`, create a `feature/<name>` branch.
2. If there are uncommitted changes, review them briefly (see **Safety** below), then commit.
3. Push the branch to the remote.
4. Create a PR with `dev` as the base branch.
5. Finish after the PR is created. Do not poll or wait for remote CI or deployment checks unless the user explicitly asks.

If the current branch is not `dev`, use it as-is and run steps 2-5 above.

## Safety

Before committing or pushing:

- **Secrets/credentials**: If changes may include secrets or credentials, stop and tell the user. Do not commit or push.
- **Destructive git commands**: Prefer normal commands (`git push`, `git merge`, etc.). Do not use destructive commands unless the user explicitly requests them; ask first if unsure.
- **Git config**: Do not change git config. If a config change seems necessary, ask the user first.
- **Pre-commit review**: Briefly review staged and unstaged changes before committing. Complete authorized fixes and select only task-related changes for the commit, preserving unrelated work. Ask only when proceeding requires additional authority or a user decision; follow the secrets rule above.

## Pull request

- Unless the user explicitly asks for a ready (non-draft) PR, create it as a **draft**.
- Generate the PR title automatically based on the changes.
- Prefer GitHub MCP when it is configured. Otherwise, use the authenticated GitHub CLI (`gh pr create`). Stop only when neither is available or authentication fails.

Include the following sections in the PR body:

- Summary: Brief overview of the PR changes
- Testing: How reviewers can verify the changes
