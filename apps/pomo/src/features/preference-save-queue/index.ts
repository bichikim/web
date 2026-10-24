export interface PreferenceSaveQueueOptions<Value> {
  readonly initial: Value
  readonly equal: (left: Value, right: Value) => boolean
}
/** Tracks ordered saves, committed values and stale optimistic storage snapshots. */
export const createPreferenceSaveQueue = <Value>(options: PreferenceSaveQueueOptions<Value>) => {
  const pending: Value[] = []
  let committed = options.initial
  let failedStored: Value | null = null
  return {
    clearFailure: () => {
      failedStored = null
    },
    enqueue: (value: Value) => {
      failedStored = value
      pending.push(value)
    },
    hasPending: () => pending.length > 0,
    settle: (didSave: boolean) => {
      const value = pending.shift() ?? null
      if (didSave && value !== null) {
        committed = value
      }
      if (didSave && pending.length === 0) {
        failedStored = null
      }
      return {committed, hasPending: pending.length > 0, value}
    },
    synchronize: (value: Value): boolean => {
      if (pending.length > 0 || (failedStored !== null && options.equal(value, failedStored))) {
        return false
      }
      failedStored = null
      committed = value
      return true
    },
  }
}
