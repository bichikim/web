import {limitAsync} from 'es-toolkit/promise'

export interface SerialTaskQueue {
  /** 작업을 제출한 순서대로 하나씩 실행하며, 해당 작업의 결과나 오류를 전달한다. */
  readonly run: <Value>(operation: () => Promise<Value>) => Promise<Value>
  /** 호출 시점까지 제출된 작업이 모두 끝나기를 기다린다. 작업의 실패는 전달하지 않는다. */
  readonly settle: () => Promise<void>
}

/** 제출된 모든 작업을 순서대로 실행하고, 실패 후에도 다음 작업을 진행한다. */
export const createSerialTaskQueue = (): SerialTaskQueue => {
  const execute = limitAsync(
    <Value>(operation: () => Promise<Value>): Promise<Value> => operation(),
    1,
  )
  let pending = Promise.resolve()
  return {
    run(operation) {
      const result = execute(operation)
      pending = result.then(
        () => undefined,
        () => undefined,
      )
      return result
    },
    settle: () => pending,
  }
}
