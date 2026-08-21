import type {SupertonicModelId, SupertonicVoiceId} from '../supertonic/model'

export const AUTOMATIC_DIALOGUE_SETTINGS_CHANGED_EVENT = 'pomo:automatic-dialogue-settings-changed'

export interface AutomaticDialogueSettings {
  readonly modelId: SupertonicModelId
  readonly version: 1
  readonly voiceId: SupertonicVoiceId
}

export const DEFAULT_AUTOMATIC_DIALOGUE_SETTINGS: AutomaticDialogueSettings = {
  modelId: 'int8',
  version: 1,
  voiceId: 'Yuna',
}

export interface AutomaticDialogueSettingsStorage {
  readonly getItem: (key: string) => string | null
  readonly setItem: (key: string, value: string) => void
}

export interface AutomaticDialogueSettingsRepository {
  readonly load: () => AutomaticDialogueSettings
  readonly save: (settings: AutomaticDialogueSettings) => void
}
