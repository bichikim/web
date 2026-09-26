/// <reference lib="webworker" />

// oxlint-disable eslint-js/camelcase -- Transformers.js option names are fixed external contracts.

import {type AutomaticSpeechRecognitionPipeline, pipeline} from '@huggingface/transformers'

import {getErrorMessage} from 'src/utils/get-error-message'
import {createPercentProgressReporter} from '../transformers-progress'

import type {SpeechRecognitionError, SpeechRecognitionPhase} from './errors'
import type {SpeechWorkerRequest, SpeechWorkerResponse} from './messages'
import {getSpeechModel, type SpeechModelDefinition, type SpeechModelId} from './models'
import type {SpeechBackend} from './recognizer'

const MINIMUM_PROGRESS = 0
const workerScope = globalThis.self as DedicatedWorkerGlobalScope

let transcriber: AutomaticSpeechRecognitionPipeline | null = null
let activeBackend: SpeechBackend | null = null
let activeModelId: SpeechModelId | null = null

interface PendingPreparation {
  readonly modelId: SpeechModelId
  readonly promise: Promise<SpeechBackend>
}

let pendingPreparation: PendingPreparation | null = null

const sendResponse = (response: SpeechWorkerResponse) => workerScope.postMessage(response)

const createModelError = (
  error: unknown,
  phase: SpeechRecognitionPhase,
): SpeechRecognitionError => ({
  code: 'model-failed',
  detail: getErrorMessage(error, '알 수 없는 오류'),
  phase,
  retryable: true,
})

const reportProgress = createPercentProgressReporter((progress) =>
  sendResponse({progress, type: 'loading'}),
)

const loadTranscriber = async (backend: SpeechBackend, model: SpeechModelDefinition) => {
  const loadedTranscriber = await pipeline('automatic-speech-recognition', model.repositoryId, {
    device: backend,
    progress_callback: reportProgress,
  })
  transcriber = loadedTranscriber
  activeBackend = backend
  activeModelId = model.id
  return backend
}

const prepareModel = async (preferredBackend: SpeechBackend, modelId: SpeechModelId) => {
  const existingPreparation = pendingPreparation

  if (existingPreparation !== null && existingPreparation.modelId !== modelId) {
    await existingPreparation.promise.catch(() => undefined)

    if (pendingPreparation === existingPreparation) {
      pendingPreparation = null
    }

    return prepareModel(preferredBackend, modelId)
  }

  if (transcriber !== null && activeBackend !== null && activeModelId === modelId) {
    return activeBackend
  }

  if (existingPreparation !== null) {
    return existingPreparation.promise
  }

  const model = getSpeechModel(modelId)
  sendResponse({progress: MINIMUM_PROGRESS, type: 'loading'})
  const currentPreparation = (async () => {
    if (preferredBackend === 'webgpu') {
      try {
        return await loadTranscriber('webgpu', model)
      } catch {
        transcriber = null
        activeBackend = null
        activeModelId = null
        sendResponse({backend: 'wasm', type: 'backend-changed'})
      }
    }

    return loadTranscriber('wasm', model)
  })()
  const nextPreparation = {modelId, promise: currentPreparation}
  pendingPreparation = nextPreparation

  try {
    return await currentPreparation
  } finally {
    if (pendingPreparation === nextPreparation) {
      pendingPreparation = null
    }
  }
}

const prepare = async (request: Extract<SpeechWorkerRequest, {readonly type: 'prepare'}>) => {
  try {
    const backend = await prepareModel(request.preferredBackend, request.modelId)
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
    backend = await prepareModel(request.preferredBackend, request.modelId)
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
    const model = getSpeechModel(request.modelId)
    const result =
      model.family === 'whisper'
        ? await transcriber(request.audio, {
            language: request.language,
            task: 'transcribe',
          })
        : await transcriber(request.audio)
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
        detail: getErrorMessage(error, '알 수 없는 오류'),
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
        detail: getErrorMessage(error, '알 수 없는 오류'),
        phase: event.data.type === 'prepare' ? 'prepare' : 'transcribe',
        retryable: true,
      },
      requestId: event.data.requestId,
      type: 'error',
    })
  })
})
