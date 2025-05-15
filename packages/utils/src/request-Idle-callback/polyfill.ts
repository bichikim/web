export const requestIdleCallbackPolyfill = (callback: IdleRequestCallback, options: IdleRequestOptions = {}) => {
  const {timeout} = options
  const start = Date.now()
  let didExecute = false
  let timeoutId: any

  if (timeout !== undefined) {
    timeoutId = setTimeout(() => {
      clearTimeout(executeId)

      if (!didExecute) {
        didExecute = true

        callback({
          didTimeout: true,
          // eslint-disable-next-line no-magic-numbers
          timeRemaining: () => Math.max(0, 50 - (Date.now() - start)),
        })
      }
    }, timeout)
  }

  const executeId = setTimeout(() => {
    clearTimeout(timeoutId)
    didExecute = true

    callback({
      didTimeout: false,
      // eslint-disable-next-line no-magic-numbers
      timeRemaining: () => Math.max(0, 50 - (Date.now() - start)),
    })
  }, 1)

  return () => {
    clearTimeout(timeoutId)
    clearTimeout(executeId)
  }
}
