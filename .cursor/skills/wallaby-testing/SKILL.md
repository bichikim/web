---
name: wallaby-testing
description: Check test status and debug failing tests using Wallaby.js real-time test results. Use after making code changes to verify tests pass, when checking if tests are failing, debugging test errors, analyzing assertions, inspecting runtime values, checking coverage, updating snapshots, or when user mentions Wallaby, tests, coverage, or test status.
compatibility: Requires Wallaby.js VS Code extension installed and running
metadata:
  author: wallaby.js
  version: '1.0'
---

# Wallaby Testing Skill

작업에 해당하는 섹션의 참조 파일을 먼저 열고 적용한다.

## Core Rules

1. Use Wallaby first after code changes, when checking test status, debugging failures, inspecting runtime values, reviewing coverage, or updating snapshots.
2. Start with failing-test or all-test queries to get test IDs before using test-scoped tools.
3. Prefer runtime values and covered-line data over guessing when the failure cause is unclear.
4. Make targeted fixes based on the failing test, stack trace, coverage, and runtime values.
5. Verify the specific fixed test and then check all failing tests for regressions.
6. Update snapshots only when the snapshot change is expected, and verify again afterward.
7. See ./rules/tool-reference.md for available Wallaby tools and required inputs.
8. See ./rules/debugging-workflow.md for the step-by-step debug workflow.
9. See ./examples/assertion-failure.md for an assertion failure example.
