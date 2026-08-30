---
name: critical-review
description: Review code for correctness, maintainability, security, lifecycle, and performance; verify every finding's cause and concrete impact first.
disable-model-invocation: true
---

# Critical Review

Review the explicit target for correctness, security, lifecycle, maintainability, accessibility, and performance. If unclear, ask for an anchor. Inspect only its relevant callers, callees, types, tests, and configuration, and read matching project skills first.

## Review rules

- Report risks and actionable alternatives, not praise.
- Check consumer contracts, misuse risk, boundaries, coupling, errors, races, and cleanup.
- Treat tests as first-class consumers of the design. Production behavior, including failure paths, must be deterministically exercisable through explicit inputs and replaceable boundaries; report code that requires invasive mocking or hidden global, time, random, network, or process state as P3 even when no current behavior defect is proven.
- Prefer deleting branches, helpers, modes, or layers over rearranging avoidable complexity.
- Flag changed code files over 600 lines; exclude non-code assets.

Severity: **P0** active widespread security incident, irreversible data loss, or outage; **P1** exploitable security flaw, data corruption, or core-path failure; **P2** reproducible scoped defect or concrete operational/maintainability impact; **P3** non-blocking structural improvement without current behavior impact; **P4** optional cleanup, consistency, or wording.

- `README.md`: keep directory-wide context there; explain an item in its own file when possible, otherwise in `[filename].md`.
- Config `.ts` files directly under `apps/pomo`, `apps/coong`, or `packages/*` roots, including `vite.config.ts`, must not import their `src/**`. Report reverse imports; ask before implementing an unavoidable exception.

## Verification gate

Warnings, size, unusual code, and analyzer output are leads. A finding requires a falsifiable cause, a check capable of disproving it, the observed result, and concrete runtime or user impact.

Trace browser/server/Worker, build/runtime, and eager/on-demand boundaries. Performance claims require measurement of the affected client artifact or request; server warnings, raw size, and `import()` alone are insufficient.

Tag only verified findings. Put material unproven leads under **Verification gaps** without severity or fix claims. Every finding needs a concrete fix; add a focused diff or snippet only when useful.

## Output

Start with scope, overall risk, and whether P0/P1 exists. Number findings by severity and give each: title, risk, cause, verification, observed result, fix with rationale/tradeoffs, and optional example. Then list numbered **Verification gaps** with missing evidence and material **Out of scope** items; omit empty optional sections.
