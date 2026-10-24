import * as m from '@paraglide/message'
import {generateCompressedDialogueAudio} from '../../features/focus-room-dialogue'
import type {LanguageLearningLanguage} from '../../features/language-learning'
import {
  getSupertonicErrorMessage,
  type SupertonicModelId,
  type SupertonicVoiceId,
} from '../../features/supertonic'
import {runLanguageLearningSupertonic} from './supertonic-lifecycle'

interface CompletedWordPronunciation {
  readonly audio: Blob
  readonly status: 'complete'
}

interface FailedWordPronunciation {
  readonly message: string
  readonly status: 'error'
}

interface CancelledWordPronunciation {
  readonly status: 'cancelled'
}

export type GenerateLanguageLearningWordPronunciationResult =
  | CancelledWordPronunciation
  | CompletedWordPronunciation
  | FailedWordPronunciation

export interface GenerateLanguageLearningWordPronunciationOptions {
  readonly language: LanguageLearningLanguage
  readonly modelId: SupertonicModelId
  readonly signal?: AbortSignal
  readonly text: string
  readonly voiceId: SupertonicVoiceId
}

const isAborted = (signal?: AbortSignal) => signal?.aborted === true

/** Generates one local pronunciation audio blob for a saved learning word. */
export const generateLanguageLearningWordPronunciation = async (
  options: GenerateLanguageLearningWordPronunciationOptions,
): Promise<GenerateLanguageLearningWordPronunciationResult> => {
  if (isAborted(options.signal)) {
    return {status: 'cancelled'}
  }

  try {
    const result =
      await runLanguageLearningSupertonic<GenerateLanguageLearningWordPronunciationResult>({
        modelId: options.modelId,
        onProgress: () => undefined,
        onStatus: () => undefined,
        run: async (client) => {
          if (isAborted(options.signal)) {
            return {status: 'cancelled'}
          }

          const generated = await generateCompressedDialogueAudio({
            client,
            language: options.language,
            modelId: options.modelId,
            onChunk: () => undefined,
            signal: options.signal,
            text: options.text,
            voiceId: options.voiceId,
          })

          if (isAborted(options.signal)) {
            return {status: 'cancelled'}
          }

          return generated.ok
            ? {audio: generated.value.audio, status: 'complete'}
            : {message: generated.message, status: 'error'}
        },
        signal: options.signal,
      })

    switch (result.status) {
      case 'cancelled':
        return result
      case 'initialization-error':
        return {message: getSupertonicErrorMessage(result.error), status: 'error'}
      case 'complete':
        return result.value
    }
  } catch (error: unknown) {
    if (isAborted(options.signal)) {
      return {status: 'cancelled'}
    }

    console.error('Failed to generate language learning word pronunciation.', error)
    return {message: m.learning_words_pronunciation_failed(), status: 'error'}
  }
}
