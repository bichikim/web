import {createPreferenceSaveQueue} from 'src/features/preference-save-queue'
import {usePreference} from 'src/hooks/use-preference'
import {type Accessor, createEffect, createSignal, onCleanup} from 'solid-js'

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

const areDialogueVolumeDuckingSettingsEqual = (
  left: DialogueVolumeDuckingSettingsValue,
  right: DialogueVolumeDuckingSettingsValue,
) =>
  left.enabled === right.enabled &&
  left.playerVolumePercent === right.playerVolumePercent &&
  left.version === right.version

export const useVolumeDucking = (): VolumeDuckingState => {
  const [settings, setSettings] = createSignal<DialogueVolumeDuckingSettingsValue>(
    DEFAULT_DIALOGUE_VOLUME_DUCKING_SETTINGS,
  )
  const [isLoading, setIsLoading] = createSignal(true)
  const [message, setMessage] = createSignal<string | null>(null)
  const saveQueue = createPreferenceSaveQueue<DialogueVolumeDuckingSettingsValue>({
    equal: areDialogueVolumeDuckingSettingsEqual,
    initial: DEFAULT_DIALOGUE_VOLUME_DUCKING_SETTINGS,
  })
  let isDisposed = false
  let pendingSettings: DialogueVolumeDuckingSettingsValue | null = null

  const handlePreferenceError = (error: unknown) => {
    const isSaveError = saveQueue.hasPending()
    console.error(
      isSaveError
        ? 'Failed to save dialogue volume ducking settings.'
        : 'Failed to load dialogue volume ducking settings.',
      error,
    )
    setMessage(
      isSaveError
        ? m.settings_dialogue_volume_save_failed()
        : m.settings_dialogue_volume_loaded_failed(),
    )
    if (isSaveError) {
      const settled = saveQueue.settle(false)
      if (settled.value !== null && !settled.hasPending) {
        setSettings(settled.committed)
        setStoredSettings(settled.committed, {persist: false})
      }
    }
  }
  const handlePreferenceSaved = () => {
    const settled = saveQueue.settle(true)
    if (settled.value === null) {
      return
    }
    if (!isDisposed) {
      if (!settled.hasPending) {
        setSettings(settled.committed)
      }
      setMessage(null)
    }
  }
  const [storedSettings, setStoredSettings] = usePreference(
    createDialogueVolumeDuckingPreferenceOptions({
      onError: handlePreferenceError,
      onSaved: handlePreferenceSaved,
    }),
  )

  const persistSettings = (nextSettings: DialogueVolumeDuckingSettingsValue) => {
    saveQueue.enqueue(nextSettings)
    setStoredSettings(nextSettings)
  }

  const pendingSave = createPendingSave<DialogueVolumeDuckingSettingsValue>({
    delayMilliseconds: SAVE_DEBOUNCE_MILLISECONDS,
    save: (nextSettings) => {
      pendingSettings = null
      persistSettings(nextSettings)
    },
  })

  const publishSettings = (nextSettings: DialogueVolumeDuckingSettingsValue) => {
    setStoredSettings(nextSettings, {persist: false})
  }

  const scheduleSave = (nextSettings: DialogueVolumeDuckingSettingsValue) => {
    saveQueue.clearFailure()
    setSettings(nextSettings)
    setMessage(null)
    pendingSettings = nextSettings
    publishSettings(nextSettings)

    pendingSave.schedule(nextSettings)
  }

  createEffect(() => {
    const nextSettings = storedSettings()

    if (nextSettings === null) {
      return
    }
    setIsLoading(false)
    if (pendingSettings !== null || saveQueue.hasPending()) {
      return
    }

    if (!saveQueue.synchronize(nextSettings)) {
      return
    }
    setSettings(nextSettings)
  })

  onCleanup(() => {
    isDisposed = true
    pendingSave.flush()
  })

  const changeEnabled = (enabled: boolean) => scheduleSave({...settings(), enabled})
  const changeVolume = (playerVolumePercent: number) =>
    scheduleSave({...settings(), playerVolumePercent})

  return {changeEnabled, changeVolume, isLoading, message, settings}
}
