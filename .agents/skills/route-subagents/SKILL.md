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

- Use `gpt-5.6-luna` with `max` for ordinary coding, cross-file analysis, review, implementation, unit tests, mechanical execution, and other bounded work.
- Use `gpt-6-astra` with `high` for complex design, ambiguous bugs, high-risk decisions, difficult logic, and final integration review.
- The parent retains authorization, integration ownership, and final judgment; Astra performs the high-risk or final review when that route is selected.

Use `fork_turns: "none"` and send only required context. Start with Luna `max` by default. Route to Astra `high` only when complexity, ambiguity, risk, or final integration review requires it; never rerun successful work automatically on a stronger model.

Read [model-routing.md](references/model-routing.md) when the model or effort is not obvious, or when concrete comparison examples would change the route.

## Worker Contract

Each `spawn_agent` request includes task name, working directory, objective, read/write scope, constraints, completion checks, evidence, uncertainty, escalation conditions, report format, and no nested delegation unless allowed.

Use one worker by default. Add workers only for independent read-heavy scopes or material wall-time reduction, never for edits to the same files. Wait, review their evidence, and synthesize the result.

Read [execution-routing.md](references/execution-routing.md) when delegating unit-test work or package scripts.

## Evaluate the Routing

Do not infer savings from prices, research percentages, or model labels. Compare representative parent-only and delegated runs by success, evidence, parent rework, observed usage, latency, and coordination failures; keep a route only at equal final quality.
