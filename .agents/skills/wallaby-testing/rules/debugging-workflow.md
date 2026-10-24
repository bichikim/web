# Debugging Workflow

1. Get failing tests with `wallaby_failingTests`, then review error messages and stack traces.
2. If there are no failing tests but the user asks about status or coverage, use `wallaby_allTests` to confirm state and obtain test IDs.
3. If the failure location is unclear, use `wallaby_coveredLinesForTest` to locate executed source paths.
4. Inspect runtime values with `wallaby_runtimeValues` or `wallaby_runtimeValuesByTest` when expected and actual values need comparison.
5. Implement the smallest targeted fix and reference runtime values in the explanation when they informed the fix.
6. Verify with `wallaby_testById` for the relevant test and `wallaby_failingTests` for regressions.
7. Update snapshots only when snapshot changes are expected, then verify tests again.
