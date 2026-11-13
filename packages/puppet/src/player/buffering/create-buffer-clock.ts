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
  return {
    next(now: number): BufferPrediction {
      const time = Math.max(previous + refresh, now + refresh)
      const deltaTime = (time - previous) / MILLISECONDS_PER_SECOND
      previous = time
      return {deltaTime, time}
    },
    observeRefresh(milliseconds: number) {
      if (Number.isFinite(milliseconds) && milliseconds > 0) {
        refresh = Math.min(refresh, milliseconds)
      }
    },
    rebase(time: number) {
      previous = time
    },
  }
}
