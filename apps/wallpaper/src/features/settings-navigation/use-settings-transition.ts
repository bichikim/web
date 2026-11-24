import {
  cancelCallback,
  createSignal,
  getOwner,
  onCleanup,
  requestCallback,
  runWithOwner,
  startTransition,
} from 'solid-js'

/** Yields to selection paint when visible, without waiting for suspended frames when hidden. */
export const useSettingsTransition = () => {
  const owner = getOwner()
  const [pending, setPending] = createSignal(false)
  let revision = 0
  let disposed = false
  let cancelQueued: (() => void) | null = null
  const start = (change: () => void): Promise<void> => {
    revision += 1
    const request = revision
    setPending(true)
    cancelQueued?.()
    return new Promise((resolve, reject) => {
      let frame = 0
      let task: ReturnType<typeof requestCallback> | null = null
      const stopPaint = () => {
        cancelAnimationFrame(frame)
        document.removeEventListener('visibilitychange', handleVisibility)
      }
      const cancel = () => {
        stopPaint()
        if (task !== null) {
          cancelCallback(task)
        }
        resolve()
      }
      cancelQueued = cancel
      const commit = async () => {
        if (cancelQueued === cancel) {
          cancelQueued = null
        }
        try {
          if (!disposed && request === revision) {
            await runWithOwner(owner, () => startTransition(change))
          }
        } finally {
          if (!disposed && request === revision) {
            setPending(false)
          }
        }
      }
      const queue = () => {
        stopPaint()
        if (task === null) {
          task = requestCallback(() => {
            commit().then(resolve, reject)
          })
        }
      }
      const handleVisibility = () => {
        if (document.visibilityState === 'hidden') {
          queue()
        }
      }
      if (document.visibilityState === 'hidden') {
        queue()
      } else {
        document.addEventListener('visibilitychange', handleVisibility)
        frame = requestAnimationFrame(queue)
      }
    })
  }
  onCleanup(() => {
    disposed = true
    cancelQueued?.()
    cancelQueued = null
  })
  return {pending, start}
}
