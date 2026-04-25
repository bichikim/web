---
name: typescript-conventions
description: Applies project TypeScript conventions for naming, formatting, typing, and code patterns. Use when writing or editing .ts or .tsx files.
---

# Typescript

## Naming Conventions

- Use PascalCase for Class, Interface and Type
- Use camelCase for variables, function and method
- Use UPPER_SNAKE_CASE for CONSTANTS
- Do not abbreviate variable names (e.g. use `event` not `e`, `value` not `v`)
- Variable names may be composed of up to 3 words
- When nesting (object, callback, loop, etc.), do not repeat the outer name in inner variables (e.g. inside `user.profile` use `name` not `userName`)

## Code Writing Order

1. Write code
2. Run `oxlint --fix` for lint auto-fix

## Format

### Comment placement

Never write comments on the right side of code; always write above the target code.

```ts
// ok
// 5 minutes
const CACHE_MAX_AGE = 300

// nope
const CACHE_MAX_AGE = 300 // 5 minutes
```

### type & value import

Do not duplicate the import source when importing type and value from the same module — use `import {type Foo, bar} from './foo'` not separate lines.

### Object parameter (props / options)

- For Solid-style hook functions whose name starts with `use`, the single object parameter should be `props: FooBarProps` (match the type name to the hook: `{HookName}Props`).
- For shared utils, the single object parameter should be `options: FooBarOptions` (match the type name to the function: `{FunctionName}Options`).

```ts
// hooks
export const useMyFeature = (props: MyFeatureProps) => {
  /* ... */
}

// utils
export const formatUserLabel = (options: FormatUserLabelOptions) => {
  /* ... */
}
```

## Typing

- Define types with `interface`; use `type` only when interface cannot express it
- Keep object type nesting depth to at most one level
- Avoid `any`; prefer `unknown` with type guards
- Prefer `satisfies` over `as` (type assertion); `as const` is an exception
- Use `as const` + union instead of `enum`
- Use `readonly` for immutable data whenever possible
- When types are missing in a module — see `./rules/no-types.md`

## Code Patterns

### Single responsibility (functions)

- Prefer one function, one reason to change: split **access** (e.g. read last element), **guards / predicates**, and **transforms** (e.g. map or copy-and-update) when they are mixed in one place.
- Build target behavior through function composition: first reuse existing single-purpose shared functions when they fit, then add the smallest new focused functions needed and compose them into the goal function.
- Extract small, named single-purpose functions when the same sub-step appears in more than one caller or when the name makes the main flow read as steps, not mechanics.
- Do not create meaningless wrapper or blob functions: every extracted function must represent a clear concept in the composition and improve readability, reuse, or testability.

### Undefined checks

./cdde-patters/undefined-check.md

### Null checks

./cdde-patters/null-check.md

### Type guards

./cdde-patters/type-guard.md

### Type + value import pattern

./cdde-patters/type-and-value-import.md
