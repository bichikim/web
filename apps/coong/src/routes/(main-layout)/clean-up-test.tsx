import {createResource} from 'solid-js'

const FAKE_FETCH_DELAY_MS = 1000

const fakeFetch = (timeout: number, signal?: AbortSignal) => {
  return new Promise((resolve, reject) => {
    let timeoutFlag: any = null

    const cleanupWithReject = () => {
      clearTimeout(timeoutFlag)
      removeAbortListener()
      reject(new Error('AbortError'))
    }

    const removeAbortListener = () => {
      signal?.removeEventListener('abort', cleanupWithReject)
    }

    timeoutFlag = setTimeout(() => {
      resolve('data')
      removeAbortListener()
    }, timeout)
    signal?.addEventListener('abort', cleanupWithReject)
  })
}

export default function CleanUpTest() {
  const controller = new AbortController()

  const [data] = createResource(async () => {
    return fakeFetch(FAKE_FETCH_DELAY_MS, controller.signal)
  })

  return <div>CleanUpTest</div>
}
