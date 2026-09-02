---
name: typescript-conventions
description: Apply project TypeScript conventions, functional error contracts, and library boundaries when editing .ts/.tsx files, APIs, cross-layer contracts, errors, or dependencies.
---

# Typescript

Open and apply the reference files for the relevant section before working. For exported APIs, reusable modules, or cross-layer changes, read [rules/library-boundaries.md](rules/library-boundaries.md) before editing. Solid component structure, reactivity, and JSX conventions: solidjs skill (also triggers on Solid `.tsx` / `.ts`).

## Core Rules

1. For every TypeScript implementation task, first write the intended specification as a unit test, then write the code that makes it pass. Apply the `unit-test` skill when writing or editing the test.
2. Use PascalCase for classes, interfaces, and types; camelCase for variables, functions, and methods; UPPER_SNAKE_CASE for constants.
3. Do not abbreviate variable names, keep them to at most three words, and avoid repeating outer object names in nested variables.
4. Define and compose object shapes with named `interface`s; prefer `extends` over intersections, name boundary union members instead of reconstructing them with `Extract`, and reserve `type` for unions and type operators.
5. Avoid `any`; prefer `unknown` with type guards, `satisfies` over `as`, `as const` plus unions over `enum`, and `readonly` for immutable data.
6. Keep constants at the site of use unless they are genuinely shared or part of a boundary, contract, config, type, test, or file-size concern.
7. Read a mutable, reactive, or external getter once per decision and reuse that snapshot; repeated calls may differ and are not free.
8. Avoid `continue` (and `break` when skipping loop body logic). Prefer a straight `for...of` with one positive body or an early `return`; use array pipelines only when they are clearer and do not add wasteful passes or allocations.
9. Make each function read as one level of story. Treat mixed reasons to change (such as parsing, policy, persistence, and logging), deep nesting, combined network/time/global test setup, and unnamed non-trivial calculations as refactoring signals. Use guard clauses to keep the normal path linear. Do not enforce line limits; extract only when it reduces cognitive or test setup cost, and avoid wrappers that only add navigation.
10. Use exhaustive `switch` with a `never` check when dispatching a discriminated union or comparing three or more cases of one finite value (`type`, `status`, `kind`), including boolean membership written with chained `||`; reserve `if` for guards and binary conditions, and never hide cases behind a catch-all default.
11. Use a generic only when it preserves a real relationship between values or members of a returned generic container; replace a naked type parameter used once with a concrete type or `unknown`.
12. Never write comments on the right side of code; always write above the target code.
13. Check `null`/`undefined` with `=== null` / `=== undefined`.
14. Run `oxlint --fix` after writing code, then fix remaining lint issues.
15. See ./rules/object-parameter.md when naming a single object parameter on a hook or util.
16. See ./rules/no-types.md when module types are missing.
17. See ./code-patterns/type-guard.md when handling `unknown` or writing type guards.
18. See ./code-patterns/type-and-value-import.md when importing both a type and a value from the same module.
19. For every internal import, consider an available `src/*` alias and choose the shortest readable valid specifier.
20. Outside a feature, use one feature entrypoint per file when its cohesive API can be re-exported; keep subpaths for runtime boundaries, side effects, or cycle avoidance. Do not omit `index.ts` re-exports to hide internals.

Read [references/error-contracts.md](references/error-contracts.md) when designing, changing, or normalizing error contracts.

Read [references/feature-layout.md](references/feature-layout.md) when creating or splitting modules under `src/features`.
