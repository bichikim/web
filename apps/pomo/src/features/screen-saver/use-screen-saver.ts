import {createEffect, createSignal, onCleanup, onMount} from 'solid-js'
import {useEvent} from '@winter-love/solid-use/event'

import {usePreference} from 'src/hooks/use-preference'
import {createParsedPreferenceStorage} from '../parsed-preference-storage'
import {getMonotonicTime} from 'src/utils/get-monotonic-time'

import {
  getScreenSaverDelayMilliseconds,
  type ScreenSaverController,
  type ScreenSaverDelay,
} from './model'
import {
  DEFAULT_SCREEN_SAVER_DELAY,
  parseScreenSaverDelay,
  readScreenSaverDelay,
  SCREEN_SAVER_STORAGE_KEY,
  writeScreenSaverDelay,
} from './storage'

const ACTIVITY_THROTTLE_MILLISECONDS = 500

const screenSaverStorage = createParsedPreferenceStorage({
  invalidMessage: 'Invalid screen saver delay.',
  parse: parseScreenSaverDelay,
  read: () => readScreenSaverDelay(),
  write: (value) => writeScreenSaverDelay(value),
})

/** Tracks user inactivity and shares the persisted screen saver preference. */
export const useScreenSaver = (): ScreenSaverController => {
  const [storedDelay, setStoredDelay] = usePreference({
    defaultValue: DEFAULT_SCREEN_SAVER_DELAY,
    key: SCREEN_SAVER_STORAGE_KEY,
    onError: () => undefined,
    parse: parseScreenSaverDelay,
    storage: screenSaverStorage,
  })
  const [isActive, setIsActive] = createSignal(false)
  const [isDocumentVisible, setIsDocumentVisible] = createSignal(true)
  const [activityRevision, setActivityRevision] = createSignal(0)
  let lastActivityTime = Number.NEGATIVE_INFINITY

  const delay = () => storedDelay() ?? DEFAULT_SCREEN_SAVER_DELAY

  const recordActivity = () => {
    const wasActive = isActive()

    if (wasActive) {
      setIsActive(false)
    }

    const currentTime = getMonotonicTime()
    if (!wasActive && currentTime - lastActivityTime < ACTIVITY_THROTTLE_MILLISECONDS) {
      return
    }

    lastActivityTime = currentTime
    setActivityRevision((revision) => revision + 1)
  }

  const onDelayChange = (nextDelay: ScreenSaverDelay) => {
    setStoredDelay(nextDelay)
    setIsActive(false)
  }

  onMount(() => {
    setIsDocumentVisible(globalThis.document.visibilityState === 'visible')

    const handleVisibilityChange = () => {
      const isVisible = globalThis.document.visibilityState === 'visible'
      setIsDocumentVisible(isVisible)
      setIsActive(false)

      if (isVisible) {
        recordActivity()
      }
    }

    const activityEvents = ['keydown', 'pointerdown', 'pointermove', 'scroll', 'wheel'] as const
    for (const eventName of activityEvents) {
      useEvent(globalThis, eventName, recordActivity, {passive: true})
    }
    useEvent(globalThis.document, 'visibilitychange', handleVisibilityChange)

    createEffect(() => {
      const currentDelay = delay()
      const isVisible = isDocumentVisible()
      activityRevision()
      const delayMilliseconds = getScreenSaverDelayMilliseconds(currentDelay)

      if (!isVisible || delayMilliseconds === null) {
        setIsActive(false)
        return
      }

      const timeout = globalThis.setTimeout(() => setIsActive(true), delayMilliseconds)
      onCleanup(() => globalThis.clearTimeout(timeout))
    })
  })

  return {
    delay,
    isActive,
    onDelayChange,
    onDismiss: recordActivity,
  }
}
