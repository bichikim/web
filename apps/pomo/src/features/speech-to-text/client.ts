import type {SpeechRecognitionError, SpeechRecognitionPhase} from './errors'
import type {SpeechWorkerRequest, SpeechWorkerResponse} from './messages'
import type {
  CreateSpeechRecognizerOptions,
  SpeechRecognizer,
  SpeechRecognizerReady,
  SpeechTranscript,
} from './recognizer'
import {speechFailure, type SpeechResult, speechSuccess} from './result'
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
): SpeechResult<Value, SpeechRecognitionError> =>
  failure.code === 'disposed'
    ? speechFailure(createCancelledError(phase))
    : speechFailure(createWorkerError(phase, failure.detail))

const getUnexpectedResponse = <Value>(
  phase: SpeechRecognitionPhase,
): SpeechResult<Value, SpeechRecognitionError> =>
  speechFailure(createWorkerError(phase, 'Worker가 예상하지 않은 응답을 반환했습니다.'))

const getUnknownFailureResult = <Value>(
  error: unknown,
  phase: SpeechRecognitionPhase,
): SpeechResult<Value, SpeechRecognitionError> =>
  isWorkerRpcFailure(error)
    ? getFailureResult(error, phase)
    : speechFailure(createWorkerError(phase, 'Worker 요청을 완료하지 못했습니다.'))

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
  let preparePromise: Promise<SpeechResult<SpeechRecognizerReady, SpeechRecognitionError>> | null =
    null
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
    worker,
  })

  const resolvePrepareResponse = (
    response: SpeechWorkerResponse,
  ): SpeechResult<SpeechRecognizerReady, SpeechRecognitionError> => {
    switch (response.type) {
      case 'error':
        return speechFailure(response.error)
      case 'ready':
        activeBackend = {backend: response.backend}
        options.onBackendChange(response.backend)
        return speechSuccess(activeBackend)
      case 'backend-changed':
      case 'complete':
      case 'loading':
        return getUnexpectedResponse('prepare')
    }

    response satisfies never
  }

  const executePrepare = async (): Promise<
    SpeechResult<SpeechRecognizerReady, SpeechRecognitionError>
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
  ): SpeechResult<Value, SpeechRecognitionError> | null => {
    if (disposed) {
      return speechFailure(createCancelledError(phase))
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
      return Promise.resolve(speechSuccess(activeBackend))
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
      return speechFailure({code: 'busy', phase: 'transcribe', retryable: true})
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
          return speechSuccess({backend: response.backend, text: response.text})
        case 'error':
          return speechFailure(response.error)
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
