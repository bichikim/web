---
name: critical-review
description: Review code for correctness, maintainability, security, lifecycle, and performance; verify every finding's cause and concrete impact first.
disable-model-invocation: true
---

# Critical Review

Review the explicit target and relevant callers, callees, types, tests, and configuration. Ask for an anchor if unclear.

## Review perspectives

Review every target through these three perspectives:

1. **Behavior bugs:** verify correctness, security, lifecycle, accessibility, and performance defects through consumer contracts, errors, races, and cleanup; inspect structure only as needed to establish behavior.
2. **Refactoring:** coupling, testability, avoidable complexity, declarative programming, state derivation, and side-effect boundaries.
3. **Naming and structure:** apply skills' naming and folder rules to names, file placement, and module organization.

Report any behavior defect encountered, regardless of the perspective that reveals it. Severity follows verified impact, not the perspective; never downgrade verified behavior defects to P3. Cover scope, findings with evidence and fixes (or explicitly none), and verification gaps.

Complete all three perspectives before producing one report. Merge findings sharing a root cause and fix, preserving distinct impacts and locations. Use the verification gate and output contract below. Disclose unfinished coverage; do not claim completion when a perspective or required verification cannot finish.

## Shared review rules

- Report risks and actionable alternatives, not praise.

Severity: **P0** active widespread security incident, irreversible data loss, or outage; **P1** exploitable security flaw, data corruption, or core-path failure; **P2** reproducible scoped defect or concrete operational/maintainability impact; **P3** non-blocking structural improvement without current behavior impact; **P4** optional cleanup, consistency, or wording.

## Refactoring and structure rules

The refactoring and naming/structure perspectives apply these rules within their respective roles; they are not an additional checklist for the behavior perspective.

- Report verified skill-structure violations without behavior impact as P3, citing the rule, code, and maintenance or testability cost.
- Require deterministic testing of production behavior and failure paths through explicit inputs and replaceable boundaries. Report invasive mocking or hidden global, time, random, network, or process dependencies as P3 even without a behavior defect.
- Prefer deleting branches, helpers, modes, or layers over rearranging avoidable complexity.
- Flag changed code files over 600 lines; exclude non-code assets.

- `README.md`: keep directory-wide context there; explain an item in its own file when possible, otherwise in `[filename].md`.
- Config `.ts` files directly under `apps/pomo`, `apps/coong`, or `packages/*` roots, including `vite.config.ts`, must not import their `src/**`. Report reverse imports; ask before implementing an unavoidable exception.

## Verification gate

Warnings, size, unusual code, and analyzer output are leads. Findings require a falsifiable cause, a disproof-capable check, and its observed result. Behavior defects need concrete runtime or user impact; P3/P4 improvements need design evidence and maintenance or testability cost, without implying a behavior defect.

Trace browser/server/Worker, build/runtime, and eager/on-demand boundaries. Performance claims require measurement of the affected client artifact or request; server warnings, raw size, and `import()` alone are insufficient.

Assign severity only to verified findings. Put material unproven leads under **Verification gaps** without severity or fix claims.

## Output

Start with scope, overall risk, and P0–P2 findings discovered, fixed, and remaining; distinguish none found from none remaining after fixes. Present P0–P2 findings first, then **Verification gaps** with missing evidence, then P3/P4 proposals. Explicitly state when there are no material verification gaps; incomplete verification is not evidence of no defects.

Number findings by severity and give each: title, risk, cause, verification, observed result, and fix with rationale/tradeoffs. Number verification gaps separately. List material **Out of scope** items when present.
