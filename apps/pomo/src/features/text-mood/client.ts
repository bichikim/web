import type {TextMoodAnalysis, TextSufficiencyAnalysis} from './analysis'
import type {TextMoodError, TextMoodPhase} from './errors'
import type {TextMoodWorkerRequest, TextMoodWorkerResponse} from './messages'
import {TEXT_MOOD_MODEL} from './model'
import {reportClientError} from '../client-error-reporter'
import {failureResult, type Result, successResult} from '../result'

export interface AnalyzeTextMoodOptions {
  readonly context?: string
  readonly text: string
}

export interface TextMoodAnalyzerReady {
  readonly repositoryId: string
}

export interface TextMoodAnalyzerCompleteResult {
  readonly analysis: TextMoodAnalysis
  readonly elapsedMilliseconds: number
  readonly status: 'complete'
}

export interface TextMoodAnalyzerInsufficientResult {
  readonly elapsedMilliseconds: number
  readonly status: 'insufficient'
  readonly sufficiency: TextSufficiencyAnalysis
}

export type TextMoodAnalyzerResult =
  | TextMoodAnalyzerCompleteResult
  | TextMoodAnalyzerInsufficientResult

export interface CreateTextMoodAnalyzerOptions {
  readonly onProgress?: (progress: number) => void
}

export interface TextMoodAnalyzer {
  readonly analyze: (
    options: AnalyzeTextMoodOptions,
  ) => Promise<Result<TextMoodAnalyzerResult, TextMoodError>>
  readonly dispose: () => void
  readonly prepare: () => Promise<Result<TextMoodAnalyzerReady, TextMoodError>>
}

interface PendingRequest<Value> {
  readonly requestId: number
  readonly resolve: (result: Result<Value, TextMoodError>) => void
}

const createRequestId = () => {
  let nextRequestId = 1

  return () => {
    const requestId = nextRequestId
    nextRequestId += 1
    return requestId
  }
}

const createCancelledError = (phase: TextMoodPhase): TextMoodError => ({
  code: 'cancelled',
  phase,
  retryable: false,
})

const createWorkerError = (phase: TextMoodPhase, detail: string): TextMoodError => ({
  code: 'worker-failed',
  detail,
  phase,
  retryable: true,
})

interface ObserveTextMoodWorkerOptions {
  readonly onFailure: (detail: string) => void
  readonly worker: Worker
}

const observeTextMoodWorker = (options: ObserveTextMoodWorkerOptions) => {
  options.worker.addEventListener('error', (event) => {
    reportClientError(event.error ?? {message: 'Worker execution failed', name: 'WorkerError'}, {
      feature: 'text-mood-model',
      source: 'worker',
    })
    options.onFailure(event.message || '분위기 분석 Worker 실행 오류')
  })
  options.worker.addEventListener('messageerror', () => {
    reportClientError(
      {message: 'Worker response deserialization failed', name: 'WorkerError'},
      {
        feature: 'text-mood-model',
        source: 'worker',
      },
    )
    options.onFailure('분위기 분석 Worker 응답을 읽지 못했습니다.')
  })
}

/** Owns one embedding Worker and resolves feature requests by request id. */
export const createTextMoodAnalyzer = (
  options: CreateTextMoodAnalyzerOptions = {},
): TextMoodAnalyzer => {
  const worker = new Worker(new URL('./worker.ts', import.meta.url), {
    name: 'pomo-text-mood',
    type: 'module',
  })
  const getRequestId = createRequestId()
  let disposed = false
  let terminated = false
  let workerFailure: string | null = null
  let pendingAnalyze: PendingRequest<TextMoodAnalyzerResult> | null = null
  let pendingPrepare: PendingRequest<TextMoodAnalyzerReady> | null = null

  const terminateWorker = () => {
    if (!terminated) {
      terminated = true
      worker.terminate()
    }
  }

  const failPending = (detail: string) => {
    workerFailure ??= detail
    pendingAnalyze?.resolve(failureResult(createWorkerError('analyze', detail)))
    pendingPrepare?.resolve(failureResult(createWorkerError('prepare', detail)))
    pendingAnalyze = null
    pendingPrepare = null
  }

  const handleError = (response: Extract<TextMoodWorkerResponse, {readonly type: 'error'}>) => {
    if (pendingAnalyze?.requestId === response.requestId) {
      pendingAnalyze.resolve(failureResult(response.error))
      pendingAnalyze = null
      return
    }

    if (pendingPrepare?.requestId === response.requestId) {
      reportClientError(response.error, {feature: 'text-mood-model', source: 'worker'})
      pendingPrepare.resolve(failureResult(response.error))
      pendingPrepare = null
    }
  }

  worker.addEventListener('message', (event: MessageEvent<TextMoodWorkerResponse>) => {
    const response = event.data

    switch (response.type) {
      case 'complete':
        if (pendingAnalyze?.requestId === response.requestId) {
          pendingAnalyze.resolve(
            successResult({
              analysis: response.analysis,
              elapsedMilliseconds: response.elapsedMilliseconds,
              status: 'complete',
            }),
          )
          pendingAnalyze = null
        }
        return
      case 'insufficient':
        if (pendingAnalyze?.requestId === response.requestId) {
          pendingAnalyze.resolve(
            successResult({
              elapsedMilliseconds: response.elapsedMilliseconds,
              status: 'insufficient',
              sufficiency: response.sufficiency,
            }),
          )
          pendingAnalyze = null
        }
        return
      case 'error':
        handleError(response)
        return
      case 'loading':
        options.onProgress?.(response.progress)
        return
      case 'ready':
        if (pendingPrepare?.requestId === response.requestId) {
          pendingPrepare.resolve(successResult({repositoryId: TEXT_MOOD_MODEL.repositoryId}))
          pendingPrepare = null
        }
    }
  })
  observeTextMoodWorker({
    onFailure: (detail) => {
      failPending(detail)
      terminateWorker()
    },
    worker,
  })

  const sendRequest = (request: TextMoodWorkerRequest) => worker.postMessage(request)

  const prepare: TextMoodAnalyzer['prepare'] = () => {
    if (disposed) {
      return Promise.resolve(failureResult(createCancelledError('prepare')))
    }

    if (workerFailure !== null) {
      return Promise.resolve(failureResult(createWorkerError('prepare', workerFailure)))
    }

    if (pendingPrepare !== null) {
      return Promise.resolve(
        failureResult({
          code: 'model-failed',
          detail: '모델을 이미 준비하고 있어요.',
          phase: 'prepare',
          retryable: true,
        }),
      )
    }

    const requestId = getRequestId()
    return new Promise((resolve) => {
      pendingPrepare = {requestId, resolve}
      sendRequest({requestId, type: 'prepare'})
    })
  }

  const analyze: TextMoodAnalyzer['analyze'] = (requestOptions) => {
    if (disposed) {
      return Promise.resolve(failureResult(createCancelledError('analyze')))
    }

    if (workerFailure !== null) {
      return Promise.resolve(failureResult(createWorkerError('analyze', workerFailure)))
    }

    if (pendingAnalyze !== null) {
      return Promise.resolve(
        failureResult({
          code: 'classification-failed',
          detail: '다른 문장을 분석하고 있어요.',
          phase: 'analyze',
          retryable: true,
        }),
      )
    }

    const requestId = getRequestId()
    return new Promise((resolve) => {
      pendingAnalyze = {requestId, resolve}
      sendRequest({...requestOptions, requestId, type: 'analyze'})
    })
  }

  const dispose = () => {
    if (disposed) {
      return
    }

    disposed = true
    pendingAnalyze?.resolve(failureResult(createCancelledError('analyze')))
    pendingPrepare?.resolve(failureResult(createCancelledError('prepare')))
    pendingAnalyze = null
    pendingPrepare = null
    terminateWorker()
  }

  return {analyze, dispose, prepare}
}
