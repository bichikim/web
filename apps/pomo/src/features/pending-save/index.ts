import {debounce} from '@winter-love/solid-use/debounce'

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
  const pending = debounce((value: Value) => {
    options.save(value)
  }, options.delayMilliseconds)
  return {
    cancel: pending.cancel,
    flush: pending.flush,
    hasPending: pending.hasPending,
    schedule: (value) => {
      pending(value)
    },
  }
}
