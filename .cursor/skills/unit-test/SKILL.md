---
name: unit-test
description: Applies project unit test conventions with Vitest and @solidjs/testing-library. Use when writing or editing .spec.ts files, including DOM tests, module mocking, assertions, async/error handling, and time-based tests.
---

# Typescript

## Test Framework

- Use Vitest
- Also use @solidjs/testing-library when testing Solid.js

## Naming Conventions

- File name should follow the target file name: `{targetFileName}.spec.ts`
- Place files in the `__tests__` folder of the same directory as the target
- Tests should use the format starting with "should": `it('should return a name', ...)`

## Patterns

### DOM test

When testing with DOM (e.g. Solid.js tests), add `/** @vitest-environment jsdom */` at the top of the file

### Module mocking

See `./examples/module-mocking.md`

### Assertion patterns

#### toEqual vs toBe

- toBe: Reference equality, primitive values (===)
- toEqual: Deep comparison (objects, arrays)

#### Partial object validation

Pass as argument to toHaveBeenCalledWith, toEqual, etc.

```ts
expect({foo: 'foo', bar: 'bar'}).toEqual(
  expect.objectContaining({
    // check only foo
    foo: 'foo',
  }),
)
```

Use directly with expect

```ts
expect({bar: 'bar', foo: 'foo'}).toMatchObject({
  foo: 'foo',
})
```

#### null, undefined validation

```ts
expect(null).toBeNull()
expect(undefined).toBeUndefined()
```

#### Type-only validation

```ts
const mock = jest.fn()
expect(mock).toHaveBeenCalledWith(expect.any(Function))
```

### Async assertion

See `./examples/async-assertion.md`

### Error assertion

See `./examples/error-assertion.md`

### Time-based testing patterns

See `./examples/time-based-testing.md`
