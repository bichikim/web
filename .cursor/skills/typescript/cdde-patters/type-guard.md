### type guard

- Use type guard functions in the form `(value: unknown): value is Type` when handling unknown
- Use existing utils like isNotUndefined, isAccessor, isPromise; create new ones if none exist

```ts
// packages/utils/src/is-not-undefined/index.ts
export const isNotUndefined = <T>(value: T): value is NotUndefined<T> => value !== undefined
```
