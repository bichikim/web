---
name: skill-diet
description: Reduce an existing Codex skill to its minimum useful form, or decide that the skill should be deleted. Use when the user asks to diet, slim, trim, simplify, minimize, reevaluate, or remove bloat from a skill while preserving its trigger behavior, tone, safety constraints, and practical usefulness.
---

# Skill Diet

## Goal

Shrink a skill until only durable behavior remains. Prefer deletion when the skill only repeats general model ability, AGENTS.md rules, or non-actionable advice.

## Loop

Repeat until the next deletion would change behavior:

1. Name the skill's real job in one sentence.
2. Mark what must survive: trigger wording, safety constraints, project-specific rules, resource routing, output contract, and one boundary example if needed.
3. Delete everything else: history, rationale, duplicated examples, long reference summaries, generic advice, aspirational wording, and examples that do not change decisions.
4. Re-read the smaller skill as if seeing it for the first time.
5. Run the smallest validation available. If this skill's script is available, run `node scripts/validate-skill.js <skill_directory>`. For repo changes, also run required format/lint commands.

## Delete Instead

Delete the skill if all are true:

- No durable trigger is needed.
- No project- or domain-specific rule remains.
- No reusable resource routing remains.
- The remaining behavior is already covered by system, developer, AGENTS.md, or normal model ability.

When deleting, remove the whole skill folder and state the reason.

## Keep

Keep only rules that prevent a likely future mistake. Keep examples only when they define a boundary the model may otherwise miss.

## Output

Report:

- decision: kept, reduced, or deleted
- before/after size
- what stayed and why
- validation run
