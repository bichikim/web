import {type PreferenceErrorContext, usePreference} from 'src/hooks/use-preference'
import {type Accessor, batch, createSignal, onCleanup} from 'solid-js'

import {
  createDialogueVolumeDuckingPreferenceOptions,
  DEFAULT_DIALOGUE_VOLUME_DUCKING_SETTINGS,
  type DialogueVolumeDuckingSettings as DialogueVolumeDuckingSettingsValue,
} from 'src/features/focus-room-dialogue'
import {createPendingSave} from 'src/features/pending-save'
import * as m from '@paraglide/message'

interface VolumeDuckingState {
  readonly settings: Accessor<DialogueVolumeDuckingSettingsValue>
  readonly isLoading: Accessor<boolean>
  readonly message: Accessor<string | null>
  readonly changeEnabled: (enabled: boolean) => void
  readonly changeVolume: (playerVolumePercent: number) => void
}

const SAVE_DEBOUNCE_MILLISECONDS = 300

export const useVolumeDucking = (): VolumeDuckingState => {
  const [draft, setDraft] = createSignal<DialogueVolumeDuckingSettingsValue | null>(null)
  const [message, setMessage] = createSignal<string | null>(null)

  const handleStorageError = (error: unknown, context: PreferenceErrorContext) => {
    const isSaveError = context.operation === 'write'
    console.error(
      isSaveError
        ? 'Failed to save dialogue volume ducking settings.'
        : 'Failed to load dialogue volume ducking settings.',
      error,
    )
    if (context.isCurrent) {
      setMessage(
        isSaveError
          ? m.settings_dialogue_volume_save_failed()
          : m.settings_dialogue_volume_loaded_failed(),
      )
    }
  }
  const [storedSettings, setStoredSettings] = usePreference(
    createDialogueVolumeDuckingPreferenceOptions({
      onSaved: () => setMessage(null),
      onStorageError: handleStorageError,
    }),
  )
  const settings = () => draft() ?? storedSettings() ?? DEFAULT_DIALOGUE_VOLUME_DUCKING_SETTINGS
  const isLoading = () => storedSettings() === null
  const pendingSave = createPendingSave<DialogueVolumeDuckingSettingsValue>({
    delayMilliseconds: SAVE_DEBOUNCE_MILLISECONDS,
    save: (nextSettings) =>
      batch(() => {
        setStoredSettings(nextSettings, {rollbackOnError: true})
        setDraft(null)
      }),
  })

  const scheduleSave = (nextSettings: DialogueVolumeDuckingSettingsValue) => {
    batch(() => {
      setDraft(nextSettings)
      setMessage(null)
      setStoredSettings(nextSettings, {persist: false})
    })
    pendingSave.schedule(nextSettings)
  }

  onCleanup(pendingSave.flush)

  const changeEnabled = (enabled: boolean) => scheduleSave({...settings(), enabled})
  const changeVolume = (playerVolumePercent: number) =>
    scheduleSave({...settings(), playerVolumePercent})

  return {changeEnabled, changeVolume, isLoading, message, settings}
}
