export interface CompletedAsyncTask {
  readonly status: 'completed'
}

export interface SkippedAsyncTask {
  readonly reason: 'busy'
  readonly status: 'skipped'
}

export type ExclusiveAsyncTaskResult = CompletedAsyncTask | SkippedAsyncTask

export interface ExclusiveAsyncTask {
  /** 빈 슬롯에서 작업을 실행한다. 실행 중이면 작업을 호출하지 않고 skipped를 반환하며, 실행한 작업의 오류는 그대로 전달한다. */
  readonly run: (operation: () => Promise<void>) => Promise<ExclusiveAsyncTaskResult>
}

/** 비동기 작업을 한 번에 하나씩 실행하고, 추가 요청에는 busy 사유의 skipped 결과를 반환한다. */
export const createExclusiveAsyncTask = (): ExclusiveAsyncTask => {
  let running = false
  return {
    async run(operation) {
      if (running) {
        return {reason: 'busy', status: 'skipped'}
      }
      running = true
      try {
        await operation()
        return {status: 'completed'}
      } finally {
        running = false
      }
    },
  }
}
