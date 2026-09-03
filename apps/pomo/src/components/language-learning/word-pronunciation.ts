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

export type GenerateLanguageLearningWordPronunciationResult =
  | CompletedWordPronunciation
  | FailedWordPronunciation

export interface GenerateLanguageLearningWordPronunciationOptions {
  readonly language: LanguageLearningLanguage
  readonly modelId: SupertonicModelId
  readonly text: string
  readonly voiceId: SupertonicVoiceId
}

/** Generates one local pronunciation audio blob for a saved learning word. */
export const generateLanguageLearningWordPronunciation = async (
  options: GenerateLanguageLearningWordPronunciationOptions,
): Promise<GenerateLanguageLearningWordPronunciationResult> => {
  const client = createSupertonicClient()

  try {
    const initialized = await client.initialize({
      modelId: options.modelId,
      onProgress: () => undefined,
      onStatus: () => undefined,
    })

    if (!initialized.ok) {
      return {message: getSupertonicErrorMessage(initialized.error), status: 'error'}
    }

    const generated = await generateCompressedDialogueAudio({
      client,
      language: options.language,
      modelId: options.modelId,
      onChunk: () => undefined,
      text: options.text,
      voiceId: options.voiceId,
    })

    return generated.ok
      ? {audio: generated.value.audio, status: 'complete'}
      : {message: generated.message, status: 'error'}
  } catch (error: unknown) {
    console.error('Failed to generate language learning word pronunciation.', error)
    return {message: m.learning_words_pronunciation_failed(), status: 'error'}
  } finally {
    client.dispose()
  }
}
