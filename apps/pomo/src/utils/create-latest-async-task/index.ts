interface PendingInput<Input> {
  readonly value: Input
}

/** Runs one task at a time, retains only the latest pending input, and settles callers after the final task. */
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
          // Await sequentially to prevent overlapping tasks.
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
