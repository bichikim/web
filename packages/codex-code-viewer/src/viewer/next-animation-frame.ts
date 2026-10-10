/** Resolves at the next rendering opportunity and releases a pending frame when cancelled. */
export const nextAnimationFrame = (signal: AbortSignal): Promise<void> => {
  signal.throwIfAborted()
  if (typeof globalThis.requestAnimationFrame === 'undefined') {
    return Promise.resolve()
  }
  return new Promise((resolve, reject) => {
    const abort = (): void => {
      cancelAnimationFrame(frame)
      reject(signal.reason)
    }
    const frame = requestAnimationFrame(() => {
      signal.removeEventListener('abort', abort)
      resolve()
    })
    signal.addEventListener('abort', abort, {once: true})
  })
}
