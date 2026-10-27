interface RefreshFailure {
  error: unknown
}

/**
 * Coalesces concurrent refresh requests and retains changes received during an active refresh.
 * The shared promise settles after queued work drains, rejecting with the first failure, if any.
 */
export const createRefreshQueue = (refresh: () => Promise<void>): (() => Promise<void>) => {
  let queued = false
  let running: Promise<void> | null = null
  const drain = async (): Promise<void> => {
    let failure: RefreshFailure | undefined
    while (queued) {
      queued = false
      try {
        // oxlint-disable-next-line no-await-in-loop -- Refreshes must finish before queued work starts.
        await refresh()
      } catch (error) {
        failure ??= {error}
      }
    }
    running = null
    if (failure !== undefined) {
      throw failure.error
    }
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
