# Suspense And ErrorBoundary

- Wrap async/`createResource` UI in `<Suspense fallback={…}>`.
- Wrap recoverable render or resource failures in `<ErrorBoundary fallback={(error, reset) => …}>`.

```tsx
const AsyncComponent = () => {
  const [data] = createResource(() => fakeFetch())
  return <div>{data()}</div>
}

const App = () => (
  <ErrorBoundary
    fallback={(error, reset) => (
      <div onClick={reset}>Error: {error.toString()}. Click to retry.</div>
    )}
  >
    <Suspense fallback={<div>Loading...</div>}>
      <AsyncComponent />
    </Suspense>
  </ErrorBoundary>
)
```
