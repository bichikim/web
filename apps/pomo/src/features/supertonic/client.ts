import type {SupertonicError, WorkerFailedError} from './errors'
import type {
  SupertonicAudio,
  SupertonicProgress,
  SupertonicWorkerInput,
  SupertonicWorkerOutput,
} from './messages'
import type {SupertonicModelId, SupertonicVoiceId} from './model'
import {failureResult, type Result, successResult} from './result'

export interface InitializeSupertonicOptions {
  readonly modelId: SupertonicModelId
  readonly onProgress: (progress: SupertonicProgress) => void
  readonly onStatus: (message: string) => void
}

export interface GenerateSupertonicOptions {
  readonly speed?: number
  readonly text: string
  readonly voiceId: SupertonicVoiceId
}

interface PendingRequest {
  readonly resolve: (result: Result<SupertonicAudio, SupertonicError>) => void
}

export interface SupertonicClient {
  readonly dispose: () => void
  readonly generate: (
    options: GenerateSupertonicOptions,
  ) => Promise<Result<SupertonicAudio, SupertonicError>>
  readonly initialize: (
    options: InitializeSupertonicOptions,
  ) => Promise<Result<void, SupertonicError>>
}

const DEFAULT_SPEECH_SPEED = 1.05

/** Creates an isolated Supertonic Worker client and owns it until disposal. */
export const createSupertonicClient = (): SupertonicClient => {
  const worker = new Worker(new URL('./worker.ts', import.meta.url), {type: 'module'})
  let initializeResolve: ((result: Result<void, SupertonicError>) => void) | null = null
  let nextRequestId = 1
  let onProgress: ((progress: SupertonicProgress) => void) | null = null
  let onStatus: ((message: string) => void) | null = null
  let pendingRequest: PendingRequest | null = null

  const postMessage = (message: SupertonicWorkerInput) => {
    worker.postMessage(message)
  }

  const resolveFailures = (error: WorkerFailedError) => {
    initializeResolve?.(failureResult(error))
    pendingRequest?.resolve(
      failureResult({...error, phase: 'generate'} satisfies WorkerFailedError),
    )
    initializeResolve = null
    pendingRequest = null
  }

  const handleMessage = (message: SupertonicWorkerOutput) => {
    if (message.type === 'progress') {
      onProgress?.(message.progress)
    } else if (message.type === 'status') {
      onStatus?.(message.message)
    } else if (message.type === 'ready') {
      initializeResolve?.(successResult(undefined))
      initializeResolve = null
    } else if (message.type === 'result') {
      pendingRequest?.resolve(
        successResult({
          generationTime: message.generationTime,
          sampleRate: message.sampleRate,
          samples: message.samples,
        }),
      )
      pendingRequest = null
    } else if (message.type === 'error') {
      if (message.requestId === null) {
        initializeResolve?.(failureResult(message.error))
        initializeResolve = null
      } else {
        pendingRequest?.resolve(failureResult(message.error))
        pendingRequest = null
      }
    } else {
      worker.terminate()
    }
  }

  worker.addEventListener('message', (event: MessageEvent<SupertonicWorkerOutput>) => {
    handleMessage(event.data)
  })
  worker.addEventListener('error', (event) => {
    resolveFailures({
      code: 'worker-failed',
      detail: event.message || 'Worker 실행 오류',
      phase: 'initialize',
      retryable: true,
    })
  })

  const initialize: SupertonicClient['initialize'] = (options) => {
    const {modelId, onProgress: progressCallback, onStatus: statusCallback} = options
    onProgress = progressCallback
    onStatus = statusCallback

    return new Promise((resolve) => {
      initializeResolve = resolve
      postMessage({modelId, type: 'initialize'})
    })
  }

  const generate: SupertonicClient['generate'] = (options) => {
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
      pendingRequest = {resolve}
      postMessage({
        requestId,
        speed: options.speed ?? DEFAULT_SPEECH_SPEED,
        text: options.text,
        type: 'generate',
        voiceId: options.voiceId,
      })
    })
  }

  const dispose = () => {
    postMessage({type: 'dispose'})
    initializeResolve?.(failureResult({code: 'cancelled', phase: 'initialize', retryable: false}))
    pendingRequest?.resolve(failureResult({code: 'cancelled', phase: 'generate', retryable: false}))
    initializeResolve = null
    pendingRequest = null
  }

  return {dispose, generate, initialize}
}
