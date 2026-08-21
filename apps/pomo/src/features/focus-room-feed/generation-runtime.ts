import {
  AUTOMATIC_DIALOGUE_SETTINGS_CHANGED_EVENT,
  type AutomaticDialogueSettingsStorage,
} from '../focus-room-dialogue/automatic-dialogue-settings-contract'
import type {GenerateDialogueAudioOptions} from '../focus-room-dialogue/generate-dialogue-audio'

const createVoiceClient = async () => {
  const {createSupertonicClient} = await import('../supertonic/client')
  return createSupertonicClient()
}

const generateDialogueAudio = async (options: GenerateDialogueAudioOptions) => {
  const {generateCompressedDialogueAudio} =
    await import('../focus-room-dialogue/generate-dialogue-audio')
  return generateCompressedDialogueAudio(options)
}

const loadAutomaticDialogueSettings = async (storage: AutomaticDialogueSettingsStorage) => {
  const {createAutomaticDialogueSettingsRepository} =
    await import('../focus-room-dialogue/automatic-dialogue-settings')
  return createAutomaticDialogueSettingsRepository(storage).load()
}

export const feedGenerationRuntime = {
  createVoiceClient,
  generateDialogueAudio,
  loadAutomaticDialogueSettings,
  settingsChangedEvent: AUTOMATIC_DIALOGUE_SETTINGS_CHANGED_EVENT,
}
