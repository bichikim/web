import {type Accessor, createSignal, onCleanup, onMount} from 'solid-js'

import {
  DEFAULT_DIALOGUE_VOLUME_DUCKING_SETTINGS,
  DIALOGUE_VOLUME_DUCKING_SETTINGS_CHANGED_EVENT,
  type DialogueVolumeDuckingSettings as DialogueVolumeDuckingSettingsValue,
  readDialogueVolumeDuckingSettings,
  writeDialogueVolumeDuckingSettings,
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

const dispatchSettingsChange = (settings: DialogueVolumeDuckingSettingsValue) => {
  window.dispatchEvent(
    new CustomEvent(DIALOGUE_VOLUME_DUCKING_SETTINGS_CHANGED_EVENT, {detail: settings}),
  )
}

export const useVolumeDucking = (): VolumeDuckingState => {
  const [settings, setSettings] = createSignal<DialogueVolumeDuckingSettingsValue>(
    DEFAULT_DIALOGUE_VOLUME_DUCKING_SETTINGS,
  )
  const [isLoading, setIsLoading] = createSignal(true)
  const [message, setMessage] = createSignal<string | null>(null)
  let disposed = false
  let pendingSettings: DialogueVolumeDuckingSettingsValue | null = null
  let saveTimeout: ReturnType<typeof globalThis.setTimeout> | null = null

  const persistSettings = async (nextSettings: DialogueVolumeDuckingSettingsValue) => {
    try {
      await writeDialogueVolumeDuckingSettings(nextSettings)
      if (!disposed) {
        setMessage(null)
      }
    } catch (error: unknown) {
      console.error('Failed to save dialogue volume ducking settings.', error)
      if (!disposed) {
        setMessage(m.settings_dialogue_volume_save_failed())
      }
    }
  }

  const scheduleSave = (nextSettings: DialogueVolumeDuckingSettingsValue) => {
    setSettings(nextSettings)
    setMessage(null)
    dispatchSettingsChange(nextSettings)
    pendingSettings = nextSettings

    if (saveTimeout !== null) {
      globalThis.clearTimeout(saveTimeout)
    }

    saveTimeout = globalThis.setTimeout(() => {
      saveTimeout = null
      pendingSettings = null
      persistSettings(nextSettings)
    }, SAVE_DEBOUNCE_MILLISECONDS)
  }

  onMount(() => {
    readDialogueVolumeDuckingSettings()
      .then((storedSettings) => {
        if (!disposed) {
          setSettings(storedSettings)
          dispatchSettingsChange(storedSettings)
        }
      })
      .catch((error: unknown) => {
        console.error('Failed to load dialogue volume ducking settings.', error)
        if (!disposed) {
          setMessage(m.settings_dialogue_volume_loaded_failed())
        }
      })
      .finally(() => {
        if (!disposed) {
          setIsLoading(false)
        }
      })
  })

  onCleanup(() => {
    disposed = true

    if (saveTimeout !== null) {
      globalThis.clearTimeout(saveTimeout)
    }

    const nextSettings = pendingSettings
    pendingSettings = null
    if (nextSettings !== null) {
      writeDialogueVolumeDuckingSettings(nextSettings).catch((error: unknown) => {
        console.error('Failed to save dialogue volume ducking settings.', error)
      })
    }
  })

  const changeEnabled = (enabled: boolean) => scheduleSave({...settings(), enabled})
  const changeVolume = (playerVolumePercent: number) =>
    scheduleSave({...settings(), playerVolumePercent})

  return {changeEnabled, changeVolume, isLoading, message, settings}
}
