/**
 * Coalesces concurrent refresh requests and retains changes received during an active refresh.
 * A failure rejects the active callers; queued work continues with a new shared promise.
 */
export const createRefreshQueue = (refresh: () => Promise<void>): (() => Promise<void>) => {
  let queued = false
  let running: Promise<void> | null = null
  const drain = async (): Promise<void> => {
    while (queued) {
      queued = false
      try {
        // oxlint-disable-next-line no-await-in-loop -- Refreshes must finish before queued work starts.
        await refresh()
      } catch (error) {
        running = null
        if (queued) {
          running = Promise.resolve().then(drain)
          // Observe internally started work without changing the promise returned to later callers.
          running.catch(() => undefined)
        }
        throw error
      }
    }
    running = null
  }
  return () => {
    queued = true
    if (running !== null) {
      return running
    }
    const pending = Promise.withResolvers<void>()
    running = pending.promise
    drain().then(pending.resolve, pending.reject)
    return pending.promise
  }
}
