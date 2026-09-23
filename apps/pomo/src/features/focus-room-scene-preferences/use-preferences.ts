import {usePreference} from 'src/hooks/use-preference'
import {createParsedPreferenceStorage} from '../parsed-preference-storage'

import {
  DEFAULT_P_SCENE_PREFERENCES,
  type PScenePreferences,
  type PScenePreferencesController,
} from './model'
import {
  parsePScenePreferences,
  readPScenePreferences,
  SCENE_PREFERENCES_STORAGE_KEY,
  writePScenePreferences,
} from './storage'

const pScenePreferencesStorage = createParsedPreferenceStorage({
  invalidMessage: 'Invalid focus-room scene preferences.',
  parse: parsePScenePreferences,
  read: () => readPScenePreferences(),
  write: (value) => writePScenePreferences(value),
})

const updatePreference = (
  preference: PScenePreferences,
  changes: Partial<PScenePreferences>,
): PScenePreferences => ({...preference, ...changes})

/** Shares the persisted focus-room scene preferences across mounted consumers. */
export const usePScenePreferences = (): PScenePreferencesController => {
  const [storedPreference, setStoredPreference] = usePreference({
    defaultValue: DEFAULT_P_SCENE_PREFERENCES,
    key: SCENE_PREFERENCES_STORAGE_KEY,
    parse: parsePScenePreferences,
    storage: pScenePreferencesStorage,
  })
  const preference = () => storedPreference() ?? DEFAULT_P_SCENE_PREFERENCES

  const onActivityChange = (activity: PScenePreferences['activity']) => {
    setStoredPreference(updatePreference(preference(), {activity}))
  }
  const onGazeChange = (gaze: PScenePreferences['gaze']) => {
    setStoredPreference(updatePreference(preference(), {gaze}))
  }
  const onTimeModeChange = (timeMode: PScenePreferences['timeMode']) => {
    setStoredPreference(updatePreference(preference(), {timeMode}))
  }

  return {
    activity: () => preference().activity,
    gaze: () => preference().gaze,
    isReady: () => storedPreference() !== null,
    onActivityChange,
    onGazeChange,
    onTimeModeChange,
    timeMode: () => preference().timeMode,
  }
}
