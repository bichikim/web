import {createWorkerRpcTransport, isWorkerRpcFailure} from '../worker-rpc'
import type {TextMoodAnalysis, TextSufficiencyAnalysis} from './analysis'
import type {TextMoodError, TextMoodPhase} from './errors'
import type {TextMoodWorkerRequest, TextMoodWorkerResponse} from './messages'
import {TEXT_MOOD_MODEL} from './model'
import {reportClientError} from '../client-error-reporter'
import {failureResult, type Result, successResult} from 'src/features/result'

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

/** Owns one embedding Worker and resolves feature requests through the shared RPC transport. */
export const createTextMoodAnalyzer = (
  options: CreateTextMoodAnalyzerOptions = {},
): TextMoodAnalyzer => {
  const worker = new Worker(new URL('./worker.ts', import.meta.url), {
    name: 'pomo-text-mood',
    type: 'module',
  })
  let disposed = false
  let preparing = false
  let analyzing = false
  const transport = createWorkerRpcTransport<TextMoodWorkerRequest, TextMoodWorkerResponse>({
    getRequestId: (response) => (response.type === 'loading' ? null : response.requestId),
    messageFailureMessage: '분위기 분석 Worker 응답을 읽지 못했습니다.',
    onEvent: (response) => options.onProgress?.(response.progress),
    onFailure: (failure) => {
      if (failure.code !== 'disposed') {
        reportClientError(failure.cause ?? failure, {feature: 'text-mood-model', source: 'worker'})
      }
    },
    worker,
    workerFailureMessage: '분위기 분석 Worker 실행 오류',
  })

  const getFailure = (phase: TextMoodPhase): TextMoodError | null => {
    if (disposed) {
      return createCancelledError(phase)
    }
    const failure = transport.getFailure()
    return failure === null ? null : createWorkerError(phase, failure.detail)
  }
  const mapFailure = (error: unknown, phase: TextMoodPhase): TextMoodError =>
    isWorkerRpcFailure(error) && error.code === 'disposed'
      ? createCancelledError(phase)
      : createWorkerError(
          phase,
          isWorkerRpcFailure(error) ? error.detail : 'Worker 요청을 완료하지 못했습니다.',
        )

  const prepare: TextMoodAnalyzer['prepare'] = async () => {
    const unavailable = getFailure('prepare')
    if (unavailable !== null) {
      return failureResult(unavailable)
    }
    if (preparing) {
      return failureResult({
        code: 'model-failed',
        detail: '모델을 이미 준비하고 있어요.',
        phase: 'prepare',
        retryable: true,
      })
    }
    preparing = true
    try {
      const response = await transport.request({
        createRequest: (requestId) => ({requestId, type: 'prepare'}),
      })
      switch (response.type) {
        case 'ready':
          return successResult({repositoryId: TEXT_MOOD_MODEL.repositoryId})
        case 'error':
          reportClientError(response.error, {feature: 'text-mood-model', source: 'worker'})
          return failureResult(response.error)
        case 'complete':
        case 'insufficient':
          return failureResult(
            createWorkerError('prepare', 'Worker가 예상하지 않은 응답을 반환했습니다.'),
          )
      }
    } catch (error: unknown) {
      return failureResult(mapFailure(error, 'prepare'))
    } finally {
      preparing = false
    }
  }

  const analyze: TextMoodAnalyzer['analyze'] = async (requestOptions) => {
    const unavailable = getFailure('analyze')
    if (unavailable !== null) {
      return failureResult(unavailable)
    }
    if (analyzing) {
      return failureResult({
        code: 'classification-failed',
        detail: '다른 문장을 분석하고 있어요.',
        phase: 'analyze',
        retryable: true,
      })
    }
    analyzing = true
    try {
      const response = await transport.request({
        createRequest: (requestId) => ({...requestOptions, requestId, type: 'analyze'}),
      })
      switch (response.type) {
        case 'complete':
          return successResult({
            analysis: response.analysis,
            elapsedMilliseconds: response.elapsedMilliseconds,
            status: 'complete',
          })
        case 'insufficient':
          return successResult({
            elapsedMilliseconds: response.elapsedMilliseconds,
            status: 'insufficient',
            sufficiency: response.sufficiency,
          })
        case 'error':
          return failureResult(response.error)
        case 'ready':
          return failureResult(
            createWorkerError('analyze', 'Worker가 예상하지 않은 응답을 반환했습니다.'),
          )
      }
    } catch (error: unknown) {
      return failureResult(mapFailure(error, 'analyze'))
    } finally {
      analyzing = false
    }
  }

  const dispose = () => {
    disposed = true
    transport.dispose()
  }
  return {analyze, dispose, prepare}
}
