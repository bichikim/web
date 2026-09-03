import * as m from '@paraglide/message'
import {generateCompressedDialogueAudio} from '../../features/focus-room-dialogue'
import type {LanguageLearningLanguage} from '../../features/language-learning'
import {
  createSupertonicClient,
  getSupertonicErrorMessage,
  type SupertonicModelId,
  type SupertonicVoiceId,
} from '../../features/supertonic'

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

  const client = createSupertonicClient()
  let isClientDisposed = false
  const disposeClient = () => {
    if (!isClientDisposed) {
      isClientDisposed = true
      client.dispose()
    }
  }
  options.signal?.addEventListener('abort', disposeClient, {once: true})

  try {
    if (isAborted(options.signal)) {
      return {status: 'cancelled'}
    }

    const initialized = await client.initialize({
      modelId: options.modelId,
      onProgress: () => undefined,
      onStatus: () => undefined,
    })

    if (isAborted(options.signal)) {
      return {status: 'cancelled'}
    }

    if (!initialized.ok) {
      return {message: getSupertonicErrorMessage(initialized.error), status: 'error'}
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
  } catch (error: unknown) {
    if (isAborted(options.signal)) {
      return {status: 'cancelled'}
    }

    console.error('Failed to generate language learning word pronunciation.', error)
    return {message: m.learning_words_pronunciation_failed(), status: 'error'}
  } finally {
    options.signal?.removeEventListener('abort', disposeClient)
    disposeClient()
  }
}
