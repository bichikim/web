---
name: skill-diet
description: Reduce an existing Codex skill to its minimum useful form, extract on-demand context into linked sibling files, or decide that the skill should be deleted. Use when the user asks to diet, slim, trim, simplify, minimize, reevaluate, or remove bloat from a skill while preserving its trigger behavior, tone, safety constraints, and practical usefulness.
---

# Skill Diet

## Goal

Shrink a skill until only durable behavior remains. Prefer deletion when the skill only repeats general model ability, AGENTS.md rules, or non-actionable advice.

## Loop

Repeat until the next deletion or extraction would change behavior:

1. Name the skill's real job in one sentence.
2. Mark what must survive in `SKILL.md`: trigger wording, safety constraints, project-specific rules, resource routing, output contract, and one boundary example if needed.
3. Split the rest into delete vs extract:
   - Delete: history, rationale, duplicated examples, long reference summaries, generic advice, aspirational wording, and examples that do not change decisions.
   - Extract: useful context the model should not load on every run (long examples, pattern catalogs, deep references, edge-case tables). Move it to a sibling file and leave only a when-to-open link in `SKILL.md`.
4. Re-read the smaller skill as if seeing it for the first time. Confirm linked files are opened only when the link's condition matches.
5. Check outcome parity: for the skill's real job (step 1), walk 1–3 typical invocations and confirm the reduced skill still yields the same decisions, constraints, routing, and output contract as before. If parity breaks, restore the missing rule or tighten an extract link — do not ship a smaller skill that changes results.
6. Run the smallest validation available. If this skill's script is available, run `node scripts/validate-skill.js <skill_directory>`. For repo changes, also run required format/lint commands.

## Extract On Demand

Prefer extraction over inlining when content helps only in some invocations.

- Put extracted files beside the skill (`rules/`, `examples/`, `references/`, or a named `.md`).
- In `SKILL.md`, keep a one-line conditional link only — e.g. `See ./rules/foo.md when …`. Do not paste or summarize the extracted body.
- Keep links one level deep from `SKILL.md`. Do not chain reference → reference.
- Match this repo's pattern: core rules stay in `SKILL.md`; detail lives behind `See ./…` links the agent opens when relevant.

## Delete Instead

Delete the skill if all are true:

- No durable trigger is needed.
- No project- or domain-specific rule remains.
- No reusable resource routing remains.
- The remaining behavior is already covered by system, developer, AGENTS.md, or normal model ability.

When deleting, remove the whole skill folder and state the reason.

## Keep

Keep in `SKILL.md` only rules that prevent a likely future mistake. Keep inline examples only when they define a boundary the model may otherwise miss. Everything else useful but situational goes behind a link.

## Output

Report:

- decision: kept, reduced, or deleted
- before/after size
- what stayed, what was extracted (paths), and why
- outcome parity: invocations checked and pass/fail
- validation run
