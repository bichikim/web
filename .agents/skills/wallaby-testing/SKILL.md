---
name: wallaby-testing
description: Check test status and debug failing tests using Wallaby.js real-time test results, preferring Wallaby MCP and falling back to Wallaby CLI before Vitest. Use after making code changes to verify tests pass, when checking if tests are failing, debugging test errors, analyzing assertions, inspecting runtime values, checking coverage, updating snapshots, or when user mentions Wallaby, tests, coverage, or test status.
metadata:
  author: wallaby.js
  version: '1.0'
---

# Wallaby Testing Skill

Open and apply the reference files for the relevant section before working.

## Core Rules

1. Use test runners in this strict order: Wallaby MCP, Wallaby CLI when MCP is unavailable, then Vitest only when neither Wallaby option is available or sufficient.
2. When using Wallaby CLI, apply the `wallaby-cli` skill if available; it may connect to an existing Wallaby instance or start a background instance without an editor.
3. Start with failing-test or all-test queries to get test IDs before using test-scoped tools.
4. Prefer runtime values and covered-line data over guessing when the failure cause is unclear.
5. Make targeted fixes based on the failing test, stack trace, coverage, and runtime values.
6. Verify the specific fixed test and then check all failing tests for regressions through the same selected Wallaby backend.
7. Update snapshots only when the snapshot change is expected, and verify again afterward.
8. See ./rules/tool-reference.md for available Wallaby tools and required inputs.
9. See ./rules/debugging-workflow.md for the step-by-step debug workflow.
10. See ./examples/assertion-failure.md for an assertion failure example.
