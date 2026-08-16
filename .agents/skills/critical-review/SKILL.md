---
name: critical-review
description: Review code for correctness, maintainability, security, lifecycle, and performance issues only after verifying each finding's cause and concrete impact.
disable-model-invocation: true
---

# Critical Review

Review the explicit target against enterprise-grade correctness, security, lifecycle, maintainability, accessibility, and performance expectations. If the target is unclear, ask for an anchor. Trace only relevant callers, callees, types, tests, and configuration; read matching project skills before reporting findings.

## Rules

- Report risks and actionable alternatives, not praise.
- Review consumer contracts, misuse risk, responsibility boundaries, coupling, error paths, races, and cleanup.
- Prefer deleting branches, helpers, modes, or layers over rearranging avoidable complexity.
- Flag modified or new code files over 600 lines unless they are non-code assets.

## Verification gate

Treat warnings, large files, unusual code, and analyzer output as leads, not findings. For every candidate:

1. State a falsifiable cause.
2. Choose and run a check that can disprove it.
3. Record the observed result.
4. Connect that result to concrete runtime or user impact.

Trace browser, server, Worker, build-time, eager, and on-demand boundaries instead of inferring across them. For performance claims, measure the affected client artifact or runtime request; server warnings, raw size, and `import()` alone prove nothing.

Only verified candidates become severity-tagged findings. Put material unproven candidates under **Verification gaps** without severity or a fix claim. Give each finding a concrete fix and include a focused diff or snippet when useful.

## Output

### Summary

State scope, overall risk, and whether P0/P1 findings exist.

### Findings

Number findings in severity order:

#### {N}. [{severity}] {short title}

- **Risk:** concrete impact
- **Cause:** verified mechanism
- **Verification:** reproduction, command, trace, or measurement
- **Result:** observed proof
- **Fix:** change, rationale, and tradeoffs
- **Example:** focused diff or snippet when useful

### Verification gaps (optional)

Number material leads and state the missing evidence. Do not call them defects.

### Out of scope (optional)

List only material unrelated issues noticed in passing.
