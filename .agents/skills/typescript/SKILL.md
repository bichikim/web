---
name: typescript-conventions
description: Applies project TypeScript conventions and library-grade module boundaries. Use when writing or editing .ts/.tsx files, designing exported APIs or cross-layer contracts, creating reusable modules, or refactoring dependencies between features, packages, services, and adapters.
---

# Typescript

Open and apply the reference files for the relevant section before working. For exported APIs, reusable modules, or cross-layer changes, read [rules/library-boundaries.md](rules/library-boundaries.md) before editing. Solid component structure, reactivity, and JSX conventions: solidjs skill (also triggers on Solid `.tsx` / `.ts`).

## Core Rules

1. Use PascalCase for classes, interfaces, and types; camelCase for variables, functions, and methods; UPPER_SNAKE_CASE for constants.
2. Do not abbreviate variable names, keep them to at most three words, and avoid repeating outer object names in nested variables.
3. Define object shapes with `interface`; use `type` only when `interface` cannot express the type.
4. Avoid `any`; prefer `unknown` with type guards, `satisfies` over `as`, `as const` plus unions over `enum`, and `readonly` for immutable data.
5. Keep constants at the site of use unless they are genuinely shared or part of a boundary, contract, config, type, test, or file-size concern.
6. Avoid `continue` (and `break` when skipping loop body logic). Prefer a single positive `if` condition, early `return`, or `filter`/`reduce` so the loop body stays one straight path.
7. Never write comments on the right side of code; always write above the target code.
8. Check `null`/`undefined` with `=== null` / `=== undefined`.
9. Run `oxlint --fix` after writing code, then fix remaining lint issues.
10. See ./rules/object-parameter.md when naming a single object parameter on a hook or util.
11. See ./rules/no-types.md when module types are missing.
12. See ./code-patterns/type-guard.md when handling `unknown` or writing type guards.
13. See ./code-patterns/type-and-value-import.md when importing both a type and a value from the same module.

## `src/features` Layout

Apply this layout only under `src/features`. Keep a feature in `index.ts` when one file is enough.

```text
src/features/<feature>/
├─ index.ts
├─ a.ts      # when needed
└─ b.ts      # when needed
```

When splitting files, make `index.ts` use or export each sibling module; re-exporting is not required.
