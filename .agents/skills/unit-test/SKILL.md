---
name: unit-test
description: Apply Vitest and @solidjs/testing-library conventions when adding or editing unit tests, or when separating production responsibilities to make them testable without test-only production code.
---

# Unit Test

Open and apply the reference files for the relevant section before working.

## Core Rules

1. If tests already exist, verify current results in this strict order: Wallaby MCP, Wallaby CLI when MCP is unavailable, then Vitest only when neither Wallaby option is available or sufficient; fix existing failures before adding tests.
2. Use Vitest, and use `@solidjs/testing-library` for Solid.js DOM tests.
3. Give each test file exactly one primary production target. Do not combine tests for multiple target files into one test file; imports used only as dependencies, fixtures, or test helpers do not become additional primary targets.
4. Use one test file per target file by default. Place it in the target directory's `__tests__` folder and name it `{targetFileName}.spec.ts`. A single target may use multiple test files only when one file would be excessively long or when runtime/environment-specific setup must be isolated; name additional files `{targetFileName}.{scope}.spec.ts`. Every split file must still test the same single target.
5. Start test names with `should`, and split multi-function targets with `describe` blocks.
6. Treat test difficulty caused by mixed responsibilities as a production design problem. When production changes are authorized, first separate cohesive domain logic from CLI, UI, I/O, lifecycle, or other side effects at a natural responsibility boundary, then test each resulting production contract. Do not split cohesive behavior into trivial pass-through modules merely to expose private branches or satisfy coverage. When production changes are not authorized, report the required refactor and ask before changing the target.
7. Production code must not contain behavior or interfaces that exist only for tests: no test-mode branches, public test hooks, test-only exports or options, fake implementations, or alternate execution paths. Mock environment, configuration, and external dependencies at their import boundary. Use dependency injection, lazy initialization, caching, or changed error timing only when an independently verified runtime requirement justifies that production design.
8. For DOM tests, add `/** @vitest-environment jsdom */` at the top of the file.
9. Aim for 100% coverage; when impossible, add ignore comments and document the reason.
10. Verify tests and coverage after changes using the same Wallaby MCP → Wallaby CLI → Vitest priority, then fix lint issues.
11. See ./rules/assertion-patterns.md and ./examples/module-mocking.md for assertion and mocking examples.
12. See ./examples/async-assertion.md, ./examples/error-assertion.md, and ./examples/time-based-testing.md for specialized patterns.
