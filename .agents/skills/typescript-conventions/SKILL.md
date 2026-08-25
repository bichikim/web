---
name: typescript-conventions
description: Applies project TypeScript conventions, functional error contracts, and library-grade module boundaries. Use when writing or editing .ts/.tsx files, designing exported APIs or cross-layer contracts, creating reusable modules, handling errors across adapters or workers, or refactoring dependencies between features, packages, services, and adapters.
---

# Typescript

Open and apply the reference files for the relevant section before working. For exported APIs, reusable modules, or cross-layer changes, read [rules/library-boundaries.md](rules/library-boundaries.md) before editing. Solid component structure, reactivity, and JSX conventions: solidjs skill (also triggers on Solid `.tsx` / `.ts`).

## Core Rules

1. Use PascalCase for classes, interfaces, and types; camelCase for variables, functions, and methods; UPPER_SNAKE_CASE for constants.
2. Do not abbreviate variable names, keep them to at most three words, and avoid repeating outer object names in nested variables.
3. Define and compose object shapes with named `interface`s; prefer `extends` over intersections, name boundary union members instead of reconstructing them with `Extract`, and reserve `type` for unions and type operators.
4. Avoid `any`; prefer `unknown` with type guards, `satisfies` over `as`, `as const` plus unions over `enum`, and `readonly` for immutable data.
5. Keep constants at the site of use unless they are genuinely shared or part of a boundary, contract, config, type, test, or file-size concern.
6. Read a mutable, reactive, or external getter once per decision and reuse that snapshot; repeated calls may differ and are not free.
7. Avoid `continue` (and `break` when skipping loop body logic). Prefer a straight `for...of` with one positive body or an early `return`; use array pipelines only when they are clearer and do not add wasteful passes or allocations.
8. Make each function read as one level of story. Treat mixed reasons to change (such as parsing, policy, persistence, and logging), deep nesting, combined network/time/global test setup, and unnamed non-trivial calculations as refactoring signals. Use guard clauses to keep the normal path linear. Do not enforce line limits; extract only when it reduces cognitive or test setup cost, and avoid wrappers that only add navigation.
9. Use exhaustive `switch` with a `never` check when dispatching a discriminated union or comparing three or more cases of one finite value (`type`, `status`, `kind`), including boolean membership written with chained `||`; reserve `if` for guards and binary conditions, and never hide cases behind a catch-all default.
10. Use a generic only when it preserves a real relationship between values or members of a returned generic container; replace a naked type parameter used once with a concrete type or `unknown`.
11. Never write comments on the right side of code; always write above the target code.
12. Check `null`/`undefined` with `=== null` / `=== undefined`.
13. Run `oxlint --fix` after writing code, then fix remaining lint issues.
14. See ./rules/object-parameter.md when naming a single object parameter on a hook or util.
15. See ./rules/no-types.md when module types are missing.
16. See ./code-patterns/type-guard.md when handling `unknown` or writing type guards.
17. See ./code-patterns/type-and-value-import.md when importing both a type and a value from the same module.
18. For every internal import, consider an available `src/*` alias and choose the shortest readable valid specifier.
19. Outside a feature, use one feature entrypoint per file when its cohesive API can be re-exported; keep subpaths for runtime boundaries, side effects, or cycle avoidance. Do not omit `index.ts` re-exports to hide internals.

## Functional Error Design

1. Use a discriminated `Result<T, E>` only for expected failures that callers can meaningfully recover from, branch on, retry, or propagate; use `Promise<Result<T, E>>` for asynchronous APIs.
2. Reserve `throw` and rejected promises for programming defects or failures outside the declared contract. Catch third-party exceptions once at the nearest adapter boundary and normalize `unknown` into a domain error.
3. When callers need distinct handling, define domain errors as discriminated unions with stable machine-readable codes and exhaustive `never` checks. Keep user-facing messages out of domain and transport errors.
4. Send plain serializable error DTOs across Worker, network, or storage boundaries. Preserve the original cause only for local diagnostics and telemetry.
5. Represent cancellation separately from failure, and encode retryability only when callers can act on it. Retry transient failures; do not retry validation or contract failures.
6. Preserve existing public error behavior during structural refactors. Do not introduce `Result`, error unions, or boundary contract changes solely for consistency; redesign the API only when the task or caller needs require it.

## `src/features` Layout

Apply this layout only under `src/features`. Keep a feature in `index.ts` when one file is enough.

```text
src/features/<feature>/
├─ index.ts
├─ a.ts      # when needed
└─ b.ts      # when needed
```

When splitting files, `index.ts` must re-export each sibling module. Do not review that export list.
