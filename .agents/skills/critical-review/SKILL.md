---
name: critical-review
description: Review code for correctness, maintainability, security, lifecycle, and performance; verify every finding's cause and concrete impact first.
disable-model-invocation: true
---

# Critical Review

Review the explicit target and relevant callers, callees, types, tests, and configuration. Ask for an anchor if unclear.

## Three-agent review

Use three independent, read-only subagents on the same target; no nested delegation. Give each the scope, project instructions, and rules below. Each reads and applies skills matching the target's language, framework, and its review role:

1. **Behavior bugs:** correctness, security, lifecycle, accessibility, and performance.
2. **Refactoring:** general improvements plus declarative programming, state derivation, and side-effect boundaries.
3. **Naming and structure:** apply skills' naming and folder rules to names, file placement, and module organization.

Each returns scope, findings with evidence and fixes (or explicitly none), and verification gaps.

Wait for all three. The parent verifies evidence, resolves conflicts, and merges findings sharing a root cause and fix, preserving distinct impacts and locations. Return one report under the verification gate and output contract below. Disclose unfinished coverage; do not claim completion if an agent cannot finish.

## Review rules

- Report risks and actionable alternatives, not praise.
- Check consumer contracts, misuse risk, boundaries, coupling, errors, races, and cleanup.
- Report verified skill-structure violations as P3, citing the rule, code, and maintenance or testability cost. Never downgrade verified behavior defects to P3.
- Require deterministic testing of production behavior and failure paths through explicit inputs and replaceable boundaries. Report invasive mocking or hidden global, time, random, network, or process dependencies as P3 even without a behavior defect.
- Prefer deleting branches, helpers, modes, or layers over rearranging avoidable complexity.
- Flag changed code files over 600 lines; exclude non-code assets.

Severity: **P0** active widespread security incident, irreversible data loss, or outage; **P1** exploitable security flaw, data corruption, or core-path failure; **P2** reproducible scoped defect or concrete operational/maintainability impact; **P3** non-blocking structural improvement without current behavior impact; **P4** optional cleanup, consistency, or wording.

- `README.md`: keep directory-wide context there; explain an item in its own file when possible, otherwise in `[filename].md`.
- Config `.ts` files directly under `apps/pomo`, `apps/coong`, or `packages/*` roots, including `vite.config.ts`, must not import their `src/**`. Report reverse imports; ask before implementing an unavoidable exception.

## Verification gate

Warnings, size, unusual code, and analyzer output are leads. Findings require a falsifiable cause, a disproof-capable check, and its observed result. Behavior defects need concrete runtime or user impact; P3/P4 improvements need design evidence and maintenance or testability cost, without implying a behavior defect.

Trace browser/server/Worker, build/runtime, and eager/on-demand boundaries. Performance claims require measurement of the affected client artifact or request; server warnings, raw size, and `import()` alone are insufficient.

Assign severity only to verified findings. Put material unproven leads under **Verification gaps** without severity or fix claims.

## Output

Start with scope, overall risk, and whether P0/P1 exists. Number findings by severity and give each: title, risk, cause, verification, observed result, fix with rationale/tradeoffs, and optional example. Then list numbered **Verification gaps** with missing evidence and material **Out of scope** items; omit empty optional sections.
