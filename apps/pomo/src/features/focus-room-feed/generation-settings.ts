import type {
  AutomaticDialogueSettings,
  AutomaticDialogueSettingsStorage,
} from '../focus-room-dialogue/automatic-dialogue-settings-contract'
import type {SupertonicModelId, SupertonicVoiceId} from '../supertonic'
import type {FeedConnectionRepository} from './repository'
import {DEFAULT_FEED_VOICE_ID} from './schema'

export interface FeedGenerationSettings {
  readonly modelId: SupertonicModelId
  readonly voiceId: SupertonicVoiceId
}

export interface ResolveGenerationSettingsOptions {
  readonly connectionId: string
  readonly connectionRepository: FeedConnectionRepository
  readonly loadAutomaticSettings: (
    storage: AutomaticDialogueSettingsStorage,
  ) => Promise<AutomaticDialogueSettings>
  readonly storage: AutomaticDialogueSettingsStorage
}

export const resolveGenerationSettings = async (
  options: ResolveGenerationSettingsOptions,
): Promise<FeedGenerationSettings | null> => {
  const automaticSettings = await options.loadAutomaticSettings(options.storage)
  const connection = options.connectionRepository
    .list()
    .find((item) => item.id === options.connectionId)

  if (connection === undefined) {
    return null
  }

  return {
    modelId: automaticSettings.modelId,
    voiceId:
      connection.voiceId === DEFAULT_FEED_VOICE_ID ? automaticSettings.voiceId : connection.voiceId,
  }
}
