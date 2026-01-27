import {createResource, ErrorBoundary, Suspense, createEffect, onCleanup} from 'solid-js'

function AsyncComponent() {
  const [data] = createResource(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 1000)
    })

    onCleanup(() => {
      console.log('cleanup')
    })

    if (Math.random() > 0.5) {
      throw new Error('Random Failure')
    }

    return 'Success!'
  })

  return <div>{data()}</div>
}

function App() {
  return (
    <ErrorBoundary fallback={(error, reset) => <div onClick={reset}>Error: {error.toString()}. Click to retry.</div>}>
      <Suspense fallback={<div>Loading...</div>}>
        <AsyncComponent />
      </Suspense>
    </ErrorBoundary>
  )
}
