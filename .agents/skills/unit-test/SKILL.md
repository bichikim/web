---
name: unit-test
description: Apply Vitest and @solidjs/testing-library conventions when adding or editing unit tests, or when separating production responsibilities to make them testable without test-only production code.
---

# Unit Test

Open and apply the reference files for the relevant section before working.

For test execution, status, coverage, and debugging, apply the `wallaby-testing` skill.

## Test Authoring Workflow

Complete these steps in order before final verification:

1. Write the tests.
2. Review the tests against the specification and observable contract for missing cases, then add the missing coverage. Passing tests or high code coverage alone do not establish completeness.
3. Review the resulting tests for excessive scope, redundancy, or assertions that do not detect the intended regression. Remove, merge, or revise them while preserving distinct required behaviors and failure cases.

## Component DOM Query Priority

For Solid component tests, find elements in this order:

1. Role-based query: use `screen.getByRole` or the corresponding `getAllByRole`/`queryByRole` query, with the accessible name or state when needed.
2. Role-based query plus an element selector: first find the semantic owner with a role query, then scope an element selector such as `img`, `svg`, or `input` to that element when the nested part has no independent accessible query.
3. `data-testid`: use `screen.getByTestId` or the corresponding test-id query only when the first two options cannot express the contract, such as for dynamic or otherwise non-semantic content. Add `data-testid` as an explicit stable test contract when this fallback is necessary.

Avoid locating elements with CSS class selectors whenever possible, including `querySelector('.class-name')`; prefer semantic queries, scoped element selectors, or `data-testid`. Use a class selector only as a last resort when no stable alternative can express the contract, and make that reason explicit. Do not use arbitrary custom `data-*` attributes as a substitute for `data-testid`. Class assertions are allowed only when the class output itself is the behavior under test.

See the [Testing Library query priority guide](https://testing-library.com/docs/queries/about/) and the [`@solidjs/testing-library` documentation](https://github.com/solidjs/solid-testing-library) for the underlying guidance.

## Core Rules

1. Before changes, check relevant existing test results. Resolve failures relevant to the changed path within the authorized scope; report unrelated pre-existing failures with evidence without making their repair a prerequisite for adding tests.
2. Use Vitest, and use `@solidjs/testing-library` for Solid.js DOM tests.
3. Give each test file exactly one primary production target. Do not combine tests for multiple target files into one test file; imports used only as dependencies, fixtures, or test helpers do not become additional primary targets.
4. Use one test file per target file by default. Place it in the target directory's `__tests__` folder and name it `{targetFileName}.spec.ts`. A single target may use multiple test files only when one file would be excessively long or when runtime/environment-specific setup must be isolated; name additional files `{targetFileName}.{scope}.spec.ts`. Every split file must still test the same single target.
5. Start test names with `should`, and split multi-function targets with `describe` blocks.
6. Treat test difficulty caused by mixed responsibilities as a production design problem. When production changes are authorized, first separate cohesive domain logic from CLI, UI, I/O, lifecycle, or other side effects at a natural responsibility boundary, then test each resulting production contract. Do not split cohesive behavior into trivial pass-through modules merely to expose private branches or satisfy coverage. When production changes are not authorized, report the required refactor and ask before changing the target.
7. Production code must not contain behavior or interfaces that exist only for tests: no test-mode branches, public test hooks, test-only exports or options, fake implementations, or alternate execution paths. Mock environment, configuration, and external dependencies at their import boundary. Use dependency injection, lazy initialization, caching, or changed error timing only when an independently verified runtime requirement justifies that production design.
8. For DOM tests, add `/** @vitest-environment jsdom */` at the top of the file.
9. Cover important behavior and failure paths. Report unverified paths; exclude coverage only with an independent justification, and document it. Do not add ignore comments merely to reach a coverage target.
10. After changes, verify relevant tests and coverage, then fix lint issues.
11. See ./rules/assertion-patterns.md and ./examples/module-mocking.md for assertion and mocking examples.
12. See ./examples/async-assertion.md, ./examples/error-assertion.md, and ./examples/time-based-testing.md for specialized patterns.
