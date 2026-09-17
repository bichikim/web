import {usePreference} from 'src/hooks/use-preference'
import {type Accessor, createEffect, createSignal, onCleanup} from 'solid-js'

import {
  createDialogueVolumeDuckingPreferenceOptions,
  DEFAULT_DIALOGUE_VOLUME_DUCKING_SETTINGS,
  type DialogueVolumeDuckingSettings as DialogueVolumeDuckingSettingsValue,
} from 'src/features/focus-room-dialogue'
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
  const [settings, setSettings] = createSignal<DialogueVolumeDuckingSettingsValue>(
    DEFAULT_DIALOGUE_VOLUME_DUCKING_SETTINGS,
  )
  const [isLoading, setIsLoading] = createSignal(true)
  const [message, setMessage] = createSignal<string | null>(null)
  let edited = false
  let isDisposed = false
  let pendingSettings: DialogueVolumeDuckingSettingsValue | null = null
  let saveTimeout: ReturnType<typeof globalThis.setTimeout> | null = null

  const handlePreferenceError = (error: unknown) => {
    const isSaveError = edited
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
  }
  const handlePreferenceSaved = () => {
    if (!isDisposed) {
      setMessage(null)
    }
  }
  const [storedSettings, setStoredSettings] = usePreference(
    createDialogueVolumeDuckingPreferenceOptions({
      onError: handlePreferenceError,
      onSaved: handlePreferenceSaved,
    }),
  )

  const scheduleSave = (nextSettings: DialogueVolumeDuckingSettingsValue) => {
    edited = true
    setSettings(nextSettings)
    setMessage(null)
    pendingSettings = nextSettings

    if (saveTimeout !== null) {
      globalThis.clearTimeout(saveTimeout)
    }

    saveTimeout = globalThis.setTimeout(() => {
      saveTimeout = null
      pendingSettings = null
      setStoredSettings(nextSettings)
    }, SAVE_DEBOUNCE_MILLISECONDS)
  }

  createEffect(() => {
    const nextSettings = storedSettings()

    if (nextSettings === null || pendingSettings !== null) {
      return
    }

    setSettings(nextSettings)
    setIsLoading(false)
  })

  onCleanup(() => {
    isDisposed = true

    if (saveTimeout !== null) {
      globalThis.clearTimeout(saveTimeout)
    }

    const nextSettings = pendingSettings
    pendingSettings = null
    if (nextSettings !== null) {
      setStoredSettings(nextSettings)
    }
  })

  const changeEnabled = (enabled: boolean) => scheduleSave({...settings(), enabled})
  const changeVolume = (playerVolumePercent: number) =>
    scheduleSave({...settings(), playerVolumePercent})

  return {changeEnabled, changeVolume, isLoading, message, settings}
}
