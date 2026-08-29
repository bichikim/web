---
name: route-subagents
description: Delegate independent, bounded scripts, research, review, tests, or implementation when results are compact and cheap to verify; skip trivial, ambiguous, coupled, or hard-to-verify work.
---

# Route Subagents

The parent owns planning, authorization, integration, and final judgment. Use the minimum workers needed for independent work, context isolation, or lower wall time—not merely for a cheaper model.

## Delegation Gate

Delegate only when the work has all of these properties:

- Its objective, inputs, allowed actions, and completion evidence are known before spawning.
- It is independent or safely parallel, and large enough to justify coordination.
- It returns a compact result that the parent can verify cheaply without repeating the work.
- Writes are explicitly scoped and non-overlapping; failure cannot contaminate unverified work.

Otherwise keep it in the parent, especially when short, sequential, ambiguous, decision-heavy, expensive to verify, or sharing write targets. Delegation never bypasses approval, sandbox, security, or external-mutation boundaries.

## Model Routing

- Use `gpt-5.6-luna` `low` for deterministic execution and collection, `medium` for bounded classification or synthesis, and `high`/`max` for difficult but tightly specified work with cheap objective verification. Raising Luna effort does not replace Terra when judgment scope broadens.
- Use `gpt-5.6-terra` `medium` for ordinary cross-file analysis, review, implementation, and unit tests; use `high` when complex logic or edge cases justify more checking.
- Use `gpt-5.6-sol` `high` or above only for an independent difficult workstream that materially reduces parent work. Keep ambiguous architecture, high-risk decisions, integration, and final review in the parent.

Use `fork_turns: "none"` and send only required context. Start with the least expensive route that meets the quality bar. Escalate only for contradictory evidence, failed checks, unclear behavior, repeated scope drift, or out-of-bound reasoning; never rerun successful work automatically on a stronger model.

Read [model-routing.md](references/model-routing.md) when the model or effort is not obvious, or when concrete comparison examples would change the route.

## Worker Contract

Each `spawn_agent` request includes task name, working directory, objective, read/write scope, constraints, completion checks, evidence, uncertainty, escalation conditions, report format, and no nested delegation unless allowed.

Use one worker by default. Add workers only for independent read-heavy scopes or material wall-time reduction, never for edits to the same files. Wait, review their evidence, and synthesize the result.

Read [execution-routing.md](references/execution-routing.md) when delegating unit-test work or package scripts.

## Evaluate the Routing

Do not infer savings from prices, research percentages, or model labels. Compare representative parent-only and delegated runs by success, evidence, parent rework, observed usage, latency, and coordination failures; keep a route only at equal final quality.
