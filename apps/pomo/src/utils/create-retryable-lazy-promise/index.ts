/** Shares a lazy promise across concurrent calls and retries after a rejected attempt. */
export const createRetryableLazyPromise = <Value>(
  create: () => Promise<Value>,
): (() => Promise<Value>) => {
  let pending: Promise<Value> | null = null
  return () => {
    pending ??= create().catch((error: unknown) => {
      pending = null
      throw error
    })
    return pending
  }
}
