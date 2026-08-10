export interface QwenFileProgress {
  readonly fileName: string
  readonly loadedBytes: number
  readonly percentage: number
  readonly totalBytes: number
}

export interface QwenProgress {
  readonly files: ReadonlyArray<QwenFileProgress>
  readonly loadedBytes: number
  readonly percentage: number
  readonly totalBytes: number
}

export interface PrepareQwenRequest {
  readonly modelId: QwenModelId
  readonly type: 'prepare'
}

export interface GenerateDialogueRequest {
  readonly modelId: QwenModelId
  readonly request: string
  readonly type: 'generate'
}

export type QwenWorkerRequest = GenerateDialogueRequest | PrepareQwenRequest

export interface QwenLoadingResponse extends QwenProgress {
  readonly type: 'loading'
}

export interface QwenReadyResponse {
  readonly type: 'ready'
}

export interface DialogueStartedResponse {
  readonly type: 'started'
}

export interface DialogueTokenResponse {
  readonly text: string
  readonly type: 'token'
}

export interface DialogueCompleteResponse {
  readonly text: string
  readonly type: 'complete'
}

export interface QwenErrorResponse {
  readonly message: string
  readonly restartRequired: boolean
  readonly type: 'error'
}

export type QwenWorkerResponse =
  | DialogueCompleteResponse
  | DialogueStartedResponse
  | DialogueTokenResponse
  | QwenErrorResponse
  | QwenLoadingResponse
  | QwenReadyResponse
import type {QwenModelId} from './model'
