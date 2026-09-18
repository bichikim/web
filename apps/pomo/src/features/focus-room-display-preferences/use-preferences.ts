import {usePreference} from 'src/hooks/use-preference'
import type {PreferenceStorage} from 'src/utils/preference-storage'

import {
  DEFAULT_P_DISPLAY_PREFERENCES,
  type PDisplayPreferences,
  type PDisplayPreferencesController,
} from './model'
import {
  DISPLAY_PREFERENCES_STORAGE_KEY,
  parsePDisplayPreferences,
  readPDisplayPreferences,
  writePDisplayPreferences,
} from './storage'

const pDisplayPreferencesStorage: PreferenceStorage = {
  read: () => readPDisplayPreferences(),
  write: (_key, value) => {
    const preferences = parsePDisplayPreferences(value)
    return preferences === null
      ? new Error('Invalid focus-room display preferences.')
      : writePDisplayPreferences(preferences)
  },
}

const updatePreference = (
  preference: PDisplayPreferences,
  changes: Partial<PDisplayPreferences>,
): PDisplayPreferences => ({...preference, ...changes})

/** Shares the persisted focus-room display preferences across mounted consumers. */
export const usePDisplayPreferences = (): PDisplayPreferencesController => {
  const [storedPreference, setStoredPreference] = usePreference({
    defaultValue: DEFAULT_P_DISPLAY_PREFERENCES,
    key: DISPLAY_PREFERENCES_STORAGE_KEY,
    parse: parsePDisplayPreferences,
    storage: pDisplayPreferencesStorage,
  })
  const preference = () => storedPreference() ?? DEFAULT_P_DISPLAY_PREFERENCES

  const onDialogueComposerVisibleChange = (visible: boolean) => {
    setStoredPreference(updatePreference(preference(), {dialogueComposerVisible: visible}))
  }
  const onMemoryAssistVisibleChange = (visible: boolean) => {
    setStoredPreference(updatePreference(preference(), {memoryAssistVisible: visible}))
  }
  const onFeatureRequestVisibleChange = (visible: boolean) => {
    setStoredPreference(updatePreference(preference(), {featureRequestVisible: visible}))
  }
  const onPlayerVisibleChange = (visible: boolean) => {
    setStoredPreference(updatePreference(preference(), {playerVisible: visible}))
  }
  const onPomodoroVisibleChange = (visible: boolean) => {
    setStoredPreference(updatePreference(preference(), {pomodoroVisible: visible}))
  }
  const onToolsButtonVisibleChange = (visible: boolean) => {
    setStoredPreference(updatePreference(preference(), {toolsButtonVisible: visible}))
  }
  const onTourButtonVisibleChange = (visible: boolean) => {
    setStoredPreference(updatePreference(preference(), {tourButtonVisible: visible}))
  }

  return {
    dialogueComposerVisible: () => preference().dialogueComposerVisible,
    featureRequestVisible: () => preference().featureRequestVisible,
    isReady: () => storedPreference() !== null,
    memoryAssistVisible: () => preference().memoryAssistVisible,
    onDialogueComposerVisibleChange,
    onFeatureRequestVisibleChange,
    onMemoryAssistVisibleChange,
    onPlayerVisibleChange,
    onPomodoroVisibleChange,
    onToolsButtonVisibleChange,
    onTourButtonVisibleChange,
    playerVisible: () => preference().playerVisible,
    pomodoroVisible: () => preference().pomodoroVisible,
    toolsButtonVisible: () => preference().toolsButtonVisible,
    tourButtonVisible: () => preference().tourButtonVisible,
  }
}
