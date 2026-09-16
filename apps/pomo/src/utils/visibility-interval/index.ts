import {getDocument} from '@winter-love/utils'
import {visibility} from 'src/utils/visibility'

export interface VisibilityIntervalOptions {
  readonly callback: () => void
  readonly interval: number
  readonly runOnVisible?: boolean
  readonly runOverdueOnVisible?: boolean
}

/** Pauses the interval while hidden and restarts it when the document is visible. */
export function visibilityInterval(options: VisibilityIntervalOptions): () => void
export function visibilityInterval(
  callback: () => void,
  interval: number,
  runOverdueOnVisible?: boolean,
): () => void
export function visibilityInterval(
  optionsOrCallback: VisibilityIntervalOptions | (() => void),
  interval?: number,
  runOverdueOnVisible = false,
) {
  let options: VisibilityIntervalOptions
  if (typeof optionsOrCallback === 'function') {
    if (interval === undefined) {
      throw new TypeError('visibilityInterval requires an interval.')
    }

    options = {
      callback: optionsOrCallback,
      interval,
      runOverdueOnVisible,
    }
  } else {
    options = optionsOrCallback
  }

  let nextExecution = Date.now() + options.interval
  const run = () => {
    const now = Date.now()
    nextExecution = now + options.interval
    options.callback()
  }
  let intervalId: ReturnType<typeof globalThis.setInterval> | null = null

  const startInterval = (isReturningToVisible: boolean) => {
    if (intervalId !== null) {
      return
    }

    const now = Date.now()
    const isOverdue = now >= nextExecution
    nextExecution = now + options.interval
    intervalId = globalThis.setInterval(run, options.interval)
    if (
      isReturningToVisible &&
      (options.runOnVisible === true || (options.runOverdueOnVisible === true && isOverdue))
    ) {
      run()
    }
  }

  const stopInterval = () => {
    if (intervalId === null) {
      return
    }

    globalThis.clearInterval(intervalId)
    intervalId = null
  }

  const clearVisibilityWatch = visibility((isHidden) => {
    if (isHidden) {
      stopInterval()
      return
    }

    startInterval(true)
  })

  if (getDocument()?.hidden === false) {
    startInterval(false)
  }

  return () => {
    stopInterval()
    clearVisibilityWatch()
  }
}
