/// <reference lib="webworker" />

// oxlint-disable eslint-js/camelcase -- Transformers.js option names are fixed external contracts.

import {
  type AutomaticSpeechRecognitionPipeline,
  pipeline,
  type ProgressInfo,
} from '@huggingface/transformers'

import type {SpeechRecognitionError, SpeechRecognitionPhase} from './errors'
import type {SpeechWorkerRequest, SpeechWorkerResponse} from './messages'
import type {SpeechBackend} from './recognizer'

const MAXIMUM_PROGRESS = 100
const MINIMUM_PROGRESS = 0
const MODEL_ID = 'onnx-community/whisper-tiny'
const workerScope = self as DedicatedWorkerGlobalScope

let transcriber: AutomaticSpeechRecognitionPipeline | null = null
let activeBackend: SpeechBackend | null = null
let preparePromise: Promise<SpeechBackend> | null = null

const sendResponse = (response: SpeechWorkerResponse) => workerScope.postMessage(response)

const getErrorDetail = (error: unknown) =>
  error instanceof Error && error.message.length > 0 ? error.message : '알 수 없는 오류'

const createModelError = (
  error: unknown,
  phase: SpeechRecognitionPhase,
): SpeechRecognitionError => ({
  code: 'model-failed',
  detail: getErrorDetail(error),
  phase,
  retryable: true,
})

const reportProgress = (progress: ProgressInfo) => {
  if (progress.status !== 'progress_total') {
    return
  }

  const percentage = Math.min(
    MAXIMUM_PROGRESS,
    Math.max(MINIMUM_PROGRESS, Math.round(progress.progress)),
  )
  sendResponse({progress: percentage, type: 'loading'})
}

const loadTranscriber = async (backend: SpeechBackend) => {
  const loadedTranscriber = await pipeline('automatic-speech-recognition', MODEL_ID, {
    device: backend,
    progress_callback: reportProgress,
  })
  transcriber = loadedTranscriber
  activeBackend = backend
  return backend
}

const prepareModel = async (preferredBackend: SpeechBackend) => {
  if (transcriber !== null && activeBackend !== null) {
    return activeBackend
  }

  if (preparePromise === null) {
    sendResponse({progress: MINIMUM_PROGRESS, type: 'loading'})
    preparePromise = (async () => {
      if (preferredBackend === 'webgpu') {
        try {
          return await loadTranscriber('webgpu')
        } catch {
          transcriber = null
          activeBackend = null
          sendResponse({backend: 'wasm', type: 'backend-changed'})
        }
      }

      return loadTranscriber('wasm')
    })()
  }

  try {
    return await preparePromise
  } catch (error) {
    preparePromise = null
    throw error
  }
}

const prepare = async (request: Extract<SpeechWorkerRequest, {readonly type: 'prepare'}>) => {
  try {
    const backend = await prepareModel(request.preferredBackend)
    sendResponse({backend, requestId: request.requestId, type: 'ready'})
  } catch (error) {
    sendResponse({
      error: createModelError(error, 'prepare'),
      requestId: request.requestId,
      type: 'error',
    })
  }
}

const transcribe = async (request: Extract<SpeechWorkerRequest, {readonly type: 'transcribe'}>) => {
  let backend: SpeechBackend

  try {
    backend = await prepareModel(request.preferredBackend)
  } catch (error) {
    sendResponse({
      error: createModelError(error, 'transcribe'),
      requestId: request.requestId,
      type: 'error',
    })
    return
  }

  if (transcriber === null) {
    sendResponse({
      error: createModelError(new Error('음성 인식 모델이 준비되지 않았습니다.'), 'transcribe'),
      requestId: request.requestId,
      type: 'error',
    })
    return
  }

  try {
    const result = await transcriber(request.audio, {
      language: request.language,
      task: 'transcribe',
    })
    sendResponse({
      backend,
      requestId: request.requestId,
      text: result.text.trim(),
      type: 'complete',
    })
  } catch (error) {
    sendResponse({
      error: {
        code: 'transcription-failed',
        detail: getErrorDetail(error),
        phase: 'transcribe',
        retryable: true,
      },
      requestId: request.requestId,
      type: 'error',
    })
  }
}

const handleRequest = (request: SpeechWorkerRequest): Promise<void> => {
  switch (request.type) {
    case 'prepare':
      return prepare(request)
    case 'transcribe':
      return transcribe(request)
  }

  request satisfies never
}

workerScope.addEventListener('message', (event: MessageEvent<SpeechWorkerRequest>) => {
  handleRequest(event.data).catch((error: unknown) => {
    sendResponse({
      error: {
        code: 'worker-failed',
        detail: getErrorDetail(error),
        phase: event.data.type === 'prepare' ? 'prepare' : 'transcribe',
        retryable: true,
      },
      requestId: event.data.requestId,
      type: 'error',
    })
  })
})
