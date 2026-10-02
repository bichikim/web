import {createMemo} from 'solid-js'
import {useInactivity} from 'src/hooks/use-inactivity'

import {usePreference} from 'src/hooks/use-preference'
import {createParsedPreferenceStorage} from '../parsed-preference-storage'

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
  const delay = () => storedDelay() ?? DEFAULT_SCREEN_SAVER_DELAY
  const timeoutMs = createMemo(() => {
    const currentDelay = storedDelay()
    return currentDelay === null ? null : getScreenSaverDelayMilliseconds(currentDelay)
  })
  const inactivity = useInactivity({
    activityThrottleMs: () => ACTIVITY_THROTTLE_MILLISECONDS,
    enabled: () => timeoutMs() !== null,
    timeoutMs: () => timeoutMs() ?? 0,
  })

  const onDelayChange = (nextDelay: ScreenSaverDelay) => {
    setStoredDelay(nextDelay)
    inactivity.wake()
  }

  return {
    delay,
    isActive: inactivity.inactive,
    onDelayChange,
    onDismiss: inactivity.reset,
  }
}
