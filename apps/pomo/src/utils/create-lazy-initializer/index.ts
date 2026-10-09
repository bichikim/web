/** Initializes on first call, shares the result across calls, and retries on the next call after rejection. */
export const createLazyInitializer = <Value>(
  initialize: () => Promise<Value>,
): (() => Promise<Value>) => {
  let pending: Promise<Value> | null = null
  return () => {
    pending ??= initialize().catch((error: unknown) => {
      pending = null
      throw error
    })
    return pending
  }
}
