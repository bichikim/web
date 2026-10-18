export interface ExclusiveAsyncTask {
  readonly run: (operation: () => Promise<void>) => Promise<void>
}

/** 비동기 작업을 한 번에 하나씩 실행하고 실행 중 들어온 요청은 버린다. */
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
