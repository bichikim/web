---
name: new-pr
description: Create a GitHub pull request from the current branch—commit uncommitted changes, push, and open a PR against main with an auto-generated title and Summary/Testing body sections.
disable-model-invocation: true
---

# Create new pull request

Create a new PR using the steps below.

## Workflow

1. If the current branch is `dev`, create a `feature/<name>` branch.
2. If there are uncommitted changes, review them briefly (see **Safety** below), then commit.
3. Push the branch to the remote.
4. Create a PR with `dev` as the base branch.

If the current branch is not `dev`, use it as-is and run steps 2-4 above.

## Safety

Before committing or pushing:

- **Secrets/credentials**: If changes may include secrets or credentials (e.g. `.env`, API keys, tokens, passwords), stop and tell the user. Do not commit or push.
- **Destructive git commands**: Prefer normal commands (`git push`, `git merge`, etc.). Do not use destructive commands (e.g. `git push --force`, `git reset --hard`) unless the user explicitly requests them; ask first if unsure.
- **Git config**: Do not change git config. If a config change seems necessary, ask the user first.
- **Pre-commit review**: Briefly review staged and unstaged changes before committing. If fixes are needed (secrets, unrelated files, incomplete work), stop and tell the user what to change before proceeding.

## Pull request

- Unless the user explicitly asks for a ready (non-draft) PR, create it as a **draft**.
- Generate the PR title automatically based on the changes.
- If GitHub MCP is configured, create the PR. If it is not configured, stop the task.

Include the following sections in the PR body:

- Summary: Brief overview of the PR changes
- Testing: How reviewers can verify the changes
