import {
  createSupertonicClient,
  type InitializeSupertonicOptions,
  type SupertonicClient,
  type SupertonicError,
  type SupertonicModelId,
} from '../../features/supertonic'

interface CancelledLanguageLearningSupertonicRun {
  readonly status: 'cancelled'
}

interface FailedLanguageLearningSupertonicInitialization {
  readonly error: SupertonicError
  readonly status: 'initialization-error'
}

interface CompletedLanguageLearningSupertonicRun<T> {
  readonly status: 'complete'
  readonly value: T
}

export type LanguageLearningSupertonicRunResult<T> =
  | CancelledLanguageLearningSupertonicRun
  | CompletedLanguageLearningSupertonicRun<T>
  | FailedLanguageLearningSupertonicInitialization

export interface RunLanguageLearningSupertonicOptions<T> {
  readonly isCancelled?: () => boolean
  readonly modelId: SupertonicModelId
  readonly onProgress: InitializeSupertonicOptions['onProgress']
  readonly onStatus: InitializeSupertonicOptions['onStatus']
  readonly run: (client: SupertonicClient) => Promise<T>
  readonly signal?: AbortSignal
}

const isAborted = (signal: AbortSignal | undefined) => signal?.aborted === true

/** Runs one bounded language-learning Supertonic operation with one initialized client. */
export const runLanguageLearningSupertonic = async <T>(
  options: RunLanguageLearningSupertonicOptions<T>,
): Promise<LanguageLearningSupertonicRunResult<T>> => {
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
      onProgress: options.onProgress,
      onStatus: options.onStatus,
    })

    if (isAborted(options.signal) || options.isCancelled?.()) {
      return {status: 'cancelled'}
    }

    if (!initialized.ok) {
      return {error: initialized.error, status: 'initialization-error'}
    }

    const value = await options.run(client)

    if (isAborted(options.signal)) {
      return {status: 'cancelled'}
    }

    return {status: 'complete', value}
  } finally {
    options.signal?.removeEventListener('abort', disposeClient)
    disposeClient()
  }
}
