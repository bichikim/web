---
name: unit-test
description: Applies project unit test conventions with Vitest and @solidjs/testing-library. Use when writing or editing .spec.ts files, including DOM tests, module mocking, assertions, async/error handling, and time-based tests.
---

# Unit Test

작업에 해당하는 섹션의 참조 파일을 먼저 열고 적용한다.

## Core Rules

1. If tests already exist, verify current results first with Wallaby MCP, then Vitest if needed; fix existing failures before adding tests.
2. Use Vitest, and use `@solidjs/testing-library` for Solid.js DOM tests.
3. Place tests in the target directory's `__tests__` folder and name files `{targetFileName}.spec.ts`.
4. Start test names with `should`, and split multi-function targets with `describe` blocks.
5. Do not modify the code under test; if a production change is required, explain why instead of changing it.
6. For DOM tests, add `/** @vitest-environment jsdom */` at the top of the file.
7. Aim for 100% coverage; when impossible, add ignore comments and document the reason.
8. Verify tests and coverage after changes, then fix lint issues.
9. See ./rules/assertion-patterns.md and ./examples/module-mocking.md for assertion and mocking examples.
10. See ./examples/async-assertion.md, ./examples/error-assertion.md, and ./examples/time-based-testing.md for specialized patterns.
