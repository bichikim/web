import {type Accessor, createEffect, createSignal, on, onCleanup, onMount} from 'solid-js'
import {isServer} from 'solid-js/web'
import {useEvent} from '@winter-love/solid-use/event'
import {useTimeout} from '@winter-love/solid-use/timeout'
import {getMonotonicTime} from 'src/utils/get-monotonic-time'

export interface UseInactivityProps {
  readonly timeoutMs: Accessor<number>
  /** Evaluated at each deadline; reactive reads do not restart the countdown. */
  readonly isBlocked?: () => boolean
  readonly capture?: Accessor<boolean>
  readonly activityThrottleMs?: Accessor<number>
}

export interface UseInactivityResult {
  readonly inactive: Accessor<boolean>
  /** Begins monitoring with a full wait; repeated calls preserve the current deadline and state. */
  readonly start: () => void
  /** Cancels the countdown and restores active state until explicitly started again. */
  readonly stop: () => void
  /** Records activity only while started, subject to the throttle unless already inactive. */
  readonly reset: () => void
  /** Restores active state without changing the deadline or recording activity. */
  readonly wake: () => void
}

/** Starts stopped; explicit start tracks browser inactivity, suspending waits in hidden documents. */
export const useInactivity = (props: UseInactivityProps): UseInactivityResult => {
  const [inactive, setInactive] = createSignal(false)
  let started = false
  let disposed = false
  let lastActivity = Number.NEGATIVE_INFINITY

  const wake = () => {
    if (!disposed) {
      setInactive(false)
    }
  }
  const deadline = useTimeout(() => {
    if (props.isBlocked?.() ?? false) {
      restartDeadline()
    } else {
      setInactive(true)
    }
  }, props.timeoutMs)
  const restartDeadline = () => {
    if (!started || disposed) {
      return
    }
    deadline.cancel()
    wake()
    if (globalThis.document.visibilityState !== 'hidden') {
      deadline.execute()
    }
  }
  const start = () => {
    if (disposed || started || isServer || typeof globalThis.document === 'undefined') {
      return
    }
    started = true
    lastActivity = Number.NEGATIVE_INFINITY
    restartDeadline()
  }
  const stop = () => {
    if (disposed) {
      return
    }
    started = false
    deadline.cancel()
    wake()
  }
  const reset = () => {
    if (!started || disposed) {
      return
    }
    const currentTime = getMonotonicTime()
    const throttle = props.activityThrottleMs?.() ?? 0
    if (!inactive() && currentTime - lastActivity < throttle) {
      return
    }
    lastActivity = currentTime
    restartDeadline()
  }

  createEffect(on(props.timeoutMs, restartDeadline, {defer: true}))
  onCleanup(() => {
    disposed = true
    started = false
  })
  onMount(() => {
    if (isServer || typeof globalThis.document === 'undefined') {
      return
    }
    createEffect(() => {
      const capture = props.capture?.() ?? false
      for (const event of ['pointermove', 'pointerdown', 'keydown', 'wheel', 'scroll'] as const) {
        useEvent(globalThis.window, event, reset, {capture, passive: true})
      }
    })
    const handleVisibilityChange = () => {
      if (!started || disposed) {
        return
      }
      restartDeadline()
      if (document.visibilityState === 'visible') {
        lastActivity = getMonotonicTime()
      }
    }
    useEvent(document, 'visibilitychange', handleVisibilityChange)
  })

  return {inactive, reset, start, stop, wake}
}
