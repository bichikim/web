---
name: critical-review
description: Review code for correctness, maintainability, security (including abuse resistance), lifecycle, and performance; verify every finding's cause and concrete impact first.
disable-model-invocation: true
---

# Critical Review

Review the explicit target and relevant callers, callees, types, tests, and configuration. Ask for an anchor if unclear.

## Required coverage

Complete all three perspectives before one report:

1. **Behavior:** correctness, security, lifecycle, accessibility, and performance through consumer contracts, errors, races, and cleanup.
2. **Refactoring:** coupling, testability, avoidable complexity, declarative programming, state derivation, and side-effect boundaries.
3. **Naming and structure:** applicable skills' naming, folder, and module rules.

Read the matching rules during every review:

- For paths crossing trust boundaries or exposing caller-triggered side effects: [abuse resistance](rules/abuse-resistance.md).
- For rendering stalls or any path whose work or retained resources can grow with input, accumulated data, concurrency, or duration: [performance](rules/performance.md).
- For Solid code: [reactivity and lifecycle](rules/solid.md).

Report behavior defects found through any perspective by verified impact; never downgrade them to P3. Merge shared causes and fixes while preserving distinct impacts and locations. Disclose unfinished perspectives or required verification; do not claim completion.

## Refactoring and structure

Apply these rules within the refactoring and naming/structure perspectives:

- Report verified skill-structure violations without behavior impact as P3, citing the rule, code, and maintenance or testability cost.
- Require deterministic tests of production behavior and failure paths through explicit inputs and replaceable boundaries. Report invasive mocking or hidden global, time, random, network, or process dependencies as P3 even without a behavior defect.
- Prefer deleting unnecessary branches, helpers, modes, or layers over rearranging them.
- Flag changed code files over 600 lines; exclude non-code assets.
- Keep directory-wide context in `README.md`; explain an item in its own file when possible, otherwise in `[filename].md`.
- Config `.ts` files directly under `apps/pomo`, `apps/coong`, or `packages/*` must not import their `src/**`. Report reverse imports; ask before implementing an unavoidable exception.

## Evidence and severity

Ground expected behavior in consumer contracts; missing requirements are verification gaps. Findings require a falsifiable cause, a disproof-capable check, and its observed result. Behavior defects need concrete runtime or user impact; P3/P4 proposals need design evidence and maintenance or testability cost. Warnings, size, unusual code, and analyzer output are leads, not findings.

Trace browser/server/Worker, build/runtime, and eager/on-demand boundaries. Performance claims require measurement of the affected client artifact or request; server warnings, raw size, and `import()` alone are insufficient. Put material unproven leads under **Verification gaps**, without severity or fix claims.

- **P0:** active widespread security incident, irreversible data loss, or outage.
- **P1:** exploitable security flaw, data corruption, or core-path failure.
- **P2:** reproducible scoped defect or concrete operational/maintainability impact.
- **P3:** non-blocking structural improvement without current behavior impact.
- **P4:** optional cleanup, consistency, or wording.

## Output

Report risks and actionable alternatives, not praise. Start with scope, overall risk, and P0–P2 findings discovered, fixed, and remaining; distinguish none found from none remaining after fixes. Then list verification gaps and P3/P4 proposals. Explicitly state when no material verification gaps remain; incomplete verification does not establish absence of defects.

Number findings by severity. Include title, risk, cause, verification, observed result, and fix with rationale/tradeoffs; number verification gaps separately. List material out-of-scope items.
