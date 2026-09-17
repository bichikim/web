import {createModelStorage, type ModelStorage, type ModelStorageError} from '../model-storage'
import {createKeyedTaskQueue, type KeyedTaskQueue} from 'src/utils/create-keyed-task-queue'
import type {LanguageLearningWord} from './word-schema'

const AUDIO_CACHE_NAME = 'pomo-language-learning-word-audio-v1'
const AUDIO_OWNER_HEADER = 'X-Pomo-Word-Audio-Owner'
const AUDIO_PATH_PREFIX = '/__pomo/language-learning-word-audio'

const defaultAudioCoordinator = createKeyedTaskQueue()
const injectedAudioCoordinators = new WeakMap<ModelStorage, KeyedTaskQueue>()

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

const getInjectedAudioCoordinator = (storage: ModelStorage): KeyedTaskQueue => {
  const existingCoordinator = injectedAudioCoordinators.get(storage)
  if (existingCoordinator !== undefined) {
    return existingCoordinator
  }

  const createdCoordinator = createKeyedTaskQueue()
  injectedAudioCoordinators.set(storage, createdCoordinator)
  return createdCoordinator
}

/** Persists compressed word pronunciation audio in the browser cache. */
export const createLanguageLearningWordAudioRepository = (
  storage?: ModelStorage,
  coordinator?: KeyedTaskQueue,
): LanguageLearningWordAudioRepository => {
  const resolvedStorage = storage ?? createModelStorage({cacheName: AUDIO_CACHE_NAME})
  const resolvedCoordinator =
    coordinator ??
    (storage === undefined ? defaultAudioCoordinator : getInjectedAudioCoordinator(resolvedStorage))

  return {
    delete(word, owner) {
      const path = getAudioPath(word)
      return resolvedCoordinator.run(path, async () => {
        if (owner !== undefined) {
          const storedResult = await resolvedStorage.get(path)
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

        const result = await resolvedStorage.delete(path)

        if (!result.ok) {
          throwStorageError(result.error)
        }
      })
    },
    get(word) {
      const path = getAudioPath(word)
      return resolvedCoordinator.run(path, async () => {
        const result = await resolvedStorage.get(path)

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
      return resolvedCoordinator.run(path, async () => {
        const result = await resolvedStorage.set(
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
