import {selectMaximumBy} from '../select-maximum-by'

interface TimestampedValue {
  readonly savedAt: number
}
interface TimestampedStorageOptions {
  readonly now: () => number
  readonly timestamp?: 'clock' | 'monotonic'
}

/** 타임스탬프가 있는 쓰기와 읽기 리비전을 조정한다. 런타임 간 조정과 실패 정책은 어댑터가 담당한다. */
export const createTimestampedDualRuntimeStorage = <Value extends TimestampedValue>(
  options: TimestampedStorageOptions,
) => {
  let revision = 0
  let latestSavedAt = 0
  const pendingWrites = new Set<Promise<void>>()
  const invalidate = () => (revision += 1)
  const observeSavedAt = (...timestamps: ReadonlyArray<number>) => {
    latestSavedAt = Math.max(latestSavedAt, ...timestamps)
  }
  const trackWrite = (pending: Promise<void>): Promise<void> => {
    pendingWrites.add(pending)
    pending.finally(() => pendingWrites.delete(pending)).catch(() => undefined)
    return pending
  }
  const writeStored = async (
    createValue: (savedAt: number) => Value,
    persist: (value: Value) => Promise<void>,
  ): Promise<void> => {
    invalidate()
    const now = options.now()
    const savedAt = options.timestamp === 'monotonic' ? Math.max(now, latestSavedAt + 1) : now
    latestSavedAt = savedAt
    return trackWrite(persist(createValue(savedAt)))
  }
  return {
    hasPendingWrites: () => pendingWrites.size > 0,
    invalidate,
    observeSavedAt,
    revision: () => revision,
    selectLatest: (first: Value | null, second: Value | null): Value | null =>
      selectMaximumBy(first, second, (value) => value.savedAt),
    settleWrites: async (): Promise<void> => {
      await Promise.all(Array.from(pendingWrites, (pending) => pending.catch(() => undefined)))
    },
    trackWrite,
    writeStored,
  }
}
