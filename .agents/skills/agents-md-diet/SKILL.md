---
name: agents-md-diet
description: Slim or reorganize AGENTS.md instructions while preserving behavior across directory scopes; use for deduplication, conditional extraction, or inherited-file audits.
---

# AGENTS.md Diet

Minimize instructions without changing which rules apply to any task or path.

## Workflow

1. Find every `AGENTS.md` from the repository root through the target subtree. Record each rule's origin, scope, overrides, and relevant project enforcement.
2. Build the effective instruction set for representative files in every affected scope before editing.
3. Keep only non-obvious, durable behavior:
   - safety and approval boundaries
   - required commands and quality gates
   - project conventions and operational gotchas
   - explicit routing to skills or references
4. Remove generic advice, history, rationale, stale facts, and identical descendant copies of inherited rules. Keep deliberate overrides where they take effect.
5. Move a shared rule only to the nearest common ancestor whose entire subtree should inherit it. Check unaffected descendants before broadening scope.
6. Keep always-on requirements in `AGENTS.md`. Conditional details may move to a skill or reference only when `AGENTS.md` retains the condition and routing instruction. Never make a manual skill the sole home of a rule required for every relevant task.
7. Repeat until the next cut would change an effective instruction set.

## Validation

- Compare the before/after effective instruction sets for at least two representative paths, including an override or unaffected boundary when present.
- For behavior-affecting cuts, use two fresh agents with no conversation history and only raw repository artifacts:
  - one performs a task that must retain a required behavior;
  - one performs a task in a different scope to detect leaked rules, false positives, or overreach.
- Do not reveal expected outcomes or prior diagnosis. Restore missing rules or narrow broadened scope on failure.
- If fresh agents are unavailable, state that independent validation was not run.
- Run repository format, lint, and dedicated instruction validation required by the applicable `AGENTS.md` files.

## Completion gate

Do not present the diet as complete until every workflow and validation step has run. If user confirmation is required before editing, label the proposal as unvalidated, obtain confirmation, then edit, validate with two fresh agents, run required checks, and report the results. If any step cannot run, explicitly report the skill as incomplete.

## Output

Report:

- decision and before/after size per file
- rules kept, removed, moved, or replaced, with destinations and reasons
- before/after scope checks
- fresh-agent cases and pass/fail
- validation commands and results
