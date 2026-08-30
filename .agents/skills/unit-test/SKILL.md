---
name: unit-test
description: Apply Vitest and @solidjs/testing-library conventions when editing .spec.ts tests, including DOM, mocking, assertions, async/error, and time-based cases.
---

# Unit Test

Open and apply the reference files for the relevant section before working.

## Core Rules

1. If tests already exist, verify current results in this strict order: Wallaby MCP, Wallaby CLI when MCP is unavailable, then Vitest only when neither Wallaby option is available or sufficient; fix existing failures before adding tests.
2. Use Vitest, and use `@solidjs/testing-library` for Solid.js DOM tests.
3. Give each test file exactly one primary production target. Do not combine tests for multiple target files into one test file; imports used only as dependencies, fixtures, or test helpers do not become additional primary targets.
4. Use one test file per target file by default. Place it in the target directory's `__tests__` folder and name it `{targetFileName}.spec.ts`. A single target may use multiple test files only when one file would be excessively long or when runtime/environment-specific setup must be isolated; name additional files `{targetFileName}.{scope}.spec.ts`. Every split file must still test the same single target.
5. Start test names with `should`, and split multi-function targets with `describe` blocks.
6. Do not modify the code under test by default. If the target is hard to unit test because logic is embedded in CLI, UI, I/O, or lifecycle code, ask whether to first extract the behavior into pure, importable logic functions, then test those functions and keep only smoke coverage for the wrapper.
7. For DOM tests, add `/** @vitest-environment jsdom */` at the top of the file.
8. Aim for 100% coverage; when impossible, add ignore comments and document the reason.
9. Verify tests and coverage after changes using the same Wallaby MCP → Wallaby CLI → Vitest priority, then fix lint issues.
10. See ./rules/assertion-patterns.md and ./examples/module-mocking.md for assertion and mocking examples.
11. See ./examples/async-assertion.md, ./examples/error-assertion.md, and ./examples/time-based-testing.md for specialized patterns.
