import {createModelStorage, type ModelStorage, type ModelStorageError} from '../model-storage'
import type {LanguageLearningWord} from './word-schema'

const AUDIO_CACHE_NAME = 'pomo-language-learning-word-audio-v1'
const AUDIO_PATH_PREFIX = '/__pomo/language-learning-word-audio'

export interface LanguageLearningWordAudioRepository {
  readonly delete: (word: LanguageLearningWord) => Promise<void>
  readonly get: (word: LanguageLearningWord) => Promise<Blob | null>
  readonly save: (word: LanguageLearningWord, audio: Blob) => Promise<void>
}

export class LanguageLearningWordAudioStorageError extends Error {
  override readonly name = 'LanguageLearningWordAudioStorageError'

  constructor(
    readonly operation: ModelStorageError['operation'],
    options: ErrorOptions,
  ) {
    super('Language learning word audio storage failed', options)
  }
}

const getAudioPath = (word: LanguageLearningWord) =>
  `${AUDIO_PATH_PREFIX}/${word.language}/${encodeURIComponent(word.value)}.opus`

const throwStorageError = (error: ModelStorageError): never => {
  throw new LanguageLearningWordAudioStorageError(error.operation, {cause: error.cause})
}

/** Persists compressed word pronunciation audio in the browser cache. */
export const createLanguageLearningWordAudioRepository = (
  storage: ModelStorage = createModelStorage({cacheName: AUDIO_CACHE_NAME}),
): LanguageLearningWordAudioRepository => ({
  async delete(word) {
    const result = await storage.delete(getAudioPath(word))

    if (!result.ok) {
      throwStorageError(result.error)
    }
  },
  async get(word) {
    const result = await storage.get(getAudioPath(word))

    if (!result.ok) {
      return throwStorageError(result.error)
    }

    if (result.value === null) {
      return null
    }

    return result.value.blob()
  },
  async save(word, audio) {
    const result = await storage.set(
      getAudioPath(word),
      new Response(audio, {headers: {'Content-Type': 'audio/ogg; codecs=opus'}}),
    )

    if (!result.ok) {
      throwStorageError(result.error)
    }
  },
})
