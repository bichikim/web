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
