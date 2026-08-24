import type {SpeechRecognitionError} from './errors'
import type {SpeechModelId} from './models'
import type {Result} from '../result'

export type SpeechBackend = 'wasm' | 'webgpu'

export interface SpeechRecognizerReady {
  readonly backend: SpeechBackend
}

export interface SpeechTranscript extends SpeechRecognizerReady {
  readonly text: string
}

export interface TranscribeSpeechOptions {
  readonly audio: Float32Array
  readonly language: string
}

export interface SpeechRecognizer {
  readonly dispose: () => void
  readonly prepare: () => Promise<Result<SpeechRecognizerReady, SpeechRecognitionError>>
  readonly transcribe: (
    options: TranscribeSpeechOptions,
  ) => Promise<Result<SpeechTranscript, SpeechRecognitionError>>
}

export interface CreateSpeechRecognizerOptions {
  readonly modelId: SpeechModelId
  readonly onBackendChange: (backend: SpeechBackend) => void
  readonly onProgress: (progress: number) => void
  readonly preferredBackend: SpeechBackend
}
