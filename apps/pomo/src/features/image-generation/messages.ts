import type {TextModelId} from '../text-generation'
import type {ImageSettings} from './settings'

export interface PromptRequest {
  readonly idea: string
  readonly modelId: TextModelId
  readonly type: 'prompt'
}
export interface ImageRequest {
  readonly prompt: string
  readonly settings: ImageSettings
  readonly type: 'image'
}
export type GenerationRequest = PromptRequest | ImageRequest

export interface GenerationProgress {
  readonly label: string
  readonly percentage?: number
  readonly type: 'progress'
}
export interface PromptResponse {
  readonly prompt: string
  readonly type: 'prompt'
}
export interface ImageResponse {
  readonly blob: Blob
  readonly type: 'image'
}
export interface GenerationError {
  readonly message: string
  readonly type: 'error'
}
export type GenerationResponse =
  | GenerationProgress
  | PromptResponse
  | ImageResponse
  | GenerationError
export type GenerationUpdate = GenerationProgress | PromptResponse
