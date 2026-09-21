import {createEffect, createSignal, onCleanup} from 'solid-js'

import {
  MAX_DELAYED_END_EVENT_MINUTES,
  MIN_DELAYED_END_EVENT_MINUTES,
} from './delayed-end-event-settings'

const MILLISECONDS_PER_MINUTE = 60_000

export interface UseDelayedEndEventProps {
  readonly isEnabled: () => boolean
  readonly onEvent: () => Promise<void> | void
}

export interface DelayedEndEventController {
  readonly cancel: () => void
  readonly isRunning: () => boolean
  readonly start: (durationMinutes: number) => void
}

const isValidDuration = (durationMinutes: number) =>
  Number.isInteger(durationMinutes) &&
  durationMinutes >= MIN_DELAYED_END_EVENT_MINUTES &&
  durationMinutes <= MAX_DELAYED_END_EVENT_MINUTES

/** Schedules one delayed-end event and cancels it when the owner or enabled scope closes. */
export const useDelayedEndEvent = (props: UseDelayedEndEventProps): DelayedEndEventController => {
  const [isRunning, setIsRunning] = createSignal(false)
  let timerId: ReturnType<typeof globalThis.setTimeout> | null = null

  const cancel = () => {
    if (timerId !== null) {
      globalThis.clearTimeout(timerId)
      timerId = null
    }
    setIsRunning(false)
  }

  const start = (durationMinutes: number) => {
    if (!props.isEnabled() || !isValidDuration(durationMinutes)) {
      return
    }

    cancel()
    setIsRunning(true)
    timerId = globalThis.setTimeout(() => {
      timerId = null
      setIsRunning(false)
      Promise.resolve()
        .then(() => props.onEvent())
        .catch((error: unknown) => {
          console.error('Failed to queue the delayed end event.', error)
        })
    }, durationMinutes * MILLISECONDS_PER_MINUTE)
  }

  createEffect(() => {
    if (!props.isEnabled()) {
      cancel()
    }
  })

  onCleanup(cancel)

  return {cancel, isRunning, start}
}
