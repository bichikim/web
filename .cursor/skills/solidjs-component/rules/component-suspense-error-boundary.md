# Suspense And ErrorBoundary

```tsx
import {createResource, ErrorBoundary, Suspense} from 'solid-js'

// Mock fetch - use an actual fetch function in real code
const fakeFetch = async (): Promise<string> => {
  return fetch('https://example.com')
    .then((res) => res.json())
    .then((data) => data.message)
    .catch((error) => {
      throw new Error('Failed to fetch')
    })
}

const AsyncComponent = () => {
  /**
   * @see https://docs.solidjs.com/reference/basic-reactivity/create-resource
   */
  const [data] = createResource(() => {
    return fakeFetch()
  })

  return <div>{data()}</div>
}

const App = () => {
  return (
    /**
     * @see https://docs.solidjs.com/reference/components/error-boundary
     */
    <ErrorBoundary fallback={(error, reset) => <div onClick={reset}>Error: {error.toString()}. Click to retry.</div>}>
      {/* @see https://docs.solidjs.com/reference/components/suspense */}
      <Suspense fallback={<div>Loading...</div>}>
        <AsyncComponent />
      </Suspense>
    </ErrorBoundary>
  )
}

```
