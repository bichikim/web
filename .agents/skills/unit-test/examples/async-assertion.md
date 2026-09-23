# Async assertion (resolves/rejects)

- Must use the form `return expect(promise).resolves.toEqual(...)`
- Without `return`, the Promise won't be awaited and the test will always pass
