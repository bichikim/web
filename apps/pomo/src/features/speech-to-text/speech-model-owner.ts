import type {SpeechRecognitionError} from './errors'
import type {
  CreateSpeechRecognizerOptions,
  SpeechBackend,
  SpeechRecognizer,
  SpeechRecognizerReady,
  SpeechTranscript,
} from './recognizer'
import type {SpeechResult} from './result'

interface IdleModelState {
  readonly status: 'idle'
}

interface LoadingModelState {
  readonly progress: number
  readonly status: 'loading'
}

interface ReadyModelState {
  readonly backend: SpeechBackend
  readonly status: 'ready'
}

export type SpeechModelState = IdleModelState | LoadingModelState | ReadyModelState

export interface CreateSpeechModelOwnerOptions {
  readonly createRecognizer: (options: CreateSpeechRecognizerOptions) => SpeechRecognizer
  readonly isDisposed: () => boolean
  readonly language: string
  readonly onBackendChange: (backend: SpeechBackend) => void
  readonly onError: (error: SpeechRecognitionError) => void
  readonly onStateChange: (state: SpeechModelState) => void
  readonly preferredBackend: SpeechBackend
}

export interface SpeechModelOwner {
  readonly dispose: () => void
  readonly prepare: () => Promise<SpeechResult<SpeechRecognizerReady, SpeechRecognitionError>>
  readonly transcribe: (
    audio: Float32Array,
  ) => Promise<SpeechResult<SpeechTranscript, SpeechRecognitionError>>
}

const shouldReplaceRecognizer = (error: SpeechRecognitionError) =>
  error.code === 'cancelled' || error.code === 'worker-failed'

/** Owns one lazy recognizer session and normalizes preparation, retry, and disposal. */
export const createSpeechModelOwner = (
  options: CreateSpeechModelOwnerOptions,
): SpeechModelOwner => {
  let preparation: Promise<SpeechResult<SpeechRecognizerReady, SpeechRecognitionError>> | null =
    null
  let recognizer: SpeechRecognizer | null = null
  let readyBackend: SpeechBackend | null = null

  const release = () => {
    recognizer?.dispose()
    recognizer = null
    preparation = null
    readyBackend = null

    if (!options.isDisposed()) {
      options.onStateChange({status: 'idle'})
    }
  }

  const handleError = (error: SpeechRecognitionError) => {
    options.onError(error)

    if (shouldReplaceRecognizer(error)) {
      release()
    }
  }

  const getRecognizer = () => {
    recognizer ??= options.createRecognizer({
      onBackendChange: options.onBackendChange,
      onProgress: (progress) => {
        if (!options.isDisposed()) {
          options.onStateChange({progress, status: 'loading'})
        }
      },
      preferredBackend: options.preferredBackend,
    })
    return recognizer
  }

  const prepare = () => {
    if (readyBackend !== null) {
      return Promise.resolve({ok: true, value: {backend: readyBackend}} as const)
    }

    if (preparation !== null) {
      return preparation
    }

    options.onStateChange({progress: 0, status: 'loading'})
    preparation = getRecognizer()
      .prepare()
      .then((result) => {
        if (options.isDisposed()) {
          return result
        }

        if (result.ok) {
          readyBackend = result.value.backend
          options.onBackendChange(result.value.backend)
          options.onStateChange({backend: result.value.backend, status: 'ready'})
        } else {
          options.onStateChange({status: 'idle'})
          handleError(result.error)
        }

        return result
      })
      .finally(() => {
        preparation = null
      })
    return preparation
  }

  const transcribe = async (audio: Float32Array) => {
    const preparationResult = await prepare()

    if (!preparationResult.ok) {
      return preparationResult
    }

    const result = await getRecognizer().transcribe({audio, language: options.language})

    if (result.ok) {
      options.onBackendChange(result.value.backend)
    } else {
      handleError(result.error)
    }

    return result
  }

  return {dispose: release, prepare, transcribe}
}
