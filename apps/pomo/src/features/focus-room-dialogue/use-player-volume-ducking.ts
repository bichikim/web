import {type Accessor, createEffect, createSignal, onCleanup, onMount, untrack} from 'solid-js'

import {
  DEFAULT_DIALOGUE_VOLUME_DUCKING_SETTINGS,
  DIALOGUE_VOLUME_DUCKING_SETTINGS_CHANGED_EVENT,
  type DialogueVolumeDuckingSettings,
  parseDialogueVolumeDuckingSettings,
  readDialogueVolumeDuckingSettings,
} from './volume-ducking-settings'

const PERCENT_SCALE = 100

export interface UsePlayerVolumeDuckingOptions {
  readonly isDialogueActive: Accessor<boolean>
  readonly onGainChange: (gain: number) => void
}

export const resolveDialoguePlayerGain = (
  settings: DialogueVolumeDuckingSettings,
  isDialogueActive: boolean,
) => (settings.enabled && isDialogueActive ? settings.playerVolumePercent / PERCENT_SCALE : 1)

/** Applies persisted dialogue ducking preferences to a player output gain capability. */
export const usePlayerVolumeDucking = (options: UsePlayerVolumeDuckingOptions): void => {
  const [settings, setSettings] = createSignal<DialogueVolumeDuckingSettings>(
    DEFAULT_DIALOGUE_VOLUME_DUCKING_SETTINGS,
  )
  let disposed = false
  let settingsRevision = 0

  createEffect(() => {
    const gain = resolveDialoguePlayerGain(settings(), options.isDialogueActive())
    untrack(() => options.onGainChange)(gain)
  })

  onMount(() => {
    const handleSettingsChange = (event: Event) => {
      if (!(event instanceof CustomEvent)) {
        return
      }

      const nextSettings = parseDialogueVolumeDuckingSettings(event.detail)
      if (nextSettings !== null) {
        settingsRevision += 1
        setSettings(nextSettings)
      }
    }

    window.addEventListener(DIALOGUE_VOLUME_DUCKING_SETTINGS_CHANGED_EVENT, handleSettingsChange)
    const readRevision = settingsRevision
    readDialogueVolumeDuckingSettings()
      .then((storedSettings) => {
        if (!disposed && settingsRevision === readRevision) {
          setSettings(storedSettings)
        }
      })
      .catch((error: unknown) => {
        console.error('Failed to load dialogue volume ducking settings.', error)
      })

    onCleanup(() => {
      disposed = true
      window.removeEventListener(
        DIALOGUE_VOLUME_DUCKING_SETTINGS_CHANGED_EVENT,
        handleSettingsChange,
      )
    })
  })
}
