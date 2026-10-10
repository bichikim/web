/** Coalesces concurrent refresh requests and retains changes received during an active refresh. */
export const createRefreshQueue = (refresh: () => Promise<void>): (() => Promise<void>) => {
  let queued = false
  let running: Promise<void> | null = null
  const drain = async (): Promise<void> => {
    queued = false
    try {
      await refresh()
    } catch (error) {
      running = null
      throw error
    }
    if (queued) {
      await drain()
    } else {
      running = null
    }
  }
  return () => {
    queued = true
    running ??= drain()
    return running
  }
}
