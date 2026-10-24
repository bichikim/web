import {usePreference} from 'src/hooks/use-preference'
import {type Accessor, createEffect, untrack} from 'solid-js'

import {
  createDialogueVolumeDuckingPreferenceOptions,
  DEFAULT_DIALOGUE_VOLUME_DUCKING_SETTINGS,
  type DialogueVolumeDuckingSettings,
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
  const [storedSettings] = usePreference(
    createDialogueVolumeDuckingPreferenceOptions({
      onError: (error) => console.error('Failed to load dialogue volume ducking settings.', error),
    }),
  )

  createEffect(() => {
    const currentSettings = storedSettings() ?? DEFAULT_DIALOGUE_VOLUME_DUCKING_SETTINGS
    const gain = resolveDialoguePlayerGain(currentSettings, options.isDialogueActive())
    untrack(() => options.onGainChange(gain))
  })
}
