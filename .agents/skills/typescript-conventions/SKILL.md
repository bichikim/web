---
name: typescript-conventions
description: Apply project TypeScript conventions, functional error contracts, and library boundaries when editing .ts/.tsx files, APIs, cross-layer contracts, errors, or dependencies.
---

# Typescript

Open and apply the reference files for the relevant section before working. For exported APIs, reusable modules, or cross-layer changes, read [rules/library-boundaries.md](rules/library-boundaries.md) before editing. Solid component structure, reactivity, and JSX conventions: solidjs skill (also triggers on Solid `.tsx` / `.ts`).

## Core Rules

1. For observable behavior changes and bug fixes, first express the intended behavior in a relevant test, then implement it. For wording, naming, type-only, or other changes without behavior changes, choose verification appropriate to the change instead of requiring a new unit test. Apply the `unit-test` skill when writing or editing unit tests.
2. Use PascalCase for classes, interfaces, and types; camelCase for variables, functions, and methods; UPPER_SNAKE_CASE for constants.
3. Do not abbreviate variable names, keep them to at most three words, and avoid repeating outer object names in nested variables.
4. Define and compose object shapes with named `interface`s; prefer `extends` over intersections, name boundary union members instead of reconstructing them with `Extract`, and reserve `type` for unions and type operators. Name files that collect types shared by multiple consumers `types.ts`.
5. Avoid `any`; prefer `unknown` with type guards, `satisfies` over `as`, `as const` plus unions over `enum`, and `readonly` for immutable data.
6. Keep fixed constants at the site of use unless they are genuinely shared or part of a boundary, contract, config, type, test, or file-size concern. For inexpensive caller-controlled variations, follow the parameterization workflow below.
7. Read a mutable, reactive, or external getter once per decision and reuse that snapshot; repeated calls may differ and are not free.
8. Do not make object-literal property value evaluation depend on property order through side effects, or make consuming logic depend on object key order. `sort-keys-fix` alphabetically reorders object properties; any behavior change from that is a violation of this coding contract. If evaluation order matters, use explicit statements before creating the object, and represent ordered data with arrays.
9. Avoid `continue` (and `break` when skipping loop body logic). Prefer a straight `for...of` with one positive body or an early `return`; use array pipelines only when they are clearer and do not add wasteful passes or allocations.
10. Make each function read as one level of story. Treat mixed reasons to change (such as parsing, policy, persistence, and logging), deep nesting, combined network/time/global test setup, and operations whose purpose is unclear from their syntax as refactoring signals. Use guard clauses to keep the normal path linear. Follow the reuse and naming workflow below; do not enforce line limits or add wrappers that only add navigation. Do not introduce arrays, objects, or loops solely to enumerate fixed calls. Prefer direct calls when the abstraction does not clarify meaning or behavior; fewer lines or reuse of the same list alone does not justify it.
11. Use exhaustive `switch` with a `never` check when dispatching a discriminated union or comparing three or more cases of one finite value (`type`, `status`, `kind`), including boolean membership written with chained `||`; reserve `if` for guards and binary conditions, and never hide cases behind a catch-all default.
12. Use a generic only when it preserves a real relationship between values or members of a returned generic container; replace a naked type parameter used once with a concrete type or `unknown`.
13. Never write comments on the right side of code; always write above the target code.
14. Check `null`/`undefined` with `=== null` / `=== undefined`.
15. Run `oxlint --fix` after writing code, then fix remaining lint issues.
16. See ./rules/object-parameter.md when naming a single object parameter on a hook or util.
17. See ./rules/no-types.md when module types are missing.
18. See ./code-patterns/type-guard.md when handling `unknown` or writing type guards.
19. See ./code-patterns/type-and-value-import.md when importing both a type and a value from the same module.
20. For every internal import, consider an available `src/*` alias and choose the shortest readable valid specifier.
21. Outside a feature, use one feature entrypoint per file when its cohesive API can be re-exported; keep subpaths for runtime boundaries, side effects, or cycle avoidance. Do not omit `index.ts` re-exports to hide internals.
22. When implementing functions, prefer one primary exported function per file and name the file after that function in kebab-case.

## Low-Cost Parameterization

When designing a function's inputs, consider these steps in order:

1. Expose foreseeable caller-controlled variations as parameters when supporting them adds little implementation or conceptual cost, rather than hardcoding one use case.
2. Consider accepting multiple values when the same operation naturally applies to each. Support a collection when its practical flexibility outweighs the added implementation, validation, and maintenance cost; do not require callers to compose repeated single-value calls unnecessarily.

Keep the contract explicit, including empty inputs, ordering, and duplicates where they affect behavior. State the foreseeable use being supported and why the added cost is small. Preserve fixed domain invariants, avoid speculative configuration, and do not add parallel single-value and collection APIs without a concrete need.

## Reuse Before Naming a Local Operation

When an expression performs a distinct operation but makes readers decipher its mechanics to understand its purpose, follow this order:

1. Check the relevant framework or library for a supported public API.
2. Check the underlying runtime or standard library for an equivalent API.
3. When it would help the decision, inspect similar code already in the project for reuse.
4. If no suitable implementation exists, extract a dedicated function at the nearest appropriate scope, usually in the same file, and name it for its purpose. A single use or one-line body does not rule out extraction when the name improves comprehension.

Verify that a candidate's input semantics and behavior match the task; similar names or private internal helpers are not sufficient. Prefer a meaningful function name over a comment that merely explains the operation. Keep comments for intent or constraints the name cannot express. Do not promote the helper to a shared module without a concrete reuse need.

Read [references/error-contracts.md](references/error-contracts.md) when designing, changing, or normalizing error contracts.

Read [references/feature-layout.md](references/feature-layout.md) when creating or splitting modules under `src/features`.

## Input ownership and return values

- Do not return unchanged inputs or re-expose them in result objects; the caller already has them. Return only meaningful results of the operation.
- Changes to an object's contents count as changes even when its reference stays the same. When producing a changed object, prefer copying the portions being modified and returning the result without mutating caller-owned data. Do not copy unchanged input merely to justify returning it.
- Do not clone DOM elements for this purpose or re-expose caller-provided elements in return values. Preserve their identity and return only the operation's results or capabilities.
