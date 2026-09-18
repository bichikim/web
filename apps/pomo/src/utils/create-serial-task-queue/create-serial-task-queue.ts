export interface SerialTaskQueue {
  readonly run: <Value>(operation: () => Promise<Value>) => Promise<Value>
  readonly settle: () => Promise<void>
}

/** Runs every submitted operation in order and lets later operations proceed after a failure. */
export const createSerialTaskQueue = (): SerialTaskQueue => {
  let pending = Promise.resolve()
  return {
    run(operation) {
      const result = pending.then(operation)
      pending = result.then(
        () => undefined,
        () => undefined,
      )
      return result
    },
    settle: () => pending,
  }
}
