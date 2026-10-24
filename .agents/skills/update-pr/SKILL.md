---
name: update-pr
description: Update the current branch's GitHub pull request by committing and pushing changes, then refreshing its title and body from the full diff against the PR's actual base branch.
disable-model-invocation: true
---

# Update pull request

Find the current branch's PR and read its actual base branch. Review and commit task-related changes, push, then update the title and body from the full diff against that base. Preserve unrelated work and apply the pre-commit boundaries in the `new-pr` skill.

Prefer GitHub MCP when configured; otherwise use the authenticated GitHub CLI (`gh`). Stop only when neither is available or authentication fails after the applicable authentication retry.
