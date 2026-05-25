---
name: critical-review
description: Review code for correctness risks, maintainability, security, and lifecycle issues with severity-tagged findings.
disable-model-invocation: true
---

# Critical Review

Review target code against **enterprise-grade** expectations (correctness, maintainability, scalability, separation of concerns, robust error handling, consistent patterns). When relevant, apply the same bar to security, accessibility, and performance.

## Scope

- Review only the **explicit scope** (files, PR diff, modules, etc.); go deep inside that boundary.
- **Empty or unclear scope** → do not review; ask once which files, commits, or features to include.

## Before you review

Identify code type in scope, find matching `.agents/skills/`, and **read them before any findings**.

## Review Rules

1. **No praise or positive commentary** — only **risks, defects, and actionable alternatives**.
2. **Evidence-based** critique: each claim needs a **code citation, reproduction path, or stated assumption**.
3. Tag **severity** per issue (e.g. **P0** release/correctness/security blocker; **P1** maintainability, bug risk, fix after alignment).
4. Review as a **consumer**: API surface (names, types, props), misuse risk, clarity without extra context.
5. Check **decomposition/composition**; flag mixed responsibilities and coupling that blocks tests or reuse.
6. **Lifecycle/cleanup**: teardown gaps, races, dispose on unmount (`createEffect`/`onMount` + `onCleanup`; subscriptions, timers, listeners, `AbortController`). Solid: see `solidjs` — cleanup via `onCleanup`, not a returned function from `createEffect`.
7. Every finding needs a **concrete fix path** (what to change and why), not only a description of the current code. Ship **example code** with that path; prefer **unified diffs** (one diff per theme). Trivial one-liners: inline block only.

## Output

Use this structure every time. **Number findings** (`1`, `2`, `3`, …) so follow-ups can reference them (e.g. “fix 2 and 5”).

**Prioritize fix guidance over exposition.** Keep Risk/Evidence short; spend depth on how to improve the code.

### Summary

2–3 sentences: scope reviewed, overall risk, whether any **P0** exists. If no P0/P1 findings, say so explicitly.

### Findings

One block per issue, in severity order (P0 before P1). Repeat for each numbered item:

#### {N}. [{severity}] {short title}

- **Risk:** what breaks or degrades (brief)
- **Evidence:** code citation, reproduction path, or stated assumption (brief)
- **Fix:** what to change, why it helps, and tradeoffs if any — this is the main content
- **Example:** drop-in snippet or unified diff implementing **Fix**; add comments on **non-obvious** lines explaining *why* (intent), not what the syntax does. Skip noise comments and narrating obvious code. Match `AGENTS.md` comment style when the snippet is production-shaped (JSDoc = contract; `//` = why at the decision point)

### Out of scope (optional)

Brief bullets only for material issues outside the requested boundary — no deep review.
