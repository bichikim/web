---
name: typescript-conventions
description: Applies project TypeScript conventions for naming, formatting, typing, and code patterns. Use when writing or editing .ts or .tsx files.
---

# Typescript

Open and apply the reference files for the relevant section before working.

## Core Rules

1. Use PascalCase for classes, interfaces, and types; camelCase for variables, functions, and methods; UPPER_SNAKE_CASE for constants.
2. Do not abbreviate variable names, keep them to at most three words, and avoid repeating outer object names in nested variables.
3. Define object shapes with `interface`; use `type` only when `interface` cannot express the type.
4. Avoid `any`; prefer `unknown` with type guards, `satisfies` over `as`, `as const` plus unions over `enum`, and `readonly` for immutable data.
5. Keep constants at the site of use unless they are genuinely shared or part of a boundary, contract, config, type, test, or file-size concern.
6. Split mixed responsibilities into focused access, guard, predicate, and transform functions that improve readability, reuse, or testability.
7. Avoid `continue` (and `break` when skipping loop body logic). Prefer a single positive `if` condition, early `return`, or `filter`/`reduce` so the loop body stays one straight path.
8. Run `oxlint --fix` after writing code, then fix remaining lint issues.
9. See ./rules/comment-placement.md and ./rules/object-parameter.md for formatting and parameter naming examples.
10. See ./rules/no-types.md when module types are missing.
11. See ./code-patterns/undefined-check.md, ./code-patterns/null-check.md, ./code-patterns/type-guard.md, and ./code-patterns/type-and-value-import.md for code patterns.
