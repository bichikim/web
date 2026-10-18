export interface KeyedTaskQueue {
  readonly run: <Value>(key: string, operation: () => Promise<Value>) => Promise<Value>
}

/** 키별로 작업을 독립적으로 순차 실행하고 완료된 큐 항목을 해제한다. */
export const createKeyedTaskQueue = (): KeyedTaskQueue => {
  const queues = new Map<string, Promise<void>>()
  return {
    run(key, operation) {
      const result = (queues.get(key) ?? Promise.resolve()).then(operation)
      const completion = result.then(
        () => undefined,
        () => undefined,
      )
      queues.set(key, completion)
      return result.finally(() => {
        if (queues.get(key) === completion) {
          queues.delete(key)
        }
      })
    },
  }
}
