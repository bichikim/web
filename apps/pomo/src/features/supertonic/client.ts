// oxlint-disable no-await-in-loop, no-loop-func, no-unmodified-loop-condition -- Stream consumers intentionally wait for each Worker chunk notification.
import type {CancelledError, SupertonicError, WorkerFailedError} from './errors'
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
import {failureResult, type Result, successResult} from './result'

export interface InitializeSupertonicOptions {
  readonly modelId: SupertonicModelId
  readonly onProgress: (progress: SupertonicProgress) => void
  readonly onStatus: (message: string) => void
}

export interface GenerateSupertonicOptions {
  readonly speed?: number
  readonly text: string
  readonly voice: SupertonicVoiceSource
}

interface PendingRequest {
  readonly onChunk: (audio: SupertonicAudioChunk) => void
  readonly resolve: (result: Result<SupertonicAudio, SupertonicError>) => void
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
const ignoreChunk = () => undefined
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

/** Creates an isolated Supertonic Worker client and owns it until disposal. */
export const createSupertonicClient = (): SupertonicClient => {
  const worker = new Worker(new URL('./worker.ts', import.meta.url), {type: 'module'})
  let initializeResolve: ((result: Result<void, SupertonicError>) => void) | null = null
  let nextRequestId = 1
  let onProgress: ((progress: SupertonicProgress) => void) | null = null
  let onStatus: ((message: string) => void) | null = null
  let pendingRequest: PendingRequest | null = null

  const resolveFailures = (error: WorkerFailedError) => {
    initializeResolve?.(failureResult(error))
    pendingRequest?.resolve(
      failureResult({...error, phase: 'generate'} satisfies WorkerFailedError),
    )
    initializeResolve = null
    pendingRequest = null
  }

  const handleMessage = (message: SupertonicWorkerOutput) => {
    switch (message.type) {
      case 'chunk':
        pendingRequest?.onChunk(getAudioChunk(message))
        return
      case 'disposed':
        worker.terminate()
        return
      case 'error':
        if (message.requestId === null) {
          initializeResolve?.(failureResult(message.error))
          initializeResolve = null
        } else {
          pendingRequest?.resolve(failureResult(message.error))
          pendingRequest = null
        }
        return
      case 'progress':
        onProgress?.(message.progress)
        return
      case 'ready':
        initializeResolve?.(successResult(undefined))
        initializeResolve = null
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
        onStatus?.(message.message)
        return
    }

    message satisfies never
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
      worker.postMessage({modelId, type: 'initialize'} satisfies SupertonicWorkerInput)
    })
  }

  const generateRequest = (
    options: GenerateSupertonicOptions,
    onChunk: (audio: SupertonicAudioChunk) => void,
  ): Promise<Result<SupertonicAudio, SupertonicError>> => {
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
        requestId,
        speed: options.speed ?? DEFAULT_SPEECH_SPEED,
        text: options.text,
        type: 'generate',
        voice: options.voice,
      } satisfies SupertonicWorkerInput)
    })
  }

  const generate: SupertonicClient['generate'] = (options) => generateRequest(options, ignoreChunk)

  const cancelGeneration = () => {
    if (pendingRequest !== null) {
      worker.postMessage({type: 'cancel-generation'} satisfies SupertonicWorkerInput)
    }
  }

  async function* generateStream(
    options: GenerateSupertonicOptions,
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
      const chunk = chunks.shift()

      if (chunk !== undefined) {
        yield successResult({audio: chunk, type: 'chunk'})
      } else if (!isComplete) {
        await new Promise<void>((resolve) => {
          wakeConsumer = resolve
        })
      }
    }

    const result = await generation
    yield result.ok
      ? successResult({audio: result.value, type: 'complete'})
      : failureResult(result.error)
  }

  const dispose = () => {
    worker.postMessage({type: 'dispose'} satisfies SupertonicWorkerInput)
    initializeResolve?.(failureResult(createCancelledError('initialize')))
    pendingRequest?.resolve(failureResult(createCancelledError('generate')))
    initializeResolve = null
    pendingRequest = null
  }

  return {cancelGeneration, dispose, generate, generateStream, initialize}
}
