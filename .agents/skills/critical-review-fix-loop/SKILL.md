---
name: critical-review-fix-loop
description: Run only when the user explicitly invokes $critical-review-fix-loop. Use $critical-review to fix P0/P1/P2 findings and repeat full reviews until none remain and verification passes, then report remaining P3/P4 findings.
disable-model-invocation: true
---

# Critical Review Fix Loop

1. Anchor on the user's target; otherwise use the current task's changed files or diff. Ask once if neither is safe.
2. Read and follow `$critical-review`; grade every finding P0–P4.
3. Record a full review, fix every P0–P2 within the authorized scope while preserving unrelated changes, and run focused verification.
4. Repeat a fresh full `$critical-review` over the relevance cone until no P0–P2 findings remain and all required tests, lint, and formatting pass.
5. If a finding survives a fix, diagnose its root cause before patching again. Never omit or downgrade a finding to finish.
6. Treat P3/P4 as non-blocking; retain each finding's evidence and recommended fix.

If a required fix needs product direction, new authority, destructive action, or external change, stop as blocked and report what is needed.

Report the pass count, fixed P0–P2 findings, verification results, and final status: `no P0/P1/P2 findings` or `blocked`. Format remaining P3/P4 findings as a numbered list; write `none` when there are none.
