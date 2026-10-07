import {createTimeout} from '@winter-love/solid-use/timeout'
import {runPendingEvent} from './run-pending-event'
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
  readonly getTimerGeneration: () => number
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
  let pendingDelay = 0
  let timerGeneration = 0
  let eventState: 'idle' | 'running' | 'queued' = 'idle'

  const runEvent = () => {
    eventState = 'running'
    runPendingEvent({
      onError: (error) => console.error('Failed to queue the delayed end event.', error),
      onEvent: () => props.onEvent(),
      onSettled: () => {
        if (eventState === 'queued') {
          runEvent()
          return
        }
        eventState = 'idle'
      },
    })
  }

  const triggerEvent = () => {
    if (eventState !== 'idle') {
      eventState = 'queued'
      return
    }

    runEvent()
  }

  const timeout = createTimeout(
    (generation: number) => {
      if (generation === timerGeneration) {
        setIsRunning(false)
        triggerEvent()
      }
    },
    () => pendingDelay,
  )

  const cancel = () => {
    timerGeneration += 1
    timeout.cancel()
    setIsRunning(false)
  }

  const start = (durationMinutes: number) => {
    if (!props.isEnabled() || !isValidDuration(durationMinutes)) {
      return
    }

    cancel()
    const currentGeneration = timerGeneration
    setIsRunning(true)
    pendingDelay = durationMinutes * MILLISECONDS_PER_MINUTE
    timeout.execute(currentGeneration)
  }

  createEffect(() => {
    if (!props.isEnabled()) {
      cancel()
    }
  })

  onCleanup(cancel)

  return {cancel, getTimerGeneration: () => timerGeneration, isRunning, start}
}
