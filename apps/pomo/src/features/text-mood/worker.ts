/// <reference lib="webworker" />

// oxlint-disable eslint-js/camelcase -- Transformers.js option names are fixed external contracts.

import {
  type FeatureExtractionPipeline,
  pipeline,
  type ProgressInfo,
} from '@huggingface/transformers'

import {classifyTextMood, classifyTextSufficiency} from './classifier'
import type {TextMoodError, TextMoodPhase} from './errors'
import type {TextMoodWorkerRequest, TextMoodWorkerResponse} from './messages'
import {TEXT_MOOD_MODEL} from './model'

const MAXIMUM_PROGRESS = 100
const MINIMUM_PROGRESS = 0
const workerScope = self as DedicatedWorkerGlobalScope

let extractor: FeatureExtractionPipeline | null = null
let preparePromise: Promise<void> | null = null

const sendResponse = (response: TextMoodWorkerResponse) => workerScope.postMessage(response)

const getErrorDetail = (error: unknown) =>
  error instanceof Error && error.message.length > 0 ? error.message : '알 수 없는 오류'

const createError = (
  error: unknown,
  code: TextMoodError['code'],
  phase: TextMoodPhase,
): TextMoodError => ({
  code,
  detail: getErrorDetail(error),
  phase,
  retryable: code !== 'invalid-input',
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

const prepareModel = async () => {
  if (extractor !== null) {
    return
  }

  if (preparePromise === null) {
    sendResponse({progress: MINIMUM_PROGRESS, type: 'loading'})
    preparePromise = pipeline('feature-extraction', TEXT_MOOD_MODEL.repositoryId, {
      device: 'wasm',
      dtype: TEXT_MOOD_MODEL.dtype,
      progress_callback: reportProgress,
      revision: TEXT_MOOD_MODEL.revision,
    }).then((loadedExtractor) => {
      extractor = loadedExtractor
    })
  }

  try {
    await preparePromise
  } catch (error) {
    preparePromise = null
    throw error
  }
}

const prepare = async (request: Extract<TextMoodWorkerRequest, {readonly type: 'prepare'}>) => {
  try {
    await prepareModel()
    sendResponse({requestId: request.requestId, type: 'ready'})
  } catch (error) {
    sendResponse({
      error: createError(error, 'model-failed', 'prepare'),
      requestId: request.requestId,
      type: 'error',
    })
  }
}

const getEmbeddingText = (request: Extract<TextMoodWorkerRequest, {readonly type: 'analyze'}>) => {
  const text = request.text.trim()

  if (request.context === undefined || request.context.trim().length === 0) {
    return text
  }

  return `이전 대화: ${request.context.trim()}\n현재 문장: ${text}`
}

const analyze = async (request: Extract<TextMoodWorkerRequest, {readonly type: 'analyze'}>) => {
  const text = request.text.trim()

  if (text.length === 0) {
    sendResponse({
      error: {code: 'invalid-input', phase: 'analyze', retryable: false},
      requestId: request.requestId,
      type: 'error',
    })
    return
  }

  try {
    await prepareModel()
  } catch (error) {
    sendResponse({
      error: createError(error, 'model-failed', 'analyze'),
      requestId: request.requestId,
      type: 'error',
    })
    return
  }

  if (extractor === null) {
    sendResponse({
      error: createError(
        new Error('분위기 분석 모델이 준비되지 않았습니다.'),
        'model-failed',
        'analyze',
      ),
      requestId: request.requestId,
      type: 'error',
    })
    return
  }

  const startedAt = performance.now()

  try {
    const output = await extractor(getEmbeddingText(request), {
      normalize: true,
      pooling: TEXT_MOOD_MODEL.pooling,
    })
    const embedding = Array.from(output.data, Number)
    const sufficiency = classifyTextSufficiency(embedding)

    if (sufficiency.insufficient) {
      sendResponse({
        elapsedMilliseconds: performance.now() - startedAt,
        requestId: request.requestId,
        sufficiency,
        type: 'insufficient',
      })
      return
    }

    const analysis = classifyTextMood(embedding)
    sendResponse({
      analysis,
      elapsedMilliseconds: performance.now() - startedAt,
      requestId: request.requestId,
      type: 'complete',
    })
  } catch (error) {
    sendResponse({
      error: createError(error, 'classification-failed', 'analyze'),
      requestId: request.requestId,
      type: 'error',
    })
  }
}

const handleRequest = (request: TextMoodWorkerRequest): Promise<void> => {
  switch (request.type) {
    case 'analyze':
      return analyze(request)
    case 'prepare':
      return prepare(request)
  }

  request satisfies never
}

workerScope.addEventListener('message', (event: MessageEvent<TextMoodWorkerRequest>) => {
  handleRequest(event.data).catch((error: unknown) => {
    sendResponse({
      error: createError(
        error,
        'worker-failed',
        event.data.type === 'prepare' ? 'prepare' : 'analyze',
      ),
      requestId: event.data.requestId,
      type: 'error',
    })
  })
})
