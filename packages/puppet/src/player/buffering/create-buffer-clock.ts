export interface BufferPrediction {
  readonly deltaTime: number
  readonly time: number
}

/** Predicts presentation time from measured capacity without imposing a playback FPS limit. */
export const createBufferClock = (initialTime: number) => {
  const MILLISECONDS_PER_SECOND = 1000
  const INITIAL_REFRESH_RATE = 60
  const SAMPLE_WEIGHT = 0.2
  let previous = initialTime
  let refresh = MILLISECONDS_PER_SECOND / INITIAL_REFRESH_RATE
  let compute = 0
  return {
    next(now: number): BufferPrediction {
      const time = Math.max(previous + Math.max(refresh, compute), now + Math.max(refresh, compute))
      const deltaTime = (time - previous) / MILLISECONDS_PER_SECOND
      previous = time
      return {deltaTime, time}
    },
    observeCompute(milliseconds: number) {
      if (Number.isFinite(milliseconds) && milliseconds >= 0) {
        compute =
          compute === 0
            ? milliseconds
            : compute * (1 - SAMPLE_WEIGHT) + milliseconds * SAMPLE_WEIGHT
      }
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
