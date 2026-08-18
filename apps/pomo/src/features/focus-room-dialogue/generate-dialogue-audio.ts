import {joinAudioChunks} from '../supertonic/audio'
import {getSupertonicSpeechSpeed, type SupertonicClient} from '../supertonic/client'
import {getSupertonicErrorMessage} from '../supertonic/error-message'
import type {SupertonicLanguage} from '../supertonic/language'
import type {SupertonicAudioChunk} from '../supertonic/messages'
import {
  getSupertonicModel,
  type SupertonicModelId,
  type SupertonicVoiceId,
} from '../supertonic/model'
import {createOpusBlob} from '../supertonic/opus-client'
import {splitSpeechText} from '../supertonic/text-chunking'
import {createWaveBlob} from '../supertonic/wav'
import type {DialogueSegment} from './schema'
import {createDialogueTimeline} from './timeline'

export interface GenerateDialogueAudioOptions {
  readonly client: SupertonicClient
  readonly language: SupertonicLanguage
  readonly modelId: SupertonicModelId
  readonly onChunk: (completed: number, total: number) => void
  readonly signal?: AbortSignal
  readonly text: string
  readonly voiceId: SupertonicVoiceId
}

export interface GeneratedDialogueAudio {
  readonly audioChunks: ReadonlyArray<SupertonicAudioChunk>
  readonly durationMs: number
  readonly sampleRate: number
  readonly segments: ReadonlyArray<DialogueSegment>
  readonly speed: number
}

export interface GeneratedCompressedDialogueAudio {
  readonly audio: Blob
  readonly durationMs: number
  readonly segments: ReadonlyArray<DialogueSegment>
}

interface DialogueAudioSuccess<T> {
  readonly ok: true
  readonly value: T
}

interface DialogueAudioFailure {
  readonly message: string
  readonly ok: false
}

export type GenerateDialogueAudioResult =
  | DialogueAudioFailure
  | DialogueAudioSuccess<GeneratedDialogueAudio>

export type GenerateCompressedDialogueAudioResult =
  | DialogueAudioFailure
  | DialogueAudioSuccess<GeneratedCompressedDialogueAudio>

export interface RegenerateDialogueSegmentAudioOptions {
  readonly client: SupertonicClient
  readonly current: GeneratedDialogueAudio
  readonly language: SupertonicLanguage
  readonly modelId: SupertonicModelId
  readonly position: number
  readonly voiceId: SupertonicVoiceId
}

const getGenerationFailure = (error: unknown): DialogueAudioFailure => {
  console.error('Failed to generate dialogue audio.', error)
  return {message: '음성을 만들지 못했어요.', ok: false}
}

/** Joins editable segments only when a preview or stored file needs complete PCM. */
export const createDialogueAudioSamples = (
  audio: GeneratedDialogueAudio,
  modelId: SupertonicModelId,
) =>
  joinAudioChunks({
    chunks: audio.audioChunks.map((chunk) => chunk.samples),
    sampleRate: audio.sampleRate,
    silenceDuration: getSupertonicModel(modelId).speechPolicy.silenceDuration,
  })

/** Creates a disposable full-preview blob without retaining duplicate PCM. */
export const createDialogueAudioPreview = (
  audio: GeneratedDialogueAudio,
  modelId: SupertonicModelId,
) => createWaveBlob(createDialogueAudioSamples(audio, modelId), audio.sampleRate)

/** Generates editable PCM dialogue audio and a subtitle timeline. */
export const generateDialogueAudio = async (
  options: GenerateDialogueAudioOptions,
): Promise<GenerateDialogueAudioResult> => {
  const model = getSupertonicModel(options.modelId)
  const textChunks = splitSpeechText(options.text, model.speechPolicy)
  const audioChunks: Array<SupertonicAudioChunk> = []
  const speed = getSupertonicSpeechSpeed(options.text)

  try {
    for await (const result of options.client.generateStream({
      language: options.language,
      speed,
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
            audioChunks,
            durationMs: timeline.durationMs,
            sampleRate: result.value.audio.sampleRate,
            segments: timeline.segments,
            speed,
          },
        }
      }
    }
  } catch (error: unknown) {
    return getGenerationFailure(error)
  }

  return {message: '완성된 음성을 받지 못했어요.', ok: false}
}

/** Generates dialogue audio and compresses it for non-editing consumers. */
export const generateCompressedDialogueAudio = async (
  options: GenerateDialogueAudioOptions,
): Promise<GenerateCompressedDialogueAudioResult> => {
  const generated = await generateDialogueAudio(options)

  if (!generated.ok) {
    return generated
  }

  try {
    return {
      ok: true,
      value: {
        audio: await createOpusBlob({
          sampleRate: generated.value.sampleRate,
          samples: createDialogueAudioSamples(generated.value, options.modelId),
          signal: options.signal,
        }),
        durationMs: generated.value.durationMs,
        segments: generated.value.segments,
      },
    }
  } catch (error: unknown) {
    return getGenerationFailure(error)
  }
}

/** Replaces one editable PCM segment and rebuilds the full preview timeline. */
export const regenerateDialogueSegmentAudio = async (
  options: RegenerateDialogueSegmentAudioOptions,
): Promise<GenerateDialogueAudioResult> => {
  const segment = options.current.segments[options.position]
  const previousChunk = options.current.audioChunks[options.position]

  if (segment === undefined || previousChunk === undefined) {
    return {message: '다시 만들 말풍선을 찾지 못했어요.', ok: false}
  }

  try {
    const generated = await options.client.generate({
      language: options.language,
      speed: options.current.speed,
      text: segment.text,
      voice: {id: options.voiceId, kind: 'preset'},
    })

    if (!generated.ok) {
      return {message: getSupertonicErrorMessage(generated.error), ok: false}
    }

    if (generated.value.sampleRate !== options.current.sampleRate) {
      return {message: '다시 만든 음성 형식이 기존 음성과 달라요.', ok: false}
    }

    const audioChunks = options.current.audioChunks.map((chunk, position) =>
      position === options.position
        ? {...generated.value, index: chunk.index, total: chunk.total}
        : chunk,
    )
    const model = getSupertonicModel(options.modelId)
    const timeline = createDialogueTimeline({
      audioChunks,
      silenceDuration: model.speechPolicy.silenceDuration,
      textChunks: options.current.segments.map((item) => item.text),
    })
    const segments = timeline.segments.map((item, position) => {
      const mood = options.current.segments[position]?.mood
      return mood === undefined ? item : {...item, mood}
    })

    return {
      ok: true,
      value: {
        audioChunks,
        durationMs: timeline.durationMs,
        sampleRate: options.current.sampleRate,
        segments,
        speed: options.current.speed,
      },
    }
  } catch (error: unknown) {
    return getGenerationFailure(error)
  }
}
