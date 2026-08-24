import type {SpeechRecognitionError, SpeechRecognitionPhase} from './errors'
import type {SpeechWorkerRequest, SpeechWorkerResponse} from './messages'
import type {
  CreateSpeechRecognizerOptions,
  SpeechRecognizer,
  SpeechRecognizerReady,
  SpeechTranscript,
} from './recognizer'
import {reportClientError} from '../client-error-reporter'
import {failureResult, type Result, successResult} from '../result'
import {createWorkerRpcTransport, isWorkerRpcFailure, type WorkerRpcFailure} from '../worker-rpc'

const createCancelledError = (phase: SpeechRecognitionPhase): SpeechRecognitionError => ({
  code: 'cancelled',
  phase,
  retryable: false,
})

const createWorkerError = (
  phase: SpeechRecognitionPhase,
  detail: string,
): SpeechRecognitionError => ({code: 'worker-failed', detail, phase, retryable: true})

const getRequestId = (response: SpeechWorkerResponse) => {
  switch (response.type) {
    case 'backend-changed':
    case 'loading':
      return null
    case 'complete':
    case 'error':
    case 'ready':
      return response.requestId
  }

  response satisfies never
}

const getFailureResult = <Value>(
  failure: WorkerRpcFailure,
  phase: SpeechRecognitionPhase,
): Result<Value, SpeechRecognitionError> =>
  failure.code === 'disposed'
    ? failureResult(createCancelledError(phase))
    : failureResult(createWorkerError(phase, failure.detail))

const getUnexpectedResponse = <Value>(
  phase: SpeechRecognitionPhase,
): Result<Value, SpeechRecognitionError> =>
  failureResult(createWorkerError(phase, 'Worker가 예상하지 않은 응답을 반환했습니다.'))

const reportSpeechWorkerFailure = (failure: WorkerRpcFailure) => {
  if (failure.code !== 'disposed') {
    reportClientError(failure, {feature: 'speech-to-text-model', source: 'worker'})
  }
}

const getUnknownFailureResult = <Value>(
  error: unknown,
  phase: SpeechRecognitionPhase,
): Result<Value, SpeechRecognitionError> => {
  if (isWorkerRpcFailure(error)) {
    reportSpeechWorkerFailure(error)
    return getFailureResult(error, phase)
  }

  return failureResult(createWorkerError(phase, 'Worker 요청을 완료하지 못했습니다.'))
}

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
  let preparePromise: Promise<Result<SpeechRecognizerReady, SpeechRecognitionError>> | null = null
  let transcriptionPending = false
  const transport = createWorkerRpcTransport<SpeechWorkerRequest, SpeechWorkerResponse>({
    getRequestId,
    onEvent: (response) => {
      if (disposed) {
        return
      }

      switch (response.type) {
        case 'backend-changed':
          options.onBackendChange(response.backend)
          return
        case 'loading':
          options.onProgress(response.progress)
          return
        case 'complete':
        case 'error':
        case 'ready':
          return
      }

      response satisfies never
    },
    onFailure: reportSpeechWorkerFailure,
    worker,
  })

  const resolvePrepareResponse = (
    response: SpeechWorkerResponse,
  ): Result<SpeechRecognizerReady, SpeechRecognitionError> => {
    switch (response.type) {
      case 'error':
        reportClientError(response.error, {feature: 'speech-to-text-model', source: 'worker'})
        return failureResult(response.error)
      case 'ready':
        activeBackend = {backend: response.backend}
        options.onBackendChange(response.backend)
        return successResult(activeBackend)
      case 'backend-changed':
      case 'complete':
      case 'loading':
        return getUnexpectedResponse('prepare')
    }

    response satisfies never
  }

  const executePrepare = async (): Promise<
    Result<SpeechRecognizerReady, SpeechRecognitionError>
  > => {
    try {
      const response = await transport.request({
        createRequest: (requestId) => ({
          modelId: options.modelId,
          preferredBackend: options.preferredBackend,
          requestId,
          type: 'prepare',
        }),
      })
      return resolvePrepareResponse(response)
    } catch (error) {
      return getUnknownFailureResult(error, 'prepare')
    } finally {
      preparePromise = null
    }
  }

  const getUnavailableResult = <Value>(
    phase: SpeechRecognitionPhase,
  ): Result<Value, SpeechRecognitionError> | null => {
    if (disposed) {
      return failureResult(createCancelledError(phase))
    }

    const failure = transport.getFailure()

    if (failure !== null) {
      return getFailureResult(failure, phase)
    }

    return null
  }

  const prepare: SpeechRecognizer['prepare'] = () => {
    const unavailableResult = getUnavailableResult<SpeechRecognizerReady>('prepare')

    if (unavailableResult !== null) {
      return Promise.resolve(unavailableResult)
    }

    if (activeBackend !== null) {
      return Promise.resolve(successResult(activeBackend))
    }

    if (preparePromise !== null) {
      return preparePromise
    }

    const currentPreparation = executePrepare()
    preparePromise = currentPreparation
    return currentPreparation
  }

  const transcribe: SpeechRecognizer['transcribe'] = async (transcriptionOptions) => {
    const unavailableResult = getUnavailableResult<SpeechTranscript>('transcribe')

    if (unavailableResult !== null) {
      return unavailableResult
    }

    if (transcriptionPending) {
      return failureResult({code: 'busy', phase: 'transcribe', retryable: true})
    }

    const transferableAudio = transcriptionOptions.audio.slice()
    transcriptionPending = true

    try {
      const response = await transport.request({
        createRequest: (requestId) => ({
          audio: transferableAudio,
          language: transcriptionOptions.language,
          modelId: options.modelId,
          preferredBackend: options.preferredBackend,
          requestId,
          type: 'transcribe',
        }),
        transfer: [transferableAudio.buffer],
      })

      switch (response.type) {
        case 'complete':
          activeBackend = {backend: response.backend}
          options.onBackendChange(response.backend)
          return successResult({backend: response.backend, text: response.text})
        case 'error':
          return failureResult(response.error)
        case 'backend-changed':
        case 'loading':
        case 'ready':
          return getUnexpectedResponse('transcribe')
      }

      response satisfies never
    } catch (error) {
      return getUnknownFailureResult(error, 'transcribe')
    } finally {
      transcriptionPending = false
    }
  }

  const dispose = () => {
    if (disposed) {
      return
    }

    disposed = true
    transport.dispose()
  }

  return {dispose, prepare, transcribe}
}
