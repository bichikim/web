---
name: wallaby-testing
description: Run or diagnose Vitest unit tests and inspect their results, coverage, runtime values, or snapshots. Prefer Wallaby MCP, then CLI.
metadata:
  author: wallaby.js
  version: '1.0'
---

# Wallaby Testing Skill

Use this workflow for Vitest unit-test results. For browser E2E failures, apply [e2e-testing](../e2e-testing/SKILL.md).

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
