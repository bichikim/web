import {readWebStorageJson} from 'src/utils/runtime-storage'
import {usePreference} from 'src/hooks/use-preference'

const STORAGE_KEY = 'pomo:feed-auto-prepare:v1'
const parseEnabled = (value: unknown) => (typeof value === 'boolean' ? value : null)

/** Reads whether newly received feeds should start voice preparation automatically. */
export const readFeedAutoPreparePreference = () =>
  readWebStorageJson(STORAGE_KEY, parseEnabled) ?? true

/** Owns the persisted automatic preparation switch. */
export const useAutoPreparePreference = () => {
  const [enabled, setEnabled] = usePreference({
    defaultValue: true,
    key: STORAGE_KEY,
    parse: parseEnabled,
  })
  return {
    enabled,
    onEnabledChange: setEnabled,
  }
}
