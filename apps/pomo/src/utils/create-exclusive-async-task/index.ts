export interface ExclusiveAsyncTask {
  readonly run: (operation: () => Promise<void>) => Promise<void>
}

/** Runs one asynchronous operation at a time and drops overlapping requests. */
export const createExclusiveAsyncTask = (): ExclusiveAsyncTask => {
  let running = false
  return {
    run(operation) {
      if (running) {
        return Promise.resolve()
      }
      running = true
      try {
        return operation().finally(() => {
          running = false
        })
      } catch (error: unknown) {
        running = false
        return Promise.reject(error)
      }
    },
  }
}
