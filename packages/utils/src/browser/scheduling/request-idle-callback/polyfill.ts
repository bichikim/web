/** Idle period budget (ms) used when emulating `requestIdleCallback` deadlines. */
const IDLE_DEADLINE_MS = 50

export const requestIdleCallbackPolyfill = (
  callback: IdleRequestCallback,
  options: IdleRequestOptions = {},
) => {
  const {timeout} = options
  const start = Date.now()
  let didExecute = false
  let timeoutId: ReturnType<typeof setTimeout> | undefined

  if (timeout !== undefined) {
    timeoutId = setTimeout(() => {
      clearTimeout(executeId)

      if (!didExecute) {
        didExecute = true

        callback({
          didTimeout: true,

          timeRemaining: () => Math.max(0, IDLE_DEADLINE_MS - (Date.now() - start)),
        })
      }
    }, timeout)
  }

  const executeId = setTimeout(() => {
    clearTimeout(timeoutId)
    didExecute = true

    callback({
      didTimeout: false,

      timeRemaining: () => Math.max(0, IDLE_DEADLINE_MS - (Date.now() - start)),
    })
  }, 1)

  return () => {
    clearTimeout(timeoutId)
    clearTimeout(executeId)
  }
}
