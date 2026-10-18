export interface SerialTaskQueue {
  readonly run: <Value>(operation: () => Promise<Value>) => Promise<Value>
  readonly settle: () => Promise<void>
}

/** 제출된 모든 작업을 순서대로 실행하고, 실패 후에도 다음 작업을 진행한다. */
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
