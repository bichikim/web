import {onCleanup, onMount} from 'solid-js'

/** Loads once after client mount; skips callbacks after disposal and releases synchronous setup's cleanup. Does not cancel the Promise. */
export const useClientAsync = <T>(
  load: () => Promise<T>,
  onReady: (value: T) => void | (() => void),
  onError: (error: unknown) => void,
): void => {
  let disposed = false
  let cleanup: void | (() => void)

  onCleanup(() => {
    disposed = true
    const release = cleanup
    cleanup = undefined
    release?.()
  })

  onMount(async () => {
    try {
      const value = await load()

      if (disposed) {
        return
      }

      const release = onReady(value)

      if (disposed) {
        release?.()
      } else {
        cleanup = release
      }
    } catch (error: unknown) {
      if (!disposed) {
        onError(error)
      }
    }
  })
}
