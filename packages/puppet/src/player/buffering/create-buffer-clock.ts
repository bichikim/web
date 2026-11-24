export interface BufferPrediction {
  readonly deltaTime: number
  readonly time: number
}

/** Follows display cadence and catches up to elapsed time when production is late. */
export const createBufferClock = (initialTime: number) => {
  const MILLISECONDS_PER_SECOND = 1000
  const INITIAL_REFRESH_RATE = 60
  let previous = initialTime
  let refresh = MILLISECONDS_PER_SECOND / INITIAL_REFRESH_RATE
  const advance = (time: number): BufferPrediction => {
    const deltaTime = (time - previous) / MILLISECONDS_PER_SECOND
    previous = time
    return {deltaTime, time}
  }
  return {
    /** Input is displayed immediately, so repeated updates must not advance into predicted time. */
    current: (now: number) => advance(Math.max(previous, now)),
    next(now: number): BufferPrediction {
      return advance(Math.max(previous + refresh, now + refresh))
    },
    observeRefresh(milliseconds: number) {
      if (Number.isFinite(milliseconds) && milliseconds > 0) {
        refresh = Math.min(refresh, milliseconds)
      }
    },
    /** Observed refresh interval in milliseconds, initially 60 Hz. */
    rebase(time: number) {
      previous = time
    },
    refreshInterval: () => refresh,
  }
}
