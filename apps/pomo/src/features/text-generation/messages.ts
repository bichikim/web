import type {TextModelId} from './model'
import type {TextGenerationProgress} from './progress'

export interface PrepareTextModelRequest {
  readonly modelId: TextModelId
  readonly type: 'prepare'
}

export interface TextGenerationLoadingResponse extends TextGenerationProgress {
  readonly type: 'loading'
}

export interface TextGenerationReadyResponse {
  readonly type: 'ready'
}

export interface TextGenerationTokenResponse {
  readonly text: string
  readonly type: 'token'
}

export interface TextGenerationErrorResponse {
  readonly message: string
  readonly restartRequired: boolean
  readonly type: 'error'
}

export type TextModelPreparationResponse =
  | TextGenerationErrorResponse
  | TextGenerationLoadingResponse
  | TextGenerationReadyResponse

/** 다른 작업이 실행 중이어서 해당 요청을 접수하지 않았다는 응답이다. */
export interface TextGenerationSkippedResponse<Request> {
  readonly reason: 'busy'
  readonly request: Request
  readonly type: 'skipped'
}
