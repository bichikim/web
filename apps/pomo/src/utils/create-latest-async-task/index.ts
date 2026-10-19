interface PendingInput<Input> {
  readonly value: Input
}

/** 작업을 한 번에 하나씩 실행하고 최신 대기 입력만 유지하며, 마지막 작업이 끝나면 호출자들의 Promise를 완료한다. */
export const createLatestAsyncTask = <Input>(
  execute: (input: Input) => void | Promise<void>,
): ((input: Input) => Promise<void>) => {
  let pendingTask: Promise<void> | null = null
  let pendingInput: PendingInput<Input> | null = null

  const flush = async (): Promise<void> => {
    try {
      while (pendingInput !== null) {
        const current = pendingInput
        pendingInput = null
        try {
          // 작업이 겹치지 않도록 순서대로 기다린다.
          // eslint-disable-next-line no-await-in-loop
          await execute(current.value)
        } catch (error: unknown) {
          if (pendingInput === null) {
            throw error
          }
        }
      }
    } finally {
      pendingTask = null
    }
  }

  return (value: Input) => {
    pendingInput = {value}
    if (pendingTask !== null) {
      return pendingTask
    }
    const completion = Promise.withResolvers<void>()
    pendingTask = completion.promise
    flush().then(completion.resolve, completion.reject)
    return completion.promise
  }
}
