# Assertion Patterns

## toEqual vs toBe

- `toBe`: Reference equality, primitive values (`===`)
- `toEqual`: Deep comparison for objects and arrays

## Partial Object Validation

Pass as argument to `toHaveBeenCalledWith`, `toEqual`, etc.

```ts
expect({foo: 'foo', bar: 'bar'}).toEqual(
  expect.objectContaining({
    // check only foo
    foo: 'foo',
  }),
)
```

Use directly with `expect`.

```ts
expect({bar: 'bar', foo: 'foo'}).toMatchObject({
  foo: 'foo',
})
```

## null, undefined validation

```ts
expect(null).toBeNull()
expect(undefined).toBeUndefined()
```

## Type-only validation

```ts
import {expect, vi} from 'vitest'

const mock = vi.fn()
expect(mock).toHaveBeenCalledWith(expect.any(Function))
```
