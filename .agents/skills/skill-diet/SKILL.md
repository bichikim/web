---
name: skill-diet
description: Reduce a Codex skill to its minimum useful form or delete it when redundant while preserving triggers, tone, safety constraints, and usefulness; extract conditional context when needed.
---

# Skill Diet

Shrink a skill to durable behavior only. Cut aggressively — outcome parity is the safety net. Prefer deleting the skill when it only repeats general model ability, AGENTS.md, or non-actionable advice.

## Loop

Repeat until the next cut would change behavior:

1. Name the skill's real job in one sentence.
2. Keep in `SKILL.md` only: trigger wording, safety constraints, project-specific rules, resource routing, output contract, and one boundary example if needed.
3. Delete the rest, or extract situational context behind a when-to-open link:
   - Delete: history, rationale, duplicated/non-decisive examples, long reference summaries, generic or aspirational advice.
   - Extract: long examples, pattern catalogs, deep references, edge-case tables.
4. Re-read as a first-time reader. Linked files open only when their condition matches.
5. Outcome parity:
   - For wording-only edits, walk 1–3 typical invocations mentally.
   - For behavior-affecting cuts, use two fresh agents with no conversation history. Give both the skill and raw task artifacts, never the expected answer or prior diagnosis.
   - Use complementary cases: one checks that required behavior still appears; the other checks that boundaries hold without false positives or overreach. Add cases only for materially different modes.
   - Compare decisions, constraints, routing, and output contracts. Restore missing rules or tighten links on failure. Revert temporary side effects.
   - If fresh agents are unavailable, report that independent validation was not run; never describe a mental walkthrough as fresh validation.
6. Validate: `node scripts/validate-skill.js <skill_directory>` when available. For repo changes, also run required format/lint.

## Extract

When content helps only some invocations, move it beside the skill (`rules/`, `examples/`, `references/`, or a named `.md`). In `SKILL.md`, leave only a one-line conditional link — e.g. `See ./rules/foo.md when …`. Do not summarize the extracted body. Links stay one level deep from `SKILL.md`.

## Delete the skill

Delete the whole skill folder (and state why) when all are true:

- No durable trigger needed
- No project-/domain-specific rule remains
- No reusable resource routing remains
- Remaining behavior is already covered by system, AGENTS.md, or normal model ability

## Output

Report:

- decision: kept, reduced, or deleted
- before/after size
- what stayed, what was extracted (paths), and why
- outcome parity: invocations checked and pass/fail
- validation run
