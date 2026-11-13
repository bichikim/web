---
name: critical-review-fix-loop
description: Run only when explicitly invoked as $critical-review-fix-loop; use $critical-review to fix P0/P1/P2 findings until verification passes, then report fixes, verification gaps, and remaining P3/P4 findings.
disable-model-invocation: true
---

# Critical Review Fix Loop

1. Use the user's target, otherwise the current task's diff; ask once if neither is reliable.
2. Read `$critical-review` and record a full P0–P4 review. For each suspected behavior defect, first write or extend an automated E2E, integration, or unit test at the level that exercises the affected contract, then run it before changing production code. Confirm that it fails because of the suspected defect; distinguish setup, runner, sandbox, and environment failures from product failures. Treat an unconfirmed defect as a verification gap, not a verified finding.
3. Fix every authorized P0–P2 while preserving unrelated changes. Re-run each reproducing test after its fix and retain it as a regression test. For browser behavior requiring direct verification, write and run repository E2E regression tests covering the same interactions and observable results; include those tests and required fixtures in the Git changes alongside the fix. Manual browser checks and temporary automation do not replace these tests.
4. Re-run a fresh full review over the relevance cone until no P0–P2 remains and relevant E2E, integration, unit tests, `typecheck`, lint, and formatting pass. Lint or build cannot replace tests or `typecheck`.
5. Diagnose the root cause before retrying a surviving finding; never omit or downgrade one to finish.
6. Keep P3/P4 evidence and fixes. After correctness closure, group structural P3s into an unimplemented refactor proposal requiring user authorization.

Mark absent applicable test or `typecheck` scripts as not applicable with a reason; a missing script does not waive required reproducing or E2E regression tests. Stop as blocked when a required check cannot run or a fix needs product direction, new authority, destructive action, or external change.

Follow `$critical-review`'s output order. Summarize P0–P2 findings discovered across all passes, fixed, and remaining; retain each fixed finding's cause, regression-test path, and observed test results before and after the fix. Report pass count, exact test and `typecheck` commands/results, other checks, and final status (`no remaining P0/P1/P2 findings` or `blocked`). Then report verification gaps and remaining P3/P4 proposals. Give each remaining P3/P4 one unique number in a single consecutive list across severities so the user can authorize by number; write `none` when empty.

Explicitly state whether this workflow updated an existing PR. If it did, say so clearly and identify the PR; if it did not, state that no PR was updated. Never describe a merged PR as updated; if subsequent changes require a new PR, identify the new PR and state that the previous PR was already merged.
