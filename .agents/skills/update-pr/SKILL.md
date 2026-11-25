---
name: update-pr
description: Update an existing GitHub PR from its task branch and refresh its title and body against its actual base.
disable-model-invocation: true
---

# Update pull request

Find the current branch's PR and read its actual base branch. Review and commit task-related changes, push, then update the title and body from the full diff against that base. Preserve unrelated work and apply the pre-commit boundaries in [new-pr](../new-pr/SKILL.md#safety).

Prefer GitHub MCP when configured; otherwise use the authenticated GitHub CLI (`gh`). Stop only when neither is available or authentication fails after the applicable authentication retry.
