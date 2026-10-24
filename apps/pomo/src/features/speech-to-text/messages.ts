import type {SpeechRecognitionError} from './errors'
import type {SpeechModelId} from './models'
import type {SpeechBackend} from './recognizer'

export interface PrepareSpeechRequest {
  readonly modelId: SpeechModelId
  readonly preferredBackend: SpeechBackend
  readonly requestId: number
  readonly type: 'prepare'
}

export interface TranscribeSpeechRequest {
  readonly audio: Float32Array
  readonly language: string
  readonly modelId: SpeechModelId
  readonly preferredBackend: SpeechBackend
  readonly requestId: number
  readonly type: 'transcribe'
}

export type SpeechWorkerRequest = PrepareSpeechRequest | TranscribeSpeechRequest

export interface SpeechLoadingResponse {
  readonly progress: number
  readonly type: 'loading'
}

export interface SpeechFallbackResponse {
  readonly backend: 'wasm'
  readonly type: 'backend-changed'
}

export interface SpeechReadyResponse {
  readonly backend: SpeechBackend
  readonly requestId: number
  readonly type: 'ready'
}

export interface SpeechCompleteResponse {
  readonly backend: SpeechBackend
  readonly requestId: number
  readonly text: string
  readonly type: 'complete'
}

export interface SpeechErrorResponse {
  readonly error: SpeechRecognitionError
  readonly requestId: number
  readonly type: 'error'
}

export type SpeechWorkerResponse =
  | SpeechCompleteResponse
  | SpeechErrorResponse
  | SpeechFallbackResponse
  | SpeechLoadingResponse
  | SpeechReadyResponse
