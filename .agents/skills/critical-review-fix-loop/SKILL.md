---
name: critical-review-fix-loop
description: Run only when explicitly invoked as $critical-review-fix-loop; use $critical-review to fix P0/P1/P2 findings until verification passes, then report P3/P4 findings.
disable-model-invocation: true
---

# Critical Review Fix Loop

1. Use the user's target, otherwise the current task's diff; ask once if neither is reliable.
2. Read `$critical-review`, record a full P0–P4 review, fix every authorized P0–P2 while preserving unrelated changes, and verify each fix.
3. Re-run a fresh full review over the relevance cone until no P0–P2 remains and relevant unit tests, `typecheck`, lint, and formatting pass. Lint or build cannot replace tests or `typecheck`.
4. Diagnose the root cause before retrying a surviving finding; never omit or downgrade one to finish.
5. Keep P3/P4 evidence and fixes. After correctness closure, group structural P3s into an unimplemented refactor proposal requiring user authorization.

Mark absent applicable test or `typecheck` scripts as not applicable with a reason. Stop as blocked when a required check cannot run or a fix needs product direction, new authority, destructive action, or external change.

Report pass count, fixed P0–P2s, exact test and `typecheck` commands/results, other checks, and final status (`no P0/P1/P2 findings` or `blocked`). Number remaining P3/P4s or write `none`.
