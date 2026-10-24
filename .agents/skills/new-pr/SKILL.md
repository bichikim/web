---
name: new-pr
description: Create and verify a draft GitHub pull request against dev, ensuring changes are committed and pushed from a real task branch with Summary and Testing sections.
---

# Create new pull request

Create a new PR using the steps below.

## Workflow

1. Before editing, committing, or pushing, run `git branch --show-current`.
   - If the output is empty (detached `HEAD`) or the current branch is `dev`, create and check out a dedicated branch from the current `HEAD`.
   - Use `codex/bug-<issue-number>-<slug>` when an explicit issue number is available; otherwise use `codex/feature/<name>`. Add a short unique suffix if the name already exists.
   - Run `git branch --show-current` again and verify the result is non-empty, issue/task-specific, and not `dev` before continuing. Never edit, commit, push, or create a PR from detached `HEAD` or `dev`.
2. If there are uncommitted changes, review them briefly (see **Safety** below), then commit only task-related changes.
3. Push the verified task branch to the remote.
4. Create a draft PR with `dev` as the base branch.
5. Verify the created PR through GitHub before finishing: confirm its URL, draft status, `dev` base, expected head branch, and any required issue-closing reference. Do not poll or wait for remote CI or deployment checks unless the user explicitly asks.

If the current branch is not `dev`, use it as-is and run steps 2-5 above.

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
- After creation, verify the returned PR directly (for example with `gh pr view <url> --json url,isDraft,baseRefName,headRefName,body`) and report the verified URL and branch name.

Include the following sections in the PR body:

- Summary: Brief overview of the PR changes
- Testing: How reviewers can verify the changes
