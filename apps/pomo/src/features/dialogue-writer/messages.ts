import type {
  PrepareTextModelRequest,
  TextGenerationErrorResponse,
  TextGenerationLoadingResponse,
  TextGenerationReadyResponse,
  TextGenerationTokenResponse,
} from '../text-generation/messages'
import type {TextModelId} from '../text-generation/model'

export interface GenerateDialogueRequest {
  readonly modelId: TextModelId
  readonly request: string
  readonly type: 'generate'
}

export type DialogueWorkerRequest = GenerateDialogueRequest | PrepareTextModelRequest

export interface DialogueStartedResponse {
  readonly type: 'started'
}

export interface DialogueCompleteResponse {
  readonly text: string
  readonly type: 'complete'
}

export type DialogueWorkerResponse =
  | DialogueCompleteResponse
  | DialogueStartedResponse
  | TextGenerationErrorResponse
  | TextGenerationLoadingResponse
  | TextGenerationReadyResponse
  | TextGenerationTokenResponse
