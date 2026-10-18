interface StreamProgressOptions<T> {
  readonly signal: AbortSignal
  readonly run: (receive: (value: T) => Promise<void>, signal: AbortSignal) => Promise<void>
}

/** Delivers producer events until completion and cancels production when consumption stops. */
export async function* streamProgress<T>(
  options: StreamProgressOptions<T>,
): AsyncGenerator<readonly T[]> {
  const controller = new AbortController()
  const signal = AbortSignal.any([controller.signal, options.signal])
  const queue: {value: T; consumed: ReturnType<typeof Promise.withResolvers<void>>}[] = []
  let changed = Promise.withResolvers<void>()
  let done = false
  let error: Error | undefined
  const wake = (): void => changed.resolve()
  signal.addEventListener('abort', wake, {once: true})
  const receive = (value: T): Promise<void> => {
    const consumed = Promise.withResolvers<void>()
    if (signal.aborted) {
      consumed.resolve()
    } else {
      queue.push({consumed, value})
      wake()
    }
    return consumed.promise
  }
  Promise.resolve()
    .then(() => options.run(receive, signal))
    .catch((reason: unknown) => {
      error = reason instanceof Error ? reason : new Error('Navigation failed', {cause: reason})
    })
    .finally(() => {
      done = true
      wake()
    })
  try {
    // oxlint-disable-next-line no-unmodified-loop-condition -- Producer events update completion and wake the consumer.
    while (!done || queue.length > 0) {
      signal.throwIfAborted()
      if (queue.length > 0) {
        const batch = queue.splice(0)
        try {
          yield batch.map((entry) => entry.value)
        } finally {
          batch.forEach((entry) => entry.consumed.resolve())
        }
      } else {
        // oxlint-disable-next-line no-await-in-loop -- Wait for the next producer event without polling.
        await changed.promise
        changed = Promise.withResolvers<void>()
      }
    }
    signal.throwIfAborted()
    if (error instanceof Error) {
      // oxlint-disable-next-line no-throw-literal -- The producer failure is normalized to an Error before storage.
      throw error
    }
  } finally {
    controller.abort()
    queue.splice(0).forEach((entry) => entry.consumed.resolve())
    signal.removeEventListener('abort', wake)
  }
}
