import {
  createWaveBlob,
  getSupertonicErrorMessage,
  getSupertonicModel,
  type SupertonicAudioChunk,
  type SupertonicClient,
  type SupertonicModelId,
  type SupertonicVoiceId,
} from '../supertonic'
import {splitSpeechText} from '../supertonic/text-chunking'
import type {DialogueSegment} from './schema'
import {createDialogueTimeline} from './timeline'

export interface GenerateDialogueAudioOptions {
  readonly client: SupertonicClient
  readonly modelId: SupertonicModelId
  readonly onChunk: (completed: number, total: number) => void
  readonly text: string
  readonly voiceId: SupertonicVoiceId
}

export interface GeneratedDialogueAudio {
  readonly audio: Blob
  readonly durationMs: number
  readonly segments: ReadonlyArray<DialogueSegment>
}

interface GenerateDialogueAudioSuccess {
  readonly ok: true
  readonly value: GeneratedDialogueAudio
}

interface GenerateDialogueAudioFailure {
  readonly message: string
  readonly ok: false
}

export type GenerateDialogueAudioResult =
  | GenerateDialogueAudioFailure
  | GenerateDialogueAudioSuccess

/** Generates a dialogue WAV and subtitle timeline using the same model contract as the editor. */
export const generateDialogueAudio = async (
  options: GenerateDialogueAudioOptions,
): Promise<GenerateDialogueAudioResult> => {
  const model = getSupertonicModel(options.modelId)
  const textChunks = splitSpeechText(options.text, model.speechPolicy)
  const audioChunks: Array<SupertonicAudioChunk> = []

  try {
    for await (const result of options.client.generateStream({
      text: options.text,
      voice: {id: options.voiceId, kind: 'preset'},
    })) {
      if (!result.ok) {
        return {message: getSupertonicErrorMessage(result.error), ok: false}
      }

      if (result.value.type === 'chunk') {
        audioChunks.push(result.value.audio)
        options.onChunk(result.value.audio.index + 1, result.value.audio.total)
      } else {
        const timeline = createDialogueTimeline({
          audioChunks,
          silenceDuration: model.speechPolicy.silenceDuration,
          textChunks,
        })

        return {
          ok: true,
          value: {
            audio: createWaveBlob(result.value.audio.samples, result.value.audio.sampleRate),
            durationMs: timeline.durationMs,
            segments: timeline.segments,
          },
        }
      }
    }
  } catch (error: unknown) {
    console.error('Failed to generate dialogue audio.', error)
    return {message: '음성을 만들지 못했어요.', ok: false}
  }

  return {message: '완성된 음성을 받지 못했어요.', ok: false}
}
