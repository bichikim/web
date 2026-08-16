---
name: critical-review
description: Review code for correctness, maintainability, security, lifecycle, and performance issues only after verifying each finding's cause and concrete impact.
disable-model-invocation: true
---

# Critical Review

Review target code against **enterprise-grade** expectations (correctness, maintainability, scalability, separation of concerns, robust error handling, consistent patterns). When relevant, apply the same bar to security, accessibility, and performance.

# Review rules

- Be ambitious about structural simplification.
  - Do not stop at "this could be a bit cleaner."
  - Look for opportunities to reframe the change so that whole branches, helpers, modes, conditionals, or layers disappear entirely.
  - Prefer the solution that makes the code feel inevitable in hindsight.
  - If you see a path to delete complexity rather than rearrange it, push hard for that path.

- A code file you modify or create must not exceed **600 lines**.
  - Treat this as a strong code-quality smell by default.
  - Prefer extracting subcomponents, modules, or local abstractions instead of letting a file sprawl past 600 lines.
  - Move hardcoded data (e.g. mock data) into `.json` files; `.json`, `.svg`, and similar non-code assets are exempt from line limits.
  - Move UnoCSS (and similar) style class definitions into well-named dedicated files.

## Scope

- **Explicit scope** (files, PR diff, modules, etc.) is the **entry point**, not a hard boundary.
- **Follow relevance**: open and review related code (callers, callees, shared types, tests, config) when needed to judge correctness, contracts, or lifecycle — even if not named in the request.
- Go **deep** across that relevance cone; do not skim the starting files or stop at symbols you never traced.
- **Empty or unclear entry point** → do not review; ask once which files, commits, or features to anchor on.

## Before you review

Identify code type in scope, find matching `.agents/skills/`, and **read them before any findings**.

## Review Rules

1. **No praise or positive commentary** — only **risks, defects, and actionable alternatives**.
2. **Do not promote a suspicion to a finding until it is verified.**
   - Treat warnings, large files, unusual code, and static-analysis output as investigation leads only.
   - Form a falsifiable cause, choose a check that can disprove it, run that check, and record the result.
   - Trace the relevant runtime boundary and load path. Distinguish browser, server, Worker, build-time, eager, and on-demand behavior instead of inferring one from another.
   - For performance findings, measure the affected client artifact or runtime request. A server warning, raw source size, or `import()` alone does not prove client impact.
   - If the cause, observed behavior, and concrete impact do not all connect, exclude it from Findings. Put a material unresolved lead under **Verification gaps** without severity or a fix claim.
3. Tag **severity** per issue (e.g. **P0** release/correctness/security blocker; **P1** maintainability, bug risk, fix after alignment).
4. Review as a **consumer**: API surface (names, types, props), misuse risk, clarity without extra context.
5. Check **decomposition/composition**; flag mixed responsibilities and coupling that blocks tests or reuse.
6. **Lifecycle/cleanup**: teardown gaps, races, dispose on unmount (`createEffect`/`onMount` + `onCleanup`; subscriptions, timers, listeners, `AbortController`). Solid: see `solidjs` — cleanup via `onCleanup`, not a returned function from `createEffect`.
7. Every finding needs a **concrete fix path** (what to change and why), not only a description of the current code. Ship **example code** with that path; prefer **unified diffs** (one diff per theme). Trivial one-liners: inline block only.

## Output

Use this structure every time. **Number findings** (`1`, `2`, `3`, …) so follow-ups can reference them (e.g. “fix 2 and 5”).

**Prioritize fix guidance over exposition.** Keep Risk/Cause/Verification/Result short; spend depth on how to improve the code.

### Summary

2–3 sentences: scope reviewed, overall risk, whether any **P0** exists. If no P0/P1 findings, say so explicitly.

### Findings

One block per issue, in severity order (P0 before P1). Repeat for each numbered item:

#### {N}. [{severity}] {short title}

- **Risk:** what breaks or degrades (brief)
- **Cause:** the specific mechanism believed to produce the problem
- **Verification:** how the cause was tested, including the relevant command, reproduction, trace, or measurement
- **Result:** what was observed and how it proves both the cause and concrete impact
- **Fix:** what to change, why it helps, and tradeoffs if any — this is the main content
- **Example:** drop-in snippet or unified diff implementing **Fix**; add comments on **non-obvious** lines explaining _why_ (intent), not what the syntax does. Skip noise comments and narrating obvious code. Match `AGENTS.md` comment style when the snippet is production-shaped (JSDoc = contract; `//` = why at the decision point)

### Verification gaps (optional)

Number material leads that could not be proven. State exactly what evidence is missing. Do not assign severity, call them defects, or prescribe a fix.

### Out of scope (optional)

Brief bullets only for material issues in **unrelated** code noticed in passing — no deep review there.
