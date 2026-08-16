import {createEffect, createSignal, onCleanup, onMount} from 'solid-js'

import {
  getScreenSaverDelayMilliseconds,
  type ScreenSaverController,
  type ScreenSaverDelay,
} from './model'
import {readScreenSaverDelay, writeScreenSaverDelay} from './storage'

const ACTIVITY_THROTTLE_MILLISECONDS = 500

/** Tracks user inactivity and owns the persisted screen saver preference. */
export const useScreenSaver = (): ScreenSaverController => {
  const [delay, setDelay] = createSignal<ScreenSaverDelay>('off')
  const [isActive, setIsActive] = createSignal(false)
  const [isDocumentVisible, setIsDocumentVisible] = createSignal(true)
  const [activityRevision, setActivityRevision] = createSignal(0)
  let preferenceRevision = 0
  let lastActivityTime = Number.NEGATIVE_INFINITY
  let isDisposed = false

  const recordActivity = () => {
    const wasActive = isActive()

    if (wasActive) {
      setIsActive(false)
    }

    const currentTime = performance.now()
    if (!wasActive && currentTime - lastActivityTime < ACTIVITY_THROTTLE_MILLISECONDS) {
      return
    }

    lastActivityTime = currentTime
    setActivityRevision((revision) => revision + 1)
  }

  const onDelayChange = (nextDelay: ScreenSaverDelay) => {
    preferenceRevision += 1
    setDelay(nextDelay)
    setIsActive(false)
    writeScreenSaverDelay(nextDelay).catch(() => {
      // Persistence is best-effort; the in-memory preference remains active for this session.
    })
  }

  onMount(() => {
    const initialPreferenceRevision = preferenceRevision
    setIsDocumentVisible(document.visibilityState === 'visible')

    readScreenSaverDelay()
      .then((storedDelay) => {
        if (!isDisposed && preferenceRevision === initialPreferenceRevision) {
          setDelay(storedDelay)
        }
      })
      .catch(() => {
        // Storage adapters already recover to a safe default; this only guards unexpected failures.
      })

    const handleVisibilityChange = () => {
      const isVisible = document.visibilityState === 'visible'
      setIsDocumentVisible(isVisible)
      setIsActive(false)

      if (isVisible) {
        recordActivity()
      }
    }

    const activityEvents = ['keydown', 'pointerdown', 'pointermove', 'scroll', 'wheel'] as const
    for (const eventName of activityEvents) {
      window.addEventListener(eventName, recordActivity, {passive: true})
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    createEffect(() => {
      const currentDelay = delay()
      const isVisible = isDocumentVisible()
      activityRevision()
      const delayMilliseconds = getScreenSaverDelayMilliseconds(currentDelay)

      if (!isVisible || delayMilliseconds === null) {
        setIsActive(false)
        return
      }

      const timeout = window.setTimeout(() => setIsActive(true), delayMilliseconds)
      onCleanup(() => window.clearTimeout(timeout))
    })

    onCleanup(() => {
      isDisposed = true
      for (const eventName of activityEvents) {
        window.removeEventListener(eventName, recordActivity)
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    })
  })

  return {
    delay,
    isActive,
    onDelayChange,
    onDismiss: recordActivity,
  }
}
