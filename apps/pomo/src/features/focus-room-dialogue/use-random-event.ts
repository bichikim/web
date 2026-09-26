import {usePreference} from 'src/hooks/use-preference'
import {visibility} from 'src/utils/visibility'
import {getDocument} from '@winter-love/utils'
import {createEffect, createSignal, on, onCleanup, onMount} from 'solid-js'

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
  const [isDocumentVisible, setIsDocumentVisible] = createSignal(false)
  const [scheduleRevision, setScheduleRevision] = createSignal(0)
  const [settings] = usePreference(
    createRandomEventPreferenceOptions({
      onError: (error) => console.error('Failed to load random event settings.', error),
    }),
  )
  let isDisposed = false
  let clearVisibilityWatch: (() => void) | undefined

  onMount(() => {
    setIsDocumentVisible(getDocument()?.hidden === false)
    clearVisibilityWatch = visibility((isHidden) => {
      setIsDocumentVisible(!isHidden)
    })
  })

  onCleanup(() => clearVisibilityWatch?.())

  createEffect(
    on(
      [settings, isEventPending, isDocumentVisible, scheduleRevision],
      ([currentSettings, eventPending, documentVisible]) => {
        if (currentSettings === null || eventPending || !documentVisible) {
          return
        }

        const timerId = globalThis.setTimeout(
          () => {
            if (getDocument()?.hidden !== false) {
              setScheduleRevision((revision) => revision + 1)
              return
            }

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
      },
    ),
  )

  onCleanup(() => {
    isDisposed = true
  })
}
