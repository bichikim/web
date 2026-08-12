export interface BlinkSchedulerOptions {
  readonly maximumDelay: number
  readonly minimumDelay: number
  readonly onBlink: () => Promise<void> | void
  readonly random?: () => number
  readonly setTimer?: typeof globalThis.setTimeout
  readonly clearTimer?: typeof globalThis.clearTimeout
}

export interface BlinkScheduler {
  readonly blink: () => Promise<void>
  readonly destroy: () => void
  readonly start: () => void
}

/** Schedules non-overlapping blinks at randomized intervals. */
export function createBlinkScheduler(options: BlinkSchedulerOptions): BlinkScheduler {
  const random = options.random ?? Math.random
  const setTimer = options.setTimer ?? globalThis.setTimeout
  const clearTimer = options.clearTimer ?? globalThis.clearTimeout
  let timer: ReturnType<typeof setTimeout> | null = null
  let destroyed = false
  let blinking = false

  const clearScheduledBlink = () => {
    if (timer === null) {
      return
    }

    clearTimer(timer)
    timer = null
  }

  const scheduleBlink = () => {
    if (destroyed) {
      return
    }

    const range = Math.max(0, options.maximumDelay - options.minimumDelay)
    const delay = options.minimumDelay + random() * range

    timer = setTimer(() => {
      timer = null
      blink().catch((error: unknown) => {
        globalThis.reportError(error)
      })
    }, delay)
  }

  const blink = async () => {
    if (destroyed || blinking) {
      return
    }

    blinking = true
    clearScheduledBlink()

    try {
      await options.onBlink()
    } finally {
      blinking = false

      if (timer === null) {
        scheduleBlink()
      }
    }
  }

  const start = () => {
    if (destroyed || timer !== null) {
      return
    }

    scheduleBlink()
  }

  const destroy = () => {
    destroyed = true
    clearScheduledBlink()
  }

  return {blink, destroy, start}
}
