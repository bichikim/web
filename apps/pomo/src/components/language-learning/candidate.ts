import type {DialogueSegment} from '../../features/focus-room-dialogue'
import type {SupertonicModelId, SupertonicVoiceId} from '../../features/supertonic'

export interface LanguageLearningCandidate {
  readonly audio: Blob
  readonly audioKey: string
  readonly audioUrl: string
  readonly durationMs: number
  readonly id: string
  readonly modelId: SupertonicModelId
  readonly segments: ReadonlyArray<DialogueSegment>
  readonly selected: boolean
  readonly text: string
  readonly voiceId: SupertonicVoiceId
}

interface LanguageLearningAudioUrl {
  readonly audioUrl: string
}

export const revokeLanguageLearningAudioUrls = (
  candidates: ReadonlyArray<LanguageLearningAudioUrl>,
) => {
  for (const candidate of candidates) {
    URL.revokeObjectURL(candidate.audioUrl)
  }
}
