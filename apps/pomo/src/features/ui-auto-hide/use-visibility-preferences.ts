import {usePreference} from 'src/hooks/use-preference'
import {
  isVisibilitySeconds,
  parseVisibilityPreferences,
  UI_AUTO_HIDE_STORAGE_KEY,
  type VisibilityPreferences,
  visibilityPreferenceStorage,
} from './storage'

const DEFAULT_PREFERENCES: VisibilityPreferences = {enabled: false, seconds: 30}

/** Reads and updates the persisted inactivity settings. */
export const useVisibilityPreferences = () => {
  const [storedPreferences, setStoredPreferences] = usePreference<VisibilityPreferences>({
    defaultValue: DEFAULT_PREFERENCES,
    key: UI_AUTO_HIDE_STORAGE_KEY,
    parse: parseVisibilityPreferences,
    storage: visibilityPreferenceStorage,
  })
  const preferences = () => storedPreferences() ?? DEFAULT_PREFERENCES
  const onEnabledChange = (enabled: boolean) => {
    setStoredPreferences({...preferences(), enabled})
  }
  const onSecondsChange = (seconds: number) => {
    if (!isVisibilitySeconds(seconds)) {
      return
    }
    setStoredPreferences({...preferences(), seconds})
  }
  return {
    onEnabledChange,
    onSecondsChange,
    preferences,
  }
}
