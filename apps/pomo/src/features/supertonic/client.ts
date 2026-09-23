// oxlint-disable no-await-in-loop, no-loop-func, no-unmodified-loop-condition -- Stream consumers intentionally wait for each Worker chunk notification.
import type {CancelledError, SupertonicError, WorkerFailedError} from './errors'
import {resolveSupertonicLanguage, type SupertonicLanguage} from './language'
import type {
  SupertonicAudio,
  SupertonicAudioChunk,
  SupertonicGenerationEvent,
  SupertonicProgress,
  SupertonicVoiceSource,
  SupertonicWorkerInput,
  SupertonicWorkerOutput,
} from './messages'
import type {SupertonicModelId} from './model'
import {reportClientError} from '../client-error-reporter'
import {failureResult, type Result, successResult} from 'src/features/result'

export interface InitializeSupertonicOptions {
  readonly modelId: SupertonicModelId
  readonly onProgress: (progress: SupertonicProgress) => void
  readonly onStatus: (message: string) => void
}

export interface GenerateSupertonicOptions {
  readonly language?: SupertonicLanguage
  readonly speed?: number
  readonly text: string
  readonly voice: SupertonicVoiceSource
}

interface PendingRequest {
  readonly onChunk: (audio: SupertonicAudioChunk) => void
  readonly resolve: (result: Result<SupertonicAudio, SupertonicError>) => void
}

interface PendingInitialization {
  readonly modelId: SupertonicModelId
  readonly onProgressCallbacks: Array<(progress: SupertonicProgress) => void>
  readonly onStatusCallbacks: Array<(message: string) => void>
  readonly promise: Promise<Result<void, SupertonicError>>
  readonly resolve: (result: Result<void, SupertonicError>) => void
}

export interface SupertonicClient {
  readonly cancelGeneration: () => void
  readonly dispose: () => void
  readonly generate: (
    options: GenerateSupertonicOptions,
  ) => Promise<Result<SupertonicAudio, SupertonicError>>
  readonly generateStream: (
    options: GenerateSupertonicOptions,
  ) => AsyncGenerator<Result<SupertonicGenerationEvent, SupertonicError>>
  readonly initialize: (
    options: InitializeSupertonicOptions,
  ) => Promise<Result<void, SupertonicError>>
}

const DEFAULT_SPEECH_SPEED = 1.05
const SHORT_SPEECH_SPEED = 0.8
const MAXIMUM_SHORT_SPEECH_LENGTH = 10
const SPEECH_CHARACTER_PATTERN = /[\p{L}\p{N}]/gu
const ignoreChunk = () => undefined
const getSpeechLength = (text: string) => text.match(SPEECH_CHARACTER_PATTERN)?.length ?? 0
// Speed 0.8 preserved the first word in repeated short-reply trials; count only spoken characters so formatting does not bypass the mitigation.
export const getSupertonicSpeechSpeed = (text: string) =>
  getSpeechLength(text) <= MAXIMUM_SHORT_SPEECH_LENGTH ? SHORT_SPEECH_SPEED : DEFAULT_SPEECH_SPEED
const createCancelledError = (phase: CancelledError['phase']): CancelledError => ({
  code: 'cancelled',
  phase,
  retryable: false,
})
const getAudioChunk = (
  message: Extract<SupertonicWorkerOutput, {readonly type: 'chunk'}>,
): SupertonicAudioChunk => ({
  generationTime: message.generationTime,
  index: message.index,
  sampleRate: message.sampleRate,
  samples: message.samples,
  total: message.total,
})

const createWorkerFailureState = (worker: Worker) => {
  let failure: WorkerFailedError | null = null
  let terminated = false

  return {
    getFailure: () => failure,
    recordFailure: (error: WorkerFailedError) => {
      if (failure !== null) {
        return false
      }

      failure = error
      if (!terminated) {
        terminated = true
        worker.terminate()
      }
      return true
    },
    terminate: () => {
      if (!terminated) {
        terminated = true
        worker.terminate()
      }
    },
  }
}

interface ObserveSupertonicWorkerOptions {
  readonly onFailure: (error: WorkerFailedError) => void
  readonly onMessage: (message: SupertonicWorkerOutput) => void
  readonly worker: Worker
}

const observeSupertonicWorker = (options: ObserveSupertonicWorkerOptions) => {
  options.worker.addEventListener('message', (event: MessageEvent<SupertonicWorkerOutput>) => {
    options.onMessage(event.data)
  })
  options.worker.addEventListener('error', (event) => {
    reportClientError(event.error ?? {message: 'Worker execution failed', name: 'WorkerError'}, {
      feature: 'supertonic-model',
      source: 'worker',
    })
    options.onFailure({
      code: 'worker-failed',
      detail: event.message || 'Worker 실행 오류',
      phase: 'initialize',
      retryable: true,
    })
  })
  options.worker.addEventListener('messageerror', () => {
    reportClientError(
      {message: 'Worker response deserialization failed', name: 'WorkerError'},
      {
        feature: 'supertonic-model',
        source: 'worker',
      },
    )
    options.onFailure({
      code: 'worker-failed',
      detail: 'Worker 응답을 읽지 못했습니다.',
      phase: 'initialize',
      retryable: true,
    })
  })
}

interface SupertonicInitializationControllerOptions {
  readonly getFailure: () => WorkerFailedError | null
  readonly isDisposed: () => boolean
  readonly post: (modelId: SupertonicModelId) => void
}

const createSupertonicInitializationController = (
  options: SupertonicInitializationControllerOptions,
) => {
  let activeInitialization: PendingInitialization | null = null
  const initializationQueue: Array<PendingInitialization> = []

  const startNextInitialization = () => {
    if (activeInitialization !== null || options.isDisposed() || options.getFailure() !== null) {
      return
    }

    const nextInitialization = initializationQueue.shift()
    if (nextInitialization === undefined) {
      return
    }

    activeInitialization = nextInitialization
    options.post(nextInitialization.modelId)
  }

  const resolveActive = (result: Result<void, SupertonicError>) => {
    const initialization = activeInitialization
    if (initialization === null) {
      return
    }

    activeInitialization = null
    initialization.resolve(result)
    startNextInitialization()
  }

  const resolveAll = (result: Result<void, SupertonicError>) => {
    const initialization = activeInitialization
    activeInitialization = null
    initialization?.resolve(result)

    for (const queuedInitialization of initializationQueue.splice(0)) {
      queuedInitialization.resolve(result)
    }
  }

  const initialize = (initializeOptions: InitializeSupertonicOptions) => {
    const existingInitialization =
      activeInitialization?.modelId === initializeOptions.modelId
        ? activeInitialization
        : initializationQueue.find(
            (pendingInitialization) => pendingInitialization.modelId === initializeOptions.modelId,
          )

    if (existingInitialization !== undefined) {
      existingInitialization.onProgressCallbacks.push(initializeOptions.onProgress)
      existingInitialization.onStatusCallbacks.push(initializeOptions.onStatus)
      return existingInitialization.promise
    }

    let resolve: ((result: Result<void, SupertonicError>) => void) | undefined
    const promise = new Promise<Result<void, SupertonicError>>((nextResolve) => {
      resolve = nextResolve
    })
    initializationQueue.push({
      modelId: initializeOptions.modelId,
      onProgressCallbacks: [initializeOptions.onProgress],
      onStatusCallbacks: [initializeOptions.onStatus],
      promise,
      resolve: resolve!,
    })
    startNextInitialization()
    return promise
  }

  return {
    getActive: () => activeInitialization,
    initialize,
    resolveActive,
    resolveAll,
  }
}

type SupertonicGenerateRequest = (
  options: GenerateSupertonicOptions,
  onChunk: (audio: SupertonicAudioChunk) => void,
) => Promise<Result<SupertonicAudio, SupertonicError>>

async function* generateSupertonicStream(
  options: GenerateSupertonicOptions,
  generateRequest: SupertonicGenerateRequest,
): AsyncGenerator<Result<SupertonicGenerationEvent, SupertonicError>> {
  const chunks: Array<SupertonicAudioChunk> = []
  let isComplete = false
  let wakeConsumer: (() => void) | null = null
  const wake = () => {
    wakeConsumer?.()
    wakeConsumer = null
  }
  const generation = generateRequest(options, (audio) => {
    chunks.push(audio)
    wake()
  }).then((result) => {
    isComplete = true
    wake()
    return result
  })

  while (!isComplete || chunks.length > 0) {
    if (chunks.length === 0) {
      await new Promise<void>((resolve) => {
        wakeConsumer = resolve
      })
    } else {
      yield successResult({audio: chunks.shift()!, type: 'chunk'})
    }
  }

  const result = await generation
  yield result.ok
    ? successResult({audio: result.value, type: 'complete'})
    : failureResult(result.error)
}

/** Creates an isolated Supertonic Worker client and owns it until disposal. */
export const createSupertonicClient = (): SupertonicClient => {
  const worker = new Worker(new URL('./worker.ts', import.meta.url), {type: 'module'})
  let nextRequestId = 1
  let pendingRequest: PendingRequest | null = null
  let disposed = false
  const workerFailureState = createWorkerFailureState(worker)
  const initialization = createSupertonicInitializationController({
    getFailure: workerFailureState.getFailure,
    isDisposed: () => disposed,
    post: (modelId) =>
      worker.postMessage({modelId, type: 'initialize'} satisfies SupertonicWorkerInput),
  })

  const resolveFailures = (error: WorkerFailedError) => {
    if (!workerFailureState.recordFailure(error)) {
      return
    }

    initialization.resolveAll(failureResult(error))
    pendingRequest?.resolve(
      failureResult({...error, phase: 'generate'} satisfies WorkerFailedError),
    )
    pendingRequest = null
  }

  const handleMessage = (message: SupertonicWorkerOutput) => {
    switch (message.type) {
      case 'chunk':
        pendingRequest?.onChunk(getAudioChunk(message))
        return
      case 'disposed':
        workerFailureState.terminate()
        return
      case 'error':
        if (message.requestId === null) {
          reportClientError(message.error, {feature: 'supertonic-model', source: 'worker'})
          initialization.resolveActive(failureResult(message.error))
        } else {
          pendingRequest?.resolve(failureResult(message.error))
          pendingRequest = null
        }
        return
      case 'progress':
        for (const callback of initialization.getActive()?.onProgressCallbacks ?? []) {
          callback(message.progress)
        }
        return
      case 'ready':
        initialization.resolveActive(successResult(undefined))
        return
      case 'result':
        pendingRequest?.resolve(
          successResult({
            generationTime: message.generationTime,
            sampleRate: message.sampleRate,
            samples: message.samples,
          }),
        )
        pendingRequest = null
        return
      case 'status':
        for (const callback of initialization.getActive()?.onStatusCallbacks ?? []) {
          callback(message.message)
        }
    }
  }

  observeSupertonicWorker({onFailure: resolveFailures, onMessage: handleMessage, worker})

  const initialize: SupertonicClient['initialize'] = (options) => {
    if (disposed) {
      return Promise.resolve(failureResult(createCancelledError('initialize')))
    }

    const workerFailure = workerFailureState.getFailure()
    if (workerFailure !== null) {
      return Promise.resolve(failureResult({...workerFailure, phase: 'initialize'}))
    }

    return initialization.initialize(options)
  }

  const generateRequest = (
    options: GenerateSupertonicOptions,
    onChunk: (audio: SupertonicAudioChunk) => void,
  ): Promise<Result<SupertonicAudio, SupertonicError>> => {
    if (disposed) {
      return Promise.resolve(failureResult(createCancelledError('generate')))
    }

    const workerFailure = workerFailureState.getFailure()
    if (workerFailure !== null) {
      return Promise.resolve(failureResult({...workerFailure, phase: 'generate'}))
    }

    if (pendingRequest !== null) {
      return Promise.resolve(
        failureResult({
          code: 'generation-busy',
          phase: 'generate',
          retryable: true,
        }),
      )
    }

    const requestId = nextRequestId
    nextRequestId += 1

    return new Promise((resolve) => {
      pendingRequest = {onChunk, resolve}
      worker.postMessage({
        language: options.language ?? resolveSupertonicLanguage(document.documentElement.lang),
        requestId,
        speed: options.speed ?? getSupertonicSpeechSpeed(options.text),
        text: options.text,
        type: 'generate',
        voice: options.voice,
      } satisfies SupertonicWorkerInput)
    })
  }

  const generate: SupertonicClient['generate'] = (options) => generateRequest(options, ignoreChunk)

  const cancelGeneration = () => {
    if (!disposed && pendingRequest !== null && workerFailureState.getFailure() === null) {
      worker.postMessage({type: 'cancel-generation'} satisfies SupertonicWorkerInput)
    }
  }

  const generateStream: SupertonicClient['generateStream'] = (options) =>
    generateSupertonicStream(options, generateRequest)

  const dispose = () => {
    if (disposed) {
      return
    }

    disposed = true
    if (workerFailureState.getFailure() === null) {
      worker.postMessage({type: 'dispose'} satisfies SupertonicWorkerInput)
    }
    initialization.resolveAll(failureResult(createCancelledError('initialize')))
    pendingRequest?.resolve(failureResult(createCancelledError('generate')))
    pendingRequest = null
  }

  return {cancelGeneration, dispose, generate, generateStream, initialize}
}
