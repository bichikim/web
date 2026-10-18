/** 첫 호출에서 초기화하고 결과를 공유하며, 거부되면 다음 호출에서 다시 시도한다. */
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
