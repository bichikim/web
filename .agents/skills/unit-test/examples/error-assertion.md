# Error assertion (toThrow)

If error-throwing code is executed directly, the test will be aborted by that error. It must be wrapped in a function.

```ts
expect(() => {
  throw new Error('error')
}).toThrow('error')
```
