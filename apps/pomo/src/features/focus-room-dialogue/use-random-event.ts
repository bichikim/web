import {createEffect, createSignal, onCleanup, onMount} from 'solid-js'

import {
  DEFAULT_RANDOM_EVENT_SETTINGS,
  parseRandomEventSettings,
  RANDOM_EVENT_SETTINGS_CHANGED_EVENT,
  type RandomEventSettings,
  readRandomEventSettings,
} from './random-event-settings'

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
  const [settings, setSettings] = createSignal<RandomEventSettings>(DEFAULT_RANDOM_EVENT_SETTINGS)
  const [isReady, setIsReady] = createSignal(false)
  let isDisposed = false
  let settingsRevision = 0

  onMount(() => {
    const initialRevision = settingsRevision
    const handleSettingsChange = (event: Event) => {
      if (!(event instanceof CustomEvent)) {
        return
      }

      const nextSettings = parseRandomEventSettings(event.detail)

      if (nextSettings !== null) {
        settingsRevision += 1
        setSettings(nextSettings)
        setIsReady(true)
      }
    }

    window.addEventListener(RANDOM_EVENT_SETTINGS_CHANGED_EVENT, handleSettingsChange)
    readRandomEventSettings()
      .then((storedSettings) => {
        if (!isDisposed && settingsRevision === initialRevision) {
          setSettings(storedSettings)
          setIsReady(true)
        }
      })
      .catch((error: unknown) => {
        console.error('Failed to load random event settings.', error)

        if (!isDisposed) {
          setIsReady(true)
        }
      })

    onCleanup(() => {
      isDisposed = true
      window.removeEventListener(RANDOM_EVENT_SETTINGS_CHANGED_EVENT, handleSettingsChange)
    })
  })

  createEffect(() => {
    const currentSettings = settings()

    if (!isReady()) {
      return
    }

    let timerId: number | null = null
    const scheduleNextEvent = () => {
      timerId = window.setTimeout(
        () => {
          timerId = null
          scheduleNextEvent()
          Promise.resolve()
            .then(() => props.onEvent())
            .catch((error: unknown) => {
              console.error('Failed to queue a random dialogue event.', error)
            })
        },
        getRandomEventDelay(currentSettings, props.random ?? Math.random),
      )
    }

    scheduleNextEvent()

    onCleanup(() => {
      if (timerId !== null) {
        window.clearTimeout(timerId)
      }
    })
  })
}
