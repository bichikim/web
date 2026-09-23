interface TimerStorage {
  readonly getItem: (key: string) => string | null
}

interface TimerState {
  readonly remainingSeconds: number
}

/** Reads timer state and returns null when persisted data is missing, invalid, or unavailable. */
export const readTimerState = (storage: TimerStorage): TimerState | null => {
  try {
    const stored = storage.getItem('timer-state')
    return stored === null ? null : (JSON.parse(stored) as TimerState)
  } catch {
    return null
  }
}
