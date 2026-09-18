import {usePreference} from 'src/hooks/use-preference'
import {createEffect, createSignal, onCleanup} from 'solid-js'

import {createRandomEventPreferenceOptions, type RandomEventSettings} from './random-event-settings'

const MILLISECONDS_PER_MINUTE = 60_000

export interface UseRandomEventProps {
  readonly onEvent: () => Promise<void> | void
  readonly random?: () => number
}

export const getRandomEventDelay = (
  settings: RandomEventSettings,
  random: () => number = Math.random,
) => {
  const intervalRange = settings.maximumMinutes - settings.minimumMinutes
  const delayMinutes = settings.minimumMinutes + random() * intervalRange
  return delayMinutes * MILLISECONDS_PER_MINUTE
}

/** Repeats an event at a newly randomized interval after the focus room starts. */
export const useRandomEvent = (props: UseRandomEventProps) => {
  const [isEventPending, setIsEventPending] = createSignal(false)
  const [settings] = usePreference(
    createRandomEventPreferenceOptions({
      onError: (error) => console.error('Failed to load random event settings.', error),
    }),
  )
  let isDisposed = false

  createEffect(() => {
    const currentSettings = settings()

    if (currentSettings === null || isEventPending()) {
      return
    }

    const timerId = globalThis.setTimeout(
      () => {
        setIsEventPending(true)
        Promise.resolve()
          .then(() => props.onEvent())
          .catch((error: unknown) => {
            console.error('Failed to queue a random dialogue event.', error)
          })
          .finally(() => {
            if (!isDisposed) {
              setIsEventPending(false)
            }
          })
      },
      getRandomEventDelay(currentSettings, props.random ?? Math.random),
    )

    onCleanup(() => {
      globalThis.clearTimeout(timerId)
    })
  })

  onCleanup(() => {
    isDisposed = true
  })
}
