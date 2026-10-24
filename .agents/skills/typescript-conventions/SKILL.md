---
name: typescript-conventions
description: Apply project TypeScript conventions, functional error contracts, and library boundaries when editing .ts/.tsx files, APIs, cross-layer contracts, errors, or dependencies.
---

# TypeScript

Apply project-specific typing, control-flow, and API design contracts.

## Required Routing

Read and apply each matching resource before editing:

- Designing or implementing functions, decomposing logic, selecting dependencies, or changing inputs/results: [function design](references/function-design.md).
- Exported APIs, reusable modules, or cross-layer changes: [library boundaries](rules/library-boundaries.md).
- Designing, changing, or normalizing error contracts: [error contracts](references/error-contracts.md).
- Creating or splitting modules under `src/features`: [feature layout](references/feature-layout.md).
- Writing or changing comments or options: [comments](rules/comments.md).
- Naming a single object parameter on a hook or util: [object parameters](rules/object-parameter.md).
- Missing module types: [missing types](rules/no-types.md).
- Handling `unknown` or writing type guards: [type guards](code-patterns/type-guard.md).
- Importing a type and value from the same module: [type/value imports](code-patterns/type-and-value-import.md).
- Writing or editing unit tests: apply [unit-test](../unit-test/SKILL.md).
- Solid components, hooks, reactivity, or JSX: apply [solidjs](../solidjs/SKILL.md).

## Core Rules

- For behavior changes and bug fixes, express the intended behavior in a relevant test before implementation. For wording, naming, type-only, or other nonbehavioral changes, choose proportionate verification without requiring a new unit test.
- Use PascalCase for classes/interfaces/types, camelCase for variables/functions/methods, and UPPER_SNAKE_CASE for constants. Do not abbreviate variable names; use at most three words and avoid repeating outer object names in nested variables.
- Use named `interface`s for object shapes and `extends` over intersections. Name boundary union members instead of reconstructing them with `Extract`; reserve `type` for unions and type operators. Put types shared by multiple consumers in `types.ts`.
- Avoid `any`; prefer `unknown` with guards, `satisfies` over `as`, `as const` unions over `enum`, and `readonly` for immutable data. Use generics only to preserve a real relationship between values or returned container members; replace a naked type parameter used once with a concrete type or `unknown`.
- Keep fixed constants at their use site unless shared or needed for a boundary, contract, config, type, test, or file-size concern.
- Read mutable, reactive, or external getters once per decision and reuse the snapshot.
- Never depend on object-key order or property-evaluation side effects that require a particular order: `sort-keys-fix` reorders properties. Evaluate ordered effects before object creation; represent ordered data with arrays.
- Avoid `continue` and `break` used to skip loop bodies. Prefer a positive `for...of` body or early return; use array pipelines only when clearer without wasteful passes or allocations.
- Keep functions at one abstraction level with guard clauses. Review decomposition for mixed responsibilities, deep nesting, combined network/time/global test setup, unclear operations, or roughly 30–40 lines; length is a signal, not a limit. Do not add wrappers that only add navigation or collections/loops solely to enumerate fixed calls; use direct calls unless abstraction clarifies meaning or behavior.
- Use exhaustive `switch` with a `never` check for discriminated unions or three or more cases of a finite value, including membership expressed with chained `||`. Reserve `if` for guards and binary conditions; do not hide cases in catch-all defaults.
- Check nullish values with `=== null` / `=== undefined`. Model mutually exclusive states and required data as discriminated unions where practical; keep independently varying state separate.
- Make persistence destinations explicit in the function name or an argument at the composition site, including injected persistence callbacks.
- For internal imports, consider available `src/*` aliases and choose the shortest readable valid specifier.
- Group cohesive feature APIs in an entrypoint and prefer it for outside imports when practical; direct subpaths remain allowed. Do not hide internals by omitting re-exports. Multi-feature `index.ts` files only re-export; a single-feature folder may implement its feature there.
- Prefer one primary exported function per file, named after the function in kebab-case.
- Do not use built-in `performance` or `eval`, including via `globalThis` or `window`.
- After writing code, run `oxlint --fix` and fix remaining issues.
