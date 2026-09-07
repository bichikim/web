import {createModelStorage, type ModelStorage, type ModelStorageError} from '../model-storage'
import type {LanguageLearningWord} from './word-schema'

const AUDIO_CACHE_NAME = 'pomo-language-learning-word-audio-v1'
const AUDIO_OWNER_HEADER = 'X-Pomo-Word-Audio-Owner'
const AUDIO_PATH_PREFIX = '/__pomo/language-learning-word-audio'
const audioOperationQueues = new Map<string, Promise<void>>()

export interface LanguageLearningWordAudioRepository {
  readonly delete: (word: LanguageLearningWord, owner?: string) => Promise<void>
  readonly get: (word: LanguageLearningWord) => Promise<Blob | null>
  readonly save: (word: LanguageLearningWord, audio: Blob, owner: string) => Promise<void>
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
): LanguageLearningWordAudioRepository => {
  const runOperation = <Value>(key: string, operation: () => Promise<Value>): Promise<Value> => {
    const previousOperation = audioOperationQueues.get(key) ?? Promise.resolve()
    const result = previousOperation.then(operation)
    const completion = result.then(
      () => undefined,
      () => undefined,
    )
    audioOperationQueues.set(key, completion)

    return result.finally(() => {
      if (audioOperationQueues.get(key) === completion) {
        audioOperationQueues.delete(key)
      }
    })
  }

  return {
    delete(word, owner) {
      const path = getAudioPath(word)
      return runOperation(path, async () => {
        if (owner !== undefined) {
          const storedResult = await storage.get(path)
          if (!storedResult.ok) {
            return throwStorageError(storedResult.error)
          }
          if (
            storedResult.value === null ||
            storedResult.value.headers.get(AUDIO_OWNER_HEADER) !== owner
          ) {
            return
          }
        }

        const result = await storage.delete(path)

        if (!result.ok) {
          throwStorageError(result.error)
        }
      })
    },
    get(word) {
      const path = getAudioPath(word)
      return runOperation(path, async () => {
        const result = await storage.get(path)

        if (!result.ok) {
          return throwStorageError(result.error)
        }

        if (result.value === null) {
          return null
        }

        return result.value.blob()
      })
    },
    save(word, audio, owner) {
      const path = getAudioPath(word)
      return runOperation(path, async () => {
        const result = await storage.set(
          path,
          new Response(audio, {
            headers: {
              [AUDIO_OWNER_HEADER]: owner,
              'Content-Type': 'audio/ogg; codecs=opus',
            },
          }),
        )

        if (!result.ok) {
          throwStorageError(result.error)
        }
      })
    },
  }
}
