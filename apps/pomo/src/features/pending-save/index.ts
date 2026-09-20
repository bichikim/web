export interface PendingSave<Value> {
  readonly schedule: (value: Value) => void
  readonly cancel: () => void
  readonly flush: () => void
  readonly hasPending: () => boolean
}

export interface CreatePendingSaveOptions<Value> {
  readonly delayMilliseconds: number
  readonly save: (value: Value) => void
}

/** Saves the latest pending value after a quiet interval or an explicit flush. */
export const createPendingSave = <Value>(
  options: CreatePendingSaveOptions<Value>,
): PendingSave<Value> => {
  let pending: {readonly value: Value} | null = null
  let timeout: ReturnType<typeof globalThis.setTimeout> | null = null
  const cancel = () => {
    if (timeout !== null) {
      globalThis.clearTimeout(timeout)
      timeout = null
    }
    pending = null
  }
  const flush = () => {
    const snapshot = pending
    cancel()
    if (snapshot !== null) {
      options.save(snapshot.value)
    }
  }
  return {
    cancel,
    flush,
    hasPending: () => pending !== null,
    schedule(value) {
      cancel()
      pending = {value}
      timeout = globalThis.setTimeout(flush, options.delayMilliseconds)
    },
  }
}
