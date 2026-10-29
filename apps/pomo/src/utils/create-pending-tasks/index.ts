export interface PendingTasks {
  /** 완료 정리가 남아 있는 등록 작업이 있는지 반환한다. */
  readonly hasPending: () => boolean
  /** 호출 시점의 작업만 기다리며, 개별 실패와 관계없이 완료한다. */
  readonly settle: () => Promise<void>
  /** 시작된 Promise를 등록하고 같은 Promise와 결과·거부 사유를 반환한다. 완료 후 등록을 해제한다. */
  readonly track: <Value>(pending: Promise<Value>) => Promise<Value>
}

/** 인스턴스 안의 병렬 작업을 추적하고 호출 시점의 작업이 끝나기를 기다린다. */
export const createPendingTasks = (): PendingTasks => {
  const pending = new Set<Promise<unknown>>()
  return {
    hasPending: () => pending.size > 0,
    settle: async (): Promise<void> => {
      await Promise.all(Array.from(pending, (task) => task.catch(() => undefined)))
    },
    track(task) {
      pending.add(task)
      task.finally(() => pending.delete(task)).catch(() => undefined)
      return task
    },
  }
}
