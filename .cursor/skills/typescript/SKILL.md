---
name: typescript-conventions
description: Applies project TypeScript conventions for naming, formatting, typing, and code patterns. Use when writing or editing .ts or .tsx files.
---

# Typescript

## Naming Conventions

- Use PascalCase for Class, Interface and Type
- Use camelCase for variables, function and method
- Use UPPER_SNAKE_CASE for CONSTANTS

## Format

- Always check .prettierrc.yaml at project root and follow its settings when writing
- Never write comments on the right side of code; always write above the target code

## Typing

- Define types with `interface`; use `type` only when interface cannot express it
- Keep object type nesting depth to at most one level
- Avoid `any`; prefer `unknown` with type guards
- Prefer `satisfies` over `as` (type assertion); `as const` is an exception
- Use `as const` + union instead of `enum`
- Use `readonly` for immutable data whenever possible
- When types are missing in a module — see `./rules/no-types.md`

## Code Patterns

### undefined check

```ts
let name: string | undefined
if (name === undefined) {
  // ...
}
```

### null check

```ts
let name: string | null = null
if (name === null) {
  // ...
}
```

### type guard

- Use type guard functions in the form `(value: unknown): value is Type` when handling unknown
- Use existing utils like isNotUndefined, isAccessor, isPromise; create new ones if none exist

```ts
// packages/utils/src/is-not-undefined/index.ts
export const isNotUndefined = <T>(value: T): value is NotUndefined<T> => value !== undefined
```

### type & script import

- Do not duplicate the import source when importing type and value from the same module

```ts
// ok
import {type Foo, runFoo} from './foo'

// nope
import type {Bar} from './bar'
import {runBar} from './bar'
```
