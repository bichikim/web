import {onCleanup} from 'solid-js'

const animationLoopNoop = (): void => undefined

/**
 * Solid hook that runs a callback on each animation frame via `requestAnimationFrame`.
 *
 * Returns `{ start, stop }`. The loop does not run until `start(callback)` is called.
 * `stop()` cancels the next pending frame. Unmounting the owning reactive scope also
 * calls `stop()` via `onCleanup`.
 *
 * **SSR:** No-ops when `requestAnimationFrame` / `cancelAnimationFrame` are unavailable.
 *
 * **Errors:** Callback throws are not caught; scheduling continues until `stop()` (including
 * from inside the callback).
 */
export const createAnimationLoop = () => {
  if (typeof requestAnimationFrame !== 'function' || typeof cancelAnimationFrame !== 'function') {
    return {start: animationLoopNoop, stop: animationLoopNoop}
  }

  /** Whether the loop should keep scheduling frames (cleared by `stop` and `onCleanup`). */
  let running = false
  /** Handle for the next pending frame; cleared when the frame runs so `stop` only cancels once. */
  let frameId: number | undefined
  /**
   * Stable callback identity for the active `start()` call. Each `start()` wraps the user
   * callback so rAF handlers queued before `stop()` or a later `start()` are ignored.
   */
  let currentCallback: ((timestamp: DOMHighResTimeStamp) => void) | null = null

  const stop = () => {
    running = false
    currentCallback = null
    if (frameId !== undefined) {
      cancelAnimationFrame(frameId)
      frameId = undefined
    }
  }

  const scheduleFrame = (callback: (timestamp: DOMHighResTimeStamp) => void) => {
    frameId = requestAnimationFrame((timestamp) => {
      frameId = undefined
      // Ignore frames queued before stop() or superseded by a newer start().
      if (!running || currentCallback !== callback) {
        return
      }
      try {
        callback(timestamp)
      } finally {
        // Keep looping after throws; `stop()` (including from inside the callback) clears `running`.
        if (running && currentCallback === callback) {
          scheduleFrame(currentCallback)
        }
      }
    })
  }

  onCleanup(() => {
    stop()
  })

  return {
    start: (callback: (timestamp: DOMHighResTimeStamp) => void) => {
      stop()
      // Fresh wrapper per start() — identity check above rejects stale rAF handlers.
      currentCallback = (timestamp: DOMHighResTimeStamp) => callback(timestamp)
      running = true
      scheduleFrame(currentCallback)
    },
    stop,
  }
}
