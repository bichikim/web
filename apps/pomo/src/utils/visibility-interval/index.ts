import {getDocument} from '@winter-love/utils'
import {visibility} from 'src/utils/visibility'

/** Pauses while hidden; optionally runs once on return when the previous deadline has passed. */
export const visibilityInterval = (
  callback: () => void,
  interval: number,
  runOverdueOnVisible = false,
) => {
  let nextExecution = Date.now() + interval
  const run = () => {
    nextExecution = Date.now() + interval
    callback()
  }
  let intervalId: ReturnType<typeof globalThis.setInterval> | null = null

  const startInterval = () => {
    if (intervalId !== null) {
      return
    }

    const isOverdue = Date.now() >= nextExecution
    nextExecution = Date.now() + interval
    intervalId = globalThis.setInterval(run, interval)
    if (runOverdueOnVisible && isOverdue) {
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

    startInterval()
  })

  if (getDocument()?.hidden === false) {
    startInterval()
  }

  return () => {
    stopInterval()
    clearVisibilityWatch()
  }
}
