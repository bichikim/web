---
name: new-pr
description: Create a GitHub pull request from the current branch—commit uncommitted changes, push, and open a PR against main with an auto-generated title and Summary/Testing body sections.
disable-model-invocation: true
---

# Create new pull request

Create a new PR using the steps below.

1. If the current branch is `dev`, create a `feature/<name>` branch.
2. If there are uncommitted changes, commit them.
3. Push the branch to the remote.
4. Create a PR with `dev` as the base branch.

Unless the user explicitly asks for a ready (non-draft) PR, create it as a **draft**.

If the current branch is not `dev`, use it as-is and run steps 2-4 above.

Generate the PR title automatically based on the changes.

If GitHub MCP is configured, create the PR. If it is not configured, stop the task.

Include the following sections in the PR body:

- Summary: Brief overview of the PR changes
- Testing: How reviewers can verify the changes
