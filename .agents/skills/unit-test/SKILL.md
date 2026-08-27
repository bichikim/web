---
name: unit-test
description: Apply Vitest and @solidjs/testing-library conventions when editing .spec.ts tests, including DOM, mocking, assertions, async/error, and time-based cases.
---

# Unit Test

Open and apply the reference files for the relevant section before working.

## Core Rules

1. If tests already exist, verify current results in this strict order: Wallaby MCP, Wallaby CLI when MCP is unavailable, then Vitest only when neither Wallaby option is available or sufficient; fix existing failures before adding tests.
2. Use Vitest, and use `@solidjs/testing-library` for Solid.js DOM tests.
3. Place tests in the target directory's `__tests__` folder and name files `{targetFileName}.spec.ts`.
4. Start test names with `should`, and split multi-function targets with `describe` blocks.
5. Do not modify the code under test by default. If the target is hard to unit test because logic is embedded in CLI, UI, I/O, or lifecycle code, ask whether to first extract the behavior into pure, importable logic functions, then test those functions and keep only smoke coverage for the wrapper.
6. For DOM tests, add `/** @vitest-environment jsdom */` at the top of the file.
7. Aim for 100% coverage; when impossible, add ignore comments and document the reason.
8. Verify tests and coverage after changes using the same Wallaby MCP → Wallaby CLI → Vitest priority, then fix lint issues.
9. See ./rules/assertion-patterns.md and ./examples/module-mocking.md for assertion and mocking examples.
10. See ./examples/async-assertion.md, ./examples/error-assertion.md, and ./examples/time-based-testing.md for specialized patterns.
