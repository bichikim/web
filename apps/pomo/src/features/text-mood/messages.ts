import type {TextMoodAnalysis, TextSufficiencyAnalysis} from './analysis'
import type {TextMoodError} from './errors'

export interface PrepareTextMoodRequest {
  readonly requestId: number
  readonly type: 'prepare'
}

export interface AnalyzeTextMoodRequest {
  readonly context?: string
  readonly requestId: number
  readonly text: string
  readonly type: 'analyze'
}

export type TextMoodWorkerRequest = AnalyzeTextMoodRequest | PrepareTextMoodRequest

export interface TextMoodLoadingResponse {
  readonly progress: number
  readonly type: 'loading'
}

export interface TextMoodReadyResponse {
  readonly requestId: number
  readonly type: 'ready'
}

export interface TextMoodCompleteResponse {
  readonly analysis: TextMoodAnalysis
  readonly elapsedMilliseconds: number
  readonly requestId: number
  readonly type: 'complete'
}

export interface TextMoodInsufficientResponse {
  readonly elapsedMilliseconds: number
  readonly requestId: number
  readonly sufficiency: TextSufficiencyAnalysis
  readonly type: 'insufficient'
}

export interface TextMoodErrorResponse {
  readonly error: TextMoodError
  readonly requestId: number
  readonly type: 'error'
}

export type TextMoodWorkerResponse =
  | TextMoodCompleteResponse
  | TextMoodErrorResponse
  | TextMoodInsufficientResponse
  | TextMoodLoadingResponse
  | TextMoodReadyResponse
