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
  const pendingSaves: Array<DialogueVolumeDuckingSettingsValue> = []
  let edited = false
  let isDisposed = false
  let pendingSettings: DialogueVolumeDuckingSettingsValue | null = null
  let committedSettings: DialogueVolumeDuckingSettingsValue =
    DEFAULT_DIALOGUE_VOLUME_DUCKING_SETTINGS
  let failedStoredSettings: DialogueVolumeDuckingSettingsValue | null = null
  let saveTimeout: ReturnType<typeof globalThis.setTimeout> | null = null

  const settleSave = (didSave: boolean): DialogueVolumeDuckingSettingsValue | null => {
    const settledSettings = pendingSaves.shift() ?? null
    if (didSave && settledSettings !== null) {
      committedSettings = settledSettings
    }
    if (pendingSaves.length === 0 && pendingSettings === null) {
      edited = false
    }
    return settledSettings
  }

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
    if (isSaveError) {
      const settledSettings = settleSave(false)
      if (settledSettings !== null && pendingSaves.length === 0) {
        setSettings(committedSettings)
        setStoredSettings(committedSettings, {persist: false})
      }
    }
  }
  const handlePreferenceSaved = () => {
    const settledSettings = settleSave(true)
    if (settledSettings === null) {
      return
    }
    if (pendingSaves.length === 0) {
      failedStoredSettings = null
    }
    if (!isDisposed) {
      if (pendingSaves.length === 0) {
        setSettings(committedSettings)
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
    failedStoredSettings = nextSettings
    pendingSaves.push(nextSettings)
    setStoredSettings(nextSettings)
  }

  const publishSettings = (nextSettings: DialogueVolumeDuckingSettingsValue) => {
    if (storedSettings() !== null) {
      setStoredSettings(nextSettings, {persist: false})
    }
  }

  const scheduleSave = (nextSettings: DialogueVolumeDuckingSettingsValue) => {
    failedStoredSettings = null
    edited = true
    setSettings(nextSettings)
    setMessage(null)
    pendingSettings = nextSettings
    publishSettings(nextSettings)

    if (saveTimeout !== null) {
      globalThis.clearTimeout(saveTimeout)
    }

    saveTimeout = globalThis.setTimeout(() => {
      saveTimeout = null
      pendingSettings = null
      persistSettings(nextSettings)
    }, SAVE_DEBOUNCE_MILLISECONDS)
  }

  createEffect(() => {
    const nextSettings = storedSettings()

    if (nextSettings === null || pendingSettings !== null || pendingSaves.length > 0) {
      return
    }

    if (failedStoredSettings !== null) {
      if (areDialogueVolumeDuckingSettingsEqual(nextSettings, failedStoredSettings)) {
        return
      }
      failedStoredSettings = null
    }

    committedSettings = nextSettings
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
      persistSettings(nextSettings)
    }
  })

  const changeEnabled = (enabled: boolean) => scheduleSave({...settings(), enabled})
  const changeVolume = (playerVolumePercent: number) =>
    scheduleSave({...settings(), playerVolumePercent})

  return {changeEnabled, changeVolume, isLoading, message, settings}
}
