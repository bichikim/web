/**
 * Runs one operation, cancelling its wait while consuming any late result or rejection.
 * Native operations without cancellation support may finish after this wait is rejected.
 */
export const withAbort = <Value>(
  operation: () => Promise<Value>,
  signal?: AbortSignal,
): Promise<Value> => {
  if (signal === undefined) {
    return operation()
  }
  signal.throwIfAborted()
  return new Promise((resolve, reject) => {
    const cleanup = () => signal.removeEventListener('abort', abort)
    const abort = () => {
      cleanup()
      reject(signal.reason)
    }
    signal.addEventListener('abort', abort, {once: true})
    try {
      operation().then(
        (value) => {
          cleanup()
          resolve(value)
        },
        (error) => {
          cleanup()
          reject(error)
        },
      )
    } catch (error) {
      cleanup()
      reject(error)
    }
  })
}
