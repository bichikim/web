import type {
  PrepareTextModelRequest,
  TextGenerationErrorResponse,
  TextGenerationLoadingResponse,
  TextGenerationReadyResponse,
  TextGenerationTokenResponse,
} from '../text-generation/messages'
import type {TextModelId} from '../text-generation/model'

export interface ChatMessage {
  readonly content: string
  readonly id: string
  readonly role: 'assistant' | 'user'
}

export interface ChatContext {
  readonly messages: ReadonlyArray<ChatMessage>
  readonly summary: string
}

export interface ChatAnswerDraft {
  readonly content: string
  readonly id: string
}

export interface GenerateChatRequest {
  readonly context: ChatContext
  readonly modelId: TextModelId
  readonly refineAnswer: boolean
  readonly replyId: string
  readonly supplementaryContext?: string
  readonly type: 'generate'
}

export type ChatWorkerRequest = GenerateChatRequest | PrepareTextModelRequest

export interface ChatCompactingResponse {
  readonly type: 'compacting'
}

export interface ChatStartedResponse {
  readonly contextTokens: number
  readonly wasCompacted: boolean
  readonly type: 'started'
}

export interface ChatRefiningResponse {
  readonly type: 'refining'
}

export interface ChatDraftResponse {
  readonly draft: ChatAnswerDraft
  readonly type: 'draft'
}

export interface ChatCompleteResponse {
  readonly context: ChatContext
  readonly contextTokens: number
  readonly message: ChatMessage
  readonly wasCompacted: boolean
  readonly type: 'complete'
}

export type ChatWorkerResponse =
  | ChatCompactingResponse
  | ChatCompleteResponse
  | ChatDraftResponse
  | ChatRefiningResponse
  | ChatStartedResponse
  | TextGenerationErrorResponse
  | TextGenerationLoadingResponse
  | TextGenerationReadyResponse
  | TextGenerationTokenResponse
