export interface SingleFlight<Value> {
  /** 같은 키의 실행 중인 Promise를 공유한다. 새 작업은 즉시 호출하고, 성공·실패 후에는 키를 해제한다. */
  readonly run: (key: string, operation: () => Promise<Value>) => Promise<Value>
}

/** 인스턴스 안에서 작업이 반환한 Promise가 완료될 때까지 키별로 공유한다. */
export const createSingleFlight = <Value>(): SingleFlight<Value> => {
  const pending = new Map<string, Promise<Value>>()

  return {
    run(key, operation) {
      const existing = pending.get(key)
      if (existing !== undefined) {
        return existing
      }

      const result = operation().finally(() => pending.delete(key))
      pending.set(key, result)
      return result
    },
  }
}
