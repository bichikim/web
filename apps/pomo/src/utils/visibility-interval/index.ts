import {getDocument} from '@winter-love/utils'
import {visibility} from 'src/utils/visibility'

export const visibilityInterval = (callback: () => void, interval: number) => {
  let intervalId: ReturnType<typeof globalThis.setInterval> | null = null

  const startInterval = () => {
    if (intervalId !== null) {
      return
    }

    intervalId = globalThis.setInterval(callback, interval)
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
