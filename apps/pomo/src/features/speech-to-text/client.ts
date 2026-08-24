import type {SpeechRecognitionError, SpeechRecognitionPhase} from './errors'
import type {SpeechWorkerRequest, SpeechWorkerResponse} from './messages'
import type {
  CreateSpeechRecognizerOptions,
  SpeechRecognizer,
  SpeechRecognizerReady,
  SpeechTranscript,
} from './recognizer'
import {failureResult, type Result, successResult} from '../result'

interface PendingRequest<Value> {
  readonly requestId: number
  readonly resolve: (result: Result<Value, SpeechRecognitionError>) => void
}

const createCancelledError = (phase: SpeechRecognitionPhase): SpeechRecognitionError => ({
  code: 'cancelled',
  phase,
  retryable: false,
})

const createWorkerError = (
  phase: SpeechRecognitionPhase,
  detail: string,
): SpeechRecognitionError => ({code: 'worker-failed', detail, phase, retryable: true})

interface ObserveSpeechWorkerOptions {
  readonly onFailure: (detail: string) => void
  readonly onResponse: (response: SpeechWorkerResponse) => void
  readonly worker: Worker
}

const observeSpeechWorker = (options: ObserveSpeechWorkerOptions) => {
  options.worker.addEventListener('message', (event: MessageEvent<SpeechWorkerResponse>) => {
    options.onResponse(event.data)
  })
  options.worker.addEventListener('error', (event) => {
    options.onFailure(event.message || 'Worker 실행 오류')
  })
  options.worker.addEventListener('messageerror', () => {
    options.onFailure('Worker 응답을 읽지 못했습니다.')
  })
}

const createRequestId = () => {
  let nextRequestId = 1

  return () => {
    const requestId = nextRequestId
    nextRequestId += 1
    return requestId
  }
}

const createWorkerTerminator = (worker: Worker) => {
  let closed = false

  return () => {
    if (!closed) {
      closed = true
      worker.terminate()
    }
  }
}

const sendRequest = (
  worker: Worker,
  request: SpeechWorkerRequest,
  transfer: Array<Transferable> = [],
) => worker.postMessage(request, transfer)

const sendPrepareRequest = (
  worker: Worker,
  options: CreateSpeechRecognizerOptions,
  requestId: number,
) =>
  sendRequest(worker, {
    modelId: options.modelId,
    preferredBackend: options.preferredBackend,
    requestId,
    type: 'prepare',
  })

/** Creates an isolated speech recognizer and owns its Worker until disposal. */
export const createSpeechRecognizer = (
  options: CreateSpeechRecognizerOptions,
): SpeechRecognizer => {
  const worker = new Worker(new URL('./worker.ts', import.meta.url), {
    name: 'pomo-speech-to-text',
    type: 'module',
  })
  let activeBackend: SpeechRecognizerReady | null = null
  let disposed = false
  const getRequestId = createRequestId()
  let pendingPrepare: PendingRequest<SpeechRecognizerReady> | null = null
  let pendingTranscription: PendingRequest<SpeechTranscript> | null = null
  let preparePromise: Promise<Result<SpeechRecognizerReady, SpeechRecognitionError>> | null = null
  let workerFailure: string | null = null
  const terminateWorker = createWorkerTerminator(worker)

  const resolveWorkerFailure = (detail: string) => {
    if (workerFailure !== null) {
      return
    }

    workerFailure = detail
    pendingPrepare?.resolve(failureResult(createWorkerError('prepare', detail)))
    pendingTranscription?.resolve(failureResult(createWorkerError('transcribe', detail)))
    pendingPrepare = null
    pendingTranscription = null
    preparePromise = null
    terminateWorker()
  }

  const handleError = (response: Extract<SpeechWorkerResponse, {readonly type: 'error'}>) => {
    if (pendingPrepare?.requestId === response.requestId) {
      pendingPrepare.resolve(failureResult(response.error))
      pendingPrepare = null
      preparePromise = null
      return
    }

    if (pendingTranscription?.requestId === response.requestId) {
      pendingTranscription.resolve(failureResult(response.error))
      pendingTranscription = null
    }
  }

  const handleResponse = (response: SpeechWorkerResponse) => {
    if (disposed) {
      return
    }

    switch (response.type) {
      case 'backend-changed':
        options.onBackendChange(response.backend)
        return
      case 'complete':
        if (pendingTranscription?.requestId === response.requestId) {
          activeBackend = {backend: response.backend}
          options.onBackendChange(response.backend)
          pendingTranscription.resolve(
            successResult({backend: response.backend, text: response.text}),
          )
          pendingTranscription = null
        }
        return
      case 'error':
        handleError(response)
        return
      case 'loading':
        options.onProgress(response.progress)
        return
      case 'ready':
        if (pendingPrepare?.requestId === response.requestId) {
          activeBackend = {backend: response.backend}
          options.onBackendChange(response.backend)
          pendingPrepare.resolve(successResult(activeBackend))
          pendingPrepare = null
          preparePromise = null
        }
        return
    }

    response satisfies never
  }

  observeSpeechWorker({onFailure: resolveWorkerFailure, onResponse: handleResponse, worker})

  const getUnavailableResult = <Value>(
    phase: SpeechRecognitionPhase,
  ): Result<Value, SpeechRecognitionError> | null => {
    if (disposed) {
      return failureResult(createCancelledError(phase))
    }

    if (workerFailure !== null) {
      return failureResult(createWorkerError(phase, workerFailure))
    }

    return null
  }

  const prepare: SpeechRecognizer['prepare'] = () => {
    const unavailable = getUnavailableResult<SpeechRecognizerReady>('prepare')

    if (unavailable !== null) {
      return Promise.resolve(unavailable)
    }

    if (activeBackend !== null) {
      return Promise.resolve(successResult(activeBackend))
    }

    if (preparePromise !== null) {
      return preparePromise
    }

    const requestId = getRequestId()

    preparePromise = new Promise((resolve) => {
      pendingPrepare = {requestId, resolve}
      sendPrepareRequest(worker, options, requestId)
    })
    return preparePromise
  }

  const transcribe: SpeechRecognizer['transcribe'] = (transcriptionOptions) => {
    const unavailable = getUnavailableResult<SpeechTranscript>('transcribe')

    if (unavailable !== null) {
      return Promise.resolve(unavailable)
    }

    if (pendingTranscription !== null) {
      return Promise.resolve(failureResult({code: 'busy', phase: 'transcribe', retryable: true}))
    }

    const requestId = getRequestId()
    const transferableAudio = transcriptionOptions.audio.slice()

    return new Promise((resolve) => {
      pendingTranscription = {requestId, resolve}
      sendRequest(
        worker,
        {
          audio: transferableAudio,
          language: transcriptionOptions.language,
          modelId: options.modelId,
          preferredBackend: options.preferredBackend,
          requestId,
          type: 'transcribe',
        },
        [transferableAudio.buffer],
      )
    })
  }

  const dispose = () => {
    if (disposed) {
      return
    }

    disposed = true
    pendingPrepare?.resolve(failureResult(createCancelledError('prepare')))
    pendingTranscription?.resolve(failureResult(createCancelledError('transcribe')))
    pendingPrepare = null
    pendingTranscription = null
    preparePromise = null
    terminateWorker()
  }

  return {dispose, prepare, transcribe}
}
