export interface KeyedTaskQueue {
  readonly run: <Value>(key: string, operation: () => Promise<Value>) => Promise<Value>
}

/** Serializes operations for each key independently and releases completed queue entries. */
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
