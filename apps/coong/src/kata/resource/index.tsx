import {createEffect, createResource, ErrorBoundary, onCleanup, Suspense} from 'solid-js'

const TEST_TIMEOUT = 1000
const TEST_RANDOM_FAILURE_THRESHOLD = 0.5

const fakeFetch = async (signal: () => AbortSignal, delay: number = TEST_TIMEOUT) => {
  await new Promise((resolve) => {
    let timeout: any = null
    const _signal = signal()

    const cleanup = () => {
      if (timeout) {
        clearTimeout(timeout)
        timeout = null
      }
    }

    timeout = setTimeout(() => {
      resolve(null)
      _signal.removeEventListener('abort', cleanup)
    }, delay)
    _signal.addEventListener('abort', cleanup)
  })
}

function AsyncComponent() {
  const [data] = createResource(async () => {
    await new Promise((resolve) => {
      const timeout = setTimeout(resolve, TEST_TIMEOUT)

      onCleanup(() => {
        console.info('cleanup')
        clearTimeout(timeout)
      })
    })

    if (Math.random() > TEST_RANDOM_FAILURE_THRESHOLD) {
      throw new Error('Random Failure')
    }

    return 'Success!'
  })

  return <div>{data()}</div>
}

export function ResourceKata() {
  return (
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
}
