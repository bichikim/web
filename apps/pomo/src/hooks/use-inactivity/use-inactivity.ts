import {type Accessor, createEffect, createSignal, on, onCleanup, onMount} from 'solid-js'
import {useEvent} from '@winter-love/solid-use/event'
import {getMonotonicTime} from 'src/utils/get-monotonic-time'
import {createInactivityController} from './create-inactivity-controller'

export interface UseInactivityProps {
  readonly enabled: Accessor<boolean>
  readonly timeoutMs: Accessor<number>
  /** Evaluated at each deadline; reactive reads do not restart the countdown. */
  readonly isBlocked?: () => boolean
  readonly capture?: Accessor<boolean>
  readonly activityThrottleMs?: Accessor<number>
}

export interface UseInactivityResult {
  readonly inactive: Accessor<boolean>
  /** Records activity, subject to the activity throttle unless already inactive. */
  readonly reset: () => void
  /** Restores active state without changing the deadline or recording activity. */
  readonly wake: () => void
}

/** Tracks browser inactivity after mount and suspends deadlines while the document is hidden. */
export const useInactivity = (props: UseInactivityProps): UseInactivityResult => {
  const [inactive, setInactive] = createSignal(false)
  let resetActivity: (() => void) | undefined
  let wakeActivity: (() => void) | undefined

  onMount(() => {
    const controller = createInactivityController({
      enabled: props.enabled,
      isBlocked: () => props.isBlocked?.() ?? false,
      isSuspended: () => document.visibilityState === 'hidden',
      onInactiveChange: setInactive,
      schedule: (expire, milliseconds) => {
        const timeout = globalThis.setTimeout(expire, milliseconds)
        return () => globalThis.clearTimeout(timeout)
      },
      timeoutMs: props.timeoutMs,
    })
    let lastActivity = Number.NEGATIVE_INFINITY
    const recordActivity = () => {
      const currentTime = getMonotonicTime()
      const throttle = props.activityThrottleMs?.() ?? 0
      if (!inactive() && currentTime - lastActivity < throttle) {
        return
      }
      lastActivity = currentTime
      controller.reset()
    }

    resetActivity = recordActivity
    wakeActivity = controller.wake

    createEffect(() => {
      const capture = props.capture?.() ?? false
      for (const event of ['pointermove', 'pointerdown', 'keydown', 'wheel', 'scroll'] as const) {
        useEvent(globalThis.window, event, recordActivity, {capture, passive: true})
      }
    })
    const handleVisibilityChange = () => {
      controller.reset()
      if (document.visibilityState === 'visible') {
        recordActivity()
      }
    }
    useEvent(document, 'visibilitychange', handleVisibilityChange)
    createEffect(on([props.enabled, props.timeoutMs], controller.reset))
    onCleanup(() => {
      controller.dispose()
      resetActivity = undefined
      wakeActivity = undefined
    })
  })

  return {inactive, reset: () => resetActivity?.(), wake: () => wakeActivity?.()}
}
